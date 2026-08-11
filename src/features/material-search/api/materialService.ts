import type { Material, SearchCriteria } from '../types/material';
import { logger } from '../../../utils/logger';
import { isRealApiMode } from '../fieldDefaults';
import { EXPORT_PAGE_SIZE } from '../utils/paging';
import type { MaterialService } from './serviceContract';
import { MockMaterialService } from './MockMaterialService';
import { HttpMaterialService } from './HttpMaterialService';

export type { MaterialService } from './serviceContract';

export const materialServiceInstance: MaterialService = isRealApiMode()
  ? new HttpMaterialService()
  : new MockMaterialService();

logger.info(`[materialService] Using ${isRealApiMode() ? 'HTTP' : 'Mock'} material service`);

/** Fetch all pages for export (batch size EXPORT_PAGE_SIZE). */
export async function fetchAllMaterials(criteria: SearchCriteria): Promise<Material[]> {
  let skip = 0;
  const top = EXPORT_PAGE_SIZE;
  let allMaterials: Material[] = [];
  let hasMore = true;

  while (hasMore) {
    const result = await materialServiceInstance.search({ ...criteria, $skip: skip, $top: top });
    allMaterials = allMaterials.concat(result.materials);
    hasMore = result.hasMore;
    skip += top;
  }

  return allMaterials;
}
