import Link from 'next/link';

export function LegacyTimingNotice({
  kind,
  duration,
  sport,
}: {
  kind: 'workout' | 'program';
  duration: number;
  sport: string;
}) {
  const query = new URLSearchParams({
    duration: String(duration),
    goal: `Nouvelle séance de ${sport}`,
  });
  return (
    <aside className="glass-soft rounded-2xl p-5 text-sm">
      <p>Créé avant l’amélioration des durées. Le contenu enregistré est conservé.</p>
      <Link
        className="mt-3 inline-block font-semibold underline underline-offset-4"
        href={kind === 'workout' ? `/generate?${query}` : '/programs/generate'}
      >
        {kind === 'workout' ? 'Préparer une nouvelle séance' : 'Préparer un nouveau programme'}
      </Link>
    </aside>
  );
}
