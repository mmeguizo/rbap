import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertModule,
  BadgeModule,
  BreadcrumbModule,
  CardModule,
  GridModule,
} from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';
import { GoalsService } from '../../core/services/goals.service';
import { ObjectivesService } from '../../core/services/objectives.service';
import { PlansService } from '../../core/services/plans.service';
import { getHttpErrorMessage } from '../../shared/utils/http-error.utils';
import {
  canApprovePlan,
  canCreatePlan,
  canManagePlan,
  canSubmitPlan,
  countObjectives,
  formatCurrencyAmount,
  formatDateLabel,
  formatDateTimeLabel,
  formatPlanStatus,
  formatRbapItemStatus,
  getGoalsRequiredBudget,
  getGoalsTotalBudget,
  getPlanStatusColor,
  getRbapStatusColor,
  toNumber,
} from '../../shared/utils/rbap.utils';
import {
  CreatePlanPayload,
  CreateRbapItemPayload,
  GoalRecord,
  ObjectiveRecord,
  PlanRecord,
  RbapItemStatus,
  UpdateRbapItemPayload,
} from '../../types/rbap.types';

type EditorEntity = 'goal' | 'objective';
type EditorMode = 'create' | 'edit';

interface EditorState {
  entity: EditorEntity;
  mode: EditorMode;
  goalId?: string;
  entityId?: string;
}

