import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 32;
const MAX_MEMORY = 64 * 1024 * 1024;

function encodeHash(password: string, salt: Buffer): string {
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export function hashPassword(password: string): string {
  return encodeHash(password, randomBytes(16));
}

export function createTemporaryPassword(): string {
  // 24 caractères cryptographiquement aléatoires, sans ambiguïtés visuelles.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(24);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, costText, blockText, parallelText, saltText, hashText] = encoded.split('$');
  if (
    algorithm !== 'scrypt' ||
    costText !== String(COST) ||
    blockText !== String(BLOCK_SIZE) ||
    parallelText !== String(PARALLELIZATION) ||
    !saltText ||
    !hashText
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length < 16 || expected.length !== KEY_LENGTH) return false;
    const candidate = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, KEY_LENGTH, {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: MAX_MEMORY,
      }, (error, derived) => (error ? reject(error) : resolve(derived)));
    });
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
