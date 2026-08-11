type Props = {
  loadedCount: number;
  totalCount: number;
  checkedCount: number;
  showCounts: boolean;
  onClearSelection?: () => void;
};

export function MaterialResultFooter({
  loadedCount = 0,
  totalCount = 0,
  checkedCount = 0,
  showCounts,
  onClearSelection,
}: Props) {
  return (
    <div className="mdg-result-footer" role="status" aria-live="polite">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {showCounts && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mdg-result-footer-pill">
              <span>{loadedCount.toLocaleString('he-IL')}</span>
              <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.7rem' }}>
                / {totalCount.toLocaleString('he-IL')}
              </span>
            </span>
            <span className="mdg-result-footer-pill--muted">רשומות</span>
          </div>
        )}
        {checkedCount > 0 && (
          <button
            type="button"
            className="mdg-result-footer-pill mdg-result-footer-pill--select"
            onClick={onClearSelection}
            title={onClearSelection ? 'נקה בחירה' : undefined}
            disabled={!onClearSelection}
          >
            <span className="mdg-result-footer-dot" aria-hidden />
            {checkedCount} נבחרו
          </button>
        )}
      </div>
    </div>
  );
}
