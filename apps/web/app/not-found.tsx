import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative mx-auto grid min-h-[70vh] max-w-3xl place-items-center overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/[0.72] p-6 text-center shadow-2xl shadow-black/40">
      <Image
        src="/visuals/empty-state-glow.webp"
        alt=""
        fill
        sizes="(max-width: 768px) 90vw, 768px"
        className="-z-10 object-cover opacity-45"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/10 via-zinc-950/70 to-zinc-950" />

      <div className="max-w-md">
        <p
          aria-hidden="true"
          className="mx-auto mb-6 grid h-24 w-24 select-none place-items-center rounded-full border border-primary-300/30 bg-primary-300/10 text-4xl font-black tabular-nums text-primary-300 shadow-2xl shadow-primary-900/20"
        >
          404
        </p>
        <p className="section-kicker mb-3">Route introuvable</p>
        <h1 className="text-3xl font-black text-white">Page introuvable</h1>
        <p className="muted-copy mx-auto mt-4">
          Cette page n&apos;existe pas ou a ete supprimee.
        </p>
        <Link href="/" className="action-primary mt-8 w-full sm:w-auto">
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
