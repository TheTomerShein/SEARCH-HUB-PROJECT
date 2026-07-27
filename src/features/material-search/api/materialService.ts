import { 
  Material, 
  MaterialDetail,
  SearchCriteria, 
  SearchResult, 
  SearchFieldDefinition, 
  OutputFieldDefinition,
  FieldsConfig,
  CompareRequest,
  normalizeFieldsConfig,
} from '../types/material';
import { generateMockMaterials } from '../mocks/materialMockGenerator';
import { logger } from '../../../utils/logger';
import { apiClient, ApiError } from './apiClient';
import { buildSearchRequest } from './buildSearchRequest';
import { matchesMaterialFilters } from './matchMaterialFilters';
import { normalizeSearchResult } from './normalizeSearchResult';
import { mapMaterialToDetail } from './mapMaterialToDetail';

// ─────────────────────────────────────────────────────────────────────────────
// Service interface
// ─────────────────────────────────────────────────────────────────────────────

export interface MaterialService {
  /**
   * Fetch the fields configuration from the backend.
   * Provides both the input filter fields and the output column definitions.
   * Corresponds to: GET /api/materials/fields
   */
  getFieldsConfig(): Promise<FieldsConfig>;

  /**
   * Execute a material search.
   * Corresponds to: POST /api/materials/search
   */
  search(criteria: SearchCriteria): Promise<SearchResult>;

  /**
   * Fetch a single material by its material number.
   * Corresponds to: GET /api/materials/:id
   * Response: MaterialDetail (snake_case wire shape).
   */
  getById(materialNumber: string): Promise<MaterialDetail | null>;

