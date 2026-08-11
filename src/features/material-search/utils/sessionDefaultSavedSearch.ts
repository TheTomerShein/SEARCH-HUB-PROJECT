/**
 * Page-load gate for auto-seeding the starred default saved search.
 *
 * - Default is seeded on every SearchSidebar mount until suppressed.
 * - Suppress only when user clears filters (empty form stays empty until F5).
 * - Module flag survives SPA remounts + React Strict Mode double-mount;
 *   resets on full browser refresh.
 */
let suppressedThisPageLoad = false;

/** True when user cleared filters this page load — do not re-seed default. */
export function isDefaultAutoSeedSuppressed(): boolean {
  return suppressedThisPageLoad;
}

/** Call from clear-filters paths only. */
export function suppressDefaultAutoSeed(): void {
  suppressedThisPageLoad = true;
}

/** @deprecated use isDefaultAutoSeedSuppressed — kept for any leftover imports */
export function shouldAutoApplyDefaultSavedSearch(): boolean {
  return !suppressedThisPageLoad;
}

/** @deprecated use suppressDefaultAutoSeed */
export function markDefaultSavedSearchApplied(): void {
  suppressedThisPageLoad = true;
}
