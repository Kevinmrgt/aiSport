import { randomBytes, scryptSync } from 'node:crypto';

const password = process.env['JURY_PASSWORD'];
if (!password || password.length < 20 || password.length > 256) {
  console.error('JURY_PASSWORD doit contenir entre 20 et 256 caractères.');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  process.stdout.write(
    ['scrypt', 16_384, 8, 1, salt.toString('base64url'), hash.toString('base64url')].join('$') +
      '\n',
  );
}
