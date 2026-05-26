import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OfficeSummary } from '../../types/office.types';

@Injectable({ providedIn: 'root' })
export class OfficeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/offices`;

  async getAccessibleOffices(): Promise<OfficeSummary[]> {
    return firstValueFrom(this.http.get<OfficeSummary[]>(`${this.baseUrl}/accessible`));
  }
}
