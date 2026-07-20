export interface ReadinessResult {
  ready: boolean;
  checks: {
    database: 'ok' | 'unavailable';
    aiConfiguration: 'ok' | 'missing';
  };
}

/** Verifie les dependances necessaires sans exposer de secret ni d'erreur interne. */
export async function checkReadiness(): Promise<ReadinessResult> {
  const aiConfiguration = process.env['OPENAI_API_KEY'] ? 'ok' : 'missing';
  let database: ReadinessResult['checks']['database'] = 'unavailable';

  try {
    // Import differe : /health reste une sonde de vie sans acces aux dependances.
    const { pool } = await import('../db/index.js');
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        pool.query('select 1'),
        new Promise<never>((_resolve, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Timeout de la verification PostgreSQL')),
            3_000,
          );
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    database = 'ok';
  } catch (error) {
    console.error('[Readiness] Verification PostgreSQL echouee', {
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ready: database === 'ok' && aiConfiguration === 'ok',
    checks: { database, aiConfiguration },
  };
}
