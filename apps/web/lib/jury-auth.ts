import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(256),
});

const environmentSchema = z.object({
  JURY_ACCESS_IDENTIFIER: z.string().trim().min(3).max(128),
  JURY_ACCESS_PASSWORD_HASH: z.string().min(1).max(512),
  JURY_ACCESS_USER_ID: z
    .string()
    .trim()
    .regex(/^jury-[A-Za-z0-9_-]+$/)
    .max(128),
  JURY_ACCESS_EMAIL: z
    .string()
    .trim()
    .email()
    .max(254)
    .refine((value) => value.toLowerCase().endsWith('.invalid')),
  JURY_ACCESS_NAME: z.string().trim().min(1).max(128),
  JURY_ACCESS_EXPIRES_AT: z.string().datetime({ offset: true }),
  JURY_ACCESS_SESSION_VERSION: z.string().trim().min(8).max(128),
});

const hashSchema = z.object({
  cost: z.number().int().min(2).max(1_048_576),
  blockSize: z.number().int().min(1).max(64),
  parallelization: z.number().int().min(1).max(16),
  salt: z.instanceof(Buffer).refine((value) => value.length >= 16 && value.length <= 64),
  hash: z.instanceof(Buffer).refine((value) => value.length === SCRYPT_KEY_LENGTH),
});

export interface JuryAccessConfig {
  identifier: string;
  passwordHash: string;
  userId: string;
  email: string;
  name: string;
  expiresAt: Date;
  expiresAtIso: string;
  fingerprint: string;
}

export interface JuryAccessUser {
  id: string;
  email: string;
  name: string;
  juryAccessExpiresAt: string;
  juryAccessFingerprint: string;
}

type JuryEnvironment = Record<string, string | undefined>;

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePasswordHash(encoded: string) {
  const parts = encoded.split('$');
  if (parts.length !== 6) return null;
  const [algorithm, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] = parts;
  if (
    algorithm !== 'scrypt' ||
    !costValue ||
    !blockSizeValue ||
    !parallelizationValue ||
    !saltValue ||
    !hashValue
  ) {
    return null;
  }

  const cost = parsePositiveInteger(costValue);
  const blockSize = parsePositiveInteger(blockSizeValue);
  const parallelization = parsePositiveInteger(parallelizationValue);
  if (
    cost !== SCRYPT_COST ||
    blockSize !== SCRYPT_BLOCK_SIZE ||
    parallelization !== SCRYPT_PARALLELIZATION
  ) {
    return null;
  }

  try {
    const parsed = hashSchema.safeParse({
      cost,
      blockSize,
      parallelization,
      salt: Buffer.from(saltValue, 'base64url'),
      hash: Buffer.from(hashValue, 'base64url'),
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createJuryPasswordHash(password: string, salt: Buffer = randomBytes(16)): string {
  const parsedPassword = z.string().min(20).max(256).parse(password);
  const parsedSalt = z
    .instanceof(Buffer)
    .refine((value) => value.length >= 16 && value.length <= 64)
    .parse(salt);
  const hash = scryptSync(parsedPassword, parsedSalt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    parsedSalt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export function loadJuryAccessConfig(
  environment: JuryEnvironment = process.env,
): JuryAccessConfig | null {
  if (environment['JURY_ACCESS_ENABLED'] !== 'true') return null;

  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success || !parsePasswordHash(parsed.data.JURY_ACCESS_PASSWORD_HASH)) return null;

  const expiresAt = new Date(parsed.data.JURY_ACCESS_EXPIRES_AT);
  if (!Number.isFinite(expiresAt.getTime())) return null;

  const fingerprint = createHash('sha256')
    .update(
      [
        parsed.data.JURY_ACCESS_IDENTIFIER,
        parsed.data.JURY_ACCESS_PASSWORD_HASH,
        parsed.data.JURY_ACCESS_USER_ID,
        parsed.data.JURY_ACCESS_EMAIL,
        parsed.data.JURY_ACCESS_EXPIRES_AT,
        parsed.data.JURY_ACCESS_SESSION_VERSION,
      ].join('\0'),
    )
    .digest('base64url');

  return {
    identifier: parsed.data.JURY_ACCESS_IDENTIFIER,
    passwordHash: parsed.data.JURY_ACCESS_PASSWORD_HASH,
    userId: parsed.data.JURY_ACCESS_USER_ID,
    email: parsed.data.JURY_ACCESS_EMAIL,
    name: parsed.data.JURY_ACCESS_NAME,
    expiresAt,
    expiresAtIso: expiresAt.toISOString(),
    fingerprint,
  };
}

export function isJuryAccessAvailable(
  environment: JuryEnvironment = process.env,
  now: Date = new Date(),
): boolean {
  const config = loadJuryAccessConfig(environment);
  return config !== null && now.getTime() < config.expiresAt.getTime();
}

export function isJurySessionActive(
  expiresAtIso: unknown,
  fingerprint: unknown,
  environment: JuryEnvironment = process.env,
  now: Date = new Date(),
): boolean {
  if (typeof expiresAtIso !== 'string' || typeof fingerprint !== 'string') return false;
  const config = loadJuryAccessConfig(environment);
  if (!config || fingerprint !== config.fingerprint) return false;

  const sessionExpiresAt = new Date(expiresAtIso);
  if (!Number.isFinite(sessionExpiresAt.getTime())) return false;
  return now.getTime() < sessionExpiresAt.getTime() && now.getTime() < config.expiresAt.getTime();
}

function derivePassword(
  password: string,
  salt: Buffer,
  keyLength: number,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function verifyJuryCredentials(
  credentials: unknown,
  environment: JuryEnvironment = process.env,
  now: Date = new Date(),
): Promise<JuryAccessUser | null> {
  const input = credentialsSchema.safeParse(credentials);
  const config = loadJuryAccessConfig(environment);
  if (!input.success || !config || now.getTime() >= config.expiresAt.getTime()) return null;

  const passwordHash = parsePasswordHash(config.passwordHash);
  if (!passwordHash) return null;

  let candidate: Buffer;
  try {
    candidate = await derivePassword(
      input.data.password,
      passwordHash.salt,
      passwordHash.hash.length,
      passwordHash.cost,
      passwordHash.blockSize,
      passwordHash.parallelization,
    );
  } catch {
    return null;
  }

  const passwordMatches = timingSafeEqual(candidate, passwordHash.hash);
  const identifierMatches = timingSafeEqual(
    createHash('sha256').update(input.data.identifier).digest(),
    createHash('sha256').update(config.identifier).digest(),
  );
  if (!passwordMatches || !identifierMatches) return null;

  return {
    id: config.userId,
    email: config.email,
    name: config.name,
    juryAccessExpiresAt: config.expiresAtIso,
    juryAccessFingerprint: config.fingerprint,
  };
}
