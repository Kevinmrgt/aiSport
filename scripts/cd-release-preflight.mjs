import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const requiredChecks = [
  'targetMapping', 'legacyDataReview', 'oauthFreshLogin', 'twoUserIsolation',
  'aiWorkoutProgram', 'alertsReceived', 'providerContracts', 'sportsReview', 'dataPolicyReviewed',
];

function recentDate(value, now) {
  const date = Date.parse(value);
  return Number.isFinite(date) && date <= now + 60_000 && date >= now - 7 * 86_400_000;
}

function configured(value) {
  return typeof value === 'string' && value.trim().length >= 3 &&
    !/TODO|example\.(com|org)|localhost|à renseigner|renseigner|your[- ]|votre[- ]/i.test(value);
}

export function validateReleaseEvidence({ revision, migrationFingerprint, restore, checklist, legal, targets, now = Date.now() }) {
  const problems = [];
  if (!/^[a-f0-9]{40}$/i.test(revision ?? '')) problems.push('revision immuable requise');
  if (!/^[a-f0-9]{64}$/i.test(migrationFingerprint ?? '')) problems.push('empreinte migrations requise');
  for (const key of ['operatorName', 'contactEmail', 'hostingName', 'hostingContact', 'processingBasis', 'transfersNotice']) {
    if (!configured(legal?.[key])) problems.push(`information legale manquante: ${key}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legal?.contactEmail ?? '')) problems.push('contact legal invalide');
  if (!restore || restore.result !== 'passed' || restore.rowCountsMatch !== true ||
      restore.candidateMigrationsApplied !== true || restore.encrypted !== true ||
      restore.tablesVerified < 1 || !recentDate(restore.performedAt, now) ||
      !/^[a-f0-9]{64}$/i.test(restore.sourceIdentity ?? '') ||
      !/^[a-f0-9]{64}$/i.test(restore.dumpSha256 ?? '') ||
      restore.sourceIdentity === restore.restoreIdentity ||
      restore.migrationFingerprint !== migrationFingerprint) {
    problems.push('preuve recente de restauration chiffree et migration sur cible distincte requise');
  }
  if (!checklist || checklist.revision?.toLowerCase() !== revision?.toLowerCase() ||
      checklist.canonicalWebOrigin !== 'https://www.alcideai.fr' ||
      checklist.oauthCallbackOrigin !== checklist.canonicalWebOrigin ||
      checklist.databaseIdentity !== restore?.sourceIdentity ||
      !recentDate(checklist.performedAt, now) || !configured(checklist.reviewer)) {
    problems.push('checklist de la revision et de la cible reelle requise');
  }
  for (const check of requiredChecks) {
    if (checklist?.checks?.[check] !== true) problems.push(`validation non acquise: ${check}`);
  }
  if (!/^[a-f0-9]{64}$/i.test(targets?.sourceIdentity ?? '') ||
      targets.sourceIdentity !== restore?.sourceIdentity ||
      targets.sourceIdentity !== checklist?.databaseIdentity) {
    problems.push('la base applicative reelle doit correspondre a la restauration et a la checklist');
  }
  if (!/^[a-f0-9]{64}$/i.test(targets?.migrationIdentity ?? '') ||
      targets.migrationIdentity !== targets?.sourceIdentity) {
    problems.push('la connexion de migration doit viser la meme base reelle que l application');
  }
  return problems;
}

export async function readReleaseTargets(env, reader) {
  const readIdentity = reader ?? (await import('./db-operations.mjs')).readDatabaseIdentity;
  const source = await readIdentity(env['DATABASE_URL']);
  const migration = await readIdentity(env['MIGRATION_DATABASE_URL'] || env['DATABASE_URL']);
  return { sourceIdentity: source.sourceIdentity, migrationIdentity: migration.sourceIdentity };
}

async function main() {
  const env = process.env;
  const readEvidence = async (path, json) => path ? JSON.parse(await readFile(path, 'utf8')) : json ? JSON.parse(json) : null;
  const { migrationFingerprint } = await import('./db-operations.mjs');
  const problems = validateReleaseEvidence({
    revision: env['RELEASE_REVISION'], migrationFingerprint: await migrationFingerprint(),
    restore: await readEvidence(env['RESTORE_EVIDENCE_FILE'], env['PRODUCTION_RESTORE_EVIDENCE_JSON']),
    checklist: await readEvidence(env['RELEASE_CHECKLIST_FILE'], env['PRODUCTION_RELEASE_CHECKLIST_JSON']),
    legal: {
      operatorName: env['LEGAL_OPERATOR_NAME'], contactEmail: env['LEGAL_CONTACT_EMAIL'],
      hostingName: env['LEGAL_HOSTING_NAME'], hostingContact: env['LEGAL_HOSTING_CONTACT'],
      processingBasis: env['LEGAL_PROCESSING_BASIS'], transfersNotice: env['LEGAL_TRANSFERS_NOTICE'],
    },
    targets: await readReleaseTargets(env),
  });
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(JSON.stringify({ result: 'release_preflight_passed', revision: env['RELEASE_REVISION'] }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
