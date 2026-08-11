import { useRecoilValue } from 'recoil';
import { searchCriteriaState, activeOutputFieldsState } from '../state/search.state';
import { applyCriteriaToUrl } from '../utils/criteriaUrlCodec';

/**
 * Builds a shareable URL matching urlSyncEffect encoding:
 *   flat query params for criteria (arrays comma-joined)
 *   &f=<comma-joined fieldKeys> when output columns are restricted
 *   &c reserved for compare fields (not written here)
 */
function buildShareableUrl(
  criteria: import('../types/material').SearchCriteria,
  outputFields: string[] | null,
): string {
  const url = new URL(window.location.href);
  applyCriteriaToUrl(url, criteria, {
    f: outputFields && outputFields.length > 0 ? outputFields.join(',') : null,
    c: null,
  });
  return url.toString();
}

/**
 * Returns a `copyLink` function that builds the shareable URL from Recoil
 * and copies it to the clipboard. Returns true if copy succeeded.
 */
export function useShareableLink() {
  const criteria = useRecoilValue(searchCriteriaState);
  const outputFields = useRecoilValue(activeOutputFieldsState);

  const copyLink = async (): Promise<boolean> => {
    const url = buildShareableUrl(criteria, outputFields);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  return { copyLink };
}
