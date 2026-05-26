// Utility functions related to user display.
// These are pure functions — no Angular, no HTTP, no side effects.
// Pure functions are easy to test and reuse anywhere.

import type { UserRole } from '../../types/auth.types';

/**
 * Derives initials from a full name string.
 * Used to display the avatar badge when no profile photo is available.
 *
 * Examples:
 *   getUserInitials("Mark Meguizo")  → "MM"
 *   getUserInitials("John")          → "J"
 *   getUserInitials("")              → "?"
 *   getUserInitials("  ")            → "?"
 */
export function getUserInitials(name: string): string {
  // Guard: return a fallback if the name is empty or just whitespace
  if (!name?.trim()) return '?';

  return name
    .trim()
    .split(' ') // e.g. ["Mark", "Meguizo"]
    .filter((part) => part.length > 0) // remove accidental double-spaces
    .slice(0, 2) // use at most 2 words
    .map((part) => part[0].toUpperCase()) // take the first letter of each word
    .join(''); // join: "M" + "M" = "MM"
}

/**
 * Converts backend role codes into UI labels that read naturally.
 * Example: VICE_PRESIDENTS → Vice Presidents
 */
export function formatUserRole(role: UserRole): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
