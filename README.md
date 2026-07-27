# MDG Material Search

High-performance SAP MDG material search UI — React + Vite + TypeScript + MUI.

**Status:** Feature-complete search screen with mock data and optional real HTTP API  
(`VITE_USE_REAL_API=true`). Results virtualized for thousands of rows.

## Features

- Advanced filters (dynamic fields from `/api/materials/fields`)
- Virtualized results (`react-window`)
- Field visibility settings (search / output / compare); MATNR locked on output
- Material detail dialog + multi-material compare
- Export Excel, copy MATNRs, shareable filter URL
- Hebrew i18n + RTL
- Mock service or real backend behind `MaterialService`

## Tech stack

| Layer | Choice |
|--------|--------|
| UI | React 18, MUI v5, Emotion, RTL (stylis-plugin-rtl) |
| Data | TanStack Query v5, Recoil |
| HTTP | Axios + CSRF interceptors |
| i18n | i18next (he) |
| List | react-window |
| Export | xlsx (dynamic import) |

No OData client packages in use currently; HTTP REST shapes are implemented directly.

## Actual project layout

```
src/
├── main.tsx
├── App.tsx                 # Theme, RTL cache, QueryClient, Recoil
├── index.css
├── components/
│   └── ErrorBoundary.tsx
├── utils/
│   ├── formatDate.ts
│   └── logger.ts
├── hooks/
│   └── useToast.ts
├── i18n/
│   └── i18n.ts
├── locales/he/translation.json
└── features/material-search/
    ├── api/
    │   ├── apiClient.ts
    │   ├── buildSearchRequest.ts
    │   ├── matchMaterialFilters.ts
    │   ├── normalizeSearchResult.ts
    │   ├── postMaterialsMessage.ts  # דוח שגויים postMessage
    │   └── materialService.ts
    ├── components/                  # Screens, dialogs, resultList/, detail/
    ├── hooks/
    ├── mocks/
    ├── utils/                       # columns, export projection
    ├── state/search.state.ts
    ├── types/material.ts
    └── fieldDefaults.ts
skills/                              # Agent skills (optional)
```

**Seams that matter**

1. `MaterialService` — mock vs HTTP  
2. `buildSearchRequest` — only path from flat UI criteria to API filters  
3. `normalizeSearchResult` — only path from API row shape to domain materials  

## Getting started

```bash
npm install
npm run dev
```

### Real API

Create `.env.local` (do **not** commit secrets):

```env
VITE_USE_REAL_API=true
VITE_API_BASE_URL=
# Prefer proxy/session auth — never hardcode passwords in source
```

```bash
npm run build
npm run preview
```

## Search API contract (HTTP)

**POST `/api/materials/search`**

```json
{
  "skip": 0,
  "top": 200,
  "filters": [
    {
      "table_name": "MARA",
      "field_name": "MATNR",
      "operator": "CP",
      "values": ["100*"]
    }
  ]
}
```

Response materials may use wire keys (`maraMatnr`, …). The HTTP service normalizes them to bare SAP names (`MATNR`, …) before the UI.

## Scripts

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # preview production build
```

Prettier is available as a devDependency; no test runner is wired yet (pure helpers under `api/` are good first unit-test targets).

## Observability

- TanStack Query for cache / loading / error  
- `utils/logger.ts`  
- `ErrorBoundary` + per-query error UI  

## License

Internal SAP MDG material search UI.
