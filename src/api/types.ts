// Mirrors backend DTOs/return shapes from time-tracker-api.

export type Status =
  | 'BACKLOG' | 'ESTIMATE' | 'APPROVED' | 'RETURN'
  | 'IN_PROGRESS' | 'IN_REVIEW' | 'WAITING' | 'HOLD'
  | 'DONE' | 'INVOICED';

export type BillingMode = 'NONE' | 'HOURLY_RATE' | 'TASK_PRICE';

export type ActivityKind =
  | 'TIME_TRACKED' | 'STATUS_CHANGED' | 'TASK_CREATED' | 'TASK_UPDATED'
  | 'COMMENT' | 'MANUAL_ENTRY_ADDED' | 'OVER_ESTIMATE';

export type SyncKind = 'TIME' | 'STATUS' | 'COMMENT' | 'TASK';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  plan: string;
}

export interface Settings {
  userId: string;
  theme: 'dark' | 'bright';
  accentHex: string;
  density: 'compact' | 'regular' | 'comfy';
  fontScale: number;
  idleDetectionMin: number;
  autoStopAtMidnight: boolean;
  pomodoroEnabled: boolean;
  pomodoroWorkMin: number;
  pomodoroBreakMin: number;
  remindersEnabled: boolean;
  calendarIntegration: boolean;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  initials: string;
  colorHex: string;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  trackedSeconds: number;
  openTaskCount: number;
}

export interface Task {
  id: string;
  projectId: string;
  userId: string;
  parentTaskId: string | null;
  title: string;
  description: unknown | null;
  status: Status;
  urgent: boolean;
  estimateSeconds: number | null;
  billingMode: BillingMode;
  hourlyRateCents: number | null;
  taskPriceCents: number | null;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Decorated by the API
  totalTime: number;
  totalEstimate: number;
  running: boolean;
  effectiveRateCents: number | null;
  earnedSoFarCents: number | null;
  projectedTotalCents: number | null;
  children: Task[];
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  manual: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: string; title: string; project?: { id: string; name: string; colorHex: string; initials: string } };
}

export interface ActivityLog {
  id: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  kind: ActivityKind;
  meta: any;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface WeeklyReport {
  from: string;
  to: string;
  total: number;
  days: Array<{ date: string; total: number; perProject: Record<string, number> }>;
  perProject: Record<string, { name: string; colorHex: string; seconds: number }>;
}

// Status display metadata (kept in sync with src/common/constants/status.ts on the backend)
export const STATUS_META: Record<Status, { label: string; hex: string; ring: 'solid' | 'dashed' | 'check' }> = {
  BACKLOG:     { label: 'BACKLOG',            hex: '#6a6a6e', ring: 'dashed' },
  ESTIMATE:    { label: 'ESTIMATE',           hex: '#e07b3e', ring: 'solid' },
  APPROVED:    { label: 'APPROVED',           hex: '#e5b341', ring: 'solid' },
  RETURN:      { label: 'RETURN',             hex: '#e54336', ring: 'solid' },
  IN_PROGRESS: { label: 'IN PROGRESS',        hex: '#4a7eff', ring: 'solid' },
  IN_REVIEW:   { label: 'IN REVIEW',          hex: '#a464d9', ring: 'solid' },
  WAITING:     { label: 'WAITING FOR CLIENT', hex: '#8f6e57', ring: 'solid' },
  HOLD:        { label: 'ON HOLD',            hex: '#6a6a6e', ring: 'solid' },
  DONE:        { label: 'DONE',               hex: '#34c270', ring: 'check' },
  INVOICED:    { label: 'INVOICED',           hex: '#1f8a5b', ring: 'check' },
};

export const STATUS_ORDER: Status[] = [
  'BACKLOG', 'ESTIMATE', 'APPROVED', 'RETURN', 'IN_PROGRESS',
  'IN_REVIEW', 'WAITING', 'HOLD', 'DONE', 'INVOICED',
];

export const CLOSED_STATUSES: Status[] = ['DONE', 'INVOICED'];
