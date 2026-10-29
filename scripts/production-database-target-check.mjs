import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readDatabaseIdentity } from './db-operations.mjs';

// Inspect only the configured API database. Never export its URL, credentials,
// decrypted response, request headers or raw driver errors.
export async function checkProductionDatabaseTarget(env, { fetcher = fetch, identityReader = readDatabaseIdentity } = {}) {
  const base = { performedAt: new Date().toISOString(), readOnly: true, scope: 'configured-production-api-database' };
  try {
    if (!env.VERCEL_TOKEN || !env.VERCEL_ORG_ID || !env.VERCEL_API_PROJECT_ID || !env.DATABASE_URL) {
      return { ...base, complete: false, reason: 'missing_configuration' };
    }
    const get = async (path) => {
      const url = new URL(path, 'https://api.vercel.com');
      url.searchParams.set('teamId', env.VERCEL_ORG_ID);
      const response = await fetcher(url, {
        headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      return response.json();
    };
    const project = encodeURIComponent(env.VERCEL_API_PROJECT_ID);
    const metadata = await get(`/v10/projects/${project}/env?decrypt=false`);
    const matches = (metadata.envs ?? []).filter((item) => item.key === 'DATABASE_URL' &&
      (Array.isArray(item.target) ? item.target : [item.target]).includes('production') && !item.gitBranch);
    if (matches.length !== 1) return { ...base, complete: false, reason: 'missing_or_ambiguous_database_configuration' };
    const variable = matches[0];
    if (!variable.id || variable.visibility === 'secret' || variable.type === 'sensitive' || variable.type === 'secret') {
      return { ...base, complete: false, reason: 'database_configuration_not_readable' };
    }
    const decrypted = await get(`/v1/projects/${project}/env/${encodeURIComponent(variable.id)}`);
    if (decrypted.decrypted !== true || typeof decrypted.value !== 'string' || !decrypted.value) {
      return { ...base, complete: false, reason: 'database_configuration_not_readable' };
    }
    const [source, configured] = await Promise.all([
      identityReader(env.DATABASE_URL), identityReader(decrypted.value),
    ]);
    const sameDatabase = source.sourceIdentity === configured.sourceIdentity && source.databaseMajor === configured.databaseMajor;
    return { ...base, complete: true, sameDatabase, databaseMajor: configured.databaseMajor };
  } catch (error) {
    const reason = /^http_\d{3}$/.test(error?.message ?? '') ? error.message : 'private_diagnostics_required';
    return { ...base, complete: false, reason };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkProductionDatabaseTarget(process.env);
  await writeFile(process.env.DATABASE_TARGET_EVIDENCE_FILE ?? 'database-target.json', `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  if (!result.complete || !result.sameDatabase) process.exitCode = 1;
}
