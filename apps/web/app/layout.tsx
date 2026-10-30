import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import './globals.css';
import { auth, signOut } from '@/lib/auth';
import { type IconName } from '@/components/ui/Icon';
import { ActiveNavLink } from '@/components/ActiveNavLink';
import { SessionSignOut } from '@/components/SessionSignOut';

const bodyFont = localFont({
  src: [
    { path: './fonts/Urbanist-Variable.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Urbanist-Variable.ttf', weight: '500', style: 'normal' },
    { path: './fonts/Urbanist-Variable.ttf', weight: '600', style: 'normal' },
    { path: './fonts/Urbanist-Variable.ttf', weight: '700', style: 'normal' },
    { path: './fonts/Urbanist-Variable.ttf', weight: '800', style: 'normal' },
    { path: './fonts/Urbanist-Variable.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-sans',
});

const displayFont = localFont({
  src: [
    { path: './fonts/BarlowCondensed-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/BarlowCondensed-Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/BarlowCondensed-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: './fonts/BarlowCondensed-Black.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.alcideai.fr'),
  title: 'Alcide - Entraînements sportifs personnalisés',
  description:
    'Alcide prepare des seances et programmes sportifs personnalises avec une interface d entrainement immersive.',
  icons: {
    icon: '/visuals/alcide-logo-mark.svg',
  },
  openGraph: {
    title: 'Alcide — Entraînements sportifs personnalisés',
    description:
      'Préparez une séance ou un programme, suivez le minuteur et retrouvez votre progression.',
    url: 'https://www.alcideai.fr',
    locale: 'fr_FR',
    type: 'website',
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
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary-300/[0.2] bg-zinc-950/[0.72] p-1 shadow-lg shadow-primary-400/20 transition group-hover:border-primary-300/[0.45] group-hover:bg-zinc-950/[0.9]">
        <Image
          src="/visuals/alcide-logo-mark.svg"
          alt=""
          width={36}
          height={36}
          aria-hidden="true"
          className="h-full w-full"
        />
      </span>
      <span className="leading-tight">
        Alcide{' '}
        <span className="block text-xs font-bold uppercase tracking-[0.22em] text-primary-300">
          Pulse
        </span>
      </span>
      <span className="sr-only"> — Accueil</span>
    </Link>
  );
}

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr">
      <body
        data-timer-session={
          session?.user?.authIssuedAt ? String(session.user.authIssuedAt) : undefined
        }
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen overflow-x-hidden bg-[#dfe8d2] font-sans text-zinc-100 antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>

        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.16] bg-[#10170f]/90 shadow-lg shadow-black/15 backdrop-blur-2xl">
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
              <SessionSignOut
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              />
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

        <main id="main-content" tabIndex={-1} className="app-container">
          {children}
        </main>

        <footer className="relative z-10 border-t border-zinc-950/10 bg-[#dfe8d2]/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-5 py-6 text-center text-xs font-medium text-zinc-700 lg:px-8">
            <p>Alcide</p>
            <Link
              href="/confidentialite"
              className="mt-2 inline-block font-bold text-zinc-800 underline underline-offset-4 hover:text-zinc-950"
            >
              Confidentialité et données personnelles
            </Link>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Link href="/mentions-legales" className="font-bold underline underline-offset-4">
                Mentions légales
              </Link>
              <Link href="/conditions" className="font-bold underline underline-offset-4">
                Conditions d’utilisation
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
