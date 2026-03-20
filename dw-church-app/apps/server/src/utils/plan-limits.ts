import { AppError } from '../middleware/error-handler.js';

export interface PlanLimit {
  sermons: number;
  bulletins: number;
  albums: number;
  staff: number;
  storage_mb: number;
  admins: number;
}

/** -1 means unlimited */
export const PLAN_LIMITS: Record<string, PlanLimit> = {
  free: {
    sermons: 50,
    bulletins: 20,
    albums: 10,
    staff: 5,
    storage_mb: 500,
    admins: 1,
  },
  basic: {
    sermons: -1,
    bulletins: -1,
    albums: -1,
    staff: 20,
    storage_mb: 5000,
    admins: 3,
  },
  pro: {
    sermons: -1,
    bulletins: -1,
    albums: -1,
    staff: -1,
    storage_mb: -1,
    admins: -1,
  },
};

/**
 * Throws an `AppError` (402) when the tenant's plan limit for
 * `entityType` has been reached.
 */
export function checkPlanLimit(
  tenantPlan: string,
  entityType: keyof PlanLimit,
  currentCount: number,
): void {
  const limits = PLAN_LIMITS[tenantPlan];
  if (!limits) {
    throw new AppError(
      'INVALID_PLAN',
      400,
      `Unknown plan: ${tenantPlan}`,
    );
  }

  const max = limits[entityType];
  if (max === -1) return; // unlimited

  if (currentCount >= max) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      402,
      `Plan '${tenantPlan}' allows up to ${max} ${entityType}. Please upgrade your plan.`,
    );
  }
}
