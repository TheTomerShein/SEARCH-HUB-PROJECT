import { useState, useRef, useCallback } from 'react';

/** ResizeObserver-backed size of a mounted element (for react-window height). */
export function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastRef = useRef({ width: 0, height: 0 });

  const ref = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Floor — subpixel RO noise remounts FixedSizeList height every frame.
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        const prev = lastRef.current;
        if (prev.width === width && prev.height === height) return;
        lastRef.current = { width, height };
        setSize({ width, height });
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  return [ref, size] as const;
}
