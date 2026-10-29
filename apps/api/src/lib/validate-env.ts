// Validation des variables d'environnement obligatoires au demarrage.
// OWASP A05: fail-fast si la configuration critique est incomplete.

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'SERVICE_SECRET'] as const;

// Optional au boot : la generation IA sera indisponible sans cle serveur.
const OPTIONAL_ENV_VARS = ['OPENAI_API_KEY'] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("[Startup] Variables d'environnement manquantes :", missing);
    console.error('[Startup] Verifiez votre fichier .env ou les secrets CI/CD.');
    throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')}`);
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(process.env['DATABASE_URL']!);
  } catch {
    throw new Error('DATABASE_URL invalide');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL doit utiliser PostgreSQL');
  }
  if (process.env['NODE_ENV'] === 'production') {
    const secret = process.env['SERVICE_SECRET']!;
    if (secret.length < 32 || /generate|change.?me|your_|example/i.test(secret)) {
      throw new Error(
        'SERVICE_SECRET doit etre genere aleatoirement et comporter au moins 32 caracteres',
      );
    }
    if (process.env['AUTH_SECRET'] === secret) {
      throw new Error('SERVICE_SECRET doit etre distinct de AUTH_SECRET');
    }
    let frontend: URL;
    try {
      frontend = new URL(process.env['FRONTEND_URL'] ?? '');
    } catch {
      throw new Error('FRONTEND_URL HTTPS requise en production');
    }
    if (
      frontend.protocol !== 'https:' ||
      frontend.username ||
      frontend.password ||
      frontend.pathname !== '/'
    ) {
      throw new Error('FRONTEND_URL doit etre une origine HTTPS exacte');
    }
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname)) {
      if (
        !['require', 'verify-full', 'verify-ca', 'prefer'].includes(
          databaseUrl.searchParams.get('sslmode') ?? '',
        )
      ) {
        throw new Error('DATABASE_URL distante exige une verification TLS en production');
      }
    }
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      console.warn(
        `[Startup] Variable optionnelle manquante : ${key} - les generations IA echoueront tant que la cle serveur n'est pas configuree.`,
      );
    }
  }

  console.info("[Startup] Variables d'environnement validees");
}
