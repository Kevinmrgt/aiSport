import { requireAdmin } from '@/lib/admin';
import { signOut } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Administration — Alcide',
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/' });
  }
  return (
    <AdminShell email={user.email ?? ''} signOutAction={signOutAction}>
      {children}
    </AdminShell>
  );
}
