import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertModule, BadgeModule, CardModule, GridModule } from '@coreui/angular';

import { GoalsService } from '../../core/services/goals.service';
import { ObjectivesService } from '../../core/services/objectives.service';
import { PlansService } from '../../core/services/plans.service';
import { getHttpErrorMessage } from '../../shared/utils/http-error.utils';
import {
  formatCurrencyAmount,
  formatDateLabel,
  formatPlanStatus,
  formatRbapItemStatus,
  getBudgetDeficit,
  getPlanStatusColor,
} from '../../shared/utils/rbap.utils';
import { GoalRecord, ObjectiveRecord, PlanRecord } from '../../types/rbap.types';

@Component({
  selector: 'app-plan-print',
  imports: [RouterLink, AlertModule, BadgeModule, CardModule, GridModule],
  templateUrl: './plan-print.component.html',
  styleUrl: './plan-print.component.scss',
})
export class PlanPrintComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly plansService = inject(PlansService);
  private readonly goalsService = inject(GoalsService);
  private readonly objectivesService = inject(ObjectivesService);

  protected readonly formatPlanStatus = formatPlanStatus;
  protected readonly getPlanStatusColor = getPlanStatusColor;
  protected readonly formatDateLabel = formatDateLabel;
  protected readonly formatCurrencyAmount = formatCurrencyAmount;
  protected readonly formatRbapItemStatus = formatRbapItemStatus;
  protected readonly getBudgetDeficit = getBudgetDeficit;

  protected plan: PlanRecord | null = null;
  protected goals: GoalRecord[] = [];
  protected objectivesByGoalId: Record<string, ObjectiveRecord[]> = {};
  protected isLoading = true;
  protected errorMessage: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const planId = params.get('id');
      if (planId) {
        void this.loadPlan(planId);
      }
    });
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected printPage(): void {
    window.print();
  }

  protected goalObjectives(goalId: string): ObjectiveRecord[] {
    return this.objectivesByGoalId[goalId] ?? [];
  }

  private async loadPlan(planId: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const [plan, goalsResponse] = await Promise.all([
        this.plansService.getPlan(planId),
        this.goalsService.getGoals(planId, { take: 100, skip: 0 }),
      ]);

      this.plan = plan;
      this.goals = goalsResponse.data;

      const objectiveEntries = await Promise.all(
        this.goals.map(async (goal) => {
          const objectivesResponse = await this.objectivesService.getObjectives(planId, goal.id, {
            take: 100,
            skip: 0,
          });

          return [goal.id, objectivesResponse.data] as const;
        }),
      );

      this.objectivesByGoalId = Object.fromEntries(objectiveEntries);
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(
        error,
        'The printable plan view could not be loaded.',
      );
    } finally {
      this.isLoading = false;
    }
  }
}
