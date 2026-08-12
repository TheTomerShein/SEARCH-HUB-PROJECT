import type {
  Material,
  MaterialDetail,
  SearchCriteria,
  SearchResult,
  FieldsConfig,
} from '../types/material';
import { generateMockMaterials } from '../mocks/mockMaterialGenerator';
import { logger } from '../../../utils/logger';
import { buildSearchRequest } from './buildSearchRequest';
import { mockMatchesMaterialFilters } from './mockMatchMaterialFilters';
import { mockMapMaterialToDetail } from './mockMapMaterialToDetail';
import { MOCK_INPUT_FIELDS, MOCK_OUTPUT_FIELDS } from './mockFieldCatalog';
import type { MaterialService } from './serviceContract';

/** In-browser mock data backend (no real HTTP). */
export class MockMaterialService implements MaterialService {
  private mockMaterials: Material[];
  private mockDelayMs: number;

  constructor(mockCount: number = 4000, mockDelayMs: number = 400) {
    this.mockMaterials = generateMockMaterials(mockCount);
    this.mockDelayMs = mockDelayMs;
  }

  private mockSimulateDelay(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, this.mockDelayMs + Math.random() * 200),
    );
  }

  async getFieldsConfig(): Promise<FieldsConfig> {
    await this.mockSimulateDelay();
    logger.info('[MockMaterialService] getFieldsConfig()');
    return {
      inputFields: MOCK_INPUT_FIELDS,
      outputFields: MOCK_OUTPUT_FIELDS,
    };
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    try {
      await this.mockSimulateDelay();
      const request = buildSearchRequest(criteria, MOCK_INPUT_FIELDS);
      logger.info('[MockMaterialService] search', request);

      const filtered = this.mockMaterials.filter((m) =>
        mockMatchesMaterialFilters(m, request.filters),
      );

      const totalCount = filtered.length;
      logger.info(`[MockMaterialService] Found ${totalCount} materials (before paging)`);

      const skip = request.skip;
      const top = request.top;
      const page = filtered.slice(skip, skip + top);
      const hasMore = skip + page.length < totalCount;

      logger.info(
        `[MockMaterialService] Returning ${page.length} (skip=${skip}, top=${top}, hasMore=${hasMore})`,
      );

      return { materials: page, totalCount, hasMore };
    } catch (error) {
      logger.error('[MockMaterialService] search failed', error);
      throw error;
    }
  }

  async getById(materialNumber: string, werks?: string): Promise<MaterialDetail | null> {
    try {
      await this.mockSimulateDelay();
      logger.info(`[MockMaterialService] getById ${materialNumber}`, { werks });
      const material = this.mockMaterials.find((m) => m.MATNR === materialNumber);
      if (!material) return null;
      return mockMapMaterialToDetail(material, werks);
    } catch (error) {
      logger.error(`[MockMaterialService] getById failed ${materialNumber}`, error);
      throw error;
    }
  }

  /** Mock MDG deep-link for local UI testing. */
  async getMdgOpenUrl(materialNumber: string, werks?: string): Promise<string> {
    await this.mockSimulateDelay();
    const q = new URLSearchParams({ matnr: materialNumber });
    if (werks) q.set('werks', werks);
    const url = `https://mdg.example.local/material?${q.toString()}`;
    logger.info('[MockMaterialService] getMdgOpenUrl()', url);
    return url;
  }
}
