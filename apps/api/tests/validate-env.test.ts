import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OWASP A05: tests du fail-fast sur les variables d'environnement obligatoires
describe('validateEnv', () => {
  const REQUIRED_VARS = ['DATABASE_URL', 'SERVICE_SECRET', 'MISTRAL_API_KEY'];
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy sur process.exit pour éviter l'arrêt du runner de test
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    // Supprimer toutes les vars requises avant chaque test
    for (const key of REQUIRED_VARS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    exitSpy.mockRestore();
    for (const key of REQUIRED_VARS) {
      delete process.env[key];
    }
    // Vider le cache du module pour forcer un re-import
    vi.resetModules();
  });

  it('ne lève pas process.exit si toutes les variables sont présentes', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['SERVICE_SECRET'] = 'secret-test';
    process.env['MISTRAL_API_KEY'] = 'key-test';

    const { validateEnv } = await import('../src/lib/validate-env.js');
    validateEnv();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('appelle process.exit(1) si SERVICE_SECRET est absent', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['MISTRAL_API_KEY'] = 'key-test';
    // SERVICE_SECRET absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('appelle process.exit(1) si MISTRAL_API_KEY est absente', async () => {
    process.env['DATABASE_URL'] = 'postgres://localhost/test';
    process.env['SERVICE_SECRET'] = 'secret-test';
    // MISTRAL_API_KEY absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('appelle process.exit(1) si DATABASE_URL est absente', async () => {
    process.env['SERVICE_SECRET'] = 'secret-test';
    process.env['MISTRAL_API_KEY'] = 'key-test';
    // DATABASE_URL absent

    const { validateEnv } = await import('../src/lib/validate-env.js');
    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
