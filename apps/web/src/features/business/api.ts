import { object } from '../operations/api';
import { uuid } from '../workflows/contracts';
export interface Document {
  version: number;
  updatedAt: string | null;
  data: Record<string, unknown> | null;
}
export interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  taskId: string | null;
  taskStatus: string | null;
}
export interface Goal {
  id: string;
  version: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  updatedAt: string;
  milestones: Milestone[];
}
export interface GoalInput {
  version: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: Goal['status'];
  milestones: {
    id?: string | null;
    title: string;
    dueDate: string | null;
    completed: boolean;
    taskId: string | null;
  }[];
}
export function document(value: unknown): Document {
  const d = object(value);
  if (
    !Number.isSafeInteger(d.version) ||
    Number(d.version) < 0 ||
    (d.updatedAt !== null &&
      (typeof d.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(d.updatedAt)))) ||
    (d.data !== null && (typeof d.data !== 'object' || Array.isArray(d.data)))
  )
    throw Error('Invalid business profile response.');
  if (
    (d.version === 0) !== (d.data === null) ||
    (Number(d.version) > 0 && d.updatedAt === null)
  )
    throw Error('Inconsistent profile version.');
  return d as unknown as Document;
}
export function goal(value: unknown): Goal {
  const g = object(value);
  if (
    typeof g.id !== 'string' ||
    !uuid(g.id) ||
    !Number.isSafeInteger(g.version) ||
    Number(g.version) < 1 ||
    typeof g.title !== 'string' ||
    !g.title.trim() ||
    g.title.length > 200 ||
    typeof g.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(g.updatedAt)) ||
    !['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(String(g.status)) ||
    !Array.isArray(g.milestones) ||
    g.milestones.length > 20
  )
    throw Error('Invalid goal response.');
  for (const item of g.milestones) {
    const m = object(item);
    if (
      typeof m.id !== 'string' ||
      !uuid(m.id) ||
      typeof m.title !== 'string' ||
      typeof m.completed !== 'boolean' ||
      (m.taskStatus !== null &&
        !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(
          String(m.taskStatus),
        )) ||
      (m.taskId !== null && (typeof m.taskId !== 'string' || !uuid(m.taskId)))
    )
      throw Error('Invalid milestone response.');
  }
  if (
    new Set(g.milestones.map((m) => object(m).id)).size !== g.milestones.length
  )
    throw Error('Duplicate milestone identity.');
  return g as unknown as Goal;
}
export function goalInput(g: Goal): GoalInput {
  return {
    version: g.version,
    title: g.title,
    description: g.description,
    dueDate: g.dueDate,
    status: g.status,
    milestones: g.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate,
      completed: m.completed,
      taskId: m.taskId,
    })),
  };
}
export function website(value: string) {
  if (!value) return;
  const u = new URL(value);
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    value.length > 2000
  )
    throw Error(
      'Use an HTTP(S) website without credentials, query or fragment.',
    );
}
export const journeys = {
  EXISTING_OWNER: 'Existing business owner',
  NEW_FOUNDER: 'New founder with an idea',
  BUSINESS_CHALLENGES: 'Business facing challenges',
  EMPLOYEE: 'Employee or team member',
  UNDECIDED: 'Skip choosing a journey',
};
export const journeyCopy: Record<string, string> = {
  EXISTING_OWNER:
    'Focus on your current business direction and the outcomes that matter next.',
  NEW_FOUNDER: 'Explore your idea and the first outcome you want to validate.',
  BUSINESS_CHALLENGES:
    'Describe the challenge you want to work through, at your own pace.',
  EMPLOYEE: 'Choose work priorities and outcomes relevant to your role.',
  UNDECIDED: 'You can return later. Optional answers can remain blank.',
};
