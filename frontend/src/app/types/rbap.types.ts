import type { UserRole } from './auth.types';

export type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
export type RbapItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type NumericValue = number | string;

export interface RbapActor {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface PlanRecord {
  id: string;
  officeId: string;
  planningYear: number;
  campus: string;
  programProjectActivityKRA: string;
  strategicAlignment: string;
  breakthroughGoals: string;
  strategicObjectives: string;
  datePrepared: string | null;
  monitoringFrequency: string;
  reportingOffice: string | null;
  status: PlanStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  office: {
    id: string;
    name: string;
    parentId: string | null;
  };
  createdBy: RbapActor;
  _count: {
    goals: number;
  };
}

export interface GoalRecord {
  id: string;
  planId: string;
  officeId: string;
  resultLevel: string;
  targetResult: string;
  keyActions: string;
  keyRisk: string;
  mitigationMeasures: string;
  keyPerformanceIndicator: string;
  target: string;
  responsibleOfficePerson: string;
  timeline: string;
  fundSource: string | null;
  budgetRequirements: NumericValue;
  budgetAllocation: NumericValue;
  meansOfVerification: string;
  status: RbapItemStatus;
  createdAt: string;
  updatedAt: string;
  office: {
    id: string;
    name: string;
  };
  plan: {
    id: string;
    planningYear: number;
    status: PlanStatus;
  };
  createdBy: RbapActor;
  _count: {
    objectives: number;
  };
}

export interface ObjectiveRecord {
  id: string;
  goalId: string;
  resultLevel: string;
  targetResult: string;
  keyActions: string;
  keyRisk: string;
  mitigationMeasures: string;
  keyPerformanceIndicator: string;
  target: string;
  responsibleOfficePerson: string;
  timeline: string;
  fundSource: string | null;
  budgetRequirements: NumericValue;
  budgetAllocation: NumericValue;
  meansOfVerification: string;
  status: RbapItemStatus;
  createdAt: string;
  updatedAt: string;
  goal: {
    id: string;
    planId: string;
    resultLevel: string;
    office: {
      id: string;
      name: string;
    };
    plan: {
      planningYear: number;
      status: PlanStatus;
    };
  };
  createdBy: RbapActor;
}

export interface PlanSummaryResponse {
  filters: {
    officeId: string | null;
    planningYear: number | null;
  };
  overview: {
    totalPlans: number;
    draftPlans: number;
    submittedPlans: number;
    approvedPlans: number;
    pendingApprovalCount: number;
  };
  byOffice: Array<{
    officeId: string;
    officeName: string;
    totalPlans: number;
    draftPlans: number;
    submittedPlans: number;
    approvedPlans: number;
  }>;
  byYear: Array<{
    planningYear: number;
    totalPlans: number;
    draftPlans: number;
    submittedPlans: number;
    approvedPlans: number;
  }>;
}

export interface PlanListQuery {
  take?: number;
  skip?: number;
  officeId?: string;
  planningYear?: number;
  status?: PlanStatus;
}

export interface CreatePlanPayload {
  planningYear: number;
  campus: string;
  programProjectActivityKRA: string;
  strategicAlignment: string;
  breakthroughGoals: string;
  strategicObjectives: string;
  datePrepared?: string;
  monitoringFrequency?: string;
  reportingOffice?: string;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export interface CreateRbapItemPayload {
  resultLevel: string;
  targetResult: string;
  keyActions: string;
  keyRisk: string;
  mitigationMeasures: string;
  keyPerformanceIndicator: string;
  target: string;
  responsibleOfficePerson: string;
  timeline: string;
  fundSource?: string;
  budgetRequirements?: number;
  budgetAllocation?: number;
  meansOfVerification: string;
}

export interface UpdateRbapItemPayload extends Partial<CreateRbapItemPayload> {
  status?: RbapItemStatus;
}
