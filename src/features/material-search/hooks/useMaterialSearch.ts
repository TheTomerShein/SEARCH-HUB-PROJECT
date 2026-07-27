import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { materialServiceInstance } from '../api/materialService';
import {
  SearchCriteria,
  SearchResult,
  CompareFieldSelector,
  SearchFieldDefinition,
  OutputFieldDefinition,
  dedupeFieldsByName,
} from '../types/material';
import { logger } from '../../../utils/logger';

/** Default page size for infinite / paged searches (env override still wins). */
const PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 80;

/** Strip paging params so query keys stay stable across pages. */
function serializeFilters(criteria: SearchCriteria): Omit<SearchCriteria, '$skip' | '$top'> {
  const { $skip, $top, ...filters } = criteria;
  return filters;
}

/** Same key as useMaterialSearchInfiniteQuery — for cache reads (export) without a second observer. */
export function getSearchInfiniteQueryKey(
  criteria: SearchCriteria,
  pageSize: number = PAGE_SIZE,
) {
  return ['materials', 'search', 'infinite', serializeFilters(criteria), pageSize] as const;
}

export type SearchInfiniteData = InfiniteData<SearchResult, number>;

/**
 * Fetches both input filter fields and output column definitions in one call.
 * Corresponds to: GET /api/materials/fields
 *
 * The result is cached indefinitely (staleTime: Infinity) because field
 * metadata rarely changes during a session.
 */
function useFieldsConfigQuery() {
  return useQuery({
    queryKey: ['materials', 'metadata', 'fieldsConfig'],
    queryFn: async () => {
      try {
        return await materialServiceInstance.getFieldsConfig();
      } catch (error) {
        logger.error('Error fetching fields config', error);
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

/**
 * Convenience selector — returns only the input (filter sidebar) fields
 * from the shared fields-config query.
 * Deduped by fieldName: API may list the same SAP field on multiple tables.
 */
export function useSearchFieldsQuery() {
  const query = useFieldsConfigQuery();
  const data = useMemo((): SearchFieldDefinition[] | undefined => {
    if (!query.data?.inputFields) return undefined;
    return dedupeFieldsByName(query.data.inputFields);
  }, [query.data?.inputFields]);
  return { ...query, data };
}

/**
 * Convenience selector — returns only the output (results table) fields
 * from the shared fields-config query.
 * Deduped by fieldName — row values are also bare fieldName keys.
 */
export function useOutputFieldsQuery() {
  const query = useFieldsConfigQuery();
  const data = useMemo((): OutputFieldDefinition[] | undefined => {
    if (!query.data?.outputFields) return undefined;
    return dedupeFieldsByName(query.data.outputFields);
  }, [query.data?.outputFields]);
  return { ...query, data };
}

/**
 * Paged / infinite-scroll variant of the material search.
 *
 * Uses OData-style $skip / $top supported by MockMaterialService (and the
 * future real OData backend). Each page is fetched lazily as the user scrolls.
 * All pages accumulate in `data.pages`; flatten with:
 *   const items = data.pages.flatMap(p => p.materials)
 *
 * @param criteria  - Filter criteria (do NOT include $skip/$top — managed internally).
 * @param submitted - When true the query is enabled. False prevents firing
 *                    before the user has explicitly searched (real-API mode).
 *                    Mock mode ignores this flag and always runs.
 * @param pageSize  - Records per page (default: PAGE_SIZE = 80).
 */
export function useMaterialSearchInfiniteQuery(
  criteria: SearchCriteria,
  submitted = false,
  pageSize: number = PAGE_SIZE,
) {
  // Mock + real: only fetch after user clicks Search (no fire-on-type / fire-on-mount)
  const enabled = submitted;

  // Strip any stale paging params the caller might have included
  const baseCriteria = serializeFilters(criteria);

  return useInfiniteQuery({
    queryKey: getSearchInfiniteQueryKey(criteria, pageSize),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        return await materialServiceInstance.search({
          ...baseCriteria,
          $skip: pageParam as number,
          $top: pageSize,
        });
      } catch (error) {
        logger.error('Error fetching paged materials', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      // Next skip = total records already fetched across all pages
      return allPages.reduce((sum, p) => sum + p.materials.length, 0);
    },
    enabled,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches the full detail of a single material by its material number.
 * Corresponds to: GET /api/materials/:id
 *
 * - Returns `null` when the material is not found (HTTP 404).
 * - `isError` is set for any other API error (network failure, 5xx, etc.)
 * - Retries are disabled so errors surface immediately without delay.
 */
export function useMaterialDetailsQuery(materialNumber: string | null) {
  return useQuery({
    queryKey: ['materials', 'detail', materialNumber],
    queryFn: async () => {
      try {
        if (!materialNumber) return null;
        return await materialServiceInstance.getById(materialNumber);
      } catch (error) {
        logger.error('Error fetching material details query', error);
        throw error;
      }
    },
    enabled: !!materialNumber,
    retry: false,
  });
}

/**
 * Fetches specific fields for multiple materials for comparison.
 * Corresponds to: POST /api/materials/compare
 */
export function useMaterialCompareQuery(materials: string[], fields: CompareFieldSelector[]) {
  return useQuery({
    queryKey: ['materials', 'compare', materials, fields],
    queryFn: async () => {
      try {
        if (materials.length === 0 || fields.length === 0) return [];
        return await materialServiceInstance.compare({ materials, fields });
      } catch (error) {
        logger.error('Error fetching material compare query', error);
        throw error;
      }
    },
    enabled: materials.length > 0 && fields.length > 0,
    retry: false,
  });
}
