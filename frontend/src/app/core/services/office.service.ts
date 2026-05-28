import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateOfficePayload,
  OfficeListResponse,
  OfficeRecord,
  OfficeSummary,
  UpdateOfficePayload,
} from '../../types/office.types';

@Injectable({ providedIn: 'root' })
export class OfficeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/offices`;

  async getAccessibleOffices(): Promise<OfficeSummary[]> {
    return firstValueFrom(this.http.get<OfficeSummary[]>(`${this.baseUrl}/accessible`));
  }

  async getOffices(take = 200, skip = 0): Promise<OfficeListResponse> {
    return firstValueFrom(
      this.http.get<OfficeListResponse>(this.baseUrl, {
        params: { take, skip },
      }),
    );
  }

  async createOffice(payload: CreateOfficePayload): Promise<OfficeRecord> {
    return firstValueFrom(this.http.post<OfficeRecord>(`${this.baseUrl}/add-office`, payload));
  }

  async updateOffice(payload: UpdateOfficePayload): Promise<OfficeRecord> {
    return firstValueFrom(this.http.patch<OfficeRecord>(`${this.baseUrl}/update-office`, payload));
  }

  async deleteOffice(officeId: string): Promise<OfficeRecord> {
    return firstValueFrom(
      this.http.post<OfficeRecord>(`${this.baseUrl}/delete-office`, { officeId }),
    );
  }
}
