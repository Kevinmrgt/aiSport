import { ContentDetailPage } from '@/components/admin/ContentDetailPage';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ContentDetailPage params={params} kind="workouts" />;
}
