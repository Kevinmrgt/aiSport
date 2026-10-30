import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const method = (session.user as { authMethod?: string }).authMethod;
  const state = await serverFetch<{ suspended: boolean }>('/account/status');
  if (!state.suspended) redirect('/dashboard');
  return (
    <section className="glass-panel panel-padding mx-auto max-w-2xl">
      <p className="section-kicker">Accès au compte</p>
      <h1 className="page-title mt-3">Votre compte est suspendu</h1>
      <p className="muted-copy mt-5">
        Votre accès aux fonctionnalités sportives est temporairement suspendu. Votre compte et vos
        données sont conservés.
      </p>
      {!method || method === 'standard' ? (
        <p className="mt-5">
          <Link
            href="/abonnement"
            className="action-primary inline-flex rounded-full px-5 py-3 font-bold"
          >
            Gérer mon abonnement
          </Link>
        </p>
      ) : null}
      <form
        className="mt-5"
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <button type="submit" className="action-secondary rounded-full px-5 py-3 font-bold">
          Se déconnecter
        </button>
      </form>
    </section>
  );
}
