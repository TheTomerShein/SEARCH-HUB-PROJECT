import { memo } from 'react';
import { ListChildComponentProps } from 'react-window';
import type { TFunction } from 'i18next';
import {
  Material,
  OutputFieldDefinition,
  fieldKey,
  getResultRowId,
  getRowFieldValue,
  FALLBACK_MATNR_FIELD,
} from '../../types/material';
import { formatResultCell } from './formatResultCell';
import { columnClassName } from '../../utils/columnLayout';

type RowMode = 'pin' | 'scroll';

export type MaterialResultItemData = {
  mode: RowMode;
  items: Material[];
  rowIds: string[];
  focusedIndex: number;
  hoveredIndex: number;
  onHover: (index: number) => void;
  /** Opens detail for this result row (getResultRowId: matnr or matnr+werks). */
  onSelect: (rowId: string) => void;
  t: TFunction;
  /** Columns for this list only (pin: MATNR; scroll: rest). */
  columns: OutputFieldDefinition[];
  checkedSet: Set<string>;
  onToggleCheck: (rowId: string) => void;
  onCopyMatnr: (matnr: string) => void;
};

function rowPropsAreEqual(
  prev: Readonly<ListChildComponentProps>,
  next: Readonly<ListChildComponentProps>,
): boolean {
  if (prev.index !== next.index) return false;
  const ps = prev.style as { top?: number; height?: number; width?: number | string };
  const ns = next.style as { top?: number; height?: number; width?: number | string };
  if (ps.top !== ns.top || ps.height !== ns.height || ps.width !== ns.width) return false;

  const a = prev.data as MaterialResultItemData;
  const b = next.data as MaterialResultItemData;
  if (a.mode !== b.mode) return false;
  if (a.items !== b.items || a.rowIds !== b.rowIds || a.columns !== b.columns) return false;
  if (a.t !== b.t) return false;
  if (
    a.onSelect !== b.onSelect ||
    a.onToggleCheck !== b.onToggleCheck ||
    a.onCopyMatnr !== b.onCopyMatnr ||
    a.onHover !== b.onHover
  ) {
    return false;
  }

  const id = a.rowIds[prev.index] ?? '';
  if (a.checkedSet.has(id) !== b.checkedSet.has(id)) return false;
  if ((prev.index === a.focusedIndex) !== (next.index === b.focusedIndex)) return false;
  if ((prev.index === a.hoveredIndex) !== (next.index === b.hoveredIndex)) return false;
  return true;
}

function rowStateClass(
  isChecked: boolean,
  isFocused: boolean,
  isHovered: boolean,
  isEven: boolean,
): string {
  let className = 'mdg-result-row';
  if (isChecked) className += ' mdg-result-row--checked';
  else if (isFocused) className += ' mdg-result-row--focused';
  else if (isEven) className += ' mdg-result-row--even';
  if (isHovered) className += ' mdg-result-row--hovered';
  return className;
}

function MaterialResultRowInner({ index, style, data }: ListChildComponentProps) {
  const {
    mode,
    items,
    focusedIndex,
    hoveredIndex,
    onHover,
    onSelect,
    t,
    columns,
    checkedSet,
    onToggleCheck,
    onCopyMatnr,
    rowIds,
  } = data as MaterialResultItemData;

  const item = items[index] as Material;
  const matnr = item.MATNR ?? '';
  const rowId = rowIds[index] || getResultRowId(item);
  const isChecked = rowId ? checkedSet.has(rowId) : false;
  const isFocused = index === focusedIndex;
  const isHovered = index === hoveredIndex;
  const isEven = index % 2 === 0;
  const rec = item as unknown as Record<string, unknown>;
  const baseClass = rowStateClass(isChecked, isFocused, isHovered, isEven);

  if (mode === 'pin') {
    const matnrField = columns[0];
    const val = matnrField ? (getRowFieldValue(rec, matnrField) ?? matnr) : matnr;

    return (
      <div
        style={style}
        className={`${baseClass} mdg-result-row--pin`}
        onClick={() => onSelect(rowId)}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(-1)}
        role="row"
        aria-selected={isChecked}
      >
        <div
          role="cell"
          className="mdg-result-check"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(rowId);
          }}
        >
          <input
            type="checkbox"
            className="mdg-result-checkbox"
            checked={isChecked}
            onChange={() => onToggleCheck(rowId)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${rowId || matnr}`}
          />
        </div>
        <div role="cell" className="mdg-result-cell mdg-col-matnr mdg-col-matnr--pinned">
          {formatResultCell(matnrField ?? FALLBACK_MATNR_FIELD, val, t, { onCopyMatnr })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`${baseClass} mdg-result-row--scroll`}
      onClick={() => onSelect(rowId)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(-1)}
      role="row"
      aria-selected={isChecked}
    >
      {columns.map((field: OutputFieldDefinition) => {
        const val = getRowFieldValue(rec, field);
        return (
          <div key={fieldKey(field)} role="cell" className={columnClassName(field)}>
            {formatResultCell(field, val, t, { onCopyMatnr })}
          </div>
        );
      })}
      <div className="mdg-result-open-hint" aria-hidden title="פתח פרטים">
        ›
      </div>
    </div>
  );
}

export const MaterialResultRow = memo(MaterialResultRowInner, rowPropsAreEqual);
