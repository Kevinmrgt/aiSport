import { MembersPage } from '@/components/admin/MembersPage';
import type { SearchParams } from '@/components/admin/AdminPrimitives';
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <MembersPage searchParams={searchParams} betaOnly />;
}
