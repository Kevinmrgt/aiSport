import { signIn } from '@/lib/auth';

// RGAA 4.1: page de connexion accessible — labels explicites, sémantique correcte
export default function LoginPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="surface w-full max-w-sm p-6 text-center" aria-labelledby="login-title">
        <p className="section-kicker mb-2">Accès coach</p>
        <h1 id="login-title" className="text-3xl font-black text-white mb-2">
          Connexion
        </h1>
        <p className="muted-copy mb-8">
          Connectez-vous pour accéder à vos entraînements.
        </p>

        {/* RGAA 4.1: formulaire avec action server-side */}
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/generate' });
          }}
        >
          {/* RGAA 4.1: bouton avec texte descriptif complet */}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-primary-300 px-4 py-2.5 text-center text-sm font-black leading-tight text-zinc-950 transition-colors hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            {/* RGAA 4.1: SVG avec title pour lecteurs d'écran */}
            <svg
              role="img"
              aria-label="Logo Google"
              className="w-4 h-4"
              viewBox="0 0 24 24"
            >
              <title>Logo Google</title>
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v2.96h3.89c2.27-2.09 3.53-5.17 3.53-8.83z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-2.96c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.27v3.05A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.29 14.34a7.23 7.23 0 0 1 0-4.68V6.61H1.27a12 12 0 0 0 0 10.78l4.02-3.05z" />
              <path fill="#EA4335" d="M12 4.71c1.76 0 3.34.6 4.58 1.79l3.45-3.45A11.56 11.56 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.02 3.05C6.23 6.82 8.88 4.71 12 4.71z" />
            </svg>
            Continuer avec Google
          </button>
        </form>
      </section>
    </div>
  );
}
