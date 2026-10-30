import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const args = process.argv.slice(2);
const fileIndex = args.indexOf('--file');
const file = fileIndex < 0 ? undefined : args[fileIndex + 1];
if (!file || !process.env['DATABASE_URL']) {
  throw new Error(
    'DATABASE_URL explicite et --file mapping.json requis ; lecture seule par défaut.',
  );
}
if (args.some((arg, index) => arg !== '--apply' && arg !== '--file' && index !== fileIndex + 1)) {
  throw new Error('Options autorisées : --file mapping.json [--apply]');
}
const mapping = z
  .object({
    userId: z.string().uuid(),
    subject: z.string().min(1).max(255).regex(/^\S+$/),
    expectedEmail: z.string().email().max(320),
  })
  .strict()
  .parse(JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')));
const { linkLegacyGoogleIdentity } = await import('../src/repositories/identity.repository.js');
const { pool } = await import('../src/db/index.js');
try {
  await linkLegacyGoogleIdentity(mapping, args.includes('--apply'));
  // No email, provider subject or credential is written to stdout.
  console.log(
    args.includes('--apply')
      ? 'Liaison contrôlée appliquée.'
      : 'Mapping valide ; aucune modification (dry-run).',
  );
} finally {
  await pool.end();
}
