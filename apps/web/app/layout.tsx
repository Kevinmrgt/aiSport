import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SportCoach IA — Entraînements personnalisés par IA',
  description:
    "Générez des entraînements sportifs sur mesure grâce à l'intelligence artificielle Mistral AI",
  // RGAA 4.1: la langue est déclarée via lang="fr" sur la balise <html> ci-dessous
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
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
            <a
              href="/"
              className="text-xl font-bold text-primary-600 hover:text-primary-700"
              aria-label="SportCoach IA — Accueil"
            >
              SportCoach IA
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/generate"
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                Générer un entraînement
              </a>
              <a
                href="/workouts"
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                Mes entraînements
              </a>
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
