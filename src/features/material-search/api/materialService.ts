import { 
  Material, 
  MaterialDetail,
  SearchCriteria, 
  SearchResult, 
  SearchFieldDefinition, 
  OutputFieldDefinition,
  FieldsConfig,
  CompareRequest
} from '../types/material';
import { generateMockMaterials } from '../mocks/materialMockGenerator';
import { logger } from '../../../utils/logger';
import { apiClient, ApiError } from './apiClient';

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
   * Returns a full MaterialDetail (including LONG_TEXT, ERNAM, AENAM, etc.)
   * Corresponds to: GET /api/materials/:id
   */
  getById(materialNumber: string): Promise<MaterialDetail | null>;

  /**
   * @deprecated Use getFieldsConfig() instead — kept for internal mock compatibility.
   */
  getSearchFields(): Promise<SearchFieldDefinition[]>;

  /**
   * Fetch specific fields for multiple materials for comparison.
   * Corresponds to: POST /api/materials/compare
   */
  compare(request: CompareRequest): Promise<Partial<MaterialDetail>[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default field lists (shared between mock service and as fallback reference)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_INPUT_FIELDS: SearchFieldDefinition[] = [
  { table_name: 'MARA', field_name: 'MATNR', hebrew_desc: 'materialSearch.filters.materialNumber', field_type: 'CHAR', field_length: 40 },
  { table_name: 'MAKT', field_name: 'MAKTX', hebrew_desc: 'materialSearch.filters.searchPlaceholder', field_type: 'CHAR', field_length: 40 },
  { 
    table_name: 'MARA',
    field_name: 'MTART', 
    hebrew_desc: 'materialSearch.filters.materialType', 
    field_type: 'MULTI_SELECT',
    field_length: 4,
    options: [
      { label: 'materialSearch.enums.materialType.ROH', value: 'ROH' },
      { label: 'materialSearch.enums.materialType.HALB', value: 'HALB' },
      { label: 'materialSearch.enums.materialType.FERT', value: 'FERT' },
      { label: 'materialSearch.enums.materialType.HAWA', value: 'HAWA' }
    ]
  },
  { 
    table_name: 'MARA',
    field_name: 'MBRSH', 
    hebrew_desc: 'materialSearch.details.industrySector', 
    field_type: 'MULTI_SELECT',
    field_length: 1,
    options: [
      { label: 'materialSearch.enums.industrySector.M', value: 'M' },
      { label: 'materialSearch.enums.industrySector.C', value: 'C' },
      { label: 'materialSearch.enums.industrySector.P', value: 'P' },
      { label: 'materialSearch.enums.industrySector.E', value: 'E' }
    ]
  },
  {
    table_name: 'MARA',
    field_name: 'MEINS',
    hebrew_desc: 'materialSearch.filters.baseUnit',
    field_type: 'MULTI_SELECT',
    field_length: 3,
    options: [
      { label: 'PC', value: 'PC' },
      { label: 'KG', value: 'KG' },
      { label: 'L', value: 'L' },
      { label: 'M', value: 'M' },
      { label: 'M2', value: 'M2' },
      { label: 'M3', value: 'M3' }
    ]
  },
  { table_name: 'MARA', field_name: 'ERSDA_START', hebrew_desc: 'materialSearch.filters.startDate', field_type: 'DATS', field_length: 8 },
  { table_name: 'MARA', field_name: 'ERSDA_END', hebrew_desc: 'materialSearch.filters.endDate', field_type: 'DATS', field_length: 8 },
  { table_name: 'MARA', field_name: 'LVORM', hebrew_desc: 'materialSearch.filters.onlyActive', field_type: 'BOOLEAN', field_length: 1 },
  {
    table_name: 'MARC',
    field_name: 'WERKS',
    hebrew_desc: 'materialSearch.filters.plants',
    field_type: 'WERKS_SELECTOR',
    field_length: 4,
    options: [
      { label: '1000 - מפעל ראשי', value: '1000' },
      { label: '2000 - מפעל צפון', value: '2000' },
      { label: '3000 - מפעל דרום', value: '3000' },
      { label: '4000 - מחסן מרכזי', value: '4000' },
      { label: '5000 - חברת בת', value: '5000' }
    ]
  }
];

const DEFAULT_OUTPUT_FIELDS: OutputFieldDefinition[] = [
  { table_name: 'MARA', field_name: 'MATNR', hebrew_desc: 'materialSearch.results.columns.materialNumber', width: 120, field_type: 'CHAR', field_length: 40 },
  { table_name: 'MAKT', field_name: 'MAKTX', hebrew_desc: 'materialSearch.results.columns.description', width: 250, field_type: 'CHAR', field_length: 40 },
  { table_name: 'MARA', field_name: 'MTART', hebrew_desc: 'materialSearch.results.columns.materialType', width: 150, field_type: 'CHAR', field_length: 4 },
  { table_name: 'MARA', field_name: 'MEINS', hebrew_desc: 'materialSearch.results.columns.baseUnit', width: 80, field_type: 'CHAR', field_length: 3 },
  { table_name: 'MARA', field_name: 'LVORM', hebrew_desc: 'materialSearch.details.status', width: 100, field_type: 'BOOLEAN', field_length: 1 },
  { table_name: 'MARA', field_name: 'ERSDA', hebrew_desc: 'materialSearch.results.columns.createdOn', width: 100, field_type: 'DATS', field_length: 8 },
  { table_name: 'MARA', field_name: 'LAEDA', hebrew_desc: 'materialSearch.details.changedOn', width: 100, field_type: 'DATS', field_length: 8 }
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock service (in-browser, no network)
// ─────────────────────────────────────────────────────────────────────────────

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
      inputFields: DEFAULT_INPUT_FIELDS,
      outputFields: DEFAULT_OUTPUT_FIELDS,
    };
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    try {
      await this.simulateDelay();
      logger.info('Performing material search with criteria:', criteria);

      // ── 1. Filter ────────────────────────────────────────────────────────
      const filtered = this.materials.filter((m) => {
        // Exclude deleted items by default
        if (!criteria.LVORM && m.LVORM) return false;

        if (criteria.MATNR) {
          const searchMatnr = criteria.MATNR.trim().toLowerCase();
          const matnr = m.MATNR.toLowerCase();
          if (searchMatnr.endsWith('*')) {
            if (!matnr.startsWith(searchMatnr.slice(0, -1))) return false;
          } else if (searchMatnr.startsWith('*')) {
            if (!matnr.endsWith(searchMatnr.slice(1))) return false;
          } else {
            if (!matnr.includes(searchMatnr)) return false;
          }
        }

        if (criteria.MAKTX) {
          const searchDesc = criteria.MAKTX.trim().toLowerCase();
          if (!m.MAKTX.toLowerCase().includes(searchDesc) && !m.LONG_TEXT.toLowerCase().includes(searchDesc)) return false;
        }

        if (criteria.MTART && criteria.MTART.length > 0 && !criteria.MTART.includes(m.MTART)) return false;
        if (criteria.MBRSH && criteria.MBRSH.length > 0 && !criteria.MBRSH.includes(m.MBRSH)) return false;
        if (criteria.MEINS && criteria.MEINS.length > 0 && !criteria.MEINS.includes(m.MEINS)) return false;
        if (criteria.ERSDA_START || criteria.ERSDA_END) {
          const mDateClean = m.ERSDA.replace(/-/g, ''); // ponytail: normalize YYYY-MM-DD to YYYYMMDD for comparison
          if (criteria.ERSDA_START && mDateClean < criteria.ERSDA_START) return false;
          if (criteria.ERSDA_END && mDateClean > criteria.ERSDA_END) return false;
        }
        
        // Plant filtering with AND/OR logic
        if (criteria.WERKS && criteria.WERKS.length > 0) {
          const logic = criteria.WERKS_LOGIC || 'OR';
          const materialPlants = m.WERKS || [];
          if (logic === 'OR') {
            // Must have at least one of the selected plants
            const hasAny = criteria.WERKS.some(p => materialPlants.includes(p));
            if (!hasAny) return false;
          } else {
            // Must have ALL of the selected plants
            const hasAll = criteria.WERKS.every(p => materialPlants.includes(p));
            if (!hasAll) return false;
          }
        }

        return true;
      });

      const totalCount = filtered.length;
      logger.info(`Found ${totalCount} materials (before paging)`);

      // ── 2. Page (OData-style $skip / $top) ───────────────────────────────
      const skip = criteria.$skip ?? 0;
      const top  = criteria.$top;          // undefined = return all

      const page = top != null
        ? filtered.slice(skip, skip + top)
        : filtered.slice(skip);

      const hasMore = skip + page.length < totalCount;

      logger.info(`Returning ${page.length} materials (skip=${skip}, top=${top ?? 'all'}, hasMore=${hasMore})`);

      return {
        materials: page,
        totalCount,
        hasMore,
        // Populated for mock backwards-compatibility; real API does not include this.
        outputFields: DEFAULT_OUTPUT_FIELDS,
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

      // The mock Material already contains all MaterialDetail fields
      // (LONG_TEXT, ERNAM, AENAM are generated by materialMockGenerator).
      // We cast here to satisfy the richer return type.
      const detail: MaterialDetail = {
        ...material,
        LONG_TEXT: material.LONG_TEXT,
        ERNAM: material.ERNAM,
        AENAM: material.AENAM,
      };
      return detail;
    } catch (error) {
      logger.error(`Failed to fetch material ${materialNumber}`, error);
      throw error;
    }
  }

  async compare(request: CompareRequest): Promise<Partial<MaterialDetail>[]> {
    await this.simulateDelay();
    logger.info(`Comparing materials: ${request.materials.join(', ')} with fields: ${request.fields.map(f => f.field_name).join(', ')}`);
    
    return request.materials.map(matnr => {
      const material = this.materials.find(m => m.MATNR === matnr);
      if (!material) return { MATNR: matnr };
      
      const result: Partial<MaterialDetail> = { MATNR: matnr };
      for (const field of request.fields) {
        if (field.field_name in material) {
          (result as any)[field.field_name] = (material as any)[field.field_name];
        }
      }
      return result;
    });
  }

  /** @deprecated Use getFieldsConfig() */
  async getSearchFields(): Promise<SearchFieldDefinition[]> {
    const config = await this.getFieldsConfig();
    return config.inputFields;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP service (real backend)
// ─────────────────────────────────────────────────────────────────────────────

export class HttpMaterialService implements MaterialService {
  /**
   * GET /api/materials/fields
   *
   * Expected response:
   * {
   *   "inputFields": SearchFieldDefinition[],
   *   "outputFields": OutputFieldDefinition[]
   * }
   */
  async getFieldsConfig(): Promise<FieldsConfig> {
    logger.info('[HttpMaterialService] GET /api/materials/fields');
    return apiClient.get<FieldsConfig>('/api/materials/fields');
  }

  /**
   * POST /api/materials/search
   *
   * Request body: SearchCriteria
   * Expected response:
   * {
   *   "materials": Material[],
   *   "totalCount": number
   * }
   */
  async search(criteria: SearchCriteria): Promise<SearchResult> {
    logger.info('[HttpMaterialService] POST /api/materials/search', criteria);
    return apiClient.post<SearchResult>('/api/materials/search', criteria);
  }

  /**
   * GET /api/materials/:id
   *
   * Expected response: MaterialDetail object, or HTTP 404 (returns null).
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

  async compare(request: CompareRequest): Promise<Partial<MaterialDetail>[]> {
    logger.info('[HttpMaterialService] POST /api/materials/compare', request);
    return apiClient.post<Partial<MaterialDetail>[]>('/api/materials/compare', request);
  }

  /** @deprecated Use getFieldsConfig() */
  async getSearchFields(): Promise<SearchFieldDefinition[]> {
    const config = await this.getFieldsConfig();
    return config.inputFields;
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
