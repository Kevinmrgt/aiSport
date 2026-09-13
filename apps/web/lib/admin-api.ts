import 'server-only';
import type {
  AdminQuery,
  AdminPage,
  AdminMember,
  AdminMemberDetail,
  AdminSubscription,
  AdminCreditEntry,
  AdminAuditPage,
  AdminContent,
  AdminContentDetail,
  AdminSummary,
  AdminSettingsResponse,
} from '@alcide/shared';
import { requireAdmin } from './admin';
import { serverFetch, type AdminOverview } from './server-api';

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  await requireAdmin();
  return serverFetch<T>(`/admin${path}`, options);
}
function queryString(query: AdminQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return `?${params}`;
}
export const adminApi = {
  summary: () => adminFetch<AdminSummary>('/summary'),
  analytics: () => adminFetch<AdminOverview['analytics']>('/analytics'),
  settings: () => adminFetch<AdminSettingsResponse>('/platform-settings'),
  members: (query: AdminQuery) =>
    adminFetch<AdminPage<AdminMember>>(`/members${queryString(query)}`),
  member: (id: string) => adminFetch<AdminMemberDetail>(`/members/${encodeURIComponent(id)}`),
  subscriptions: (query: AdminQuery) =>
    adminFetch<AdminPage<AdminSubscription>>(`/subscriptions${queryString(query)}`),
  credits: (query: AdminQuery) =>
    adminFetch<AdminPage<AdminCreditEntry>>(`/credits${queryString(query)}`),
  audit: (query: AdminQuery) => adminFetch<AdminAuditPage>(`/audit${queryString(query)}`),
  contents: (kind: 'workouts' | 'programs', query: AdminQuery) =>
    adminFetch<AdminPage<AdminContent>>(`/${kind}${queryString(query)}`),
  content: (kind: 'workouts' | 'programs', id: string) =>
    adminFetch<AdminContentDetail>(`/${kind}/${encodeURIComponent(id)}`),
};
