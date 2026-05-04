import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { auth, signOut } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'SportCoach IA — Entraînements personnalisés par IA',
  description:
    "Générez des entraînements sportifs sur mesure grâce à l'intelligence artificielle Mistral AI",
};

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();

  const navLink =
    'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';

  return (
    <html lang="fr">
      <body className="min-h-screen overflow-x-hidden bg-ink text-zinc-100 antialiased">
        {/* RGAA 4.1: lien d'évitement */}
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        {/* RGAA 4.1: header sémantique */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
          <nav
            className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6"
            aria-label="Navigation principale"
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-sm font-black tracking-tight text-white transition-colors hover:text-primary-300"
              aria-label="SportCoach IA — Accueil"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-300 text-sm text-zinc-950 shadow-lg shadow-primary-400/20">
                SC
              </span>
              <span>SportCoach IA</span>
            </Link>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className={navLink}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/generate"
                    className={navLink}
                  >
                    Générer
                  </Link>
                  <Link
                    href="/programs"
                    className={navLink}
                  >
                    Programmes
                  </Link>
                  <Link
                    href="/workouts"
                    className={navLink}
                  >
                    Séances
                  </Link>
                  <Link
                    href="/settings"
                    className={navLink}
                  >
                    IA
                  </Link>
                  <form
                    action={async () => {
                      'use server';
                      await signOut({ redirectTo: '/' });
                    }}
                  >
                    <button
                      type="submit"
                      aria-label="Se déconnecter"
                      className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      Déconnexion
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="action-primary"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </nav>
        </header>

        {/* RGAA 4.1: main sémantique avec id pour le skip link */}
        <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-12 lg:px-6">
          {children}
        </main>

        {/* RGAA 4.1: footer sémantique */}
        <footer className="mt-24 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-6 text-center text-xs text-zinc-400 lg:px-6">
            <p>SportCoach IA — Projet RNCP 39583</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
