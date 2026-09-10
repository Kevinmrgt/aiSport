import { describe, expect, it } from 'vitest';
import { createTemporaryPassword, hashPassword, verifyPassword } from '../src/services/password.service.js';

describe('mots de passe bêta', () => {
  it('ne stocke jamais le mot de passe en clair et vérifie le bon secret', async () => {
    const password = 'Mot-de-passe-bêta-robuste';
    const hash = hashPassword(password);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('mauvais-mot-de-passe', hash)).resolves.toBe(false);
  });

  it('génère un code temporaire à six chiffres', () => {
    const first = createTemporaryPassword();
    const second = createTemporaryPassword();
    expect(first).toMatch(/^\d{6}$/);
    expect(second).toMatch(/^\d{6}$/);
  });
});
