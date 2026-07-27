# CODEMAP — MDG Material Search

Living map of **every source file**: role + what lives inside.

**Rule for agents/humans:** when you add, rename, move, or substantially change a file under `src/`, update this document in the same change.

Last updated: 2026-07-27 (dead-code purge; default fields MATNR/WERKS/MATKL/MEINS; multi-filter URL restore)

---

## Entry & shell

| File | Role | What’s inside |
|------|------|----------------|
| `src/main.tsx` | App bootstrap | Mounts React root; side-effect import of `i18n` + global CSS |
| `src/App.tsx` | Root providers + theme | RecoilRoot, QueryClient, MUI theme, Emotion RTL cache, `MaterialSearchScreen`, ErrorBoundary |
| `src/index.css` | Global styles | Base layout; **`.mdg-result-*` row CSS**; hero/criteria chrome |
| `src/components/ErrorBoundary.tsx` | Crash UI | Class boundary; logs + fallback when a child throws |

---

## i18n & shared utils

| File | Role | What’s inside |
|------|------|----------------|
| `src/i18n/i18n.ts` | i18next setup | Hebrew default; side-effect init (no default export) |
| `src/locales/he/translation.json` | Hebrew strings | Filters, results, actions, settings, compare, **דוח שגויים** (button/opened/openFailed) |
| `src/utils/formatDate.ts` | Date display | SAP `YYYYMMDD` / ISO → `he-IL`; `formatDateChip` for filter chips |
| `src/utils/logger.ts` | Console logging | `info` / `error` wrappers |
| `src/hooks/useToast.ts` | Shared snackbar state | `showToast` / open / message / severity for TopBar bulk actions |

---

## Feature: material-search

### Types & defaults

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/types/material.ts` | Domain + wire types | `Material`, criteria, filters, fields config; `fieldKey`, `apiResultPropName`, `getRowFieldValue`, `getRowMatnr`, **`getResultRowId`** / `matnrFromResultRowId`, config normalizers |
| `src/features/material-search/fieldDefaults.ts` | Product defaults | **First-visit keys: MATNR, WERKS, MATKL, MEINS** for criteria / output / compare; `resolveFieldKeys`, `ensureMatnrInOutputKeys`, `isRealApiMode` |

### State

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/state/search.state.ts` | Recoil atoms | Criteria (**URL sync**; multi-values split on `,` restore), submitted flag, saved searches (localStorage), active search/output/compare fields (output/compare URL `f`/`c`), **checked row ids**, **`searchListMetaState`**, compare open, filter drawer, selected MATNR for detail |

### API layer

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/api/apiClient.ts` | HTTP client | Axios instance, CSRF, `ApiError`, get/post helpers |
| `src/features/material-search/api/buildSearchRequest.ts` | Criteria → API body | Flat UI criteria → `{ skip, top, filters[] }` with operators (internals: `toFilterValues`, `resolveOperator`) |
| `src/features/material-search/api/matchMaterialFilters.ts` | Mock filter eval | Client-side filter matching for mock service (`matchesMaterialFilters`) |
| `src/features/material-search/api/normalizeSearchResult.ts` | Wire → domain rows | `maraMatnr` etc. → bare `MATNR` / field names for UI |
| `src/features/material-search/api/materialService.ts` | Service seam | `MaterialService` interface; private Mock + HTTP classes; **`materialServiceInstance`**; `fetchAllMaterials` paging helper |
| `src/features/material-search/api/postMaterialsMessage.ts` | External handoff | Open **דוח שגויים** URL + `postMessage` selected MATNRs (`openErrorsReportWithMaterials`) |

### Feature utils

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/utils/resolveOutputColumns.ts` | Column selection | Active output field keys → ordered `OutputFieldDefinition[]` (MATNR first) |
| `src/features/material-search/utils/projectRowsForExport.ts` | Excel projection | Rows + fields → plain objects for `xlsx` via `getRowFieldValue` |
| `src/features/material-search/utils/columnLayout.ts` | Table column CSS + pin widths | `PIN_STRIP_WIDTH`, `ROW_HEIGHT`, `HEADER_HEIGHT`, scroll vs MATNR split, column/header class names, min scroll width |

### Hooks

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/hooks/useMaterialSearch.ts` | React Query | Fields config, infinite search (**enabled only when submitted**, page size 80 / `VITE_PAGE_SIZE`, **staleTime 30s**), `getSearchInfiniteQueryKey`, detail, compare |
| `src/features/material-search/hooks/useResultRowSelection.ts` | Checkbox selection | Toggle/select-all by **`getResultRowId`** (MATNR+plant) |
| `src/features/material-search/hooks/useInitDefaultFields.ts` | Seed field visibility | When state is `null` (first visit / no URL override): seed search/output/compare with product defaults |
| `src/features/material-search/hooks/useLayoutMode.ts` | Breakpoints + drawer | `isLgUp` / `isMdUp`, filter drawer open atom |
| `src/features/material-search/hooks/useElementSize.ts` | ResizeObserver | Container size for virtual list height |
| `src/features/material-search/hooks/useShareableLink.ts` | Share URL | Builds URL from criteria + output fields; clipboard copy |
| `src/features/material-search/hooks/useBulkMaterialActions.ts` | Export/copy actions | Shared resolve-rows + Excel/clipboard for TopBar |

### Mocks

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/mocks/materialMockGenerator.ts` | Deterministic mock data | LCG generator for thousands of materials |

