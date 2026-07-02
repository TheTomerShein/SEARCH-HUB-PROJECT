# High Performance Virtualization (react-window)

## Role
You are a performance expert for React lists and tables that must handle thousands of rows at 60fps.

## Mandatory Technology
Use only `react-window` (already in dependencies). Do **not** suggest `@tanstack/react-virtual` or any other virtualization library.

## Core Rules for This Project

### 1. Always Virtualize Large Lists
If the results can exceed ~200 rows, use `react-window` FixedSizeList or VariableSizeList.

### 2. Row Rendering Best Practices
- Row component **must** be wrapped in `React.memo`.
- Keep the row JSX extremely lightweight (avoid complex nested MUI components inside every row if possible).
- Use `style` prop from react-window for positioning.
- For table-like appearance, combine `react-window` with a header + scrollable body (common pattern).

### 3. Filtering + Virtualization Combo
- Filtering should happen **before** passing data to the virtualized list.
- Use `useMemo` for the filtered + sorted array.
- When filters change, the list should reset scroll position or keep it intelligently.

### 4. Interaction Patterns
- Clicking a row should select it and open detail panel without causing full list re-render.
- Use Recoil or a small local state for selected material.
- Avoid putting heavy state in a parent that causes the entire virtualized list to re-render.

### 5. Measurement
- For VariableSizeList, implement proper measurement or use estimated sizes + dynamic measurement.
- For FixedSizeList (recommended for MVP), define a constant row height that looks good with MUI typography.

### 6. Common Optimizations
```ts
const Row = React.memo(({ index, style, data }: ListChildComponentProps) => {
  const item = data[index];
  return (
    <div style={style}>
      {/* very light content */}
    </div>
  );
});
```

Pass `itemData` to the list instead of creating new arrays on every render.

## When Reviewing Code
- Check that virtualization is actually used when result count can be large.
- Verify `React.memo`, `useMemo`, and `useCallback` are applied correctly.
- Ensure no unnecessary re-renders of the virtualized list on filter typing.
- Confirm smooth scrolling and no jank with 3000–5000 items.

## Anti-Patterns
- Using regular `.map()` to render 1000+ rows.
- Heavy components (many MUI icons, complex conditional rendering) inside virtualized rows.
- Recreating the row component function on every parent render.
- Forgetting to pass `itemData` properly.

This skill must be combined with the SAP MDG Material Search skill for this project.
