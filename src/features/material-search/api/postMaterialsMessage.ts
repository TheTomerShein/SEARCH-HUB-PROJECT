import { logger } from '../../../utils/logger';

/**
 * Message shape sent to the external "דוח שגויים" app via window.postMessage.
 * Target should listen for `type === 'MDG_MATERIAL_SEARCH_SELECTION'`.
 * Optional handshake: target posts `{ type: 'MDG_ERRORS_REPORT_READY' }` when ready.
 */
type MaterialsPostMessage = {
  type: 'MDG_MATERIAL_SEARCH_SELECTION';
  materials: string[];
  timestamp: number;
  source: 'mdg-material-search';
};

const READY_TYPE = 'MDG_ERRORS_REPORT_READY';

/** External app URL — set VITE_ERRORS_REPORT_URL in .env.local */
function getErrorsReportUrl(): string {
  return (import.meta.env.VITE_ERRORS_REPORT_URL as string | undefined)?.trim() || '';
}

/** Allowed target origin for postMessage (defaults to origin of URL). */
function getErrorsReportOrigin(url: string): string {
  const override = (import.meta.env.VITE_ERRORS_REPORT_ORIGIN as string | undefined)?.trim();
  if (override) return override;
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return '*';
  }
}

function uniqueMaterials(materials: string[]): string[] {
  return [...new Set(materials.map((m) => String(m).trim()).filter(Boolean))];
}

/**
 * Open the errors-report site and deliver selected MATNRs via postMessage.
 * Retries until the child signals READY or a short timeout elapses.
 */
export function openErrorsReportWithMaterials(materials: string[]): {
  materials: string[];
  popup: Window | null;
} {
  const list = uniqueMaterials(materials);
  if (list.length === 0) {
    throw new Error('No material numbers selected');
  }

  const url = getErrorsReportUrl();
  if (!url) {
    throw new Error(
      'VITE_ERRORS_REPORT_URL is not configured. Set it in .env.local to the target site URL.',
    );
  }

  const targetOrigin = getErrorsReportOrigin(url);
  const payload: MaterialsPostMessage = {
    type: 'MDG_MATERIAL_SEARCH_SELECTION',
    materials: list,
    timestamp: Date.now(),
    source: 'mdg-material-search',
  };

  const popup = window.open(url, 'mdg-errors-report');
  if (!popup) {
    throw new Error('Popup blocked — allow popups for this site and try again');
  }

  logger.info('[openErrorsReportWithMaterials] opened', url, 'materials', list.length);

  let done = false;
  let attempts = 0;
  const maxAttempts = 40; // ~10s @ 250ms

  const post = () => {
    if (done || popup.closed) return;
    try {
      popup.postMessage(payload, targetOrigin === '*' ? '*' : targetOrigin);
      logger.info('[openErrorsReportWithMaterials] postMessage', targetOrigin, list.length);
    } catch (err) {
      logger.error('[openErrorsReportWithMaterials] postMessage failed', err);
    }
  };

  const finish = () => {
    if (done) return;
    done = true;
    window.clearInterval(intervalId);
    window.removeEventListener('message', onReady);
  };

  const onReady = (event: MessageEvent) => {
    if (targetOrigin !== '*' && event.origin !== targetOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if ((data as { type?: string }).type !== READY_TYPE) return;
    post();
    // one more delayed send in case listener registered late
    window.setTimeout(post, 100);
    finish();
  };

  window.addEventListener('message', onReady);

  // Proactive retries (target may not implement READY handshake)
  const intervalId = window.setInterval(() => {
    if (popup.closed) {
      finish();
      return;
    }
    attempts += 1;
    post();
    if (attempts >= maxAttempts) finish();
  }, 250);

  // First attempts
  post();
  window.setTimeout(post, 400);
  window.setTimeout(post, 1000);

  return { materials: list, popup };
}
