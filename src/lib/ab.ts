import { activeExperiments, chooseVariant } from '@/lib/experiments';

const storageKey = (id: string) => `pfp-exp:${id}`;

/**
 * Resolve this browser's variant for every active experiment, assigning and
 * persisting a sticky choice on first encounter. Returns a map keyed by
 * experiment id: `{ [id]: variant }`.
 *
 * Assignments are namespaced per experiment in localStorage, so experiments are
 * independent and adding/removing one never disturbs the others. If localStorage
 * is unavailable (private mode, disabled), falls back to an in-memory roll that
 * stays stable for the page's lifetime and never throws.
 *
 * Client-only — call from a mount effect, not during render/SSR.
 */
export const getAssignments = (): Record<string, string> => {
  const assignments: Record<string, string> = {};
  for (const exp of activeExperiments()) {
    let variant: string | null = null;
    try {
      const stored = window.localStorage.getItem(storageKey(exp.id));
      if (stored !== null && exp.variants.includes(stored)) {
        variant = stored;
      }
    } catch {
      // localStorage unavailable — fall through to a fresh roll.
    }
    if (variant === null) {
      variant = chooseVariant(exp);
      try {
        window.localStorage.setItem(storageKey(exp.id), variant);
      } catch {
        // Can't persist; the returned value still keeps the variant stable for
        // this page load.
      }
    }
    assignments[exp.id] = variant;
  }
  return assignments;
};
