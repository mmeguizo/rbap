import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../types/api.types';
import {
  CreatePlanPayload,
  PlanListQuery,
  PlanRecord,
  PlanSummaryResponse,
  UpdatePlanPayload,
} from '../../types/rbap.types';

@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/plans`;

  async getPlans(query: PlanListQuery = {}): Promise<PaginatedResponse<PlanRecord>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<PlanRecord>>(this.baseUrl, {
        params: this.buildParams(query),
      }),
    );
  }

  async getSummary(
    query: Pick<PlanListQuery, 'officeId' | 'planningYear'> = {},
  ): Promise<PlanSummaryResponse> {
    return firstValueFrom(
      this.http.get<PlanSummaryResponse>(`${this.baseUrl}/summary`, {
        params: this.buildParams(query),
      }),
    );
  }

  async getPendingApprovals(query: PlanListQuery = {}): Promise<PaginatedResponse<PlanRecord>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<PlanRecord>>(`${this.baseUrl}/pending-approvals`, {
        params: this.buildParams(query),
      }),
    );
  }

  async getPlan(planId: string): Promise<PlanRecord> {
    return firstValueFrom(this.http.get<PlanRecord>(`${this.baseUrl}/${planId}`));
  }

  async createPlan(payload: CreatePlanPayload): Promise<PlanRecord> {
    return firstValueFrom(this.http.post<PlanRecord>(this.baseUrl, this.normalizePayload(payload)));
  }

  async updatePlan(planId: string, payload: UpdatePlanPayload): Promise<PlanRecord> {
    return firstValueFrom(
      this.http.patch<PlanRecord>(`${this.baseUrl}/${planId}`, this.normalizePayload(payload)),
    );
  }

  async deletePlan(planId: string): Promise<PlanRecord> {
    return firstValueFrom(this.http.delete<PlanRecord>(`${this.baseUrl}/${planId}`));
  }

  async submitPlan(planId: string): Promise<PlanRecord> {
    return firstValueFrom(this.http.patch<PlanRecord>(`${this.baseUrl}/${planId}/submit`, {}));
  }

  async approvePlan(planId: string): Promise<PlanRecord> {
    return firstValueFrom(this.http.patch<PlanRecord>(`${this.baseUrl}/${planId}/approve`, {}));
  }

  private buildParams<T extends object>(query: T): HttpParams {
    let params = new HttpParams();

    Object.entries(query as Record<string, string | number | undefined>).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }

  private normalizePayload(payload: Partial<CreatePlanPayload>): Record<string, string | number> {
    const body: Record<string, string | number> = {};

    if (payload.planningYear !== undefined) {
      body['planningYear'] = payload.planningYear;
    }

    this.assignTrimmed(body, 'campus', payload.campus);
    this.assignTrimmed(body, 'programProjectActivityKRA', payload.programProjectActivityKRA);
    this.assignTrimmed(body, 'strategicAlignment', payload.strategicAlignment);
    this.assignTrimmed(body, 'breakthroughGoals', payload.breakthroughGoals);
    this.assignTrimmed(body, 'strategicObjectives', payload.strategicObjectives);
    this.assignTrimmed(body, 'monitoringFrequency', payload.monitoringFrequency);
    this.assignTrimmed(body, 'reportingOffice', payload.reportingOffice);

    if (payload.datePrepared) {
      body['datePrepared'] = payload.datePrepared;
    }

    return body;
  }

  private assignTrimmed(
    body: Record<string, string | number>,
    key: string,
    value: string | undefined,
  ): void {
    if (!value) {
      return;
    }

    const trimmed = value.trim();
    if (trimmed) {
      body[key] = trimmed;
    }
  }
}
