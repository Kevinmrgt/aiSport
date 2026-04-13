import Link from 'next/link';

// RGAA 4.1: page d'accueil accessible — sémantique HTML5 + contraste AA
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      {/* RGAA 4.1: hiérarchie de titres correcte */}
      <section aria-labelledby="hero-title">
        <h1 id="hero-title" className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          Votre coach sportif{' '}
          <span className="text-primary-600">personnel par IA</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl">
          Générez des entraînements sportifs personnalisés en quelques secondes grâce à{' '}
          <strong>Mistral AI</strong>. Adapté à votre niveau, vos objectifs et vos contraintes.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* RGAA 4.1: boutons avec texte explicite, pas juste icône */}
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
        >
          Générer un entraînement
        </Link>
        <Link
          href="/workouts"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-lg border-2 border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors"
        >
          Mes entraînements
        </Link>
      </div>

      {/* Section features — RGAA 4.1: section avec aria-label */}
      <section aria-label="Fonctionnalités" className="grid sm:grid-cols-3 gap-6 mt-8 w-full max-w-4xl">
        {[
          {
            icon: '🏋️',
            title: 'Personnalisé',
            desc: 'Adapté à votre sport, niveau, durée et objectifs',
          },
          {
            icon: '⚡',
            title: 'Instantané',
            desc: 'Programme généré en quelques secondes par Mistral AI',
          },
          {
            icon: '⏱️',
            title: 'Timer intégré',
            desc: 'Suivez chaque exercice avec le timer de séance',
          },
        ].map(({ icon, title, desc }) => (
          <article
            key={title}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left"
          >
            {/* RGAA 4.1: emoji décoratif masqué aux lecteurs d'écran */}
            <span aria-hidden="true" className="text-3xl">
              {icon}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
