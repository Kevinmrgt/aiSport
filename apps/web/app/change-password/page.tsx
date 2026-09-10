import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { BetaPasswordChangeForm } from '@/components/BetaPasswordChangeForm';

export default async function ChangePasswordPage() {
  const session = await auth();
  const user = session?.user as { authMethod?: string } | undefined;
  const betaEmail = session?.user?.email;
  if (!session?.user || !betaEmail || user?.authMethod !== 'beta') redirect('/dashboard');

  async function changePassword(input: { currentPassword: string; newPassword: string }) {
    'use server';
    try {
      await serverApi.changeBetaPassword(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mise à jour impossible.';
      // Une réinitialisation admin fait tourner la version de session : l'ancien
      // jeton ne peut plus servir, même si le compte reste actif.
      if (message === 'Session bêta inactive ou révoquée') {
        await signOut({ redirectTo: '/login' });
      }
      return { error: message };
    }
    // Le JWT contient l'état temporaire. Une nouvelle connexion émet donc une
    // session mise à jour avant la redirection vers l'espace privé.
    await signIn('beta', {
      email: betaEmail,
      password: input.newPassword,
      redirectTo: '/dashboard',
    });
    return {};
  }

  return <section className="form-page" aria-labelledby="change-password-title"><header className="page-heading"><h1 id="change-password-title" className="page-title">Sécurisez votre accès</h1><p>Choisissez un nouveau mot de passe avant de continuer.</p></header><GlassPanel className="panel-padding"><BetaPasswordChangeForm changePassword={changePassword} /></GlassPanel></section>;
}
