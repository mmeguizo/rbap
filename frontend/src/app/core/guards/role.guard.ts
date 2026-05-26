import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Blocks non-admin users from admin-only frontend routes.
 * Backend RBAC still remains the real source of truth.
 */
export const adminRoleGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()?.role === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
