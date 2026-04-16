import { signIn } from '@/lib/auth';

// RGAA 4.1: page de connexion accessible — labels explicites, sémantique correcte
export default function LoginPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="w-full max-w-sm text-center" aria-labelledby="login-title">
        <h1 id="login-title" className="text-2xl font-bold text-zinc-900 mb-2">
          Connexion
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          Connectez-vous pour accéder à vos entraînements.
        </p>

        {/* RGAA 4.1: formulaire avec action server-side */}
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/generate' });
          }}
        >
          {/* RGAA 4.1: bouton avec texte descriptif complet */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            {/* RGAA 4.1: SVG avec title pour lecteurs d'écran */}
            <svg
              role="img"
              aria-label="Logo GitHub"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <title>Logo GitHub</title>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continuer avec GitHub
          </button>
        </form>
      </section>
    </div>
  );
}
