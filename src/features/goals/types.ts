export interface GoalStepItem {
  id: string;
  title: string;
  isDone: boolean;
}

/**
 * A goal as the client sees it.
 *
 * Dates cross the server-action boundary as ISO strings rather than Date
 * objects, matching ResolvedProfile: the client only ever renders them, and an
 * explicit string keeps the wire shape obvious instead of depending on how the
 * RSC serialiser happens to treat Date this week.
 *
 * There is no `progress` field. It is derived from `steps` at the point of
 * display (see goalProgress in lib/format.ts) because a stored percentage is a
 * second source of truth that drifts the first time a step is added or removed.
 */
export interface GoalItem {
  id: string;
  title: string;
  isCompleted: boolean;
  /** UTC midnight, ISO — or null when the goal has no deadline. */
  targetDate: string | null;
  note: string | null;
  createdAt: string;
  steps: GoalStepItem[];
}
