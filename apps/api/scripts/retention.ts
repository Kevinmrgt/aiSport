// DATABASE_URL must be supplied explicitly; never silently load a developer .env for a purge.
if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL explicite requise');
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm-retention'))
  throw new Error('La purge exige --apply --confirm-retention');
const { purgeInactiveAccounts } = await import('../src/services/retention.service.js');
const { pool } = await import('../src/db/index.js');
try {
  console.log(JSON.stringify(await purgeInactiveAccounts({ apply })));
} finally {
  await pool.end();
}
