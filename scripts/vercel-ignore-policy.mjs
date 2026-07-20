export const supportedApps = ['api', 'web'];

const sharedPaths = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/vercel-ignore-build.mjs',
  'scripts/vercel-ignore-policy.mjs',
];

const relevantPrefixes = {
  api: [
    'apps/api/api/',
    'apps/api/src/',
    'apps/api/drizzle/',
    'apps/api/public/',
    'apps/api/tests/',
    'apps/api/package.json',
    'apps/api/tsconfig',
    'apps/api/vercel.json',
    'packages/shared/src/',
    'packages/shared/package.json',
  ],
  web: [
    'apps/web/app/',
    'apps/web/components/',
    'apps/web/lib/',
    'apps/web/public/',
    'apps/web/tests/',
    'apps/web/package.json',
    'apps/web/next.config',
    'apps/web/tsconfig',
    'apps/web/tailwind.config',
    'apps/web/vercel.json',
    'packages/shared/src/',
    'packages/shared/package.json',
  ],
};

export function getIgnoreDecision({ app, vercelEnv, forceBuild, files }) {
  if (!supportedApps.includes(app)) {
    throw new Error(`Unknown app: ${app}`);
  }

  if (forceBuild === '1') {
    return { ignore: false, reason: 'Forced build: continue.' };
  }

  if (vercelEnv === 'production') {
    return {
      ignore: true,
      reason: 'Automatic Git production build ignored; GitHub Actions CD is canonical.',
    };
  }

  if (files.length === 0) {
    return { ignore: false, reason: 'Unable to determine changed files: continue.' };
  }

  const relevant = files.some(
    (file) =>
      sharedPaths.includes(file) || relevantPrefixes[app].some((prefix) => file.startsWith(prefix)),
  );

  return relevant
    ? { ignore: false, reason: `${app} source or shared configuration changed: continue.` }
    : { ignore: true, reason: `No ${app} source changes: ignore preview deployment.` };
}
