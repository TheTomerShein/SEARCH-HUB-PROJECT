# CODEMAP — MDG Material Search

Living map of **every source file**: role + what lives inside.

**Rule for agents/humans:** when you add, rename, move, or substantially change a file under `src/`, update this document in the same change.

Last updated: 2026-08-06 (architecture split: types/service seams, credentials env-only, shared formatters/URL codec)

---

## Entry & shell

| File | Role | What’s inside |
|------|------|----------------|
| `src/main.tsx` | App bootstrap | Mounts React root; side-effect import of `i18n` + global CSS |
| `src/App.tsx` | Root providers + theme | RecoilRoot, QueryClient, MUI theme, Emotion RTL cache, `MaterialSearchScreen`, ErrorBoundary |
| `src/index.css` | Global styles | Base layout; **`.mdg-result-*` row CSS**; hero/criteria chrome |
| `src/components/ErrorBoundary.tsx` | Crash UI | Class boundary; logs + fallback when a child throws |
| `src/components/SherlokBrand.tsx` | Brand mark + wordmark | SVG detective magnifier; TopBar + hero |

---

## i18n & shared utils

| File | Role | What’s inside |
|------|------|----------------|
| `src/i18n/i18n.ts` | i18next setup | Hebrew default; side-effect init (no default export) |
| `src/locales/he/translation.json` | Hebrew strings | Filters, results, actions, settings, compare, **דוח שגויים** |
| `src/utils/formatDate.ts` | Date display | SAP `YYYYMMDD` / ISO → `he-IL`; `formatDateChip` for filter chips |
| `src/utils/logger.ts` | Console logging | `info` / `error` wrappers |
| `src/hooks/useToast.ts` | Shared snackbar state | `showToast` / open / message / severity for TopBar bulk actions |

---

## Feature: material-search

### Types & defaults

| File | Role | What’s inside |
|------|------|----------------|
| `types/domain.ts` | Domain + wire types | `Material`, `SearchCriteria`, `MaterialDetail` (snake_case wire), field defs, `DEFAULT_WERKS_*`; field-identity layer note |
| `types/rowAccess.ts` | Row/key helpers | `fieldKey`, `apiResultPropName`, `getRowFieldValue`, `getRowMatnr`, **`getResultRowId`** / parse helpers, `FALLBACK_MATNR_FIELD` |
| `types/material.ts` | Barrel | Re-exports `domain` + `rowAccess` only (no api) |
| `fieldDefaults.ts` | Product defaults | **`DEFAULT_FIELD_NAMES`** (criteria/output/compare aliases); `resolveFieldKeys`, `ensureMatnrInOutputKeys`, **`isRealApiMode`** |
| `defaultCriteria.ts` | Cleared criteria | `{}` shared by clear + filters |

### State

| File | Role | What’s inside |
|------|------|----------------|
| `state/search.state.ts` | Recoil atoms | Criteria (**URL sync** via `criteriaUrlCodec`), submitted, saved searches, active fields (`f`/`c`), **checked row ids**, **`searchListMetaState`**, compare open, filter drawer, **`selectedResultRowIdState`** (detail; Recoil key still `selectedMaterialNumber`) |

### API layer

| File | Role | What’s inside |
|------|------|----------------|
| `api/apiClient.ts` | HTTP client | Axios, CSRF, optional env Basic auth (`VITE_API_BASIC_*`), never hardcoded secrets |
| `api/serviceContract.ts` | Service interface | `MaterialService` |
| `api/materialService.ts` | Factory + export pager | **`materialServiceInstance`**, `fetchAllMaterials` (`EXPORT_PAGE_SIZE`) |
| `api/MockMaterialService.ts` | Mock impl | In-memory search/detail |
| `api/HttpMaterialService.ts` | HTTP impl | fields cache, search + normalize, getById |
| `api/mockFieldCatalog.ts` | Mock field lists | `MOCK_INPUT_FIELDS` / `MOCK_OUTPUT_FIELDS` |
| `api/buildSearchRequest.ts` | Criteria → API body | Flat UI → `{ skip, top, filters[] }` |
| `api/matchMaterialFilters.ts` | Mock filter eval | `matchesMaterialFilters` |
| `api/normalizeSearchResult.ts` | Wire → domain rows | `maraMatnr` → bare keys |
| `api/normalizeFieldsConfig.ts` | Wire → field meta | Casing/OData/ABAP types (import from **api**, not types barrel) |
| `api/mapMaterialToDetail.ts` | Mock list → detail | Wire-shaped detail for mock |
| `api/postMaterialsMessage.ts` | External handoff | Open **דוח שגויים** + `postMessage` |

### Feature utils

| File | Role | What’s inside |
|------|------|----------------|
| `utils/resolveOutputColumns.ts` | Column selection | Active keys **in user order** → table + Excel (MATNR pinned first) |
| `utils/projectRowsForExport.ts` | Excel projection | Rows + fields → plain objects via `getRowFieldValue` + `formatFieldValueAsString` |
| `utils/columnLayout.ts` | Table layout | Pin widths, row/header heights, scroll fields |
| `utils/criteriaUrlCodec.ts` | URL encode/decode | Shared by atom effect + share link |
| `utils/formatFieldValue.ts` | String formatters | Shared list/compare/export field text |
| `utils/paging.ts` | Page sizes | `SEARCH_PAGE_SIZE`, `REQUEST_DEFAULT_TOP`, `EXPORT_PAGE_SIZE` |

