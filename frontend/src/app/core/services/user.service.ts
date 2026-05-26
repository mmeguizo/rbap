import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AssignOfficePayload,
  ChangeRolePayload,
  CreateManagedUserDto,
  ManagedUser,
} from '../../types/user.types';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/user`;

  async getUsers(take = 20, skip = 0): Promise<ManagedUser[]> {
    return firstValueFrom(
      this.http.get<ManagedUser[]>(this.baseUrl, {
        params: { take, skip },
      }),
    );
  }

  async getUsersWithoutOffice(): Promise<ManagedUser[]> {
    return firstValueFrom(this.http.get<ManagedUser[]>(`${this.baseUrl}/without-office`));
  }

  async getUserById(userId: string): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.get<ManagedUser>(`${this.baseUrl}/user-id`, {
        params: { userId },
      }),
    );
  }

  async getUserByEmail(email: string): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.get<ManagedUser>(`${this.baseUrl}/user-email`, {
        params: { email },
      }),
    );
  }

  async createUser(payload: CreateManagedUserDto): Promise<ManagedUser> {
    return firstValueFrom(this.http.post<ManagedUser>(this.baseUrl, payload));
  }

  async changeStatus(userId: string): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.post<ManagedUser>(`${this.baseUrl}/change-user-status`, { userId }),
    );
  }

  async deleteUser(userId: string): Promise<ManagedUser> {
    return firstValueFrom(this.http.post<ManagedUser>(`${this.baseUrl}/delete-user`, { userId }));
  }

  async assignOffice(payload: AssignOfficePayload): Promise<ManagedUser> {
    return firstValueFrom(this.http.post<ManagedUser>(`${this.baseUrl}/assign-office`, payload));
  }

  async assignRole(payload: ChangeRolePayload): Promise<ManagedUser> {
    return firstValueFrom(this.http.post<ManagedUser>(`${this.baseUrl}/assign-role`, payload));
  }
}
