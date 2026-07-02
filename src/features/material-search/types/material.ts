export type MaterialType = 'ROH' | 'HALB' | 'FERT' | 'HAWA';

export type IndustrySector = 'M' | 'C' | 'P' | 'E'; // Mechanical, Chemical, Pharmaceutical, Electronics

export type BaseUnitOfMeasure = 'PC' | 'KG' | 'L' | 'M' | 'M2' | 'M3';

export interface Material {
  MATNR: string;              // Material Number (key)
  MAKTX: string;              // Material Description (short, Hebrew)
  LONG_TEXT: string;          // Long Description (Hebrew)
  MTART: MaterialType;        // Material Type
  MBRSH: IndustrySector;      // Industry Sector
  MEINS: BaseUnitOfMeasure;   // Base Unit of Measure
  LVORM: boolean;             // Deletion Flag (Status)
  ERSDA: string;              // Created On Date (ISO string: YYYY-MM-DD)
  ERNAM: string;              // Created By
  LAEDA: string;              // Last Changed On Date (ISO string: YYYY-MM-DD)
  AENAM: string;              // Last Changed By
  WERKS?: string[];           // Plant Assignments (optional for backward compatibility)
}

export interface SearchCriteria {
  MATNR?: string;
  MAKTX?: string;             // Search description (contains)
  MTART?: MaterialType[];
  MBRSH?: IndustrySector[];
  MEINS?: BaseUnitOfMeasure[];
  ERSDA_START?: string;       // Created date range start (YYYY-MM-DD)
  ERSDA_END?: string;         // Created date range end (YYYY-MM-DD)
  LVORM?: boolean;            // Show deleted items (false by default)
  WERKS?: string[];           // Selected plants
  WERKS_LOGIC?: 'OR' | 'AND'; // Logic for matching plants

  /** OData-style page offset — number of records to skip. */
  $skip?: number;
  /** OData-style page size — max number of records to return. */
  $top?: number;
}

export interface SearchResult {
  materials: Material[];
  /** Total number of records that match the filter (before paging). */
  totalCount: number;
  /** True when there are more pages after this one (skip + page.length < totalCount). */
  hasMore: boolean;
  /** @deprecated Output fields are now returned by the fields-config endpoint (getFieldsConfig).
   *  This property is populated by MockMaterialService for backwards-compat only. */
  outputFields?: OutputFieldDefinition[];
}

/**
 * Full material detail returned by GET /api/materials/:id.
 * Extends the list-level Material with all rich fields that are
 * too expensive to include in search results.
 */
export interface MaterialDetail extends Material {
  /** Multi-line long description (Hebrew) — same as LONG_TEXT on Material */
  LONG_TEXT: string;
  /** Created by user */
  ERNAM: string;
  /** Last changed by user */
  AENAM: string;
}

/**
 * Response shape for GET /api/materials/fields.
 * Contains all metadata needed to render the search sidebar and results table.
 */
export interface FieldsConfig {
  /** Fields to render in the search/filter sidebar */
  inputFields: SearchFieldDefinition[];
  /** Columns to render in the results table */
  outputFields: OutputFieldDefinition[];
}

export type FieldType = 'CHAR' | 'NUMC' | 'DATS' | 'QUAN' | 'BOOLEAN' | 'MULTI_SELECT' | 'WERKS_SELECTOR' | string;

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface SearchFieldDefinition {
  table_name: string;
  field_name: string;
  hebrew_desc: string;
  field_type: string;
  field_length: number;
  options?: FieldOption[];
}

export interface OutputFieldDefinition {
  table_name: string;
  field_name: string;
  hebrew_desc: string;
  field_type: string;
  field_length: number;
  width: number;
}

export interface CompareFieldSelector {
  table_name: string;
  field_name: string;
}

export interface CompareRequest {
  materials: string[]; // List of MATNRs to compare
  fields: CompareFieldSelector[]; // List of fields to return
}