@Component({
  selector: 'app-plan-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertModule,
    BadgeModule,
    BreadcrumbModule,
    CardModule,
    GridModule,
  ],
  templateUrl: './plan-detail.component.html',
  styleUrl: './plan-detail.component.scss',
})
export class PlanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly plansService = inject(PlansService);
  private readonly goalsService = inject(GoalsService);
  private readonly objectivesService = inject(ObjectivesService);
  private readonly authService = inject(AuthService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly formatPlanStatus = formatPlanStatus;
  protected readonly getPlanStatusColor = getPlanStatusColor;
  protected readonly formatRbapItemStatus = formatRbapItemStatus;
  protected readonly getRbapStatusColor = getRbapStatusColor;
  protected readonly formatDateLabel = formatDateLabel;
  protected readonly formatDateTimeLabel = formatDateTimeLabel;
  protected readonly formatCurrencyAmount = formatCurrencyAmount;
  protected readonly itemStatuses: RbapItemStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

  protected plan: PlanRecord | null = null;
  protected goals: GoalRecord[] = [];
  protected objectivesByGoalId: Record<string, ObjectiveRecord[]> = {};
  protected editorState: EditorState | null = null;

  protected isCreateMode = true;
  protected isLoading = true;
  protected isSavingPlan = false;
  protected isSavingItem = false;
  protected isProcessingAction = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;

  protected readonly planForm = this.fb.nonNullable.group({
    planningYear: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    campus: ['University-wide', [Validators.required]],
    programProjectActivityKRA: ['', [Validators.required]],
    strategicAlignment: ['', [Validators.required]],
    breakthroughGoals: ['', [Validators.required]],
    strategicObjectives: ['', [Validators.required]],
    datePrepared: [''],
    monitoringFrequency: ['Quarterly'],
    reportingOffice: [''],
  });

  protected readonly itemForm = this.fb.nonNullable.group({
    resultLevel: ['Outcome', [Validators.required]],
    targetResult: ['', [Validators.required]],
    keyActions: ['', [Validators.required]],
    keyRisk: ['', [Validators.required]],
    mitigationMeasures: ['', [Validators.required]],
    keyPerformanceIndicator: ['', [Validators.required]],
    target: ['', [Validators.required]],
    responsibleOfficePerson: ['', [Validators.required]],
    timeline: ['', [Validators.required]],
    fundSource: [''],
    budgetRequirements: [0, [Validators.min(0)]],
    budgetAllocation: [0, [Validators.min(0)]],
    meansOfVerification: ['', [Validators.required]],
    status: ['NOT_STARTED' as RbapItemStatus, [Validators.required]],
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.handleRoute(params.get('id'));
    });
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected dismissSuccess(): void {
    this.successMessage = null;
  }

  protected isPlanEditable(): boolean {
    if (this.isCreateMode) {
      return canCreatePlan(this.currentUser());
    }

    return !!this.plan && canManagePlan(this.currentUser(), this.plan);
  }

  protected canSubmitCurrentPlan(): boolean {
    return !!this.plan && canSubmitPlan(this.currentUser(), this.plan);
  }

  protected canApproveCurrentPlan(): boolean {
    return !!this.plan && canApprovePlan(this.currentUser(), this.plan);
  }

  protected get objectiveCount(): number {
    return countObjectives(this.objectivesByGoalId);
  }

  protected get totalRequiredBudget(): string {
    return formatCurrencyAmount(getGoalsRequiredBudget(this.goals));
  }

  protected get totalAllocatedBudget(): string {
    return formatCurrencyAmount(getGoalsTotalBudget(this.goals));
  }

  protected goalObjectives(goalId: string): ObjectiveRecord[] {
    return this.objectivesByGoalId[goalId] ?? [];
  }

  protected openCreateGoal(): void {
    this.editorState = { entity: 'goal', mode: 'create' };
    this.itemForm.reset(this.getDefaultItemFormValue());
  }

  protected openEditGoal(goal: GoalRecord): void {
    this.editorState = { entity: 'goal', mode: 'edit', entityId: goal.id };
    this.patchItemForm(goal);
  }

  protected openCreateObjective(goal: GoalRecord): void {
    this.editorState = {
      entity: 'objective',
      mode: 'create',
      goalId: goal.id,
    };

    this.itemForm.reset({
      ...this.getDefaultItemFormValue(),
      resultLevel: `${goal.resultLevel} Output`,
      timeline: goal.timeline,
    });
  }

  protected openEditObjective(goalId: string, objective: ObjectiveRecord): void {
    this.editorState = {
      entity: 'objective',
      mode: 'edit',
      goalId,
      entityId: objective.id,
    };
    this.patchItemForm(objective);
  }

  protected cancelEditor(): void {
    this.editorState = null;
    this.itemForm.reset(this.getDefaultItemFormValue());
  }

  protected editorTitle(): string {
    if (!this.editorState) {
      return 'RBAP item editor';
    }

    const entityLabel = this.editorState.entity === 'goal' ? 'Goal' : 'Objective';
    const actionLabel = this.editorState.mode === 'create' ? 'Create' : 'Edit';
    return `${actionLabel} ${entityLabel}`;
  }

  protected editorDescription(): string {
    if (!this.editorState) {
      return '';
    }

    if (this.editorState.entity === 'goal') {
      return 'Goals are the main RBAP rows under the annual plan.';
    }

    return 'Objectives are the outputs nested under one goal row.';
  }

  protected async savePlan(): Promise<void> {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    if (!this.isPlanEditable()) {
      return;
    }

    this.isSavingPlan = true;
    this.errorMessage = null;

    try {
      const payload = this.buildPlanPayload();

      if (this.isCreateMode) {
        const createdPlan = await this.plansService.createPlan(payload);
        this.successMessage = 'Plan created. You can add goals and outputs now.';
        await this.router.navigate(['/plans', createdPlan.id]);
        return;
      }

      const updatedPlan = await this.plansService.updatePlan(this.plan!.id, payload);
      this.plan = updatedPlan;
      this.patchPlanForm(updatedPlan);
      this.successMessage = 'Plan details updated.';
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The plan could not be saved.');
    } finally {
      this.isSavingPlan = false;
    }
  }

  protected async submitPlan(): Promise<void> {
    if (!this.plan) {
      return;
    }

    this.isProcessingAction = true;
    this.errorMessage = null;

    try {
      this.plan = await this.plansService.submitPlan(this.plan.id);
      this.patchPlanForm(this.plan);
      this.successMessage = 'Plan submitted for review.';
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The plan could not be submitted.');
    } finally {
      this.isProcessingAction = false;
    }
  }

  protected async approvePlan(): Promise<void> {
    if (!this.plan) {
      return;
    }

    this.isProcessingAction = true;
    this.errorMessage = null;

    try {
      this.plan = await this.plansService.approvePlan(this.plan.id);
      this.patchPlanForm(this.plan);
      this.successMessage = 'Plan approved successfully.';
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The plan could not be approved.');
    } finally {
      this.isProcessingAction = false;
    }
  }

  protected async deletePlan(): Promise<void> {
    if (!this.plan || !this.isPlanEditable()) {
      return;
    }

    const shouldDelete = window.confirm(
      'Delete this draft plan? This also removes the goals and objectives under it.',
    );

    if (!shouldDelete) {
      return;
    }

    this.isProcessingAction = true;
    this.errorMessage = null;

    try {
      await this.plansService.deletePlan(this.plan.id);
      await this.router.navigate(['/plans']);
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The plan could not be deleted.');
    } finally {
      this.isProcessingAction = false;
    }
  }

  protected async saveEditorItem(): Promise<void> {
    if (!this.plan || !this.editorState) {
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    if (!this.isPlanEditable()) {
      return;
    }

    this.isSavingItem = true;
    this.errorMessage = null;

    try {
      const createPayload = this.buildCreateItemPayload();
      const updatePayload = this.buildUpdateItemPayload();

      if (this.editorState.entity === 'goal') {
        if (this.editorState.mode === 'create') {
          await this.goalsService.createGoal(this.plan.id, createPayload);
          this.successMessage = 'Goal added to the plan.';
        } else {
          await this.goalsService.updateGoal(
            this.plan.id,
            this.editorState.entityId!,
            updatePayload,
          );
          this.successMessage = 'Goal updated.';
        }
      } else if (this.editorState.mode === 'create') {
        await this.objectivesService.createObjective(
          this.plan.id,
          this.editorState.goalId!,
          createPayload,
        );
        this.successMessage = 'Objective added under the selected goal.';
      } else {
        await this.objectivesService.updateObjective(
          this.plan.id,
          this.editorState.goalId!,
          this.editorState.entityId!,
          updatePayload,
        );
        this.successMessage = 'Objective updated.';
      }

      this.cancelEditor();
      await this.reloadGoalsWorkspace();
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The RBAP item could not be saved.');
    } finally {
      this.isSavingItem = false;
    }
  }

  protected async deleteGoal(goal: GoalRecord): Promise<void> {
    if (!this.plan || !this.isPlanEditable()) {
      return;
    }

    const shouldDelete = window.confirm(`Delete the goal "${goal.resultLevel}"?`);
    if (!shouldDelete) {
      return;
    }

    this.isProcessingAction = true;
    this.errorMessage = null;

    try {
      await this.goalsService.deleteGoal(this.plan.id, goal.id);
      this.successMessage = 'Goal deleted.';
      await this.reloadGoalsWorkspace();
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The goal could not be deleted.');
    } finally {
      this.isProcessingAction = false;
    }
  }

  protected async deleteObjective(goalId: string, objective: ObjectiveRecord): Promise<void> {
    if (!this.plan || !this.isPlanEditable()) {
      return;
    }

    const shouldDelete = window.confirm(`Delete the objective "${objective.resultLevel}"?`);
    if (!shouldDelete) {
      return;
    }

    this.isProcessingAction = true;
    this.errorMessage = null;

    try {
      await this.objectivesService.deleteObjective(this.plan.id, goalId, objective.id);
      this.successMessage = 'Objective deleted.';
      await this.reloadGoalsWorkspace();
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The objective could not be deleted.');
    } finally {
      this.isProcessingAction = false;
    }
  }

  private async handleRoute(routeId: string | null): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;
    this.cancelEditor();

    if (!routeId || routeId === 'new') {
      this.isCreateMode = true;
      this.plan = null;
      this.goals = [];
      this.objectivesByGoalId = {};
      this.prefillPlanForm();
      this.isLoading = false;
      return;
    }

    this.isCreateMode = false;
    await this.loadWorkspace(routeId);
  }

  private async loadWorkspace(planId: string): Promise<void> {
    this.isLoading = true;

    try {
      const plan = await this.plansService.getPlan(planId);
      this.plan = plan;
      this.patchPlanForm(plan);
      await this.reloadGoalsWorkspace();
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The RBAP workspace could not be loaded.');
      this.goals = [];
      this.objectivesByGoalId = {};
    } finally {
      this.isLoading = false;
    }
  }

  private async reloadGoalsWorkspace(): Promise<void> {
    if (!this.plan) {
      this.goals = [];
      this.objectivesByGoalId = {};
      return;
    }

    const goalsResponse = await this.goalsService.getGoals(this.plan.id, { take: 100, skip: 0 });
    this.goals = goalsResponse.data;

    const objectiveEntries = await Promise.all(
      this.goals.map(async (goal) => {
        const objectivesResponse = await this.objectivesService.getObjectives(
          this.plan!.id,
          goal.id,
          {
            take: 100,
            skip: 0,
          },
        );

        return [goal.id, objectivesResponse.data] as const;
      }),
    );

    this.objectivesByGoalId = Object.fromEntries(objectiveEntries);
  }

  private prefillPlanForm(): void {
    this.planForm.reset({
      planningYear: new Date().getFullYear(),
      campus: 'University-wide',
      programProjectActivityKRA: '',
      strategicAlignment: '',
      breakthroughGoals: '',
      strategicObjectives: '',
      datePrepared: '',
      monitoringFrequency: 'Quarterly',
      reportingOffice: '',
    });
  }

  private patchPlanForm(plan: PlanRecord): void {
    this.planForm.reset({
      planningYear: plan.planningYear,
      campus: plan.campus,
      programProjectActivityKRA: plan.programProjectActivityKRA,
      strategicAlignment: plan.strategicAlignment,
      breakthroughGoals: plan.breakthroughGoals,
      strategicObjectives: plan.strategicObjectives,
      datePrepared: plan.datePrepared ? plan.datePrepared.slice(0, 10) : '',
      monitoringFrequency: plan.monitoringFrequency,
      reportingOffice: plan.reportingOffice ?? plan.office.name,
    });
  }

  private patchItemForm(item: GoalRecord | ObjectiveRecord): void {
    this.itemForm.reset({
      resultLevel: item.resultLevel,
      targetResult: item.targetResult,
      keyActions: item.keyActions,
      keyRisk: item.keyRisk,
      mitigationMeasures: item.mitigationMeasures,
      keyPerformanceIndicator: item.keyPerformanceIndicator,
      target: item.target,
      responsibleOfficePerson: item.responsibleOfficePerson,
      timeline: item.timeline,
      fundSource: item.fundSource ?? '',
      budgetRequirements: toNumber(item.budgetRequirements),
      budgetAllocation: toNumber(item.budgetAllocation),
      meansOfVerification: item.meansOfVerification,
      status: item.status,
    });
  }

  private getDefaultItemFormValue() {
    return {
      resultLevel: 'Outcome',
      targetResult: '',
      keyActions: '',
      keyRisk: '',
      mitigationMeasures: '',
      keyPerformanceIndicator: '',
      target: '',
      responsibleOfficePerson: '',
      timeline: '',
      fundSource: '',
      budgetRequirements: 0,
      budgetAllocation: 0,
      meansOfVerification: '',
      status: 'NOT_STARTED' as RbapItemStatus,
    };
  }

  private buildPlanPayload(): CreatePlanPayload {
    const raw = this.planForm.getRawValue();

    return {
      planningYear: raw.planningYear,
      campus: raw.campus.trim(),
      programProjectActivityKRA: raw.programProjectActivityKRA.trim(),
      strategicAlignment: raw.strategicAlignment.trim(),
      breakthroughGoals: raw.breakthroughGoals.trim(),
      strategicObjectives: raw.strategicObjectives.trim(),
      datePrepared: raw.datePrepared.trim() || undefined,
      monitoringFrequency: raw.monitoringFrequency.trim() || 'Quarterly',
      reportingOffice: raw.reportingOffice.trim() || undefined,
    };
  }

  private buildCreateItemPayload(): CreateRbapItemPayload {
    const raw = this.itemForm.getRawValue();

    return {
      resultLevel: raw.resultLevel.trim(),
      targetResult: raw.targetResult.trim(),
      keyActions: raw.keyActions.trim(),
      keyRisk: raw.keyRisk.trim(),
      mitigationMeasures: raw.mitigationMeasures.trim(),
      keyPerformanceIndicator: raw.keyPerformanceIndicator.trim(),
      target: raw.target.trim(),
      responsibleOfficePerson: raw.responsibleOfficePerson.trim(),
      timeline: raw.timeline.trim(),
      fundSource: raw.fundSource.trim() || undefined,
      budgetRequirements: raw.budgetRequirements,
      budgetAllocation: raw.budgetAllocation,
      meansOfVerification: raw.meansOfVerification.trim(),
    };
  }

  private buildUpdateItemPayload(): UpdateRbapItemPayload {
    const raw = this.itemForm.getRawValue();

    return {
      ...this.buildCreateItemPayload(),
      status: raw.status,
    };
  }
}
