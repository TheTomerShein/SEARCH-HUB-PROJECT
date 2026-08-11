/** Infinite-scroll page size (override with VITE_PAGE_SIZE). */
export const SEARCH_PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 80;

/** Default `top` when criteria omit $top (buildSearchRequest). */
export const REQUEST_DEFAULT_TOP = 200;

/** Batch size when exporting full result set (fetchAllMaterials). */
export const EXPORT_PAGE_SIZE = 500;
