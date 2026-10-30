import { ContentsPage } from '@/components/admin/ContentsPage';
import type { SearchParams } from '@/components/admin/AdminPrimitives';
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ContentsPage searchParams={searchParams} kind="workouts" />;
}
