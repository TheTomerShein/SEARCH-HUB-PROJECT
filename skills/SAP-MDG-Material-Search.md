# SAP MDG Material Search Skill

## Role
You are an expert in building high-performance SAP MDG-style material search UIs in React + TypeScript + MUI.

## Core Principles
- Performance first: The screen must feel instant even with 5,000+ results. Always use `react-window` virtualization.
- Clean separation: Keep mock implementation and future real OData implementation behind a clear interface.
- Hebrew-first: All user-facing text must go through i18next with Hebrew translations.
- Strong typing: Material entity and search criteria must be well-typed and close to real SAP MDG OData structures.
- Error handling & observability: Every API call and user action must have proper loading, error, and success states.

## Domain Context
This is a search screen for SAP MDG Material Master data.
Typical fields include:
- Material Number (MATNR)
- Description (short & long)
- Material Type (MTART)
- Industry Sector
- Base Unit of Measure (MEINS)
- Plant-level data (optional in MVP)
- Status / Deletion flag
- Creation and change dates

## Technical Constraints (Strict)
- Only use packages already listed in package.json (no new ones without explicit approval).
- Use MUI v5 + react-aria-components for UI.
- Use react-window for virtualization.
- Use TanStack Query v5 for data fetching and caching.
- Use Recoil for client-side UI state when needed.
- Full Hebrew i18n support from the start.

## Code Patterns You Must Follow

### 1. Service Layer Pattern
Always define a `MaterialService` interface first.
```ts
export interface MaterialService {
  search(criteria: SearchCriteria): Promise<SearchResult>;
  getById(materialNumber: string): Promise<Material | null>;
}
```

Then provide `MockMaterialService` and later `ODataMaterialService`.

### 2. Virtualization
For results with thousands of rows:
- Use `react-window` FixedSizeList or VariableSizeList.
- Keep row rendering extremely lightweight.
- Memoize row components.
- Debounce filter changes.

### 3. Filtering Strategy (Mock Phase)
- Perform filtering in memory on the full dataset.
- For very large datasets, consider web workers later (ask first).
- In real OData phase, translate filters to `$filter` query.

### 4. Hebrew & i18n
- All strings in components must use `useTranslation()` from react-i18next.
- Keys should be descriptive: `materialSearch.filters.materialNumber`, `materialSearch.results.columns.description`
- Support RTL direction when Hebrew is active.

### 5. Error Handling
- Use a centralized `handleApiError` utility.
- Show user-friendly messages (especially for SAP-style errors later).
- Log structured errors using the project logger.

### 6. Performance Rules
- `React.memo` on expensive components (especially row renderers).
- `useMemo` for filtered/sorted results.
- `useCallback` for event handlers passed to virtualized rows.
- Keep re-renders minimal when filters change.

## When Generating Code
1. First create or update the TypeScript interfaces in `features/material-search/types/`.
2. Update the service interface if needed.
3. Implement or modify the mock data generator to feel realistic.
4. Build UI components with proper loading/error/empty states.
5. Add Hebrew translation keys.
6. Write or update tests when relevant.

## Anti-Patterns to Avoid
- Rendering thousands of DOM nodes without virtualization.
- Heavy computation on every render without memoization.
- Hard-coded English strings.
- Mixing mock and real logic in the same file.
- Using new npm packages without asking.

## Success Criteria for This Feature
- User can search across 5000+ materials with sub-100ms perceived response.
- Screen feels native and professional (SAP MDG style).
- Easy to replace mock with real OData service.
- Fully bilingual (English/Hebrew) with clean translation files.
- Well tested and observable.
