import { NextResponse } from 'next/server';

// Route de healthcheck pour le Dockerfile et docker-compose
// Répond 200 si le serveur Next.js est opérationnel
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'sportcoach-web',
      timestamp: new Date().toISOString(),
      version:
        process.env['NEXT_PUBLIC_APP_VERSION'] ??
        process.env['npm_package_version'] ??
        '0.12.0',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