### Screens & chrome

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/components/MaterialSearchScreen.tsx` | Main layout | Hero vs results shell; sidebar / drawer; mounts list, detail, compare; runs `useInitDefaultFields` |
| `src/features/material-search/components/TopBar.tsx` | App chrome | Brand + counts; export / copy / compare; **דוח שגויים** via postMessage; settings; share link |
| `src/features/material-search/components/SearchSidebar.tsx` | Criteria shell | Draft criteria, Search/Clear; hero + sidebar modes; wraps filters + saved searches |
| `src/features/material-search/components/MaterialSearchFilters.tsx` | Criteria form fields | Dynamic fields by type; freeSolo multi chips; **draft only — search on submit/Enter only** |
| `src/features/material-search/components/ActiveFilterChips.tsx` | Applied filter chips | Edit applied criteria chips under results |
| `src/features/material-search/components/SavedSearches.tsx` | Named searches | `onApplySaved` → criteria + field keys; parent remounts form (`formEpoch`); no auto-search |
| `src/features/material-search/components/FieldSettingsDialog.tsx` | Field visibility UI | Tabs: search / output / compare; reset → product defaults |
| `src/features/material-search/components/VirtualizedMaterialList.tsx` | Results orchestrator | Dual virtual lists: **frozen MATNR pin** + H-scroll body; scrollY synced |
| `src/features/material-search/components/MaterialDetailPanel.tsx` | Detail dialog | Opens on row click (not MATNR chip); material hero + cards |
| `src/features/material-search/components/MaterialCompareView.tsx` | Compare fullscreen | 2–4 unique MATNRs; field grid with **`getRowFieldValue`** |

### Results list pieces (`resultList/`)

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/components/resultList/MaterialResultRow.tsx` | Virtual row | `mode: pin \| scroll` — frozen checkbox+MATNR vs scrolling cells |
| `src/features/material-search/components/resultList/MaterialResultHeader.tsx` | Headers | Pin header (select-all + MATNR) + scroll headers; vertical lists synced |
| `src/features/material-search/components/resultList/MaterialResultFooter.tsx` | List footer counts | Loaded/total + selection count |
| `src/features/material-search/components/resultList/MaterialListStates.tsx` | Loading / error / empty | Skeleton, error retry, empty state |
| `src/features/material-search/components/resultList/formatResultCell.tsx` | Cell formatting | Hot path returns **strings**; MATNR only is a native button chip |

### Detail pieces (`detail/`)

| File | Role | What’s inside |
|------|------|----------------|
| `src/features/material-search/components/detail/DetailParts.tsx` | Detail UI atoms | `InfoCard`, `TimelineRow`, `DetailLoadingSkeleton` |

---

## Key seams (don’t bypass)

1. **`materialServiceInstance` / `MaterialService`** — only mock/HTTP implementation switch  
2. **`buildSearchRequest`** — only path UI criteria → API filters  
3. **`normalizeSearchResult`** — only path API row → domain bare keys  
4. **`getRowFieldValue`** — preferred read of any field on a result/compare row  
5. **`getResultRowId`** — checkbox / export selection identity (not bare MATNR alone)  
6. **`resolveOutputColumns`** — shared table + Excel column set  
7. **`fieldDefaults` + `useInitDefaultFields`** — first-visit field visibility  

---

## Performance notes (current)

- Search infinite query runs **only when `searchSubmitted`** (mock and real).  
- **Page size default 80** (`VITE_PAGE_SIZE` override).  
- **staleTime 30s** on infinite search.  
- Typing criteria updates **draft only**; no debounce auto-search.  
- **List is sole infinite-query observer**; TopBar uses `searchListMetaState` + `getQueryData`.  
- Row ids precomputed; custom `rowPropsAreEqual` limits check/focus re-renders.  
- Result rows: plain CSS classes (no per-cell Emotion `sx`).  
- Cells: string formatting except MATNR button; bare `fieldName` after normalize.  
- Export: selected columns only; xlsx dynamic import.  

---

## Removed / not present (do not re-add without need)

| Former | Why gone |
|--------|----------|
| `useDebounce.ts` | Filters no longer auto-search on type |
| `MaterialTransferScreen.tsx` + `submitMaterials.ts` + `transferSessionState` | Never mounted; **דוח שגויים** uses `postMaterialsMessage` instead |
| `SelectionActionBar.tsx` | Actions live in TopBar |
| `estimateColumnWidthPx` | Unused after pin/scroll layout |

---

## Changelog of this map

| Date | Note |
|------|------|
| 2026-07-27 | Dead-code purge (transfer screen, debounce, unused exports); multi-filter URL restore; defaults MATNR/WERKS/MATKL/MEINS for search+output+compare |
| 2026-07-26 | UI polish: selection bar, column layout, status pills, criteria sections/dirty, quieter theme |
| 2026-07-26 | Perf pass: page size 80, searchListMeta, row CSS + custom memo, cheap cells, staleTime 30s, light hero |
| 2026-07-26 | Initial CODEMAP; split result list + detail parts; export utils; `useToast`; no auto-search; search enabled only after submit |
