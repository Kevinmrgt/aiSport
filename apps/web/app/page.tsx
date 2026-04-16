import Link from 'next/link';

// RGAA 4.1: page d'accueil accessible — sémantique HTML5 + contraste AA
export default function HomePage() {
  return (
    <section
      aria-labelledby="hero-title"
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <h1
        id="hero-title"
        className="text-5xl sm:text-7xl font-bold tracking-tight text-zinc-900 leading-none"
      >
        Votre coach sportif
        <br />
        <span className="text-zinc-400">par IA</span>
      </h1>

      <p className="mt-6 text-lg text-zinc-500 max-w-md">
        Générez des entraînements personnalisés en quelques secondes grâce à Mistral AI.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        {/* RGAA 4.1: boutons avec texte explicite */}
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Générer un entraînement
        </Link>
        <Link
          href="/workouts"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-zinc-300 text-zinc-900 text-sm font-medium hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
        >
          Mes séances
        </Link>
      </div>
    </section>
  );
}