  /**
   * Fetch specific fields for multiple materials for comparison.
   * Corresponds to: POST /api/materials/compare
   */
  compare(request: CompareRequest): Promise<Partial<Material>[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default field lists (shared between mock service and as fallback reference)
// ─────────────────────────────────────────────────────────────────────────────

const MANDT = '100';

const DEFAULT_INPUT_FIELDS: SearchFieldDefinition[] = [
  { tableName: 'MARA', fieldName: 'MATNR', hebrewDesc: 'materialSearch.filters.materialNumber', fieldType: 'CHAR', fieldLength: 40, mandt: MANDT },
  { tableName: 'MAKT', fieldName: 'MAKTX', hebrewDesc: 'materialSearch.filters.searchPlaceholder', fieldType: 'CHAR', fieldLength: 40, mandt: MANDT },
  {
    tableName: 'MARA',
    fieldName: 'MTART',
    hebrewDesc: 'materialSearch.filters.materialType',
    fieldType: 'MULTI_SELECT',
    fieldLength: 4,
    mandt: MANDT,
    options: [
      { label: 'materialSearch.enums.materialType.ROH', value: 'ROH' },
      { label: 'materialSearch.enums.materialType.HALB', value: 'HALB' },
      { label: 'materialSearch.enums.materialType.FERT', value: 'FERT' },
      { label: 'materialSearch.enums.materialType.HAWA', value: 'HAWA' }
    ]
  },
  {
    tableName: 'MARA',
    fieldName: 'MBRSH',
    hebrewDesc: 'materialSearch.details.industrySector',
    fieldType: 'MULTI_SELECT',
    fieldLength: 1,
    mandt: MANDT,
    options: [
      { label: 'materialSearch.enums.industrySector.M', value: 'M' },
      { label: 'materialSearch.enums.industrySector.C', value: 'C' },
      { label: 'materialSearch.enums.industrySector.P', value: 'P' },
      { label: 'materialSearch.enums.industrySector.E', value: 'E' }
    ]
  },
  {
    tableName: 'MARA',
    fieldName: 'MEINS',
    hebrewDesc: 'materialSearch.filters.baseUnit',
    fieldType: 'MULTI_SELECT',
    fieldLength: 3,
    mandt: MANDT,
    options: [
      { label: 'PC', value: 'PC' },
      { label: 'KG', value: 'KG' },
      { label: 'L', value: 'L' },
      { label: 'M', value: 'M' },
      { label: 'M2', value: 'M2' },
      { label: 'M3', value: 'M3' }
    ]
  },
  { tableName: 'MARA', fieldName: 'MATKL', hebrewDesc: 'materialSearch.results.columns.materialGroup', fieldType: 'CHAR', fieldLength: 9, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'ERSDA_START', hebrewDesc: 'materialSearch.filters.startDate', fieldType: 'DATS', fieldLength: 8, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'ERSDA_END', hebrewDesc: 'materialSearch.filters.endDate', fieldType: 'DATS', fieldLength: 8, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'LVORM', hebrewDesc: 'materialSearch.filters.onlyActive', fieldType: 'BOOLEAN', fieldLength: 1, mandt: MANDT },
  {
    tableName: 'MARC',
    fieldName: 'WERKS',
    hebrewDesc: 'materialSearch.filters.plants',
    fieldType: 'WERKS_SELECTOR',
    fieldLength: 4,
    mandt: MANDT,
    options: [
      { label: '1000 - מפעל ראשי', value: '1000' },
      { label: '2000 - מפעל צפון', value: '2000' },
      { label: '3000 - מפעל דרום', value: '3000' },
      { label: '4000 - מחסן מרכזי', value: '4000' },
      { label: '5000 - חברת בת', value: '5000' }
    ]
  }
];

/** Wide mock column set — exercises horizontal scroll + pinned MATNR. */
const DEFAULT_OUTPUT_FIELDS: OutputFieldDefinition[] = [
  { tableName: 'MARA', fieldName: 'MATNR', hebrewDesc: 'materialSearch.results.columns.materialNumber', fieldType: 'CHAR', fieldLength: 40, mandt: MANDT },
  { tableName: 'MAKT', fieldName: 'MAKTX', hebrewDesc: 'materialSearch.results.columns.description', fieldType: 'CHAR', fieldLength: 40, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'MTART', hebrewDesc: 'materialSearch.results.columns.materialType', fieldType: 'CHAR', fieldLength: 4, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'MBRSH', hebrewDesc: 'materialSearch.details.industrySector', fieldType: 'CHAR', fieldLength: 1, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'MEINS', hebrewDesc: 'materialSearch.results.columns.baseUnit', fieldType: 'CHAR', fieldLength: 3, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'MATKL', hebrewDesc: 'materialSearch.results.columns.materialGroup', fieldType: 'CHAR', fieldLength: 9, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'SPART', hebrewDesc: 'materialSearch.results.columns.division', fieldType: 'CHAR', fieldLength: 2, mandt: MANDT },
  { tableName: 'MARC', fieldName: 'WERKS', hebrewDesc: 'materialSearch.results.columns.plants', fieldType: 'CHAR', fieldLength: 4, mandt: MANDT },
  { tableName: 'MARC', fieldName: 'WERKS_DISP', hebrewDesc: 'materialSearch.results.columns.plants', fieldType: 'CHAR', fieldLength: 40, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'BSTME', hebrewDesc: 'materialSearch.results.columns.orderUnit', fieldType: 'CHAR', fieldLength: 3, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'BRGEW', hebrewDesc: 'materialSearch.results.columns.grossWeight', fieldType: 'CHAR', fieldLength: 13, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'NTGEW', hebrewDesc: 'materialSearch.results.columns.netWeight', fieldType: 'CHAR', fieldLength: 13, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'GEWEI', hebrewDesc: 'materialSearch.results.columns.weightUnit', fieldType: 'CHAR', fieldLength: 3, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'VOLUM', hebrewDesc: 'materialSearch.results.columns.volume', fieldType: 'CHAR', fieldLength: 13, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'VOLEH', hebrewDesc: 'materialSearch.results.columns.volumeUnit', fieldType: 'CHAR', fieldLength: 3, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'LVORM', hebrewDesc: 'materialSearch.details.status', fieldType: 'BOOLEAN', fieldLength: 1, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'ERSDA', hebrewDesc: 'materialSearch.results.columns.createdOn', fieldType: 'DATS', fieldLength: 8, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'ERNAM', hebrewDesc: 'materialSearch.details.createdBy', fieldType: 'CHAR', fieldLength: 12, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'LAEDA', hebrewDesc: 'materialSearch.details.changedOn', fieldType: 'DATS', fieldLength: 8, mandt: MANDT },
  { tableName: 'MARA', fieldName: 'AENAM', hebrewDesc: 'materialSearch.details.changedBy', fieldType: 'CHAR', fieldLength: 12, mandt: MANDT },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock service (in-browser, no network)
// ─────────────────────────────────────────────────────────────────────────────

class MockMaterialService implements MaterialService {
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
      inputFields: DEFAULT_INPUT_FIELDS,
      outputFields: DEFAULT_OUTPUT_FIELDS,
    };
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    try {
      await this.simulateDelay();
      // Same criteria → filters path as HTTP (buildSearchRequest)
      const request = buildSearchRequest(criteria, DEFAULT_INPUT_FIELDS);
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

      return {
        materials: page,
        totalCount,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to search materials', error);
      throw error;
    }
  }

  async getById(materialNumber: string): Promise<MaterialDetail | null> {
    try {
      await this.simulateDelay();
      logger.info(`Fetching material details for ${materialNumber}`);
      const material = this.materials.find((m) => m.MATNR === materialNumber);
      if (!material) return null;
      return mapMaterialToDetail(material);
    } catch (error) {
      logger.error(`Failed to fetch material ${materialNumber}`, error);
      throw error;
    }
  }

  async compare(request: CompareRequest): Promise<Partial<Material>[]> {
    await this.simulateDelay();
    logger.info(`Comparing materials: ${request.materials.join(', ')} with fields: ${request.fields.map(f => f.fieldName).join(', ')}`);
    
    return request.materials.map(matnr => {
      const material = this.materials.find(m => m.MATNR === matnr);
      if (!material) return { MATNR: matnr };
      
      const result: Partial<Material> = { MATNR: matnr };
      for (const field of request.fields) {
        if (field.fieldName in material) {
          (result as any)[field.fieldName] = (material as any)[field.fieldName];
        }
      }
      return result;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP service (real backend)
// ─────────────────────────────────────────────────────────────────────────────

class HttpMaterialService implements MaterialService {
  /** Cached fields config — used to map criteria → filter clauses with table_name. */
  private fieldsConfigCache: FieldsConfig | null = null;

  /**
   * GET /api/materials/fields
   *
   * Field items: { fieldLength, fieldName, fieldType, hebrewDesc, mandt, tableName }
   * Wrapped as: { inputFields, outputFields }
   */
  async getFieldsConfig(): Promise<FieldsConfig> {
    if (this.fieldsConfigCache) return this.fieldsConfigCache;
    logger.info('[HttpMaterialService] GET /api/materials/fields');
    const raw = await apiClient.get<unknown>('/api/materials/fields');
    this.fieldsConfigCache = normalizeFieldsConfig(raw);
    return this.fieldsConfigCache;
  }

  /**
   * POST /api/materials/search
   *
   * Request body:
   * {
   *   skip: number,
   *   top: number,
   *   filters: [{ table_name, field_name, operator, values: string[] }]
   * }
   * Expected response:
   * {
   *   "materials": Material[],
   *   "totalCount": number
   * }
   */
  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const { inputFields, outputFields } = await this.getFieldsConfig();
    const body = buildSearchRequest(criteria, inputFields);
    logger.info('[HttpMaterialService] POST /api/materials/search', body);
    const raw = await apiClient.post<SearchResult>('/api/materials/search', body);
    // Wire maraMatnr → domain MATNR at the service seam (UI stays on bare keys)
    return normalizeSearchResult(raw, outputFields);
  }

  /**
   * GET /api/materials/:id
   *
   * Expected response: MaterialDetail (snake_case), or HTTP 404 (returns null).
   */
  async getById(materialNumber: string): Promise<MaterialDetail | null> {
    logger.info(`[HttpMaterialService] GET /api/materials/${materialNumber}`);
    try {
      return await apiClient.get<MaterialDetail>(`/api/materials/${encodeURIComponent(materialNumber)}`);
    } catch (err: unknown) {
      // Treat 404 as "not found" instead of a hard error
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async compare(request: CompareRequest): Promise<Partial<Material>[]> {
    logger.info('[HttpMaterialService] POST /api/materials/compare', request);
    return apiClient.post<Partial<Material>[]>('/api/materials/compare', request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Active service instance
//
// Switch between mock and real API via the VITE_USE_REAL_API env variable.
// Set VITE_USE_REAL_API=true in .env.local to enable the real backend.
// ─────────────────────────────────────────────────────────────────────────────

const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

export const materialServiceInstance: MaterialService = useRealApi
  ? new HttpMaterialService()
  : new MockMaterialService();

logger.info(`[materialService] Using ${useRealApi ? 'HTTP' : 'Mock'} material service`);

/**
 * Utility to fetch all pages of a search query.
 * Handles the $skip and $top pagination logic automatically.
 */
export async function fetchAllMaterials(criteria: SearchCriteria): Promise<Material[]> {
  let skip = 0;
  const top = 500;
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
