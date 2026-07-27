import { OutputFieldDefinition } from '../types/material';

const CHECKBOX_COL_WIDTH = 40;
const MATNR_COL_WIDTH = 136;
/** Frozen strip = checkbox + MATNR. */
export const PIN_STRIP_WIDTH = CHECKBOX_COL_WIDTH + MATNR_COL_WIDTH;

export const ROW_HEIGHT = 52;
export const HEADER_HEIGHT = 44;

/**
 * CSS class for scroll-body columns (MATNR only in pin strip).
 */
export function columnClassName(field: OutputFieldDefinition): string {
  const n = (field.fieldName ?? '').toUpperCase();
  const type = (field.fieldType ?? '').toUpperCase();

  if (n === 'MATNR') return 'mdg-result-cell mdg-col-matnr';
  if (n === 'MAKTX' || n === 'LONG_TEXT') return 'mdg-result-cell mdg-col-desc';
  if (n === 'WERKS' || n === 'WERKS_DISP') return 'mdg-result-cell mdg-col-plant';
  if (n === 'LVORM') return 'mdg-result-cell mdg-col-status';
  if (type === 'DATS' || type === 'DATE' || n === 'ERSDA' || n === 'LAEDA') {
    return 'mdg-result-cell mdg-col-date';
  }
  if (n === 'MEINS' || n === 'MTART' || n === 'MBRSH' || n === 'MATKL' || n === 'SPART') {
    return 'mdg-result-cell mdg-col-code';
  }
  if (n === 'ERNAM' || n === 'AENAM') return 'mdg-result-cell mdg-col-user';
  return 'mdg-result-cell mdg-col-flex';
}

export function headerClassName(field: OutputFieldDefinition): string {
  return columnClassName(field).replace('mdg-result-cell', 'mdg-result-header-cell');
}

/**
 * Min width of the scroll strip (excludes pin).
 * Few columns → low min so cells can grow to 100% width.
 * Many columns → sum of min floors so H-scroll still works.
 */
export function estimateScrollMinWidthPx(fields: OutputFieldDefinition[] | undefined): number {
  const OPEN_HINT = 24;
  const body = (fields ?? []).filter((f) => (f.fieldName ?? '').toUpperCase() !== 'MATNR');
  if (body.length === 0) return 200;

  let w = OPEN_HINT;
  for (const f of body) {
    // Use floor mins that match CSS min-width so flex can expand past them
    const n = (f.fieldName ?? '').toUpperCase();
    const type = (f.fieldType ?? '').toUpperCase();
    if (n === 'MAKTX' || n === 'LONG_TEXT') w += 140;
    else if (n === 'WERKS') w += 72;
    else if (n === 'LVORM') w += 100;
    else if (type === 'DATS' || type === 'DATE' || n === 'ERSDA' || n === 'LAEDA') w += 88;
    else if (n === 'MEINS' || n === 'MTART' || n === 'MBRSH' || n === 'MATKL' || n === 'SPART') w += 80;
    else w += 96;
  }
  return w;
}

function isMatnrField(field: { fieldName?: string }): boolean {
  return (field.fieldName ?? '').toUpperCase() === 'MATNR';
}

export function scrollFieldsOnly(
  fields: OutputFieldDefinition[] | undefined,
): OutputFieldDefinition[] {
  return (fields ?? []).filter((f) => !isMatnrField(f));
}

export function findMatnrField(
  fields: OutputFieldDefinition[] | undefined,
): OutputFieldDefinition | undefined {
  return (fields ?? []).find(isMatnrField);
}
