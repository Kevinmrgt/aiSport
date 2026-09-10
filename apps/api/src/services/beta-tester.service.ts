import { randomUUID } from 'node:crypto';
import {
  adjustBetaBalance,
  changeBetaPassword,
  createBetaTester,
  findActiveBetaSession,
  findBetaForAuthentication,
  findBetaByUserId,
  listBetaTesters,
  releaseBetaGeneration,
  reserveBetaGeneration,
  resetBetaPassword,
  setBetaStatus,
} from '../repositories/beta-tester.repository.js';
import { createTemporaryPassword, hashPassword, verifyPassword } from './password.service.js';
import { AppError } from '../types/app-error.js';

function isUniqueConstraintError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current !== 'object') return false;
    const detail = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (detail.code === '23505') return true;
    if (typeof detail.message === 'string' && /unique|duplicate/i.test(detail.message)) return true;
    current = detail.cause;
  }
  return false;
}

export async function authorizeBeta(email: string, password: string) {
  const beta = await findBetaForAuthentication(email.toLowerCase());
  if (!beta || beta.active !== 1 || !(await verifyPassword(password, beta.passwordHash))) return null;
  return {
    id: beta.userId,
    email: beta.email,
    name: beta.name ?? beta.email,
    betaSessionVersion: beta.sessionVersion,
    betaMustChangePassword: beta.mustChangePassword === 1,
  };
}

export async function assertActiveBetaSession(userId: string, sessionVersion: string) {
  const beta = await findActiveBetaSession(userId, sessionVersion);
  if (!beta || beta.active !== 1) throw AppError.unauthorized('Session bêta inactive ou révoquée');
  return beta;
}

export async function reserveBetaSlot(userId: string) {
  return reserveBetaGeneration(userId);
}

export async function releaseBetaSlot(userId: string) {
  return releaseBetaGeneration(userId);
}

export async function listManagedBetaTesters() {
  return listBetaTesters();
}

export async function createManagedBetaTester(input: {
  name: string;
  email: string;
  generationBalance: number;
  adminEmail: string;
}) {
  const temporaryPassword = createTemporaryPassword();
  try {
    const beta = await createBetaTester({
      ...input,
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(temporaryPassword),
      sessionVersion: randomUUID(),
    });
    return { beta, temporaryPassword };
  } catch (error) {
    // Drizzle peut encapsuler l'erreur PostgreSQL dans `cause`.
    if (isUniqueConstraintError(error)) {
      throw AppError.badRequest('Un accès bêta existe déjà pour cette adresse e-mail.');
    }
    throw error;
  }
}

export async function adjustManagedBetaBalance(
  userId: string,
  amount: number,
  adminEmail: string,
) {
  const balance = await adjustBetaBalance(userId, amount, adminEmail);
  if (balance === null) {
    throw AppError.badRequest('Le retrait dépasse le solde de générations disponible.');
  }
  return balance;
}

export async function setManagedBetaStatus(userId: string, active: boolean) {
  if (!(await setBetaStatus(userId, active, randomUUID()))) throw AppError.notFound('Bêta-testeur');
}

export async function resetManagedBetaPassword(userId: string) {
  const temporaryPassword = createTemporaryPassword();
  if (!(await resetBetaPassword(userId, hashPassword(temporaryPassword), randomUUID()))) {
    throw AppError.notFound('Bêta-testeur');
  }
  return temporaryPassword;
}

export async function updateOwnBetaPassword(userId: string, currentPassword: string, newPassword: string) {
  const beta = await findBetaByUserId(userId);
  if (!beta || beta.active !== 1 || !(await verifyPassword(currentPassword, beta.passwordHash))) {
    throw AppError.unauthorized('Mot de passe actuel invalide');
  }
  await changeBetaPassword(userId, hashPassword(newPassword));
}
