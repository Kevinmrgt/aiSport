import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { serverApi } from '@/lib/server-api';
import { BetaAdminPanel } from '@/components/BetaAdminPanel';

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect('/dashboard');
  const [{ betaTesters }, overview] = await Promise.all([
    serverApi.listBetaTesters(),
    serverApi.getAdminOverview(),
  ]);

  async function createBetaTester(input: { name: string; email: string; generationBalance: number }) {
    'use server';
    try { return { data: await serverApi.createBetaTester(input) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Création impossible.' }; }
  }
  async function adjustCredits(userId: string, amount: number) {
    'use server';
    try { return { data: await serverApi.adjustBetaCredits(userId, amount) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Ajustement impossible.' }; }
  }
  async function setStatus(userId: string, active: boolean) {
    'use server';
    try { return { data: await serverApi.setBetaStatus(userId, active) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Mise à jour impossible.' }; }
  }
  async function resetPassword(userId: string) {
    'use server';
    try { return { data: await serverApi.resetBetaPassword(userId) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Réinitialisation impossible.' }; }
  }
  async function deleteBetaTester(userId: string) {
    'use server';
    try { return { data: await serverApi.deleteBetaTester(userId) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Suppression impossible.' }; }
  }

  async function savePlatformSettings(input: { defaultAiModel: string; defaultBetaGenerationBalance: number }) {
    'use server';
    try { return { data: await serverApi.savePlatformSettings(input) }; } catch (error) { return { error: error instanceof Error ? error.message : 'Sauvegarde impossible.' }; }
  }

  return <section aria-labelledby="admin-title" className="space-y-7"><header className="page-heading"><h1 id="admin-title" className="page-title">Administration</h1><p>Suivez l’activité, pilotez les accès bêta et réglez les valeurs par défaut de la plateforme.</p></header><BetaAdminPanel initialBetaTesters={betaTesters} overview={overview} createBetaTester={createBetaTester} adjustCredits={adjustCredits} setStatus={setStatus} resetPassword={resetPassword} deleteBetaTester={deleteBetaTester} savePlatformSettings={savePlatformSettings} /></section>;
}
