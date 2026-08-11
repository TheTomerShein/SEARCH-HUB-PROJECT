import { ensureMatnrInOutputKeys } from '../fieldDefaults';
import { OutputFieldDefinition, fieldKey } from '../types/material';

/**
 * Columns for results table + Excel.
 * Order = `activeOutputFields` key order (user-controlled).
 * MATNR always first when present in config.
 * `null` active → all catalog fields, MATNR first.
 */
export function resolveOutputColumns(
  allOutputFields: OutputFieldDefinition[] | undefined | null,
  activeOutputFields: string[] | null,
): OutputFieldDefinition[] | undefined {
  if (!allOutputFields) return undefined;

  const byKey = new Map(allOutputFields.map((f) => [fieldKey(f), f]));
  const keys = ensureMatnrInOutputKeys(
    activeOutputFields ?? allOutputFields.map(fieldKey),
    allOutputFields,
  );

  const out: OutputFieldDefinition[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) continue;
    const f = byKey.get(k);
    if (!f) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}
