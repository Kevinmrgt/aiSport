import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OWASP A05: tests du fail-fast sur les variables d'environnement obligatoires
describe('validateEnv', () => {
  const REQUIRED_VARS = ['DATABASE_URL', 'SERVICE_SECRET'];
  const OPTIONAL_VARS = ['OPENAI_API_KEY'];

  beforeEach(() => {
    // Supprimer toutes les vars requises avant chaque test
    for (const key of [...REQUIRED_VARS, ...OPTIONAL_VARS]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of [...REQUIRED_VARS, ...OPTIONAL_VARS]) {
      delete process.env[key];
    }
    // Vider le cache du module pour forcer un re-import
    vi.resetModules();
  });

  it('ne lève pas process.exit si toutes les variables sont présentes', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['SERVICE_SECRET'] = 'secret-test';
    process.env['OPENAI_API_KEY'] = 'key-test';

    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).not.toThrow();
  });

  it('lève une erreur si SERVICE_SECRET est absent', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['OPENAI_API_KEY'] = 'key-test';
    // SERVICE_SECRET absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).toThrow(/SERVICE_SECRET/);
  });

  it('ne leve pas d\'erreur si OPENAI_API_KEY est absente', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['SERVICE_SECRET'] = 'secret-test';
    // OPENAI_API_KEY absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).not.toThrow();
  });

  it('lève une erreur si DATABASE_URL est absente', async () => {
    process.env['SERVICE_SECRET'] = 'secret-test';
    process.env['OPENAI_API_KEY'] = 'key-test';
    // DATABASE_URL absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });
});
