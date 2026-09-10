import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { BetaPasswordChangeForm } from '@/components/BetaPasswordChangeForm';

export default async function ChangePasswordPage() {
  const session = await auth();
  const user = session?.user as { authMethod?: string } | undefined;
  if (!session?.user || user?.authMethod !== 'beta') redirect('/dashboard');

  async function changePassword(input: { currentPassword: string; newPassword: string }) {
    'use server';
    try {
      await serverApi.changeBetaPassword(input);
      redirect('/dashboard');
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Mise à jour impossible.' };
    }
  }

  return <section className="form-page" aria-labelledby="change-password-title"><header className="page-heading"><h1 id="change-password-title" className="page-title">Sécurisez votre accès</h1><p>Choisissez un nouveau mot de passe avant de continuer.</p></header><GlassPanel className="panel-padding"><BetaPasswordChangeForm changePassword={changePassword} /></GlassPanel></section>;
}
