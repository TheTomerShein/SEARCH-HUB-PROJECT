/**
 * Auto-apply starred default saved search only once per full page load.
 * Survives SPA remounts (hero ↔ results); resets on browser refresh.
 */
let appliedThisPageLoad = false;

/** True until the first auto-seed of the user default saved search. */
export function shouldAutoApplyDefaultSavedSearch(): boolean {
  return !appliedThisPageLoad;
}

export function markDefaultSavedSearchApplied(): void {
  appliedThisPageLoad = true;
}
