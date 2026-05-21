// All TypeScript types related to authentication and user profiles.
// These must match exactly what the backend returns from /auth/me
// and from /auth/google/callback (via the redirect URL).

// ─────────────────────────────────────────────
// Enums / Unions
// ─────────────────────────────────────────────

/**
 * All possible user roles.
 * Must stay in sync with the Role enum in: backend/prisma/schema.prisma
 */
export type UserRole = 'ADMIN' | 'PRESIDENTS' | 'VICE_PRESIDENTS' | 'DIRECTORS' | 'OFFICE_HEAD';

// ─────────────────────────────────────────────
// Response shapes — match the backend exactly
// ─────────────────────────────────────────────

/**
 * The full user profile returned by GET /auth/me.
 * This is what gets stored in localStorage and the AuthService signal.
 */
export interface UserProfile {
  id: string;

  /** The user's @chmsu.edu.ph email address */
  email: string;

  /** The user's display name, sourced from their Google account on first login */
  name: string;

  /** URL to the user's Google profile picture, or null if not set */
  avatar: string | null;

  /** Whether the account is currently allowed to log in */
  status: 'ACTIVE' | 'INACTIVE';

  /** The user's access level in the system */
  role: UserRole;

  /** True if the user has set a local password (in addition to Google login) */
  hasPassword: boolean;

  /** The office this user belongs to, or null if not assigned yet */
  office: { id: string; name: string } | null;
}

/**
 * The token pair returned by all login endpoints.
 * Matches: { access_token, refresh_token } from auth.service.ts → issueTokens()
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}
