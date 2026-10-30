import { auth } from '@/lib/auth';
import { serverApi, ServerApiError } from '@/lib/server-api';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json(
      { error: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'no-store, private' } },
    );
  try {
    const data = await serverApi.exportAccount();
    return Response.json(data, {
      headers: {
        'Cache-Control': 'no-store, private',
        'Content-Disposition': 'attachment; filename="alcide-donnees.json"',
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'EXPORT_UNAVAILABLE',
        message: 'Export indisponible. Réessayez ou contactez le responsable.',
      },
      {
        status: error instanceof ServerApiError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store, private' },
      },
    );
  }
}
