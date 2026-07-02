import { useRecoilValue } from 'recoil';
import { searchCriteriaState, activeOutputFieldsState } from '../state/search.state';
import { SearchCriteria } from '../types/material';

/**
 * Builds a shareable URL that encodes the full search snapshot:
 *   ?q=<criteria JSON>  — all active filter criteria (generic, covers every field)
 *   &f=<fields JSON>    — the ordered list of visible output columns (only when not "show all")
 *
 * The encoding is intentionally generic: we simply JSON-serialize the
 * `SearchCriteria` object, so any future fields added to the type are
 * automatically included without touching this hook.
 */
function buildShareableUrl(criteria: SearchCriteria, outputFields: string[] | null): string {
  const url = new URL(window.location.href);
  url.search = ''; // ponytail: flush everything, rebuild
  if (!(Object.keys(criteria).length === 1 && criteria.LVORM === false)) {
    Object.entries(criteria).forEach(([k, v]) => {
      if (v != null && v !== '' && (!Array.isArray(v) || v.length > 0)) {
        url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    });
  }
  if (outputFields && outputFields.length > 0) url.searchParams.set('f', outputFields.join(','));
  return url.toString();
}

/**
 * Returns a `copyLink` function that, when called, builds the shareable URL
 * from the current Recoil state and copies it to the clipboard.
 * Returns a Promise<boolean> — true if the copy succeeded.
 */
export function useShareableLink() {
  const criteria = useRecoilValue(searchCriteriaState);
  const outputFields = useRecoilValue(activeOutputFieldsState);

  const copyLink = async (): Promise<boolean> => {
    const url = buildShareableUrl(criteria, outputFields);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error('Failed to copy shareable link', err);
      return false;
    }
  };

  return { copyLink };
}
