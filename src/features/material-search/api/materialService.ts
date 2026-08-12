import type { Material, SearchCriteria } from '../types/material';
import { logger } from '../../../utils/logger';
import { isMockApiMode } from '../fieldDefaults';
import { EXPORT_PAGE_SIZE } from '../utils/paging';
import type { MaterialService } from './serviceContract';
import { MockMaterialService } from './MockMaterialService';
import { HttpMaterialService } from './HttpMaterialService';

export type { MaterialService } from './serviceContract';

/** Real HTTP or mock data service (see `isMockApiMode()` / VITE_USE_REAL_API). */
export const materialServiceInstance: MaterialService = isMockApiMode()
  ? new MockMaterialService()
  : new HttpMaterialService();

logger.info(
  `[materialService] Using ${isMockApiMode() ? 'MockMaterialService' : 'HttpMaterialService'}`,
);

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
