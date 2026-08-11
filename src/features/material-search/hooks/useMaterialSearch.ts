import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { materialServiceInstance } from '../api/materialService';
import {
  SearchCriteria,
  SearchResult,
  SearchFieldDefinition,
  OutputFieldDefinition,
  dedupeFieldsByName,
} from '../types/material';
import { logger } from '../../../utils/logger';
import { SEARCH_PAGE_SIZE } from '../utils/paging';

const PAGE_SIZE = SEARCH_PAGE_SIZE;

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
 * Current user's plant/branch — runs once at app start.
 * GET /api/user/branch → `{ werks: "XXXX" }`
 */
export function useUserBranchQuery() {
  return useQuery({
    queryKey: ['user', 'branch'],
    queryFn: async () => {
      try {
        return await materialServiceInstance.getUserBranch();
      } catch (error) {
        logger.error('Error fetching user branch', error);
        throw error;
      }
    },
    staleTime: Infinity,
    retry: 1,
  });
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
 * @param submitted - When true the query is enabled (mock and real). False until Search.
 * @param pageSize  - Records per page (default: SEARCH_PAGE_SIZE / VITE_PAGE_SIZE).
 */
export function useMaterialSearchInfiniteQuery(
  criteria: SearchCriteria,
  submitted = false,
  pageSize: number = PAGE_SIZE,
) {
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
 * Fetches full material detail by matnr + plant.
 * Corresponds to: GET /api/materials/:id?werks=...
 *
 * - Returns `null` when the material is not found (HTTP 404).
 * - `isError` is set for any other API error (network failure, 5xx, etc.)
 * - Retries are disabled so errors surface immediately without delay.
 */
export function useMaterialDetailsQuery(
  materialNumber: string | null,
  werks?: string | null,
) {
  return useQuery({
    queryKey: ['materials', 'detail', materialNumber, werks ?? ''],
    queryFn: async () => {
      try {
        if (!materialNumber) return null;
        return await materialServiceInstance.getById(
          materialNumber,
          werks || undefined,
        );
      } catch (error) {
        logger.error('Error fetching material details query', error);
        throw error;
      }
    },
    enabled: !!materialNumber,
    retry: false,
  });
}

