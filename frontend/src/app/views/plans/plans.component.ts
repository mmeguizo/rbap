import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlertModule,
  BadgeModule,
  BreadcrumbModule,
  CardModule,
  GridModule,
} from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';
import { OfficeService } from '../../core/services/office.service';
import { PlansService } from '../../core/services/plans.service';
import { getHttpErrorMessage } from '../../shared/utils/http-error.utils';
import {
  canCreatePlan,
  formatDateTimeLabel,
  formatPlanStatus,
  getPlanStatusColor,
} from '../../shared/utils/rbap.utils';
import { OfficeSummary } from '../../types/office.types';
import { PlanListQuery, PlanRecord, PlanStatus } from '../../types/rbap.types';

@Component({
  selector: 'app-plans',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertModule,
    BadgeModule,
    BreadcrumbModule,
    CardModule,
    GridModule,
  ],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
})
export class PlansComponent implements OnInit {
  private readonly plansService = inject(PlansService);
  private readonly officeService = inject(OfficeService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly formatPlanStatus = formatPlanStatus;
  protected readonly getPlanStatusColor = getPlanStatusColor;
  protected readonly formatDateTimeLabel = formatDateTimeLabel;
  protected readonly statusOptions: Array<PlanStatus | ''> = ['', 'DRAFT', 'SUBMITTED', 'APPROVED'];

  protected plans: PlanRecord[] = [];
  protected offices: OfficeSummary[] = [];
  protected total = 0;
  protected take = 10;
  protected skip = 0;
  protected isLoading = true;
  protected errorMessage: string | null = null;

  protected readonly filterForm = this.fb.nonNullable.group({
    officeId: [''],
    planningYear: [''],
    status: ['' as PlanStatus | ''],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadOffices(), this.loadPlans()]);
  }

  protected async applyFilters(): Promise<void> {
    this.skip = 0;
    await this.loadPlans();
  }

  protected async clearFilters(): Promise<void> {
    this.filterForm.reset({
      officeId: '',
      planningYear: '',
      status: '',
    });

    this.skip = 0;
    await this.loadPlans();
  }

  protected async previousPage(): Promise<void> {
    if (this.skip === 0 || this.isLoading) {
      return;
    }

    this.skip = Math.max(0, this.skip - this.take);
    await this.loadPlans();
  }

  protected async nextPage(): Promise<void> {
    if (this.isLoading || this.skip + this.take >= this.total) {
      return;
    }

    this.skip += this.take;
    await this.loadPlans();
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected canCreateNewPlan(): boolean {
    return canCreatePlan(this.currentUser());
  }

  protected get rangeStart(): number {
    return this.plans.length ? this.skip + 1 : 0;
  }

  protected get rangeEnd(): number {
    return this.skip + this.plans.length;
  }

  private async loadOffices(): Promise<void> {
    try {
      this.offices = await this.officeService.getAccessibleOffices();
    } catch {
      this.offices = [];
    }
  }

  private async loadPlans(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await this.plansService.getPlans(this.buildQuery());
      this.plans = response.data;
      this.total = response.meta.total;
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(
        error,
        'The RBAP plans workspace could not be loaded.',
      );
    } finally {
      this.isLoading = false;
    }
  }

  private buildQuery(): PlanListQuery {
    const { officeId, planningYear, status } = this.filterForm.getRawValue();

    return {
      take: this.take,
      skip: this.skip,
      officeId: officeId || undefined,
      planningYear: this.parseYear(planningYear),
      status: status || undefined,
    };
  }

  private parseYear(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
