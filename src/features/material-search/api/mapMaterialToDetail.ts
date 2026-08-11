import type { Material, MaterialDetail, CodeWithHeDesc, BranchRef } from '../types/material';
import { DEFAULT_WERKS_LABELS } from '../types/material';

const PLANT_NAMES: Record<string, string> = DEFAULT_WERKS_LABELS;

/** ZZ material type (numeric code + Hebrew) — mock map from list MTART. */
const ZZ_TYPE: Record<string, CodeWithHeDesc> = {
  ROH: { code: '06', description_he: 'חומר גלם' },
  HALB: { code: '02', description_he: 'חומר חצי מוגמר' },
  FERT: { code: '01', description_he: 'תוצר מוגמר' },
  HAWA: { code: '04', description_he: 'סחורת מסחר' },
};

const MEINS_HE: Record<string, string> = {
  PC: 'יחידה',
  KG: 'קילוגרם',
  L: 'ליטר',
  M: 'מטר',
  M2: 'מטר רבוע',
  M3: 'מטר מעוקב',
};

const MATKL_HE: Record<string, string> = {
  '001': 'חומרי גלם כללי',
  '002': 'חלקי מכונה',
  '010': 'ברגים ואומים',
  '100': 'אלקטרוניקה',
  '200': 'אריזה',
  RAW01: 'גלם גולמי',
  FIN02: 'תוצר מוגמר',
  HALB3: 'חצי מוגמר',
};

function branchRef(werks: string): BranchRef {
  return { werks, name: PLANT_NAMES[werks] ?? `מפעל ${werks}` };
}

/** Stable pseudo-random from matnr for mock CR flag. */
function matnrHash(matnr: string): number {
  let h = 0;
  for (let i = 0; i < matnr.length; i++) h = (h * 31 + matnr.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Map list-row Material → GET /api/materials/:id wire shape (mock only).
 * Optional werks prefers that plant as managing_branch when present on the row.
 */
export function mapMaterialToDetail(m: Material, werks?: string): MaterialDetail {
  const plants = m.WERKS?.length ? m.WERKS : m.WERKS_DISP ? [m.WERKS_DISP] : [];
  const using_branches = plants.map(branchRef);
  const preferred = werks
    ? using_branches.find((b) => b.werks === werks) ?? branchRef(werks)
    : null;
  const managing_branch = preferred ?? using_branches[0] ?? null;

  const mtart = String(m.MTART ?? '');
  const zzmaterial_type = ZZ_TYPE[mtart] ?? {
    code: mtart || '—',
    description_he: mtart || 'לא ידוע',
  };

  const meinsCode = String(m.MEINS ?? '');
  const meins: CodeWithHeDesc = {
    code: meinsCode || '—',
    description_he: MEINS_HE[meinsCode] ?? (meinsCode || '—'),
  };

  const matklCode = String(m.MATKL ?? '');
  const matkl: CodeWithHeDesc = {
    code: matklCode || '—',
    description_he: MATKL_HE[matklCode] ?? (matklCode ? `קבוצה ${matklCode}` : '—'),
  };

  const global_status: CodeWithHeDesc = { code: 'Z1', description_he: 'פעיל' };

  // ~1 in 5 materials "in" a change request
  const change_request =
    matnrHash(m.MATNR) % 5 === 0 ? `CR${String(matnrHash(m.MATNR) % 100000).padStart(8, '0')}` : null;

  return {
    matnr: m.MATNR,
    maktx: m.MAKTX,
    zzmaterial_type,
    managing_branch,
    using_branches,
    meins,
    global_status,
    matkl,
    created_by: m.ERNAM,
    created_at: m.ERSDA,
    changed_by: m.AENAM,
    changed_at: m.LAEDA,
    change_request,
  };
}
