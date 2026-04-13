import { NextResponse } from 'next/server';

// Route de healthcheck pour le Dockerfile et docker-compose
// Répond 200 si le serveur Next.js est opérationnel
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'sportcoach-web',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
