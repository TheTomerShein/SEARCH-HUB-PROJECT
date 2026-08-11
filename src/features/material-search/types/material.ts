/**
 * Barrel: domain types + row-access helpers.
 * Prefer importing from here for stable call sites.
 *
 * Layout:
 *   domain.ts    — types + plant defaults
 *   rowAccess.ts — fieldKey / getRowFieldValue / getResultRowId
 * Wire adapter for GET fields: api/normalizeFieldsConfig (import from api, not here).
 */
export * from './domain';
export * from './rowAccess';
