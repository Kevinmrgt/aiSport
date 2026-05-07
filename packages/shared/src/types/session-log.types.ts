import type {
  CreateSessionLogInput,
  SessionFeedback,
  SessionSourceType,
} from '../schemas/session-log.schema.js';

export interface SessionLogRecord
  extends Omit<
    CreateSessionLogInput,
    'completedAt' | 'workoutId' | 'programId' | 'painNotes' | 'notes'
  > {
  id: string;
  userId: string;
  workoutId: string | null;
  programId: string | null;
  painNotes: string | null;
  notes: string | null;
  completedAt: Date;
  createdAt: Date;
}

export interface SessionLogListItem {
  id: string;
  sourceType: SessionSourceType;
  workoutId: string | null;
  programId: string | null;
  programWeekNumber: number | null;
  programSessionNumber: number | null;
  title: string;
  sport: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  plannedDurationMinutes: number;
  durationSeconds: number;
  perceivedEffort: number;
  feedback: SessionFeedback;
  painNotes: string | null;
  notes: string | null;
  completedAt: string;
  createdAt: string;
}

export interface SessionLogStats {
  totalCompleted: number;
  totalDurationSeconds: number;
  averageEffort: number | null;
  feedbackCounts: Record<SessionFeedback, number>;
  lastCompletedAt: string | null;
}

export type { CreateSessionLogInput, SessionFeedback, SessionSourceType };
