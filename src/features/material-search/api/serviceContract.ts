import type {
  MaterialDetail,
  SearchCriteria,
  SearchResult,
  FieldsConfig,
} from '../types/material';

/** GET user branch — wire shape `{ werks: "XXXX" }`. */
export type UserBranch = {
  werks: string;
};

export interface MaterialService {
  getFieldsConfig(): Promise<FieldsConfig>;
  search(criteria: SearchCriteria): Promise<SearchResult>;
  getById(materialNumber: string, werks?: string): Promise<MaterialDetail | null>;
  /** Current user's plant/branch; used to pre-fill WERKS on app start. */
  getUserBranch(): Promise<UserBranch | null>;
}
