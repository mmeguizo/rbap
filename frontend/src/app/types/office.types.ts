import type { UserRole } from './auth.types';
import type { PaginatedResponse } from './api.types';

export interface OfficeSummary {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  head?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface OfficeRecord extends OfficeSummary {
  createdAt: string;
  members?: Array<{ id: string }>;
}

export interface CreateOfficePayload {
  name: string;
  userId?: string;
  parentId?: string;
}

export interface UpdateOfficePayload extends CreateOfficePayload {
  officeId: string;
}

export type OfficeListResponse = PaginatedResponse<OfficeRecord>;
