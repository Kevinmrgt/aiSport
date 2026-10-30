const REQUIRED_JOBS = ['migrate-db', 'deploy-api', 'deploy-web'];
const SUCCESS_GATE = "github.event.workflow_run.conclusion == 'success'";
const ENABLED_GATE = "vars.ENABLE_GHA_VERCEL_CD == 'true'";

export function shouldRunProductionCd({ conclusion, enabled }) {
  return conclusion === 'success' && enabled === true;
}

function jobBlock(source, jobName) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${jobName}:`);
  if (start === -1) return '';

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [a-z0-9-]+:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

export function validateProductionCdWorkflow(source) {
  const problems = [];

  if (!/^  workflow_run:$/m.test(source)) {
    problems.push('le CD doit être déclenché par workflow_run');
  }
  if (!/^    workflows: \['CI - Alcide'\]$/m.test(source)) {
    problems.push('le CD doit écouter uniquement CI - Alcide');
  }
  if (!/^    branches: \[main\]$/m.test(source)) {
    problems.push('le CD de production doit être limité à main');
  }
  if (!/^    types: \[completed\]$/m.test(source)) {
    problems.push('le CD doit attendre la fin de la CI');
  }
  if (/^  workflow_dispatch:/m.test(source)) {
    problems.push('le CD ne doit pas proposer de contournement workflow_dispatch');
  }
  if (!/^  group: production-database-release$/m.test(source)) {
    problems.push('verrou de workflow production commun absent');
  }
  if (!source.includes('node scripts/cd-release-preflight.mjs') ||
      !source.includes('node scripts/db-migrate-locked.mjs')) {
    problems.push('preflight et verrou PostgreSQL obligatoires');
  }
  if (!source.includes('Preserve encrypted backup before changing production')) {
    problems.push('sauvegarde chiffree avant migration obligatoire');
  }
  for (const component of ['api', 'web']) {
    const block = jobBlock(source, `deploy-${component}`);
    if (!block.includes('cd-health-check.mjs "${DEPLOYMENT_URL}') ||
        !block.includes(`cd-health-check.mjs "$${component.toUpperCase()}_HEALTH_URL"`) ||
        !block.includes('--env "APP_REVISION=${APP_REVISION}"')) {
      problems.push(`verification JSON/SHA du build et alias obligatoire: ${component}`);
    }
  }

  for (const jobName of REQUIRED_JOBS) {
    const block = jobBlock(source, jobName);
    if (!block) {
      problems.push(`job obligatoire absent : ${jobName}`);
      continue;
    }
    if (!block.includes(SUCCESS_GATE) || !block.includes(ENABLED_GATE)) {
      problems.push(`gate success/activation absente : ${jobName}`);
    }
    if (!block.includes('github.event.workflow_run.head_sha')) {
      problems.push(`checkout non lié au SHA de la CI : ${jobName}`);
    }
    if (block.includes('continue-on-error: true')) {
      problems.push(`continue-on-error interdit : ${jobName}`);
    }
  }

  return problems;
}

export function validateDatabaseMaintenanceWorkflow(source) {
  const problems = [];
  if (!source.includes('default: verify')) problems.push('verification read-only obligatoire par defaut');
  if (!source.includes('group: production-database-release')) problems.push('verrou commun CD/migration absent');
  const migration = source.split('      - name: Apply production migrations under the database advisory lock')[1]?.split('      - name:')[0] ?? '';
  if (!migration.includes("if: inputs.mode == 'migrate'") || !migration.includes('db-migrate-locked.mjs')) {
    problems.push('ecriture production non isolee dans le mode migrate');
  }
  if (!source.includes('head_branch == "main"') || !source.includes('cd-release-preflight.mjs')) {
    problems.push('CI de main et preuves de release requises avant migration');
  }
  if (source.includes('release.dump\n')) problems.push('dump clair interdit dans les artefacts');
  return problems;
}
