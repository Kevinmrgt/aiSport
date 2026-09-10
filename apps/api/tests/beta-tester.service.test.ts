import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  adjustBetaBalance: vi.fn(),
  changeBetaPassword: vi.fn(),
  createBetaTester: vi.fn(),
  findActiveBetaSession: vi.fn(),
  findBetaByUserId: vi.fn(),
  findBetaForAuthentication: vi.fn(),
  listBetaTesters: vi.fn(),
  releaseBetaGeneration: vi.fn(),
  reserveBetaGeneration: vi.fn(),
  resetBetaPassword: vi.fn(),
  setBetaStatus: vi.fn(),
}));
const passwords = vi.hoisted(() => ({
  createTemporaryPassword: vi.fn(() => 'Temporary-password-123!'),
  hashPassword: vi.fn((value: string) => `hash:${value}`),
  verifyPassword: vi.fn(),
}));

vi.mock('../src/repositories/beta-tester.repository.js', () => repository);
vi.mock('../src/services/password.service.js', () => passwords);

import {
  adjustManagedBetaBalance,
  assertActiveBetaSession,
  authorizeBeta,
  createManagedBetaTester,
  listManagedBetaTesters,
  releaseBetaSlot,
  reserveBetaSlot,
  resetManagedBetaPassword,
  setManagedBetaStatus,
  updateOwnBetaPassword,
} from '../src/services/beta-tester.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('beta tester service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('autorise seulement un compte actif avec le bon mot de passe', async () => {
    repository.findBetaForAuthentication.mockResolvedValue({
      userId: USER_ID, email: 'BETA@EXAMPLE.COM', name: null, passwordHash: 'stored', active: 1,
      sessionVersion: 'v1', mustChangePassword: 1,
    });
    passwords.verifyPassword.mockResolvedValue(true);

    await expect(authorizeBeta('Beta@Example.com', 'secret')).resolves.toEqual({
      id: USER_ID, email: 'BETA@EXAMPLE.COM', name: 'BETA@EXAMPLE.COM', betaSessionVersion: 'v1', betaMustChangePassword: true,
    });
    expect(repository.findBetaForAuthentication).toHaveBeenCalledWith('beta@example.com');

    repository.findBetaForAuthentication.mockResolvedValueOnce(null);
    await expect(authorizeBeta('missing@example.com', 'secret')).resolves.toBeNull();
    repository.findBetaForAuthentication.mockResolvedValueOnce({ active: 0, passwordHash: 'stored' });
    await expect(authorizeBeta('disabled@example.com', 'secret')).resolves.toBeNull();
    repository.findBetaForAuthentication.mockResolvedValueOnce({ active: 1, passwordHash: 'stored' });
    passwords.verifyPassword.mockResolvedValueOnce(false);
    await expect(authorizeBeta('wrong@example.com', 'secret')).resolves.toBeNull();
  });

  it('valide une session beta active et refuse une session révoquée', async () => {
    repository.findActiveBetaSession.mockResolvedValueOnce({ active: 1, mustChangePassword: 0, generationBalance: 3 });
    await expect(assertActiveBetaSession(USER_ID, 'v1')).resolves.toMatchObject({ generationBalance: 3 });
    repository.findActiveBetaSession.mockResolvedValueOnce(null);
    await expect(assertActiveBetaSession(USER_ID, 'revoked')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('crée un compte en normalisant son email et transforme une collision en erreur métier', async () => {
    const created = { userId: USER_ID, email: 'beta@example.com', name: 'Beta', active: true, generationBalance: 5, mustChangePassword: true, createdAt: new Date() };
    repository.createBetaTester.mockResolvedValueOnce(created);
    await expect(createManagedBetaTester({ name: 'Beta', email: 'BETA@EXAMPLE.COM', generationBalance: 5, adminEmail: 'admin@example.com' })).resolves.toMatchObject({ beta: created, temporaryPassword: 'Temporary-password-123!' });
    expect(repository.createBetaTester).toHaveBeenCalledWith(expect.objectContaining({ email: 'beta@example.com', passwordHash: 'hash:Temporary-password-123!' }));

    repository.createBetaTester.mockRejectedValueOnce(new Error('duplicate key'));
    await expect(createManagedBetaTester({ name: 'Beta', email: 'beta@example.com', generationBalance: 0, adminEmail: 'admin@example.com' })).rejects.toMatchObject({ statusCode: 400 });
    repository.createBetaTester.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(createManagedBetaTester({ name: 'Beta', email: 'beta@example.com', generationBalance: 0, adminEmail: 'admin@example.com' })).rejects.toThrow('database unavailable');
  });

  it('gère les ajustements, le statut et la réinitialisation sans exposer de mot de passe hashé', async () => {
    repository.adjustBetaBalance.mockResolvedValueOnce(8).mockResolvedValueOnce(null);
    await expect(adjustManagedBetaBalance(USER_ID, 3, 'admin@example.com')).resolves.toBe(8);
    await expect(adjustManagedBetaBalance(USER_ID, -20, 'admin@example.com')).rejects.toMatchObject({ statusCode: 400 });

    repository.setBetaStatus.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(setManagedBetaStatus(USER_ID, false)).resolves.toBeUndefined();
    await expect(setManagedBetaStatus(USER_ID, true)).rejects.toMatchObject({ statusCode: 404 });

    repository.resetBetaPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(resetManagedBetaPassword(USER_ID)).resolves.toBe('Temporary-password-123!');
    await expect(resetManagedBetaPassword(USER_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('réserve et libère une génération via le dépôt atomique', async () => {
    repository.reserveBetaGeneration.mockResolvedValue({ remaining: 2 });
    await expect(reserveBetaSlot(USER_ID)).resolves.toEqual({ remaining: 2 });
    await releaseBetaSlot(USER_ID);
    expect(repository.releaseBetaGeneration).toHaveBeenCalledWith(USER_ID);
  });

  it('change le mot de passe seulement si le mot de passe courant est valide sur un compte actif', async () => {
    repository.findBetaByUserId.mockResolvedValue({ active: 1, passwordHash: 'stored' });
    passwords.verifyPassword.mockResolvedValueOnce(true);
    await updateOwnBetaPassword(USER_ID, 'old', 'New-password-123!');
    expect(repository.changeBetaPassword).toHaveBeenCalledWith(USER_ID, 'hash:New-password-123!');

    repository.findBetaByUserId.mockResolvedValueOnce(null);
    await expect(updateOwnBetaPassword(USER_ID, 'old', 'new')).rejects.toMatchObject({ statusCode: 401 });
    repository.findBetaByUserId.mockResolvedValueOnce({ active: 0, passwordHash: 'stored' });
    await expect(updateOwnBetaPassword(USER_ID, 'old', 'new')).rejects.toMatchObject({ statusCode: 401 });
    repository.findBetaByUserId.mockResolvedValueOnce({ active: 1, passwordHash: 'stored' });
    passwords.verifyPassword.mockResolvedValueOnce(false);
    await expect(updateOwnBetaPassword(USER_ID, 'old', 'new')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('liste les comptes administrés', async () => {
    repository.listBetaTesters.mockResolvedValue([{ userId: USER_ID }]);
    await expect(listManagedBetaTesters()).resolves.toEqual([{ userId: USER_ID }]);
  });
});
