import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { materialServiceInstance } from '../api/materialService';
import { SearchCriteria, CompareFieldSelector } from '../types/material';
import { logger } from '../../../utils/logger';

const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

/** Default page size for infinite / paged searches. */
export const PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 200;

/**
 * Strips paging parameters ($skip, $top) from criteria to ensure
 * stable query keys across different pages.
 */
function serializeFilters(criteria: SearchCriteria): Omit<SearchCriteria, '$skip' | '$top'> {
  const { $skip, $top, ...filters } = criteria;
  return filters;
}

/**
 * Fetches both input filter fields and output column definitions in one call.
 * Corresponds to: GET /api/materials/fields
 *
 * The result is cached indefinitely (staleTime: Infinity) because field
 * metadata rarely changes during a session.
 */
export function useFieldsConfigQuery() {
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
 */
export function useSearchFieldsQuery() {
  const query = useFieldsConfigQuery();
  return { ...query, data: query.data?.inputFields };
}

/**
 * Convenience selector — returns only the output (results table) fields
 * from the shared fields-config query.
 */
export function useOutputFieldsQuery() {
  const query = useFieldsConfigQuery();
  return { ...query, data: query.data?.outputFields };
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
 * @param pageSize  - Records per page (default: PAGE_SIZE = 200).
 */
export function useMaterialSearchInfiniteQuery(
  criteria: SearchCriteria,
  submitted = false,
  pageSize: number = PAGE_SIZE,
) {
  const enabled = useRealApi ? submitted : true;

  // Strip any stale paging params the caller might have included
  const baseCriteria = serializeFilters(criteria);

  return useInfiniteQuery({
    queryKey: ['materials', 'search', 'infinite', baseCriteria, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        logger.info(`[useMaterialSearchInfiniteQuery] fetching page at skip=${pageParam}`);
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
