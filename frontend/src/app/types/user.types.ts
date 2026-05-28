import type { UserRole } from './auth.types';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface OfficeReference {
  id: string;
  name: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
  role: UserRole;
  office: OfficeReference | null;
  hasPassword?: boolean;
}

export interface CreateManagedUserDto {
  email: string;
  name: string;
  role?: UserRole;
  officeId?: string;
}

export interface AssignOfficePayload {
  userId: string;
  officeId?: string | null;
}

export interface ChangeRolePayload {
  userId: string;
  role: UserRole;
}
