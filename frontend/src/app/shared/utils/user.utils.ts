// Utility functions related to user display.
// These are pure functions — no Angular, no HTTP, no side effects.
// Pure functions are easy to test and reuse anywhere.

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
