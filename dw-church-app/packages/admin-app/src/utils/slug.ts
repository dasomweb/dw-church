/**
 * Sanitize free text into a safe slug — for the form builder and any other
 * slug-creating field. NO spaces ever: whitespace + any non [a-z0-9_] char
 * becomes an underscore, repeats collapse, and it must start with a letter.
 * Matches the server's slug regex `^[a-z][a-z0-9_]{1,39}$` (min length is
 * enforced server-side on submit).
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_') // spaces & invalid chars → underscore
    .replace(/_+/g, '_') // collapse repeats
    .replace(/^[^a-z]+/, '') // must start with a letter
    .slice(0, 40);
}
