import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

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
    { path: './fonts/Barlow-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/Barlow-Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/Barlow-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: './fonts/Barlow-Black.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
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
