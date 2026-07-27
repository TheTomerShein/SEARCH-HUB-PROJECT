import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import {
  activeSearchFieldsState,
  activeOutputFieldsState,
  activeCompareFieldsState,
} from '../state/search.state';
import { useSearchFieldsQuery, useOutputFieldsQuery } from './useMaterialSearch';
import {
  resolveFieldKeys,
  DEFAULT_CRITERIA_FIELD_NAMES,
  DEFAULT_OUTPUT_FIELD_NAMES,
  DEFAULT_COMPARE_FIELD_NAMES,
} from '../fieldDefaults';

/**
 * When visibility state is still null (first visit / no URL override),
 * seed criteria / output / compare with product defaults
 * (MATNR, WERKS, MATKL, MEINS — names present in config only).
 * Seeds at most once per list so applying a saved search with null ("all fields")
 * is not immediately overwritten.
 */
export function useInitDefaultFields() {
  const { data: searchFields } = useSearchFieldsQuery();
  const { data: outputFields } = useOutputFieldsQuery();
  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [activeOutputFields, setActiveOutputFields] = useRecoilState(activeOutputFieldsState);
  const [activeCompareFields, setActiveCompareFields] = useRecoilState(activeCompareFieldsState);
  const seededSearch = useRef(false);
  const seededOutput = useRef(false);
  const seededCompare = useRef(false);

  useEffect(() => {
    if (!searchFields || seededSearch.current) return;
    if (activeSearchFields !== null) {
      seededSearch.current = true;
      return;
    }
    const keys = resolveFieldKeys(searchFields, DEFAULT_CRITERIA_FIELD_NAMES);
    if (keys.length > 0) setActiveSearchFields(keys);
    seededSearch.current = true;
  }, [searchFields, activeSearchFields, setActiveSearchFields]);

  useEffect(() => {
    if (!outputFields || seededOutput.current) return;
    if (activeOutputFields !== null) {
      seededOutput.current = true;
      return;
    }
    const keys = resolveFieldKeys(outputFields, DEFAULT_OUTPUT_FIELD_NAMES);
    if (keys.length > 0) setActiveOutputFields(keys);
    seededOutput.current = true;
  }, [outputFields, activeOutputFields, setActiveOutputFields]);

  useEffect(() => {
    if (!outputFields || seededCompare.current) return;
    if (activeCompareFields !== null) {
      seededCompare.current = true;
      return;
    }
    const keys = resolveFieldKeys(outputFields, DEFAULT_COMPARE_FIELD_NAMES);
    if (keys.length > 0) setActiveCompareFields(keys);
    seededCompare.current = true;
  }, [outputFields, activeCompareFields, setActiveCompareFields]);
}
