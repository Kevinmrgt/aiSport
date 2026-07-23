export interface GenerationQuota {
  limited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}
