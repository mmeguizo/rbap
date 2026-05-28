import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../types/api.types';
import { CreateRbapItemPayload, GoalRecord, UpdateRbapItemPayload } from '../../types/rbap.types';

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/plans`;

  async getGoals(
    planId: string,
    query: { take?: number; skip?: number } = {},
  ): Promise<PaginatedResponse<GoalRecord>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<GoalRecord>>(`${this.baseUrl}/${planId}/goals`, {
        params: this.buildParams(query),
      }),
    );
  }

  async createGoal(planId: string, payload: CreateRbapItemPayload): Promise<GoalRecord> {
    return firstValueFrom(
      this.http.post<GoalRecord>(`${this.baseUrl}/${planId}/goals`, this.normalizePayload(payload)),
    );
  }

  async updateGoal(
    planId: string,
    goalId: string,
    payload: UpdateRbapItemPayload,
  ): Promise<GoalRecord> {
    return firstValueFrom(
      this.http.patch<GoalRecord>(
        `${this.baseUrl}/${planId}/goals/${goalId}`,
        this.normalizePayload(payload),
      ),
    );
  }

  async deleteGoal(planId: string, goalId: string): Promise<GoalRecord> {
    return firstValueFrom(
      this.http.delete<GoalRecord>(`${this.baseUrl}/${planId}/goals/${goalId}`),
    );
  }

  private buildParams(query: { take?: number; skip?: number }): HttpParams {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }

  private normalizePayload(
    payload: Partial<CreateRbapItemPayload> & UpdateRbapItemPayload,
  ): Record<string, string | number> {
    const body: Record<string, string | number> = {};

    this.assignTrimmed(body, 'resultLevel', payload.resultLevel);
    this.assignTrimmed(body, 'targetResult', payload.targetResult);
    this.assignTrimmed(body, 'keyActions', payload.keyActions);
    this.assignTrimmed(body, 'keyRisk', payload.keyRisk);
    this.assignTrimmed(body, 'mitigationMeasures', payload.mitigationMeasures);
    this.assignTrimmed(body, 'keyPerformanceIndicator', payload.keyPerformanceIndicator);
    this.assignTrimmed(body, 'target', payload.target);
    this.assignTrimmed(body, 'responsibleOfficePerson', payload.responsibleOfficePerson);
    this.assignTrimmed(body, 'timeline', payload.timeline);
    this.assignTrimmed(body, 'fundSource', payload.fundSource);
    this.assignTrimmed(body, 'meansOfVerification', payload.meansOfVerification);

    if (payload.budgetRequirements !== undefined) {
      body['budgetRequirements'] = payload.budgetRequirements;
    }

    if (payload.budgetAllocation !== undefined) {
      body['budgetAllocation'] = payload.budgetAllocation;
    }

    if (payload.status !== undefined) {
      body['status'] = payload.status;
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
