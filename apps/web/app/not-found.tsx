import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="glass-panel mx-auto grid min-h-[60vh] max-w-3xl place-items-center p-8 text-center">
      <div className="max-w-md">
        <p
          aria-hidden="true"
          className="mx-auto mb-6 grid h-24 w-24 select-none place-items-center rounded-full border border-primary-300/30 bg-primary-300/10 text-4xl font-black tabular-nums text-primary-300 shadow-2xl shadow-primary-900/20"
        >
          404
        </p>
        <h1 className="text-3xl font-black text-white">Page introuvable</h1>
        <p className="muted-copy mx-auto mt-4">Cette page n&apos;existe pas ou a ete supprimee.</p>
        <Link href="/" className="action-primary mt-8 w-full sm:w-auto">
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
