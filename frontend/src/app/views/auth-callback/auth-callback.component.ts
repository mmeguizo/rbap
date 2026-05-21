import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/**
 * AuthCallbackComponent — the "landing page" after Google OAuth login.
 *
 * This page is NEVER opened by the user directly.
 * It is opened automatically when the backend redirects after a successful Google login.
 *
 * ─── Full flow ───
 *
 *  1. User clicks "Login with Google" on the login page
 *  2. AuthService.loginWithGoogle() redirects browser to:
 *       GET /api/v1/auth/google
 *  3. Backend (Google OAuth) redirects to Google's login screen
 *  4. User signs in with their @chmsu.edu.ph Google account
 *  5. Google redirects back to backend:
 *       GET /api/v1/auth/google/callback
 *  6. Backend issues tokens and redirects the browser here:
 *       /#/auth/callback?access_token=xxx&refresh_token=yyy
 *  7. THIS component runs:
 *       a. Reads access_token and refresh_token from the URL query params
 *       b. Calls AuthService.handleCallback() → stores tokens, fetches user profile
 *       c. Navigates to /dashboard
 *
 * The user sees a brief loading spinner while steps a–c happen.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  // Minimal inline template — just a loading spinner.
  // No routing or CoreUI modules needed here.
  template: `
    <div
      class="min-vh-100 d-flex align-items-center justify-content-center"
      style="background: linear-gradient(135deg, #f0f4f1 0%, #e8f0ea 100%)"
    >
      <div class="text-center p-4">
        <!-- Spinner shown while tokens are processed -->
        <div
          class="spinner-border mb-3"
          role="status"
          style="width: 3.5rem; height: 3.5rem; color: var(--rbap-sidebar-accent, #2d5c3a)"
        >
          <span class="visually-hidden">Signing you in…</span>
        </div>
        <p class="text-muted mb-1">Signing you in, please wait…</p>
        <p class="text-muted" style="font-size: 0.8rem; opacity: 0.6">RBAP · CHMSU</p>
      </div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  async ngOnInit(): Promise<void> {
    // Read tokens from URL query params.
    // Angular's hash-based router parses:
    //   /#/auth/callback?access_token=xxx&refresh_token=yyy
    // into: path = '/auth/callback', queryParams = { access_token, refresh_token }
    const accessToken = this.route.snapshot.queryParamMap.get('access_token');
    const refreshToken = this.route.snapshot.queryParamMap.get('refresh_token');

    // Sanity check: if tokens are missing the backend had an error
    if (!accessToken || !refreshToken) {
      console.error('[AuthCallback] Tokens missing in callback URL — redirecting to login');
      await this.router.navigate(['/login']);
      return;
    }

    try {
      // Store tokens in localStorage, fetch user profile, update the currentUser signal
      await this.authService.handleCallback(accessToken, refreshToken);

      // Navigate to the main dashboard — the user is now logged in
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('[AuthCallback] Failed to finish sign-in after Google callback', error);
      await this.router.navigate(['/login']);
    }
  }
}
