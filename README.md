# MDG Material Search

Modern, high-performance SAP MDG Material Search Screen built with React + Vite + TypeScript.

**Current Status (Laptop Development):**  
Fully working search UI with realistic mock data (thousands of records).  
Designed for **excellent performance** even with 5,000+ results.

**Future Goal (Closed System):**  
Replace mock service with real SAP OData v2/v4 client using the existing `@odata2ts` packages. The architecture and types are prepared for minimal friction during integration.

## Key Features (MVP)

- Advanced search with multiple filters
- Virtualized results list (handles thousands of rows smoothly using `react-window`)
- Fast client-side filtering & sorting
- Detail view / side panel for selected material
- Export to Excel (using `xlsx`)
- Full Hebrew i18n support from day one (RTL-ready structure)
- Excellent error handling, loading states, and retry logic
- Clean architecture + strong TypeScript typing
- Prepared for easy transition to real OData backend
- Good observability via TanStack Query + custom logger

## Tech Stack (Strict - No Unauthorized Packages)

**Core**
- React 18 + Vite + TypeScript
- MUI (Material-UI) v5 + `@mui/lab` + `react-aria-components`
- TanStack React Query v5
- Recoil (state management)
- i18next + react-i18next (Hebrew support)
- react-window (virtualization for performance)
- Axios + @odata2ts packages (prepared for real backend)

**Dev**
- Vitest + Testing Library (tests)
- Prettier + TypeScript

## Project Philosophy & Clean Architecture

This project follows a **feature-sliced + clean architecture** approach optimized for:

- Easy maintenance
- High testability
- Smooth transition from mock → real OData
- Agent-assisted development in Google Antigravity IDE

### Recommended Folder Structure

```
src/
├── app/                          # App-wide providers, theme, i18n config, QueryClient
│   ├── providers/
│   ├── theme/
│   └── i18n/
├── features/
│   └── material-search/          # Main feature (can be split later)
│       ├── api/                  # Service interface + mock + future real impl
│       ├── components/           # All UI components for this feature
│       ├── hooks/                # Custom hooks (useMaterialSearch, useDebouncedValue, etc.)
│       ├── mocks/                # Mock data generator + delay simulation
│       ├── types/                # Domain types (Material, SearchCriteria, etc.)
│       ├── utils/                # Pure functions (filtering, formatting, OData builders)
│       └── MaterialSearchScreen.tsx
├── shared/
│   ├── ui/                       # Reusable MUI wrappers, common components, ErrorBoundary
│   ├── api/                      # Base Axios instance + error handling utilities
│   └── utils/                    # Generic helpers (debounce, formatDate, etc.)
├── lib/                          # OData client config, constants, logger
├── locales/                      # i18n JSON files (en, he)
│   ├── en/
│   └── he/
├── main.tsx
├── App.tsx
└── vite-env.d.ts
```

**Why this structure?**
- Clear ownership per feature
- Types live close to where they are used
- Easy for Antigravity agents to understand and modify specific parts
- Mock and real implementation can coexist behind an interface

## Getting Started (Development)

### 1. Initialize Project

```bash
npm create vite@latest mdg-material-search -- --template react-ts
cd mdg-material-search
```

### 2. Install Dependencies

Copy the exact list you provided earlier into `package.json` and run:

```bash
npm install
```

### 3. Add Testing (Vitest)

We added Vitest because it is the most natural and lightweight choice for Vite projects. If your closed system does not allow it, you can remove it later.

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

Update `vite.config.ts` and add test script.

### 4. Run Development Server

```bash
npm run dev
```

## Working with Google Antigravity IDE

This project was designed to be **agent-friendly**.

### Recommended Workflow in Antigravity

1. Create a new Project pointing to this folder.
2. Use the **Agent Manager** to spawn specialized agents:
   - One agent for UI components & virtualization
   - One agent for service layer & mock data
   - One agent for i18n (Hebrew translations)
   - One agent for tests
3. Always review **Implementation Plan** and **Code Diff** artifacts before approving changes.
4. Use custom Skills (see `skills/` folder or global Antigravity skills).

### Useful Prompts (Copy-Paste into Antigravity)

**Bootstrap the search screen:**
```
Act as a senior React + MUI engineer specialized in high-performance enterprise search UIs.
Create a Material Search Screen that supports thousands of results using react-window virtualization.
Include:
- Advanced filter panel on the left (Material Number, Description, Material Type, Base Unit, Date ranges)
- Virtualized results list (very fast rendering)
- Side detail panel when a row is selected
- Loading, error, and empty states
- Hebrew i18n ready
Use TanStack Query + Recoil where appropriate.
First produce a detailed Implementation Plan artifact.
```

**Improve performance:**
```
Review the current virtualized results component. Suggest and implement improvements for rendering 5000+ rows with complex filtering while keeping 60fps.
```

## Future Backend Integration (Closed System)

When you move to the closed system:

1. Generate real OData client using `@odata2ts/odata2ts` from your SAP MDG `$metadata`.
2. Implement the real version of `MaterialService` interface.
3. Swap the mock import in one place.
4. Most types should already match (we designed them to be close to SAP MDG structures).

The `api/` folder is prepared for both mock and real implementations behind an interface.

## Observability & Error Handling

- TanStack Query provides excellent caching, background refetching, and error states out of the box.
- Custom lightweight logger in `lib/logger.ts` (console + structured in production).
- Global `ErrorBoundary` + per-component error handling.
- All API calls go through a centralized error handler that maps OData/SAP errors nicely.

## Performance Strategy (Critical for 1000s of Results)

- `react-window` virtualization (only render visible rows)
- Memoization (`React.memo`, `useMemo`, `useCallback`)
- Debounced filter inputs
- Client-side filtering optimized with simple loops + early exits (for mock)
- In real backend: push filters to OData `$filter` query
- Avoid heavy re-renders (Recoil selectors + Query key management)

## Scripts

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "format": "prettier --write ."
}
```

## License & Notes

Internal project for SAP MDG Material Search UI development.

---

**Next Steps After Setup**
1. Copy this README into your project root.
2. Create the folder structure.
3. I will generate the core files (types, mock data, service interface, i18n setup, basic screen).
4. We iterate inside Antigravity or here.

This project is built for speed, maintainability, and smooth transition to the real backend.

Let's make the search screen feel incredibly fast even with thousands of materials.
