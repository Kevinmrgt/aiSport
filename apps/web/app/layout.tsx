import type { Metadata } from 'next';
import Image from 'next/image';
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
  icons: {
    icon: '/visuals/alcide-logo-mark.svg',
  },
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
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary-300/[0.2] bg-zinc-950/[0.72] p-1.5 shadow-lg shadow-primary-400/20 transition group-hover:border-primary-300/[0.45] group-hover:bg-zinc-950/[0.9]">
        <Image
          src="/visuals/alcide-logo-mark.svg"
          alt=""
          width={28}
          height={28}
          aria-hidden="true"
          className="h-full w-full"
        />
      </span>
      <span className="leading-tight">
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
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen overflow-x-hidden bg-[#dfe8d2] font-sans text-zinc-100 antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.16] bg-[#10170f]/70 shadow-lg shadow-black/15 backdrop-blur-2xl">
          <nav
            className="mx-auto flex min-h-14 max-w-[112rem] items-center gap-4 px-4 py-2 sm:px-6 lg:px-8"
            aria-label="Navigation principale"
          >
            <BrandMark />

            <div className="hidden min-w-0 flex-1 items-center justify-start gap-1 lg:flex xl:gap-2">
              {session?.user ? (
                NAV_ITEMS.map((item) => <ActiveNavLink key={item.href} {...item} />)
              ) : (
                <>
                  <ActiveNavLink href="/" label="Accueil" icon="home" />
                  <ActiveNavLink href="/login" label="Connexion" icon="user" />
                </>
              )}
            </div>

            {session?.user ? (
              <form
                className="ml-auto"
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  aria-label="Se deconnecter"
                  className="group hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm font-bold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white sm:flex"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-zinc-200 transition group-hover:bg-sport-orange group-hover:text-zinc-950">
                    <Icon name="log-out" className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden xl:block">Sortir</span>
                </button>
              </form>
            ) : (
              <Link href="/login" className="action-primary ml-auto min-h-9 px-4 py-2 text-xs">
                Se connecter
              </Link>
            )}
          </nav>
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

        <footer className="relative z-10 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-zinc-500 lg:px-8">
            <p>Alcide - Projet RNCP 39583</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
