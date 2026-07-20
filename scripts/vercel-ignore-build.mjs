import { execSync } from "node:child_process";

const app = process.argv[2];

if (!["api", "web"].includes(app)) {
  console.error(`[vercel-ignore] Unknown app: ${app}`);
  process.exit(1);
}

if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_FORCE_BUILD === "1") {
  console.log("[vercel-ignore] Production or forced build: continue.");
  process.exit(1);
}

function changedFiles() {
  const candidates = [
    "git diff --name-only HEAD^ HEAD",
    "git diff --name-only origin/main...HEAD",
  ];

  for (const command of candidates) {
    try {
      const files = execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
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

if (files.length === 0) {
  console.log("[vercel-ignore] Unable to determine changed files: continue.");
  process.exit(1);
}

const relevantPrefixes = {
  api: [
    "apps/api/api/",
    "apps/api/src/",
    "apps/api/drizzle/",
    "apps/api/public/",
    "apps/api/tests/",
    "apps/api/package.json",
    "apps/api/tsconfig",
    "packages/shared/src/",
    "packages/shared/package.json",
  ],
  web: [
    "apps/web/app/",
    "apps/web/components/",
    "apps/web/lib/",
    "apps/web/public/",
    "apps/web/tests/",
    "apps/web/package.json",
    "apps/web/next.config",
    "apps/web/tsconfig",
    "apps/web/tailwind.config",
    "packages/shared/src/",
    "packages/shared/package.json",
  ],
};

const relevant = files.some((file) => relevantPrefixes[app].some((prefix) => file.startsWith(prefix)));

if (relevant) {
  console.log(`[vercel-ignore] ${app} source changed: continue.`);
  process.exit(1);
}

console.log(`[vercel-ignore] No ${app} source changes: ignore preview deployment.`);
process.exit(0);
