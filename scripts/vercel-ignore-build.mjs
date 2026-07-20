import { execSync } from 'node:child_process';

import { getIgnoreDecision, supportedApps } from './vercel-ignore-policy.mjs';

const app = process.argv[2];

if (!supportedApps.includes(app)) {
  console.error(`[vercel-ignore] Unknown app: ${app}`);
  process.exit(1);
}

function changedFiles() {
  const candidates = ['git diff --name-only HEAD^ HEAD', 'git diff --name-only origin/main...HEAD'];

  for (const command of candidates) {
    try {
      const files = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (files.length > 0) {
        console.log(`[vercel-ignore] Changed files source: ${command}`);
        return files;
      }
    } catch {
      // Try the next strategy.
    }
  }

  return [];
}

const files = changedFiles();

const decision = getIgnoreDecision({
  app,
  vercelEnv: process.env.VERCEL_ENV,
  forceBuild: process.env.VERCEL_FORCE_BUILD,
  files,
});

console.log(`[vercel-ignore] ${decision.reason}`);
process.exit(decision.ignore ? 0 : 1);
