import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Timer } from '@/components/Timer';

interface WorkoutPageProps {
  params: { id: string };
}

// OWASP A01: route protégée + le backend vérifiera l'ownership
export default async function WorkoutDetailPage({ params }: WorkoutPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // TODO: charger le workout via api-client avec vérification d'ownership backend
  // Pour l'instant, page de démonstration avec un workout fictif
  const workoutId = params.id;

  if (!workoutId) {
    notFound();
  }

  // Exemple de données pour la démo du timer
  const mockExercises = [
    {
      name: 'Échauffement — Footing léger',
      description: 'Course à allure très confortable, respiration nasale',
      duration_seconds: 300,
      rest_seconds: 30,
      tips: 'Maintenez une cadence où vous pouvez tenir une conversation',
    },
    {
      name: 'Intervalles courts',
      description: 'Accélération à 80% de votre VMA pendant 30 secondes',
      duration_seconds: 30,
      rest_seconds: 60,
      tips: 'Gardez un appui actif au sol, bras décontractés',
    },
    {
      name: 'Retour au calme',
      description: 'Footing très lent puis marche progressive',
      duration_seconds: 180,
      rest_seconds: 0,
      tips: 'Respirez profondément pour abaisser la fréquence cardiaque',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <nav aria-label="Fil d'Ariane" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/workouts" className="hover:text-primary-600">
              Mes entraînements
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 font-medium" aria-current="page">
            Séance en cours
          </li>
        </ol>
      </nav>

      <Timer exercises={mockExercises} />
    </div>
  );
}
