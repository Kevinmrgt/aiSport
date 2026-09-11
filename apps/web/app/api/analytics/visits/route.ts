import { NextResponse } from 'next/server';

function apiUrl(): string {
  return process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
}

function requestComesFromThisSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === new URL(request.url).origin;
}

export async function POST(request: Request): Promise<Response> {
  if (!requestComesFromThisSite(request)) {
    return NextResponse.json({ message: 'Origine non autorisée.' }, { status: 403 });
  }

  try {
    const response = await fetch(`${apiUrl()}/analytics/visits`, {
      method: 'POST',
      headers: {
        'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[VisitTracker] Enregistrement impossible', { status: response.status });
    }
  } catch (error) {
    // La navigation ne doit jamais être dégradée par une mesure agrégée de fréquentation.
    console.warn('[VisitTracker] Service indisponible', { error });
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
