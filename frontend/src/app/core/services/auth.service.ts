import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserProfile } from '../../types/auth.types';

// ─────────────────────────────────────────────
// localStorage key constants
// Defined here so they are easy to find and change in one place.
// ─────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'rbap_access_token';
const REFRESH_TOKEN_KEY = 'rbap_refresh_token';
const USER_PROFILE_KEY = 'rbap_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Angular's HTTP client — used to call backend endpoints
  private readonly http = inject(HttpClient);
  // Angular's router — used to navigate after login/logout
  private readonly router = inject(Router);

  /**
   * Reactive signal that holds the currently logged-in user.
   *
   * Read this in any component to get the user's name, role, etc.
   * It automatically updates when the user logs in or logs out.
   *
   * Example in a component:
   *   protected readonly currentUser = this.authService.currentUser;
   *   // In template: {{ currentUser()?.name }}
   */
  readonly currentUser = signal<UserProfile | null>(null);

  // ──────────────────────────────────────────────────
  // Step 1 of login: redirect to Google
  // ──────────────────────────────────────────────────

  /**
   * Starts the Google OAuth login flow.
   *
   * This redirects the entire browser window to the backend's Google auth endpoint.
   * Google will show a login/consent screen.
   * After the user signs in, Google redirects back to the backend callback,
   * which then redirects to our /#/auth/callback page with the tokens.
   */
  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  // ──────────────────────────────────────────────────
  // Step 2 of login: handle the callback
  // ──────────────────────────────────────────────────

  /**
   * Called by AuthCallbackComponent after the backend redirects back here.
   *
   * What this does:
   *   1. Saves the access token and refresh token to localStorage
   *   2. Calls GET /auth/me with the new token to fetch the full user profile
   *   3. Saves the user profile to localStorage (survives page refresh)
   *   4. Updates the currentUser signal so all components react immediately
   */
  async handleCallback(accessToken: string, refreshToken: string): Promise<void> {
    // Save tokens first — the interceptor will attach the access token
    // to the next request automatically (the GET /auth/me call below)
    this.saveTokens(accessToken, refreshToken);

    // Ask the backend for the full user profile
    const user = await this.fetchMe();

    if (!user) {
      // If the profile cannot be loaded, the login flow is incomplete.
      // Clear the temporary tokens so the app does not open the dashboard in a broken state.
      this.clearSession();
      throw new Error('Unable to load the authenticated user profile.');
    }

    // Save profile to localStorage so the user stays logged in after a page refresh
    this.saveUser(user);
    // Update the signal — all components reading currentUser() will react
    this.currentUser.set(user);
  }

  // ──────────────────────────────────────────────────
  // Fetch user profile from the backend
  // ──────────────────────────────────────────────────

  /**
   * Calls GET /auth/me and returns the full user profile.
   *
   * The auth interceptor automatically attaches the Bearer token from localStorage.
   * Returns null if the token is missing, expired, or the user is inactive.
   *
   * Trail: GET /auth/me → JwtAuthGuard → JWT strategy → UsersService.findById()
   *        → returns { id, name, email, role, avatar, office, hasPassword }
   */
  async fetchMe(): Promise<UserProfile | null> {
    try {
      // firstValueFrom converts the Observable to a one-time Promise
      return await firstValueFrom(this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`));
    } catch {
      // 401 Unauthorized → token invalid or expired
      // 403 Forbidden    → user account is INACTIVE
      return null;
    }
  }

  // ──────────────────────────────────────────────────
  // Session management
  // ──────────────────────────────────────────────────

  /**
   * Called by APP_INITIALIZER when the Angular app first loads (before any component renders).
   *
   * Purpose: restore the user session so the user stays logged in after a page refresh.
   *
   * What this does:
   *   1. If no access token in localStorage → do nothing (user is not logged in)
   *   2. Load the cached user profile from localStorage instantly (no HTTP call)
   *   3. Verify the token is still valid by calling GET /auth/me
   *   4. If valid → update the signal with fresh profile data
   *   5. If invalid (expired/revoked) → clear session, force re-login
   */
  async restoreSession(): Promise<void> {
    // No token stored — the user hasn't logged in yet
    if (!this.isAuthenticated()) return;

    // Load the previously saved user from localStorage for instant display
    const storedUser = this.loadUser();
    if (storedUser) {
      this.currentUser.set(storedUser);
    }

    // Verify the token is still accepted by the backend
    const freshUser = await this.fetchMe();
    if (freshUser) {
      // Token is valid — update cache and signal with the latest data
      this.saveUser(freshUser);
      this.currentUser.set(freshUser);
    } else {
      // Token expired or the account was deactivated → force logout
      this.clearSession();
    }
  }

  /**
   * Logs out the current user.
   * Clears all tokens and user data from localStorage, then navigates to /login.
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ──────────────────────────────────────────────────
  // Token + auth state checks
  // ──────────────────────────────────────────────────

  /**
   * Returns true if an access token exists in localStorage.
   * Does NOT verify whether the token is still accepted by the server.
   * (That check happens in restoreSession and the auth guard.)
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Returns the stored access token string, or null if not logged in.
   * Used by the auth interceptor to attach the Bearer header.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  // ──────────────────────────────────────────────────
  // Private helpers — not accessible outside this service
  // ──────────────────────────────────────────────────

  /** Saves both tokens to localStorage */
  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** Serializes and saves the user profile to localStorage */
  private saveUser(user: UserProfile): void {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  }

  /**
   * Loads the cached user profile from localStorage.
   * Returns null if nothing is stored or if the JSON is corrupted.
   */
  private loadUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      // Corrupted JSON — remove it so it doesn't cause issues next time
      localStorage.removeItem(USER_PROFILE_KEY);
      return null;
    }
  }

  /** Removes all RBAP session data from localStorage and resets the signal to null */
  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    this.currentUser.set(null);
  }
}
