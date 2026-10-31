import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client } from './db-operations.mjs';
import { inspectConfiguration, VercelProduction } from './production-admin-release.mjs';

class ClosedPilotCheckError extends Error {}

function requireCondition(value, reason) {
  if (!value) throw new ClosedPilotCheckError(reason);
}

/** Read-only verification. No provider call, entitlement, invitation or activation is created. */
export async function verifyClosedPilotRelease(env, {
  provider = new VercelProduction(env),
  inspect = inspectConfiguration,
  clientFactory = (url) => new Client({ connectionString: url, connectionTimeoutMillis: 10_000, statement_timeout: 10_000 }),
} = {}) {
  const phase = env.PILOT_CHECK_PHASE ?? 'before';
  const report = { complete: false, readOnly: true, realAiCalls: 0 };
  let client;
  try {
    requireCondition(['before', 'after'].includes(phase) && /^[a-f0-9]{40}$/.test(env.RELEASE_REVISION ?? ''), 'invalid_closed_release_input');
    report.phase = phase;
    report.revision = env.RELEASE_REVISION;
    requireCondition(!env.ADMIN_RECIPE_CONFIRM && !env.PUBLISHER_CONFIRM, 'optional_release_mutations_not_allowed');
    const team = await provider.request(`/v2/teams/${encodeURIComponent(env.VERCEL_ORG_ID)}`);
    const plan = team.billing?.plan;
    report.hostingPlan = ['hobby', 'pro', 'enterprise'].includes(plan) ? plan : 'unverified';
    requireCondition(team.id === env.VERCEL_ORG_ID && plan === 'hobby', 'free_hosting_plan_not_verified');
    const configuration = await inspect(env, provider);
    requireCondition(configuration.ready, 'release_configuration_not_ready');
    const api = configuration.api, web = configuration.web;
    const normalize = (item) => (item?.value ?? '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean).sort();
    const allowed = normalize(api.ADMIN_EMAILS);
    requireCondition(api.PRODUCTION_ACCESS_MODE?.value === 'admin-only' && web.PRODUCTION_ACCESS_MODE?.value === 'admin-only' &&
      allowed.length === 1 && JSON.stringify(allowed) === JSON.stringify(normalize(web.ADMIN_EMAILS)), 'closed_access_not_verified');
    report.adminOnly = true;
    const simulation = await provider.snapshot(env.VERCEL_API_PROJECT_ID, ['STRIPE_TEST_SIMULATION_ENABLED']);
    requireCondition(!simulation.STRIPE_TEST_SIMULATION_ENABLED?.value || simulation.STRIPE_TEST_SIMULATION_ENABLED.value === 'false', 'stripe_simulation_must_remain_disabled');
    report.stripeSimulationDisabled = true;
    if (phase === 'after') requireCondition(api.APP_REVISION?.value === env.RELEASE_REVISION && web.APP_REVISION?.value === env.RELEASE_REVISION, 'closed_release_revision_mismatch');
    client = clientFactory(configuration.source);
    await client.connect();
    await client.query('begin read only');
    const present = (await client.query("select to_regclass('public.pilot_control') is not null as control, to_regclass('public.pilot_invitations') is not null as invitations, to_regclass('public.pilot_admissions') is not null as admissions, to_regclass('public.pilot_attempts') is not null as attempts")).rows[0];
    const values = ['control', 'invitations', 'admissions', 'attempts'].map((key) => present?.[key]);
    requireCondition(values.every((v) => v === false) || values.every((v) => v === true), 'partial_pilot_schema_refused');
    report.pilotSchemaPresent = values.every((v) => v === true);
    if (report.pilotSchemaPresent) {
      const count = (await client.query('select (select count(*)::int from public.pilot_control) as control, (select count(*)::int from public.pilot_invitations) as invitations, (select count(*)::int from public.pilot_admissions) as admissions, (select count(*)::int from public.pilot_attempts) as attempts')).rows[0];
      requireCondition(['control', 'invitations', 'admissions', 'attempts'].every((key) => count?.[key] === 0), 'pilot_must_remain_unactivated_and_empty');
    } else requireCondition(phase === 'before', 'deployed_pilot_schema_required');
    await client.query('rollback');
    report.pilotInactive = true;
    report.invitationsEmpty = true;
    report.complete = true;
  } catch (error) {
    report.reason = error instanceof ClosedPilotCheckError ? error.message : 'closed_release_private_diagnostics_required';
  } finally {
    if (client) await client.end().catch(() => undefined);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await verifyClosedPilotRelease(process.env);
  if (process.env.CLOSED_PILOT_EVIDENCE_FILE) await writeFile(process.env.CLOSED_PILOT_EVIDENCE_FILE, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(report));
  if (!report.complete) process.exitCode = 1;
}
