/**
 * Format SAP-style or ISO dates for he-IL UI.
 * Accepts YYYYMMDD or YYYY-MM-DD; empty → em dash.
 */
export function formatDate(
  raw: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!raw) return '—';
  const s = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
  try {
    return new Intl.DateTimeFormat('he-IL', options).format(new Date(s));
  } catch {
    return raw;
  }
}

/** Chip-friendly DD/MM/YYYY from YYYYMMDD (no Intl — pure string). */
export function formatDateChip(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
  }
  return dateStr;
}
