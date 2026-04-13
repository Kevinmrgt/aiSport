import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';

// OWASP A01: route protégée
export default async function WorkoutsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // TODO: récupérer les workouts via api-client avec le token de session
  // Pour l'instant, page vide avec CTA de génération

  return (
    <section aria-labelledby="workouts-title">
      <h1 id="workouts-title" className="text-3xl font-bold text-gray-900 mb-8">
        Mes entraînements
      </h1>

      {/* État vide — RGAA 4.1: message explicite et action claire */}
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
        <p aria-hidden="true" className="text-5xl mb-4">🏃</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun entraînement pour l&apos;instant
        </h2>
        <p className="text-gray-600 mb-6">
          Générez votre premier programme personnalisé par IA.
        </p>
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
        >
          Générer un entraînement
        </Link>
      </div>
    </section>
  );
}
