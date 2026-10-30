import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import type { Workout, ProgramSession } from '@alcide/shared';
import { adminApi } from '@/lib/admin-api';
import { isServerApiNotFound } from '@/lib/server-api';
import { AdminHeading, Badge, ActivityList, dateLabel } from './AdminPrimitives';
import { levels } from './ContentsPage';
function Session({ session }: { session: Workout | ProgramSession }) {
  return (
    <div className="space-y-5">
      {session.warmup?.length ? (
        <section>
          <h3 className="font-bold mb-3">Échauffement</h3>
          <ul className="space-y-3">
            {session.warmup.map((p, i) => (
              <li key={i}>
                <strong>{p.name}</strong> · {p.duration_seconds}s
                <p className="muted-copy text-sm mt-1">{p.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h3 className="font-bold mb-3">Exercices</h3>
        <ol className="space-y-4">
          {session.exercises.map((e, i) => {
            const p = e.prescription;
            return (
              <li key={i} className="glass-soft p-4">
                <h4 className="font-bold">
                  {i + 1}. {e.name}
                </h4>
                <p className="muted-copy mt-2 text-sm">{e.description}</p>
                <p className="mt-3 text-xs text-primary-200">
                  {p
                    ? p.sets +
                      ' série(s) · ' +
                      (p.reps ? p.reps + ' répétitions' : p.work_seconds + 's d’effort') +
                      ' · ' +
                      p.rest_seconds +
                      's de repos · ' +
                      p.transition_seconds +
                      's de transition' +
                      (p.circuit_id ? ' · Circuit ' + p.circuit_id : '')
                    : [
                        e.sets ? e.sets + ' série(s)' : '',
                        e.reps ? e.reps + ' répétitions' : '',
                        e.duration_seconds ? e.duration_seconds + 's' : '',
                        e.rest_seconds + 's de repos',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
                {e.tips && <p className="muted-copy mt-2 text-xs">{e.tips}</p>}
              </li>
            );
          })}
        </ol>
      </section>
      {session.cooldown?.length ? (
        <section>
          <h3 className="font-bold mb-3">Retour au calme</h3>
          <ul className="space-y-3">
            {session.cooldown.map((p, i) => (
              <li key={i}>
                <strong>{p.name}</strong> · {p.duration_seconds}s
                <p className="muted-copy text-sm mt-1">{p.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
export async function ContentDetailPage({
  params,
  kind,
}: {
  params: Promise<{ id: string }>;
  kind: 'workouts' | 'programs';
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const result = await adminApi.content(kind, id).catch((error: unknown) => {
    if (isServerApiNotFound(error)) notFound();
    throw error;
  });
  const c = result.content,
    d = result.data;
  return (
    <>
      <AdminHeading
        eyebrow={kind === 'workouts' ? 'Séance · Consultation' : 'Programme · Consultation'}
        title={c.title}
        description={
          c.sport +
          ' · ' +
          (levels[c.difficulty] ?? c.difficulty) +
          ' · ' +
          c.durationMinutes +
          ' min' +
          (c.weeksCount ? ' par séance · ' + c.weeksCount + ' semaines' : '')
        }
      >
        <Badge tone="neutral">Consultation</Badge>
      </AdminHeading>
      <section className="admin-panel mb-6">
        <p>
          Membre :{' '}
          <Link
            prefetch={false}
            className="underline text-primary-200"
            href={'/admin/membres/' + c.userId}
          >
            {c.name ?? c.email}
          </Link>
        </p>
        <p className="muted-copy text-xs mt-2">
          Créé le {dateLabel(c.createdAt)} · {c.completedCount} séances terminées enregistrées
        </p>
      </section>
      <section className="admin-panel">
        {'weeks' in d ? (
          <>
            <h2 className="mb-3">Progression du programme</h2>
            <p className="muted-copy mb-6">{d.progression_summary}</p>
            {d.weeks.map((week) => (
              <details
                key={week.week_number}
                className="glass-soft p-5 mb-4"
                open={week.week_number === 1}
              >
                <summary className="cursor-pointer font-bold">
                  Semaine {week.week_number} · {week.theme}
                </summary>
                <p className="muted-copy my-4">{week.objective}</p>
                {week.sessions.map((session) => (
                  <details key={session.session_number} className="border-t border-white/10 py-4">
                    <summary className="cursor-pointer font-bold">
                      Séance {session.session_number} · {session.title}
                    </summary>
                    <p className="muted-copy my-4">
                      {session.focus} · {session.duration_minutes} min
                    </p>
                    <Session session={session} />
                  </details>
                ))}
              </details>
            ))}
          </>
        ) : (
          <Session session={d} />
        )}
      </section>
      <section className="admin-panel mt-6">
        <h2 className="mb-3">10 dernières activités liées</h2>
        <ActivityList items={result.recentActivity} />
      </section>
    </>
  );
}
