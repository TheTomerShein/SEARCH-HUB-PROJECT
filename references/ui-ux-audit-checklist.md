# UI/UX Audit Checklist for Codebase Enhancement

Use this checklist during the audit phase (step 3 in SKILL.md). Go through each category systematically by inspecting actual code files. Mark findings as ✅ Strong, ⚠️ Needs Improvement, or ❌ Critical Issue. Always cite specific file paths and line numbers or component names as evidence.

## 1. Visual Design & Design Language
- [ ] Consistent color palette and semantic color usage across all components (primary, destructive, muted, etc.)
- [ ] Typography scale is defined and consistently applied (no magic font-size values scattered)
- [ ] Spacing scale exists and is used (Tailwind spacing utilities, CSS custom properties, or theme object)
- [ ] Elevation system (shadows, borders, z-index) is coherent and purposeful
- [ ] Visual rhythm and whitespace feel intentional rather than cramped or sparse
- [ ] Icons are from a single consistent icon set/library with uniform sizing and stroke weight
- [ ] Dark mode / theming support implemented and consistent (or clear plan)
- [ ] No obvious visual debt: outdated gradients, clip-art style icons, misaligned elements, low-contrast text

## 2. Layout, Grid & Responsiveness
- [ ] Primary layout uses modern CSS (Grid + Flexbox) rather than floats/tables/position hacks
- [ ] Responsive breakpoints are centralized (Tailwind config, CSS custom media, or single media query file)
- [ ] Mobile experience is first-class: touch targets ≥44×44px, no horizontal scroll on body, readable text without zoom
- [ ] Common layouts (dashboard, forms, lists, modals) adapt gracefully across viewport sizes
- [ ] Container strategy avoids "max-w-screen-xl mx-auto" everywhere without semantic meaning
- [ ] RTL support: logical properties used (margin-inline, padding-inline-start, text-align: start) instead of physical (margin-left/right)
- [ ] No layout shifts (CLS) caused by late-loading content or missing size attributes on images

## 3. Component Architecture & Reusability
- [ ] Clear separation between primitive components (Button, Input, Card) and composite ones (UserProfileCard, CheckoutForm)
- [ ] Components accept `children` / slots for flexibility instead of many boolean props
- [ ] Props are well-typed and documented (TypeScript interfaces or JSDoc)
- [ ] No excessive prop drilling; context or composition used appropriately
- [ ] Shared UI logic (form state, modal open/close, toast) extracted into custom hooks or composables
- [ ] Duplicated JSX/HTML blocks identified and candidates for extraction listed
- [ ] Component folder structure follows clear convention (e.g., component-name/index.tsx + component-name.tsx + types.ts)

## 4. Accessibility (a11y) — WCAG 2.2 AA Target
- [ ] All interactive elements are native or have correct `role` + keyboard handlers
- [ ] Every form control has an associated visible `<label>` or `aria-labelledby`
- [ ] Error messages are programmatically associated with inputs (`aria-describedby`)
- [ ] Focus management in modals, drawers, and dynamic content (focus trap, return focus)
- [ ] Visible focus ring or outline on all focusable elements (never `outline: none` without replacement)
- [ ] Color is never the sole means of conveying information (use icons, text, patterns)
- [ ] Images have meaningful `alt` (or `role="presentation"` + empty alt for decorative)
- [ ] Heading hierarchy is logical (h1 → h2 → h3, not skipping levels for styling)
- [ ] Live regions (`aria-live`) used for dynamic content updates (toasts, validation, loading)
- [ ] `prefers-reduced-motion` respected for all animations and transitions

## 5. Interaction Design & Feedback
- [ ] Every user action that mutates data has immediate visual feedback (loading spinner, optimistic update, or disabled state)
- [ ] Forms provide inline validation with clear, actionable error messages
- [ ] Success states are celebrated (toast, checkmark animation, or confirmation screen)
- [ ] Empty states are helpful and guide the user to next action (not just "No data")
- [ ] Loading states use skeleton screens or meaningful placeholders rather than generic spinners everywhere
- [ ] Micro-interactions exist for key actions (button press scale, hover lift, checkmark draw) but never feel gimmicky
- [ ] Navigation has clear active/selected states and visible hierarchy
- [ ] Destructive actions require confirmation (modal or undo pattern) and are visually distinct (red/destructive variant)

## 6. Performance & Perceived Performance
- [ ] Images use modern formats (WebP/AVIF) with proper `width`/`height` or `fill` + `sizes` attributes
- [ ] Heavy components or routes are lazy-loaded (`React.lazy`, `defineAsyncComponent`, dynamic import)
- [ ] List rendering uses virtualization for long lists (react-window, tanstack/virtual, etc.) or pagination
- [ ] No unnecessary re-renders caused by missing `key` props, unstable callbacks, or broad context usage
- [ ] Animations use `transform` and `opacity` only; `will-change` used judiciously
- [ ] Core Web Vitals awareness: LCP, INP, CLS considered in layout decisions

## 7. Information Architecture & User Flows
- [ ] Primary user tasks can be completed in minimal steps with clear progress indication
- [ ] Related actions are grouped logically; unrelated actions are not competing for attention
- [ ] Breadcrumbs or clear "where am I" indicators exist for deep hierarchies
- [ ] Search, filter, and sort are discoverable and powerful where data volume warrants
- [ ] Onboarding or first-time experience is considered (even if minimal)
- [ ] Error recovery paths are obvious (retry buttons, helpful messages, support links)

## 8. Technical & Maintainability Signals
- [ ] Global styles are minimal and do not override component styles unexpectedly
- [ ] No `!important` abuse or deeply nested CSS selectors (specificity wars)
- [ ] Theme values are single source of truth (no hard-coded colors repeated 50+ times)
- [ ] Console warnings/errors related to UI (React key warnings, accessibility violations, deprecated APIs)
- [ ] Storybook / component explorer exists or would be high-value addition
- [ ] E2E or component tests cover critical UI states (loading, error, empty, success)

## Quick-Scan Red Flags (Investigate Immediately)
- Many `div` elements with `onClick` instead of `button` or `a`
- Hard-coded pixel values for spacing/widths everywhere
- Different button styles in different parts of the app
- Forms that only validate on submit with poor error UX
- Missing `alt` on informative images or missing labels on inputs
- Layout that breaks or requires horizontal scroll below 768px
- No loading state between navigation or data fetch
- Inconsistent icon sizes or multiple icon libraries mixed

## Prioritization Guidance
1. **Critical path first**: Anything that prevents users from completing core tasks or violates accessibility for large user segments.
2. **Quick visual wins**: Typography, spacing consistency, button styles, color usage — high perceived impact with lower risk.
3. **Structural**: Introduce design tokens + primitive component library if missing.
4. **Polish**: Micro-interactions, empty states, advanced a11y, performance.

Use this checklist to produce a factual, file-backed audit report before proposing any code changes.
