import { adminApi } from '@/lib/admin-api';
import { AdminHeading } from '@/components/admin/AdminPrimitives';
import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
export default async function StatisticsPage() {
  const analytics = await adminApi.analytics();
  return (
    <>
      <AdminHeading
        eyebrow="Pilotage"
        title="Statistiques"
        description="Suivez les inscriptions, les visites et l’activité sportive sur les 90 derniers jours."
      />
      <AdminAnalyticsDashboard analytics={analytics} />
    </>
  );
}
