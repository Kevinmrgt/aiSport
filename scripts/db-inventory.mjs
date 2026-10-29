import { writeFile, appendFile } from 'node:fs/promises';
import { Client, databaseUrl, inventory, OperationError, safeOperationFailure } from './db-operations.mjs';

let client;
try {
  client = new Client({ connectionString: databaseUrl(process.env['DATABASE_URL']).toString(), connectionTimeoutMillis: 15_000, statement_timeout: 30_000 });
  await client.connect();
  await client.query('begin isolation level repeatable read read only');
  const result = await inventory(client);
  result.connectionModeHint = databaseUrl(process.env['DATABASE_URL']).hostname.includes('-pooler.') ? 'pooled' : 'direct_or_unclassified';
  await client.query('commit');
  if (![16, 17, 18].includes(result.databaseMajor)) throw new OperationError('Unsupported source PostgreSQL major version');
  if (process.env['INVENTORY_FILE']) await writeFile(process.env['INVENTORY_FILE'], JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  if (process.env['GITHUB_OUTPUT']) await appendFile(process.env['GITHUB_OUTPUT'], `database_major=${result.databaseMajor}\n`);
  console.log(JSON.stringify({ databaseMajor: result.databaseMajor, tables: result.tables.length, sourceIdentity: result.sourceIdentity, connectionModeHint: result.connectionModeHint }));
} catch (error) { console.error(safeOperationFailure(error)); process.exitCode = 1; }
finally { if (client) await client.end().catch(() => undefined); }
