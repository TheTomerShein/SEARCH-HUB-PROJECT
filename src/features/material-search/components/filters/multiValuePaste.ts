/** Paste / dedupe helpers for multi-value filter fields. */

export function asStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter((s) => s.length > 0);
  if (raw == null || raw === '') return [];
  return [String(raw)];
}

export function dedupeStrings(list: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = String(raw).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Split clipboard text into tokens (Excel/CSV/list paste).
 * Supports newlines, tabs, commas, semicolons; multi-space as last resort.
 */
export function parsePasteTokens(text: string, digitsOnly?: boolean): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return [];

  let parts: string[];
  if (/[\n\t,;]/.test(raw)) {
    parts = raw.split(/[\n\t,;]+/);
  } else if (/\s/.test(raw) && raw.split(/\s+/).length > 1) {
    parts = raw.split(/\s+/);
  } else {
    parts = [raw];
  }

  parts = parts.map((s) => s.trim()).filter(Boolean);
  if (digitsOnly) {
    parts = parts.map((s) => s.replace(/\D/g, '')).filter(Boolean);
  }
  return parts;
}

/** Ctrl/Cmd+V → chips (capped + deduped). */
export function handleMultiPaste(
  e: React.ClipboardEvent,
  current: string[],
  onChangeValues: (next: string[]) => void,
  opts?: { digitsOnly?: boolean; resolveToken?: (token: string) => string | null },
) {
  const text = e.clipboardData.getData('text/plain');
  if (!text) return;

  let tokens = parsePasteTokens(text, opts?.digitsOnly);
  if (tokens.length === 0) return;

  if (opts?.resolveToken) {
    tokens = tokens
      .map((t) => opts.resolveToken!(t))
      .filter((t): t is string => t != null && t.length > 0);
  }
  if (tokens.length === 0) return;

  e.preventDefault();
  e.stopPropagation();
  onChangeValues(dedupeStrings([...current, ...tokens]));
}
