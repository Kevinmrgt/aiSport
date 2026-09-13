import type { Metadata } from 'next';
import { Barlow, Urbanist } from 'next/font/google';
import './globals.css';

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

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
