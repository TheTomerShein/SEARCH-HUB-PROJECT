import type {
  MaterialDetail,
  SearchCriteria,
  SearchResult,
  FieldsConfig,
} from '../types/material';
import { normalizeFieldsConfig } from './normalizeFieldsConfig';
import { logger } from '../../../utils/logger';
import { apiClient, ApiError } from './apiClient';
import { buildSearchRequest } from './buildSearchRequest';
import { normalizeSearchResult } from './normalizeSearchResult';
import type { MaterialService } from './serviceContract';

export class HttpMaterialService implements MaterialService {
  private fieldsConfigCache: FieldsConfig | null = null;

  async getFieldsConfig(): Promise<FieldsConfig> {
    if (this.fieldsConfigCache) return this.fieldsConfigCache;
    logger.info('[HttpMaterialService] GET /api/materials/fields');
    const raw = await apiClient.get<unknown>('/api/materials/fields');
    this.fieldsConfigCache = normalizeFieldsConfig(raw);
    return this.fieldsConfigCache;
  }

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const { inputFields, outputFields } = await this.getFieldsConfig();
    const body = buildSearchRequest(criteria, inputFields);
    logger.info('[HttpMaterialService] POST /api/materials/search', body);
    const raw = await apiClient.post<SearchResult>('/api/materials/search', body);
    return normalizeSearchResult(raw, outputFields);
  }

  async getById(materialNumber: string, werks?: string): Promise<MaterialDetail | null> {
    const qs = werks ? `?werks=${encodeURIComponent(werks)}` : '';
    const path = `/api/materials/${encodeURIComponent(materialNumber)}${qs}`;
    logger.info(`[HttpMaterialService] GET ${path}`);
    try {
      return await apiClient.get<MaterialDetail>(path);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * GET /api/materials/:matnr/mdg-url?werks=
   * Response: `{ "url": "https://..." }` (also accepts url/URL/link/href or raw string).
   * Path template override: VITE_MDG_OPEN_URL_PATH with `{matnr}` placeholder.
   */
  async getMdgOpenUrl(materialNumber: string, werks?: string): Promise<string> {
    const template =
      (import.meta.env.VITE_MDG_OPEN_URL_PATH as string | undefined)?.trim() ||
      '/api/materials/{matnr}/mdg-url';
    const pathBase = template.replace(
      '{matnr}',
      encodeURIComponent(materialNumber),
    );
    const qs = werks ? `?werks=${encodeURIComponent(werks)}` : '';
    const path = `${pathBase}${qs}`;
    logger.info(`[HttpMaterialService] GET ${path}`);
    const raw = await apiClient.get<unknown>(path);
    return parseMdgOpenUrlResponse(raw);
  }
}

/** Accept common backend shapes for the MDG deep-link. */
function parseMdgOpenUrlResponse(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['url', 'URL', 'link', 'href', 'mdgUrl', 'mdg_url'] as const) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  throw new Error('MDG open URL missing in response');
}
