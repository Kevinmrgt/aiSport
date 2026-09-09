import type { Metadata } from 'next';
import Link from 'next/link';
import { Barlow, Urbanist } from 'next/font/google';
import './globals.css';
import { auth, signOut } from '@/lib/auth';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ActiveNavLink } from '@/components/ActiveNavLink';
import { RouteBackdrop } from '@/components/RouteBackdrop';
import { isLocalPreview } from '@/lib/local-preview';

const bodyFont = Urbanist({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
});
const displayFont = Barlow({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Alcide — Coaching sportif',
  description:
    'Créez vos séances et programmes sportifs, suivez votre entraînement et votre progression.',
  icons: { icon: '/visuals/alcide-logo-mark.svg' },
};

const NAV_ITEMS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Progression', icon: 'chart' },
  { href: '/generate', label: 'Séance', icon: 'zap' },
  { href: '/programs', label: 'Programmes', icon: 'layers' },
  { href: '/workouts', label: 'Historique', icon: 'activity' },
  { href: '/settings', label: 'Coach', icon: 'settings' },
];

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="fr">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans antialiased`}>
        <RouteBackdrop />
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <header className="site-header">
          <nav className="site-nav" aria-label="Navigation principale">
            <Link href="/" className="brand" aria-label="Alcide - Accueil">
              Alcide
            </Link>
            <div className="desktop-nav">
              {session?.user ? (
                NAV_ITEMS.map((item) => <ActiveNavLink key={item.href} {...item} />)
              ) : (
                <>
                  <Link href="/#approche" className="nav-link">
                    L’approche
                  </Link>
                  <Link href="/programs" className="nav-link">
                    Les programmes
                  </Link>
                </>
              )}
            </div>
            {session?.user ? (
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button type="submit" aria-label="Se deconnecter" className="header-account">
                  <span className="hidden sm:inline">Se déconnecter</span>
                  <Icon name="log-out" className="h-5 w-5 sm:hidden" />
                </button>
              </form>
            ) : (
              <Link href="/login" className="header-account">
                Se connecter
              </Link>
            )}
          </nav>
        </header>
        <main id="main-content" tabIndex={-1} className="app-container">
          {children}
        </main>
        <footer className="site-footer">
          <span>{isLocalPreview() ? 'Aperçu local · données de démonstration' : 'Alcide'}</span>
          <Link href="/confidentialite">Confidentialité et données personnelles</Link>
        </footer>
        {session?.user && (
          <nav className="bottom-dock" aria-label="Navigation mobile">
            {NAV_ITEMS.map((item) => (
              <ActiveNavLink key={item.href} {...item} compact />
            ))}
          </nav>
        )}
      </body>
    </html>
  );
}
