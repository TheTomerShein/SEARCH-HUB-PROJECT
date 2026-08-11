/** Domain + wire types for material-search. No helpers here. */

export type MaterialType = 'ROH' | 'HALB' | 'FERT' | 'HAWA';

export type IndustrySector = 'M' | 'C' | 'P' | 'E';

export type BaseUnitOfMeasure = 'PC' | 'KG' | 'L' | 'M' | 'M2' | 'M3';

export interface Material {
  MATNR: string;
  MAKTX: string;
  LONG_TEXT: string;
  MTART: MaterialType;
  MBRSH: IndustrySector;
  MEINS: BaseUnitOfMeasure;
  ERSDA: string;
  ERNAM: string;
  LAEDA: string;
  AENAM: string;
  WERKS?: string[];
  MATKL?: string;
  SPART?: string;
  BRGEW?: string;
  NTGEW?: string;
  GEWEI?: string;
  VOLUM?: string;
  VOLEH?: string;
  BSTME?: string;
  WERKS_DISP?: string;
  /** Mock-only / extended catalog fields for UI testing */
  EAN11?: string;
  WRKST?: string;
  EXTWG?: string;
  LABOR?: string;
  XCHPF?: boolean;
  LAENG?: string;
  BREIT?: string;
  HOEHE?: string;
  MEABM?: string;
  MHDRZ?: string;
  MHDHB?: string;
  TEMPB?: string;
  RAUBE?: string;
  BEHVO?: string;
  ZZSLOC?: string;
  ZZPRIO?: string;
}

export interface SearchCriteria {
  MATNR?: string;
  MAKTX?: string;
  MTART?: MaterialType[];
  MBRSH?: IndustrySector[];
  MEINS?: BaseUnitOfMeasure[];
  ERSDA_START?: string;
  ERSDA_END?: string;
  WERKS?: string[];
  WERKS_LOGIC?: 'OR' | 'AND';
  $skip?: number;
  $top?: number;
  [key: string]: string | number | boolean | string[] | undefined;
}

/** Wire: POST /api/materials/search filter clause (snake_case). */
export interface SearchFilterClause {
  table_name: string;
  field_name: string;
  operator: string;
  values: string[];
}

export interface MaterialSearchRequest {
  skip: number;
  top: number;
  filters: SearchFilterClause[];
}

export interface SearchResult {
  materials: Material[];
  totalCount: number;
  hasMore: boolean;
}

export type CodeWithHeDesc = {
  code: string;
  description_he: string;
};

export type BranchRef = {
  werks: string;
  name?: string;
};

/** Wire: GET /api/materials/:id — snake_case. */
export interface MaterialDetail {
  matnr: string;
  maktx: string;
  zzmaterial_type: CodeWithHeDesc;
  managing_branch: BranchRef | null;
  using_branches: BranchRef[];
  meins: CodeWithHeDesc;
  global_status: CodeWithHeDesc;
  matkl: CodeWithHeDesc;
  created_by: string;
  created_at: string;
  changed_by: string;
  changed_at: string;
  change_request: string | null;
}

export interface FieldsConfig {
  inputFields: SearchFieldDefinition[];
  outputFields: OutputFieldDefinition[];
}

export interface FieldOption {
  label: string;
  value: string | number;
}

export const DEFAULT_WERKS_OPTIONS: FieldOption[] = [
  { value: '1000', label: 'יבשה' },
  { value: '2000', label: 'ים' },
  { value: '3000', label: 'חיל האוויר' },
  { value: '4000', label: 'מודיעין' },
];

export const DEFAULT_WERKS_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_WERKS_OPTIONS.map((o) => [String(o.value), String(o.label)]),
);

/** Shared field metadata shape (input may carry options). */
export interface FieldDefinition {
  fieldLength: number;
  fieldName: string;
  fieldType: string;
  hebrewDesc: string;
  mandt: string;
  tableName: string;
  options?: FieldOption[];
}

export type SearchFieldDefinition = FieldDefinition;
export type OutputFieldDefinition = FieldDefinition;

/**
 * Field identity layers (do not mix):
 * - Visibility: fieldKey = `TABLE-FIELD` (active*Fields atoms)
 * - Criteria values: bare fieldName on SearchCriteria
 * - Wire list props: apiResultPropName → maraMatnr (before normalize)
 * - Row selection: getResultRowId → MATNR or MATNR\\u001fWERKS
 */
