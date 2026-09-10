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

  it('génère un mot de passe temporaire robuste à usage unique', () => {
    const first = createTemporaryPassword();
    const second = createTemporaryPassword();
    expect(first).toHaveLength(24);
    expect(second).toHaveLength(24);
    expect(first).not.toBe(second);
  });
});
