import {
  Material,
  SearchResult,
  apiResultPropName,
  getRowMatnr,
} from '../types/material';

type FieldRef = { tableName: string; fieldName: string };

/**
 * Map one wire search row (maraMatnr, marcWerks, …) → domain bare keys (MATNR, WERKS, …).
 * Keeps original keys too so nothing is lost; domain keys win for UI/export/compare.
 */
function normalizeSearchRow(
  raw: Record<string, unknown>,
  fields: FieldRef[],
): Material {
  const out: Record<string, unknown> = { ...raw };

  for (const f of fields) {
    const bare = f.fieldName;
    if (!bare) continue;
    const apiKey = apiResultPropName(f.tableName, f.fieldName);
    if (Object.prototype.hasOwnProperty.call(raw, apiKey) && raw[apiKey] !== undefined) {
      out[bare] = raw[apiKey];
    } else if (out[bare] === undefined) {
      // already bare / case variants
      const upper = bare.toUpperCase();
      for (const k of Object.keys(raw)) {
        if (k.toUpperCase() === upper) {
          out[bare] = raw[k];
          break;
        }
      }
    }
  }

  const matnrField = fields.find((f) => f.fieldName.toUpperCase() === 'MATNR');
  const matnr = getRowMatnr(out, matnrField ?? { tableName: 'MARA', fieldName: 'MATNR' });
  if (matnr) out.MATNR = matnr;

  return out as unknown as Material;
}

/** Normalize full search payload materials using output field metadata. */
export function normalizeSearchResult(
  result: SearchResult,
  fields: FieldRef[],
): SearchResult {
  const materials = (result.materials ?? []).map((m) =>
    normalizeSearchRow(m as unknown as Record<string, unknown>, fields),
  );
  return {
    materials,
    totalCount: result.totalCount ?? materials.length,
    hasMore:
      typeof result.hasMore === 'boolean'
        ? result.hasMore
        : false,
  };
}
