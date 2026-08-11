import type {
  Material,
  MaterialDetail,
  SearchCriteria,
  SearchResult,
  FieldsConfig,
} from '../types/material';
import { generateMockMaterials } from '../mocks/materialMockGenerator';
import { logger } from '../../../utils/logger';
import { buildSearchRequest } from './buildSearchRequest';
import { matchesMaterialFilters } from './matchMaterialFilters';
import { mapMaterialToDetail } from './mapMaterialToDetail';
import { MOCK_INPUT_FIELDS, MOCK_OUTPUT_FIELDS } from './mockFieldCatalog';
import type { MaterialService } from './serviceContract';

export class MockMaterialService implements MaterialService {
  private materials: Material[];
  private delayMs: number;

  constructor(mockCount: number = 4000, delayMs: number = 400) {
    this.materials = generateMockMaterials(mockCount);
    this.delayMs = delayMs;
  }

  private simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.delayMs + Math.random() * 200));
  }

  async getFieldsConfig(): Promise<FieldsConfig> {
    await this.simulateDelay();
    logger.info('[MockMaterialService] getFieldsConfig()');
    return {
      inputFields: MOCK_INPUT_FIELDS,
      outputFields: MOCK_OUTPUT_FIELDS,
    };
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    try {
      await this.simulateDelay();
      const request = buildSearchRequest(criteria, MOCK_INPUT_FIELDS);
      logger.info('Performing material search with request:', request);

      const filtered = this.materials.filter((m) =>
        matchesMaterialFilters(m, request.filters),
      );

      const totalCount = filtered.length;
      logger.info(`Found ${totalCount} materials (before paging)`);

      const skip = request.skip;
      const top = request.top;
      const page = filtered.slice(skip, skip + top);
      const hasMore = skip + page.length < totalCount;

      logger.info(`Returning ${page.length} materials (skip=${skip}, top=${top}, hasMore=${hasMore})`);

      return { materials: page, totalCount, hasMore };
    } catch (error) {
      logger.error('Failed to search materials', error);
      throw error;
    }
  }

  async getById(materialNumber: string, werks?: string): Promise<MaterialDetail | null> {
    try {
      await this.simulateDelay();
      logger.info(`Fetching material details for ${materialNumber}`, { werks });
      const material = this.materials.find((m) => m.MATNR === materialNumber);
      if (!material) return null;
      return mapMaterialToDetail(material, werks);
    } catch (error) {
      logger.error(`Failed to fetch material ${materialNumber}`, error);
      throw error;
    }
  }

  /** Mock MDG deep-link for local UI testing. */
  async getMdgOpenUrl(materialNumber: string, werks?: string): Promise<string> {
    await this.simulateDelay();
    const q = new URLSearchParams({ matnr: materialNumber });
    if (werks) q.set('werks', werks);
    const url = `https://mdg.example.local/material?${q.toString()}`;
    logger.info('[MockMaterialService] getMdgOpenUrl()', url);
    return url;
  }
}
