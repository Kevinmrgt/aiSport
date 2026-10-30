import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OWASP A05: tests du fail-fast sur les variables d'environnement obligatoires
describe('validateEnv', () => {
  const REQUIRED_VARS = ['DATABASE_URL', 'ALCIDE_DATABASE_URL', 'SERVICE_SECRET'];
  const OPTIONAL_VARS = ['OPENAI_API_KEY'];

  beforeEach(() => {
    // Supprimer toutes les vars requises avant chaque test
    for (const key of [...REQUIRED_VARS, ...OPTIONAL_VARS]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("ne leve pas d'erreur si OPENAI_API_KEY est absente", async () => {
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

  it('exige des secrets forts, une origine exacte et TLS hors boucle locale en production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://www.alcideai.fr');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:synthetic@db.example.test/app?sslmode=require');
    vi.stubEnv('SERVICE_SECRET', 'a'.repeat(64));
    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).not.toThrow();
    process.env['SERVICE_SECRET'] = 'short';
    expect(() => validateEnv()).toThrow(/SERVICE_SECRET/);
    process.env['SERVICE_SECRET'] = 'a'.repeat(64);
    process.env['FRONTEND_URL'] = 'http://www.alcideai.fr';
    expect(() => validateEnv()).toThrow(/HTTPS/);
    process.env['FRONTEND_URL'] = 'https://www.alcideai.fr';
    process.env['DATABASE_URL'] = 'postgresql://user:synthetic@db.example.test/app';
    expect(() => validateEnv()).toThrow(/TLS/);
  });

  it('ne conserve pas une URL sensible dans une erreur de configuration', async () => {
    process.env['DATABASE_URL'] = 'PRIVATE_SECRET_SENTINEL';
    process.env['SERVICE_SECRET'] = 'test-service-secret';
    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).toThrow('DATABASE_URL invalide');
    try {
      validateEnv();
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('PRIVATE_SECRET_SENTINEL');
    }
  });

  it('accepte la connexion applicative prioritaire sans DATABASE_URL et refuse tout override vide/invalide', async () => {
    process.env['SERVICE_SECRET'] = 'test-service-secret';
    process.env['ALCIDE_DATABASE_URL'] = 'postgresql://localhost/selected';
    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).not.toThrow();
    process.env['DATABASE_URL'] = 'postgresql://localhost/legacy';
    for (const value of ['', 'PRIVATE_INVALID_OVERRIDE', 'https://db.example/selected']) {
      process.env['ALCIDE_DATABASE_URL'] = value;
      expect(() => validateEnv()).toThrow(/ALCIDE_DATABASE_URL/);
    }
  });

  it('applique les exigences TLS de production a la connexion applicative choisie', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://www.alcideai.fr');
    vi.stubEnv('SERVICE_SECRET', 'a'.repeat(64));
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/legacy');
    vi.stubEnv(
      'ALCIDE_DATABASE_URL',
      'postgresql://user:PRIVATE_OVERRIDE@db.example/selected?sslmode=disable',
    );
    const { validateEnv } = await import('../src/lib/validate-env.js');
    expect(() => validateEnv()).toThrow(/ALCIDE_DATABASE_URL.*TLS/);
    process.env['ALCIDE_DATABASE_URL'] =
      'postgresql://user:PRIVATE_OVERRIDE@db.example/selected?sslmode=require';
    expect(() => validateEnv()).not.toThrow();
  });
});
