import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { auth, signOut } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'SportCoach IA — Entraînements personnalisés par IA',
  description:
    "Générez des entraînements sportifs sur mesure grâce à l'intelligence artificielle Mistral AI",
  // RGAA 4.1: la langue est déclarée via lang="fr" sur la balise <html> ci-dessous
};

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();

  return (
    // RGAA 4.1: attribut lang obligatoire
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* RGAA 4.1: lien d'évitement pour navigation clavier */}
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        {/* RGAA 4.1: header sémantique */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <nav
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
            aria-label="Navigation principale"
          >
            <Link
              href="/"
              className="text-xl font-bold text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="SportCoach IA — Accueil"
            >
              SportCoach IA
            </Link>

            <div className="flex items-center gap-4">
              {session?.user ? (
                <>
                  <Link
                    href="/generate"
                    className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors focus:outline-none focus:underline"
                  >
                    Générer
                  </Link>
                  <Link
                    href="/workouts"
                    className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors focus:outline-none focus:underline"
                  >
                    Mes entraînements
                  </Link>
                  <span className="text-sm text-gray-400 hidden sm:block" aria-hidden="true">
                    {session.user.name ?? session.user.email}
                  </span>
                  {/* RGAA 4.1: bouton déconnexion accessible */}
                  <form
                    action={async () => {
                      'use server';
                      await signOut({ redirectTo: '/' });
                    }}
                  >
                    <button
                      type="submit"
                      aria-label="Se déconnecter"
                      className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2 py-1"
                    >
                      Déconnexion
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors focus:outline-none focus:underline"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </nav>
        </header>

        {/* RGAA 4.1: main sémantique avec id pour le skip link */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* RGAA 4.1: footer sémantique */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
            <p>SportCoach IA — Projet RNCP 39583 — Expert en développement logiciel</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
