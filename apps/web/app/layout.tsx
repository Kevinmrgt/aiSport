import type { Metadata } from 'next';
import Link from 'next/link';
import { Barlow_Condensed, Urbanist } from 'next/font/google';
import './globals.css';
import { auth, signOut } from '@/lib/auth';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ActiveNavLink } from '@/components/ActiveNavLink';

const bodyFont = Urbanist({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
});

const displayFont = Barlow_Condensed({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Alcide - Coaching sportif premium',
  description:
    'Alcide prepare des seances et programmes sportifs personnalises avec une interface d entrainement immersive.',
};

const NAV_ITEMS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Progression', icon: 'chart' },
  { href: '/generate', label: 'Seance', icon: 'zap' },
  { href: '/programs', label: 'Programmes', icon: 'layers' },
  { href: '/workouts', label: 'Historique', icon: 'activity' },
  { href: '/settings', label: 'Coach', icon: 'settings' },
];

function BrandMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3 text-sm font-black tracking-normal text-white transition-colors hover:text-primary-200"
      aria-label="Alcide - Accueil"
    >
      <span className="grid h-11 w-11 place-items-center rounded-[1.2rem] bg-primary-300 text-base text-zinc-950 shadow-2xl shadow-primary-400/25">
        A
      </span>
      <span className="leading-tight lg:hidden xl:inline">
        Alcide
        <span className="block text-xs font-bold uppercase tracking-[0.22em] text-primary-300">
          Pulse
        </span>
      </span>
    </Link>
  );
}

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen overflow-x-hidden bg-ink font-sans text-zinc-100 antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        <div className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/[0.55] backdrop-blur-2xl lg:hidden">
          <nav
            className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3"
            aria-label="Navigation principale"
          >
            <BrandMark />
            {session?.user ? (
              <Link href="/generate" className="action-primary min-h-10 px-4 py-2 text-xs">
                Nouvelle seance
              </Link>
            ) : (
              <Link href="/login" className="action-primary min-h-10 px-4 py-2 text-xs">
                Se connecter
              </Link>
            )}
          </nav>
        </div>

        <header className="fixed left-5 top-5 z-50 hidden h-[calc(100vh-2.5rem)] w-20 flex-col items-center justify-between rounded-[2rem] border border-white/[0.12] bg-zinc-950/[0.55] p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:flex xl:w-64 xl:items-stretch">
          <div className="space-y-8">
            <div className="flex justify-center xl:justify-start">
              <BrandMark />
            </div>

            <nav className="flex flex-col gap-2" aria-label="Navigation principale">
              {session?.user ? (
                NAV_ITEMS.map((item) => <ActiveNavLink key={item.href} {...item} />)
              ) : (
                <>
                  <ActiveNavLink href="/" label="Accueil" icon="home" />
                  <ActiveNavLink href="/login" label="Connexion" icon="user" />
                </>
              )}
            </nav>
          </div>

          {session?.user ? (
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
              className="flex justify-center xl:justify-start"
            >
              <button
                type="submit"
                aria-label="Se deconnecter"
                className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/[0.1] hover:text-white"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-zinc-200 transition group-hover:bg-sport-orange group-hover:text-zinc-950">
                  <Icon name="log-out" className="h-4 w-4" />
                </span>
                <span className="hidden xl:block">Sortir</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className="action-primary hidden xl:flex">
              Se connecter
            </Link>
          )}
        </header>

        {session?.user && (
          <nav className="bottom-dock" aria-label="Navigation mobile">
            {NAV_ITEMS.map((item) => (
              <ActiveNavLink key={item.href} {...item} compact />
            ))}
          </nav>
        )}

        <main id="main-content" className="app-container">
          {children}
        </main>

        <footer className="relative z-10 border-t border-white/10 lg:ml-28 xl:ml-80">
          <div className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-zinc-500 lg:px-8">
            <p>Alcide - Projet RNCP 39583</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
