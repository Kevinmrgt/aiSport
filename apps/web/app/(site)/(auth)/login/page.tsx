import Link from 'next/link';
import { signIn } from '@/lib/auth';
import { isProductionAccessRestricted } from '@/lib/access-policy';
import { safeReturnTo } from '@/lib/return-to';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { Icon } from '@/components/ui/Icon';
import { redirect } from 'next/navigation';

interface LoginPageProps {
  searchParams: Promise<{ error?: string; code?: string; callbackUrl?: string }>;
}
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const betaAccessAvailable = !isProductionAccessRestricted();
  const query = await searchParams;
  const error = query?.error;
  const returnTo = safeReturnTo(query?.callbackUrl);
  return (
    <section className="login-page" aria-labelledby="login-title">
      <header className="page-heading">
        <h1 id="login-title" className="page-title">
          Connexion
        </h1>
        <p>
          Accédez à vos séances et programmes.
        </p>
      </header>
      <GlassPanel className="login-panel">
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: returnTo });
            }}
          >
            <button type="submit" className="action-primary w-full justify-between">
              <span>Continuer avec Google</span>
              <Icon name="arrow-right" className="h-6 w-6" />
            </button>
          </form>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-6 rounded-xl border border-red-300/30 bg-red-950/35 px-4 py-3 text-sm text-red-100"
          >
            {error === 'CredentialsSignin'
              ? 'Connexion impossible. Vérifiez les identifiants ou la période d’accès.'
              : 'La connexion a échoué. Vous pouvez réessayer.'}
          </p>
        )}
        {betaAccessAvailable && (
          <>
            <div className="my-8 flex items-center gap-6 text-sm text-zinc-300" aria-hidden="true">
              <span className="h-px flex-1 bg-white/20" />
              Ou
              <span className="h-px flex-1 bg-white/20" />
            </div>
            <form
              action={async (formData) => {
                'use server';
                formData.set('redirectTo', returnTo);
                try {
                  await signIn('beta', formData);
                } catch (error) {
                  if (
                    typeof error === 'object' &&
                    error !== null &&
                    'type' in error &&
                    error.type === 'CredentialsSignin'
                  ) {
                    redirect('/login?' + new URLSearchParams({ error: 'CredentialsSignin', callbackUrl: returnTo }).toString());
                  }
                  throw error;
                }
              }}
            >
              <fieldset className="space-y-5">
                <legend className="text-2xl font-bold">Accès bêta</legend>
                <p className="muted-copy">Utilisez l’adresse e-mail et le mot de passe temporaire communiqués par l’équipe Alcide.</p>
                <div>
                  <label htmlFor="beta-email" className="field-label">Adresse e-mail</label>
                  <input id="beta-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} className="field-control mt-2" />
                </div>
                <div>
                  <label htmlFor="beta-password" className="field-label">Mot de passe bêta</label>
                  <input id="beta-password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="field-control mt-2" />
                </div>
                <input type="hidden" name="redirectTo" value={returnTo} />
                <button type="submit" className="action-secondary w-full justify-between">
                  Se connecter à la bêta <Icon name="arrow-right" className="h-6 w-6 shrink-0" />
                </button>
              </fieldset>
            </form>
          </>
        )}
      </GlassPanel>
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </div>
    </section>
  );
}
