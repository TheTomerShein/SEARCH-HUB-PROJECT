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
import type { MaterialService, UserBranch } from './serviceContract';

function parseUserBranch(raw: unknown): UserBranch | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const w = r.werks ?? r.WERKS ?? r.Werks;
  if (w == null || w === '') return null;
  const werks = String(w).trim();
  return werks ? { werks } : null;
}

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
   * GET /api/user/branch → `{ werks: "XXXX" }`
   * Override path with VITE_USER_BRANCH_PATH if needed.
   */
  async getUserBranch(): Promise<UserBranch | null> {
    const path =
      (import.meta.env.VITE_USER_BRANCH_PATH as string | undefined)?.trim() ||
      '/api/user/branch';
    logger.info(`[HttpMaterialService] GET ${path}`);
    try {
      const raw = await apiClient.get<unknown>(path);
      return parseUserBranch(raw);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        logger.info('[HttpMaterialService] getUserBranch: 404 — no branch for user');
        return null;
      }
      throw err;
    }
  }
}
