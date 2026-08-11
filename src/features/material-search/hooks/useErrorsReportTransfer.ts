import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { openErrorsReportWithMaterials } from '../api/postMaterialsMessage';

/** Open external errors-report app and post selected MATNRs. */
export function useErrorsReportTransfer() {
  const { t } = useTranslation();

  const openErrorsReport = useCallback(
    (matnrs: string[]): { ok: boolean; count?: number; message?: string } => {
      if (matnrs.length === 0) {
        return { ok: false, message: t('materialSearch.transfer.openFailed', 'פתיחת דוח שגויים נכשלה') };
      }
      try {
        const { materials } = openErrorsReportWithMaterials(matnrs);
        return { ok: true, count: materials.length };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error
              ? err.message
              : t('materialSearch.transfer.openFailed', 'פתיחת דוח שגויים נכשלה'),
        };
      }
    },
    [t],
  );

  return { openErrorsReport };
}
