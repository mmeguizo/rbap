import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Route guard that blocks unauthenticated users from accessing protected pages.
 *
 * How it works:
 *   - Angular checks this guard before activating any route that declares: canActivate: [authGuard]
 *   - If the user has an access token → allow navigation (return true)
 *   - If no token → redirect to /login (return a UrlTree, not a boolean)
 *
 * Note: This guard only checks if a token *exists* — it does NOT verify the token with the server.
 * Token validity is checked in AuthService.restoreSession() on app startup.
 *
 * Usage in routes (app.routes.ts):
 *   { path: '', component: DefaultLayoutComponent, canActivate: [authGuard], children: [...] }
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Token found — allow the navigation to proceed
    return true;
  }

  // No token — redirect to /login
  // Using createUrlTree instead of navigate() is the Angular-recommended approach
  // because guards can run during initial navigation before the router is fully ready
  return router.createUrlTree(['/login']);
};
