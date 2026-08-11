import type {
  MaterialDetail,
  SearchCriteria,
  SearchResult,
  FieldsConfig,
} from '../types/material';

export interface MaterialService {
  getFieldsConfig(): Promise<FieldsConfig>;
  search(criteria: SearchCriteria): Promise<SearchResult>;
  getById(materialNumber: string, werks?: string): Promise<MaterialDetail | null>;
  /**
   * GET URL for opening this material in SAP MDG UI.
   * Backend returns `{ url: "https://..." }` (or plain string); caller opens it immediately.
   */
  getMdgOpenUrl(materialNumber: string, werks?: string): Promise<string>;
}
