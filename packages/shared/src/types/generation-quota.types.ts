export interface GenerationQuota {
  mode?: 'standard' | 'jury' | 'beta';
  limited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}
