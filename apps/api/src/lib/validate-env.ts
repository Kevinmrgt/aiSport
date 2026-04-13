// Validation des variables d'environnement obligatoires au démarrage
// OWASP A05: fail-fast si la configuration est incomplète plutôt que de
// démarrer dans un état non sécurisé (ex: SERVICE_SECRET manquant)

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SERVICE_SECRET',
  'MISTRAL_API_KEY',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('[Startup] Variables d\'environnement manquantes :', missing);
    console.error('[Startup] Vérifiez votre fichier .env ou les secrets CI/CD.');
    process.exit(1);
  }

  console.info('[Startup] Variables d\'environnement validées ✓');
}
