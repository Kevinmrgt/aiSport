import { NextResponse } from 'next/server';

// Route de healthcheck pour le Dockerfile et docker-compose
// Répond 200 si le serveur Next.js est opérationnel
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'alcide-web',
      revision: (() => {
        const candidate = process.env['APP_REVISION'] ?? process.env['VERCEL_GIT_COMMIT_SHA'];
        return candidate && /^[a-f0-9]{40}$/i.test(candidate) ? candidate.toLowerCase() : null;
      })(),
      timestamp: new Date().toISOString(),
      version:
        process.env['NEXT_PUBLIC_APP_VERSION'] ??
        process.env['npm_package_version'] ??
        '0.13.0-rc.8',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