### Hooks

| File | Role | What’s inside |
|------|------|----------------|
| `hooks/useMaterialSearch.ts` | React Query | Fields, infinite search, detail |
| `hooks/useResultRowSelection.ts` | Checkbox selection | By `getResultRowId` |
| `hooks/useInitDefaultFields.ts` | Seed field visibility | First visit / no URL override |
| `hooks/useLayoutMode.ts` | Breakpoints + drawer | |
| `hooks/useElementSize.ts` | ResizeObserver | List viewport height |
| `hooks/useShareableLink.ts` | Share URL | Flat params via `criteriaUrlCodec` |
| `hooks/useBulkMaterialActions.ts` | Export/copy | Cache selection or `fetchAllMaterials`; `getRowMatnr` for copy |
| `hooks/useClearSearch.ts` | Clear search | Cancel query + reset criteria/submitted/selection |
| `hooks/useErrorsReportTransfer.ts` | Errors-report handoff | Wraps `postMaterialsMessage` for UI |

### Mocks

| File | Role | What’s inside |
|------|------|----------------|
| `mocks/materialMockGenerator.ts` | Deterministic mock data | LCG generator |

### Screens & chrome

| File | Role | What’s inside |
|------|------|----------------|
| `components/MaterialSearchScreen.tsx` | Main layout | Hero vs results; list, detail, compare |
| `components/TopBar.tsx` | App chrome | Counts, export/copy/compare, errors-report, settings, share |
| `components/SearchSidebar.tsx` | Criteria shell | Draft criteria, Search/Clear, saved searches |
| `components/MaterialSearchFilters.tsx` | Criteria form | Dynamic fields; draft only until submit |
| `components/filters/multiValuePaste.ts` | Multi-value paste | Paste parse/dedupe helpers |
| `components/ActiveFilterChips.tsx` | Applied chips | |
| `components/SavedSearches.tsx` | Named searches | |
| `components/FieldSettingsDialog.tsx` | Field visibility + **output column order** (↑↓) |
| `components/VirtualizedMaterialList.tsx` | Results orchestrator | Dual pin/scroll virtual lists |
| `components/MaterialDetailPanel.tsx` | Detail dialog | `selectedResultRowIdState` → matnr/werks |
| `components/MaterialCompareView.tsx` | Compare fullscreen | Local result rows only (no compare API) |

### Results list (`resultList/`)

| File | Role | What’s inside |
|------|------|----------------|
| `MaterialResultRow.tsx` | Virtual row | pin \| scroll; **`getRowFieldValue`** |
| `MaterialResultHeader.tsx` | Headers | |
| `MaterialResultFooter.tsx` | Counts | |
| `MaterialListStates.tsx` | Loading/error/empty | |
| `formatResultCell.tsx` | Cell format | MATNR chip + `formatFieldValueAsString` |

### Detail (`detail/`)

| File | Role | What’s inside |
|------|------|----------------|
| `DetailParts.tsx` | Detail UI atoms | `InfoCard`, `TimelineRow`, skeleton |

---

## Key seams (don’t bypass)

1. **`materialServiceInstance` / `MaterialService`** (`serviceContract` + Mock/Http)  
2. **`buildSearchRequest`** — UI criteria → API filters  
3. **`normalizeSearchResult`** — API row → domain bare keys  
4. **`normalizeFieldsConfig`** — GET fields wire adapter  
5. **`getRowFieldValue` / `getResultRowId`** — row read + selection identity  
6. **`resolveOutputColumns`** — table + Excel columns  
7. **`fieldDefaults` + `useInitDefaultFields`** — first-visit visibility  
8. **`criteriaUrlCodec`** — criteria URL encode/decode  

---

## Performance notes (current)

- Infinite query **only when `searchSubmitted`** (mock and real).  
- Page size default **80** (`SEARCH_PAGE_SIZE` / `VITE_PAGE_SIZE`).  
- **staleTime 30s** on infinite search.  
- Typing criteria = draft only.  
- List sole infinite-query observer; TopBar uses `searchListMetaState`.  
- Row ids precomputed; custom row memo; plain CSS cells.  
- Export: selected columns; xlsx dynamic import; batch `EXPORT_PAGE_SIZE`.  

---

## Removed / not present (do not re-add without need)

| Former | Why gone |
|--------|----------|
| `useDebounce.ts` | No auto-search on type |
| `MaterialTransferScreen` + transfer session | **דוח שגויים** via `postMaterialsMessage` / `useErrorsReportTransfer` |
| Hardcoded Basic auth in `apiClient` | Env-only optional Basic; prefer session cookies |

---

## Changelog of this map

| Date | Note |
|------|------|
| 2026-08-06 | Split types (`domain`/`rowAccess`), service (Mock/Http/catalog/contract), URL codec, format helpers, clear/transfer hooks; credentials env-only; `selectedResultRowIdState` |
| 2026-07-27 | Dead-code purge; multi-filter URL restore; defaults MATNR/WERKS/MATKL/MEINS |
| 2026-07-26 | UI polish / perf pass / initial CODEMAP |
