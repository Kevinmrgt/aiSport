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
        <p>
          Adresse de domiciliation :{' '}
          {legal.operatorAddress ?? 'adresse de domiciliation à renseigner.'}
        </p>
        <p>Immatriculation : {legal.registration ?? 'immatriculation à renseigner.'}</p>
        {legal.vatNumber && <p>Numéro de TVA intracommunautaire : {legal.vatNumber}</p>}
        {legal.email ? (
          <a href={'mailto:' + legal.email} className="underline">
            {legal.email}
          </a>
        ) : (
          <p>Adresse de contact public à renseigner.</p>
        )}
        {legal.phone && legal.phoneHref ? (
          <p>
            Téléphone :{' '}
            <a href={legal.phoneHref} className="underline">
              {legal.phone}
            </a>
          </p>
        ) : (
          <p>Téléphone de contact public à renseigner.</p>
        )}
        <p>
          Directeur de la publication :{' '}
          {legal.publicationDirector ?? 'directeur de la publication à renseigner.'}
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Hébergement</h2>
        <p>{legal.host ?? 'Identité de l’hébergeur à confirmer.'}</p>
        <p>{legal.hostContact ?? 'Coordonnées d’hébergement à confirmer.'}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Stockage des données</h2>
        <p>{legal.dataHost ?? 'Identité du fournisseur de stockage des données à confirmer.'}</p>
        <p>
          {legal.dataHostContact ?? 'Adresse du fournisseur de stockage des données à confirmer.'}
        </p>
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
