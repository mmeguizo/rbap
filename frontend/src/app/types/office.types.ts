import type { UserRole } from './auth.types';

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
