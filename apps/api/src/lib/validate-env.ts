// Validation des variables d'environnement obligatoires au demarrage.
// OWASP A05: fail-fast si la configuration critique est incomplete.

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SERVICE_SECRET',
] as const;

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
    console.error('[Startup] Variables d\'environnement manquantes :', missing);
    console.error('[Startup] Verifiez votre fichier .env ou les secrets CI/CD.');
    throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')}`);
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      console.warn(
        `[Startup] Variable optionnelle manquante : ${key} - les generations IA echoueront tant que la cle serveur n'est pas configuree.`,
      );
    }
  }

  console.info('[Startup] Variables d\'environnement validees');
}
