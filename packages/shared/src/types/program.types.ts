import type { TrainingProgram, GenerateProgramInput } from '../schemas/program.schema.js';

// Programme tel que stocké en base de données
export interface TrainingProgramRecord {
  id: string;
  userId: string;
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  weeksCount: number;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  data: TrainingProgram; // JSON complet stocké en JSONB
  createdAt: Date;
  updatedAt: Date;
}

// Réponse API pour la liste des programmes (sans data complet)
export interface ProgramListItem {
  id: string;
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  weeksCount: number;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  createdAt: string; // ISO string pour la sérialisation JSON
}

// Réponse paginée de la liste des programmes
export interface ProgramListResponse {
  programs: ProgramListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Re-export du type d'input pour commodité
export type { TrainingProgram, GenerateProgramInput };
