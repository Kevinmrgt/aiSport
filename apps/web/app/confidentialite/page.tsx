import type { Metadata } from 'next';
import Link from 'next/link';
import { GlassPanel } from '@/components/PremiumPrimitives';

export const metadata: Metadata = {
  title: 'Confidentialité - Alcide',
  description: 'Informations sur les données personnelles traitées par le prototype Alcide.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-6" aria-labelledby="privacy-title">
      <header className="abstract-surface rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
        <p className="section-kicker mb-3">Données personnelles</p>
        <h1 id="privacy-title" className="page-title">
          Confidentialité
        </h1>
        <p className="muted-copy mt-4 max-w-3xl">
          Alcide est un prototype de coaching sportif. Cette page décrit les traitements réellement
          présents dans l&apos;application ; elle ne prétend pas offrir des fonctions encore absentes.
        </p>
      </header>

      <GlassPanel className="space-y-7 p-5 sm:p-8">
        <section aria-labelledby="data-title">
          <h2 id="data-title" className="text-2xl font-black text-white">
            Données traitées
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">
            <li>identifiant, nom et adresse e-mail fournis lors de la connexion Google ;</li>
            <li>
              séances et programmes générés, objectifs, sport, niveau et contraintes saisies ;
            </li>
            <li>
              journaux de séance : durée, effort perçu, ressenti, notes libres et éventuelles notes
              de douleur ;
            </li>
            <li>dates de création et de réalisation nécessaires à l&apos;historique.</li>
          </ul>
        </section>

        <section aria-labelledby="purpose-title">
          <h2 id="purpose-title" className="text-2xl font-black text-white">
            Finalités et destinataires
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Ces données servent à authentifier le compte, générer et conserver les entraînements,
            afficher la progression et enregistrer le ressenti. Google intervient pour la connexion,
            l&apos;infrastructure PostgreSQL conserve les données applicatives et OpenAI traite les
            informations envoyées lors d&apos;une demande de génération. Les notes de suivi ne sont
            pas envoyées à OpenAI par le parcours actuel.
          </p>
        </section>

        <section aria-labelledby="sensitive-title">
          <h2 id="sensitive-title" className="text-2xl font-black text-white">
            Notes de douleur
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Une note de douleur peut révéler une information sensible. Sa saisie est facultative :
            n&apos;indiquez que ce qui est utile au suivi sportif. Alcide ne remplace ni un diagnostic
            ni l&apos;avis d&apos;un professionnel de santé.
          </p>
        </section>

        <section aria-labelledby="retention-title">
          <h2 id="retention-title" className="text-2xl font-black text-white">
            Conservation actuelle
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Aucune durée de conservation automatique n&apos;est encore configurée dans ce prototype.
            Les données restent donc conservées en base tant qu&apos;elles ne sont pas supprimées par
            le responsable du projet. Ce point doit être défini avant toute mise en production
            réelle.
          </p>
        </section>

        <section aria-labelledby="rights-title">
          <h2 id="rights-title" className="text-2xl font-black text-white">
            Vos droits et contact
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données,
            ainsi que la limitation du traitement. L&apos;application ne propose pas encore
            d&apos;export du compte ni de suppression globale en libre-service. Contactez le
            responsable du projet par le canal privé qui vous a transmis l&apos;accès à Alcide.
            Aucune adresse de contact dédiée n&apos;est actuellement publiée ; ne placez pas de
            donnée sensible dans une issue publique.
          </p>
        </section>

        <p className="border-t border-white/10 pt-5 text-xs text-zinc-400">
          Information mise à jour le 20 juillet 2026. Pour revenir au service, consultez{' '}
          <Link href="/" className="font-bold text-primary-300 underline underline-offset-4">
            l&apos;accueil Alcide
          </Link>
          .
        </p>
      </GlassPanel>
    </article>
  );
}
