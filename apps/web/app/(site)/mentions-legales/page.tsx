import Link from 'next/link';
import { legalInformation } from '@/lib/legal';

export const metadata = { title: 'Mentions légales - Alcide' };

export default function LegalPage() {
  const legal = legalInformation();
  return (
    <article className="mx-auto max-w-4xl space-y-6 text-zinc-100" aria-labelledby="legal-title">
      <h1 id="legal-title" className="page-title">
        Mentions légales
      </h1>
      {!legal.ready && (
        <p>
          Informations à finaliser par le responsable avant ouverture publique. Cette version reste
          en évaluation privée.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Éditeur et contact</h2>
        <p>{legal.operator ?? 'Identité et statut de l’éditeur à renseigner.'}</p>
        {legal.email ? (
          <a href={'mailto:' + legal.email} className="underline">
            {legal.email}
          </a>
        ) : (
          <p>Adresse de contact public à renseigner.</p>
        )}
        <p>
          L’éditeur doit compléter les coordonnées et mentions adaptées à son statut, notamment
          celles requises s’il exerce une activité professionnelle.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Hébergement</h2>
        <p>{legal.host ?? 'Identité de l’hébergeur à confirmer.'}</p>
        <p>{legal.hostContact ?? 'Coordonnées d’hébergement à confirmer.'}</p>
      </section>
      <p>
        <Link href="/confidentialite" className="underline">
          Confidentialité et droits
        </Link>{' '}
        ·{' '}
        <Link href="/conditions" className="underline">
          Conditions d’utilisation
        </Link>
      </p>
    </article>
  );
}
