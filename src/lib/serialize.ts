/**
 * Wire format is snake_case (matches Supabase shape so the frontend port is a
 * one-line import swap). Internally Drizzle exposes camelCase JS field names.
 * These helpers convert between the two — top-level keys only; JSONB column
 * values are passed through untouched.
 */

const camelize = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const snakeize = (s: string): string => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Body coming in from a client (snake_case) → keys Drizzle expects (camelCase). */
export function toDb<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) out[camelize(k)] = v;
  }
  return out;
}

/** Drizzle row (camelCase) → response body (snake_case). */
export function fromDb<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeize(k)] = v;
  }
  return out;
}

export const fromDbMany = <T extends Record<string, unknown>>(rows: T[]) => rows.map(fromDb);

/** Strip fields the server controls so a client can't forge ownership / timestamps. */
const PROTECTED_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "user_id", // slide_templates ownership
]);

export function stripProtected<T extends Record<string, unknown>>(body: T): T {
  for (const k of Object.keys(body)) {
    if (PROTECTED_KEYS.has(k)) delete (body as Record<string, unknown>)[k];
  }
  return body;
}
