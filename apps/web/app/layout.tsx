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

  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        {/* RGAA 4.1: lien d'évitement */}
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        {/* RGAA 4.1: header sémantique */}
        <header className="bg-white border-b border-zinc-200">
          <nav
            className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between"
            aria-label="Navigation principale"
          >
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-900 tracking-tight hover:text-zinc-600 transition-colors"
              aria-label="SportCoach IA — Accueil"
            >
              SportCoach IA
            </Link>

            <div className="flex items-center gap-6">
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/generate"
                    className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    Générer
                  </Link>
                  <Link
                    href="/workouts"
                    className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    Séances
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
                      className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </nav>
        </header>

        {/* RGAA 4.1: main sémantique avec id pour le skip link */}
        <main id="main-content" className="max-w-5xl mx-auto px-6 py-12">
          {children}
        </main>

        {/* RGAA 4.1: footer sémantique */}
        <footer className="border-t border-zinc-100 mt-24">
          <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-zinc-400">
            <p>SportCoach IA — Projet RNCP 39583</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
