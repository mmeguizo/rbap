import type { UserProfile, UserRole } from '../../types/auth.types';
import type {
  GoalRecord,
  NumericValue,
  ObjectiveRecord,
  PlanRecord,
  PlanStatus,
  RbapItemStatus,
} from '../../types/rbap.types';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const planCreatorRoles = new Set<UserRole>([
  'OFFICE_HEAD',
  'DIRECTORS',
  'VICE_PRESIDENTS',
  'PRESIDENTS',
]);

const reviewerRoles = new Set<UserRole>(['ADMIN', 'DIRECTORS', 'VICE_PRESIDENTS', 'PRESIDENTS']);

export function toNumber(value: NumericValue | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrencyAmount(value: NumericValue | null | undefined): string {
  return currencyFormatter.format(toNumber(value));
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return shortDateFormatter.format(date);
}

export function formatDateTimeLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return dateTimeFormatter.format(date);
}

export function formatPlanStatus(status: PlanStatus): string {
  if (status === 'SUBMITTED') {
    return 'Submitted';
  }

  if (status === 'APPROVED') {
    return 'Approved';
  }

  return 'Draft';
}

export function formatRbapItemStatus(status: RbapItemStatus): string {
  if (status === 'IN_PROGRESS') {
    return 'In Progress';
  }

  if (status === 'COMPLETED') {
    return 'Completed';
  }

  return 'Not Started';
}

export function getPlanStatusColor(status: PlanStatus): string {
  if (status === 'APPROVED') {
    return 'success';
  }

  if (status === 'SUBMITTED') {
    return 'warning';
  }

  return 'secondary';
}

export function getRbapStatusColor(status: RbapItemStatus): string {
  if (status === 'COMPLETED') {
    return 'success';
  }

  if (status === 'IN_PROGRESS') {
    return 'info';
  }

  return 'secondary';
}

export function canCreatePlan(user: UserProfile | null): boolean {
  return !!user && planCreatorRoles.has(user.role);
}

export function canReviewSubordinatePlans(user: UserProfile | null): boolean {
  return !!user && reviewerRoles.has(user.role);
}

export function canManagePlan(
  user: UserProfile | null,
  plan: Pick<PlanRecord, 'officeId' | 'status'>,
): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  return user.office?.id === plan.officeId && plan.status === 'DRAFT';
}

export function canSubmitPlan(
  user: UserProfile | null,
  plan: Pick<PlanRecord, 'officeId' | 'status'>,
): boolean {
  return canManagePlan(user, plan) && plan.status === 'DRAFT';
}

export function canApprovePlan(
  user: UserProfile | null,
  plan: Pick<PlanRecord, 'officeId' | 'status'>,
): boolean {
  if (!user || plan.status !== 'SUBMITTED' || !reviewerRoles.has(user.role)) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  return user.office?.id !== plan.officeId;
}

export function countObjectives(objectivesByGoalId: Record<string, ObjectiveRecord[]>): number {
  return Object.values(objectivesByGoalId).reduce(
    (total, objectives) => total + objectives.length,
    0,
  );
}

export function getGoalTotalBudget(goal: Pick<GoalRecord, 'budgetAllocation'>): number {
  return toNumber(goal.budgetAllocation);
}

export function getGoalsTotalBudget(goals: Array<Pick<GoalRecord, 'budgetAllocation'>>): number {
  return goals.reduce((total, goal) => total + toNumber(goal.budgetAllocation), 0);
}

export function getGoalsRequiredBudget(
  goals: Array<Pick<GoalRecord, 'budgetRequirements'>>,
): number {
  return goals.reduce((total, goal) => total + toNumber(goal.budgetRequirements), 0);
}

export function getBudgetDeficit(
  item: Pick<GoalRecord, 'budgetRequirements' | 'budgetAllocation'>,
): number {
  return toNumber(item.budgetRequirements) - toNumber(item.budgetAllocation);
}
