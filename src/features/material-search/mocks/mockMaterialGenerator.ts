import type { Material, MaterialType, IndustrySector, BaseUnitOfMeasure } from '../types/material';
import { DEFAULT_WERKS_LABELS } from '../types/material';

/** Deterministic PRNG used only by mock material generation. */
class MockLcg {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (1103515245 * this.seed + 12345) % 2147483648;
    return this.seed / 2147483648;
  }

  nextRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextRange(0, arr.length - 1)];
  }

  boolean(probabilityOfTrue: number = 0.5): boolean {
    return this.next() < probabilityOfTrue;
  }
}

const NOUNS = [
  'צינור', 'בורג', 'לוח', 'כבל', 'מנוע', 'מתאם', 'שסתום', 'מחבר', 'מסנן', 'אטם',
  'משאבה', 'גוף חימום', 'חיישן', 'רכזת', 'ממסר', 'מפסק', 'שנאי', 'בקר', 'סוללה', 'מאוורר'
];

const MATERIALS = [
  'פלדה', 'פליז', 'נחושת', 'פלסטיק', 'PVC', 'נירוסטה', 'אלומיניום', 'ברזל יצוק', 'זכוכית', 'גומי', 'סיליקון'
];

const ADJECTIVES = [
  'מגולוון', 'מבודד', 'לחץ גבוה', 'חד פאזי', 'תלת פאזי', 'ראש שטוח', 'ראש משושה',
  'חשמלי', 'הידראולי', 'פניאומטי', 'דיגיטלי', 'אנלוגי', 'מהיר', 'חד כיווני', 'עמיד חום'
];

const SIZES = [
  '1/2 צול', '1 צול', '2 צול', '3 צול', 'M6', 'M8', 'M10', 'M12', '10 מ"מ', '15 מ"מ',
  '50 מ"מ', '100 מ"מ', '220V', '24V', '12V', '10A', '16A', 'IP65', 'IP67', '5HP', '10HP'
];

const USERS = ['MOSHE_COHEN', 'DAVID_LEVI', 'SARAH_NOY', 'ALON_RAZ', 'SYSTEM', 'BATCH_USER', 'YOSSI_A'];

const INDUSTRY_SECTORS: IndustrySector[] = ['M', 'C', 'P', 'E'];
const MATERIAL_TYPES: MaterialType[] = ['ROH', 'HALB', 'FERT', 'HAWA'];
const BASE_UNITS: BaseUnitOfMeasure[] = ['PC', 'KG', 'L', 'M', 'M2', 'M3'];
const PLANTS = ['1000', '2000', '3000', '4000'];
const MAT_GROUPS = ['001', '002', '010', '100', '200', 'RAW01', 'FIN02', 'HALB3'];
const DIVISIONS = ['00', '01', '10', '20'];
const WEIGHT_UNITS = ['KG', 'G', 'TO'];
const VOLUME_UNITS = ['M3', 'L', 'CCM'];
const DIM_UNITS = ['MM', 'CM', 'M'];
const LAB_OFFICES = ['001', '002', 'QA1', 'R&D'];
const EXT_GROUPS = ['EXT-A', 'EXT-B', 'EXT-C', 'OEM01', 'OEM02'];
const BASIC_MATERIALS = ['STEEL', 'ALUM', 'BRASS', 'PVC', 'RUBBER', 'GLASS', 'COPPER'];
const TEMP_CONDS = ['01', '02', '05', '10'];
const STORAGE_CONDS = ['01', '03', '07', 'Y1'];
const CONTAINER_REQS = ['01', '02', 'B1', 'C2'];
const STORAGE_LOCS = ['0001', '0002', 'RAW1', 'FIN1', 'QA01'];
const PRIORITIES = ['1', '2', '3'];

/** Build in-memory mock materials for MockMaterialService. */
export function generateMockMaterials(count: number = 4000): Material[] {
  const lcg = new MockLcg(123456); // fixed seed → deterministic mock rows
  const materials: Material[] = [];

  // Track matnr sequences per type to generate realistic SAP numbers
  // ROH: 10000000, HALB: 20000000, FERT: 30000000, HAWA: 40000000
  const counters: Record<MaterialType, number> = {
    ROH: 10000000,
    HALB: 20000000,
    FERT: 30000000,
    HAWA: 40000000
  };

  for (let i = 0; i < count; i++) {
    const mtart = lcg.pick(MATERIAL_TYPES);
    const mbrsh = lcg.pick(INDUSTRY_SECTORS);
    const meins = lcg.pick(BASE_UNITS);

    // Increment counter and get MATNR
    counters[mtart]++;
    const matnr = counters[mtart].toString();

    // Construct short description (MAKTX)
    const noun = lcg.pick(NOUNS);
    const materialMat = lcg.boolean(0.7) ? ` ${lcg.pick(MATERIALS)}` : '';
    const adj = lcg.boolean(0.8) ? ` ${lcg.pick(ADJECTIVES)}` : '';
    const size = lcg.boolean(0.6) ? ` ${lcg.pick(SIZES)}` : '';
    const maktx = `${noun}${materialMat}${adj}${size}`.trim();

    // Construct realistic long text
    const longText = `תיאור מורחב עבור ${maktx}.\nפריט זה משמש כחלק במערכות SAP MDG ארגוניות.\nמפרט טכני: חומר גלם עיקרי מבוסס על ${materialMat.trim() || 'סטנדרט תעשייתי'}. סקטור תעשייה מוגדר כ-${mbrsh === 'M' ? 'מכונות' : mbrsh === 'C' ? 'כימיקלים' : mbrsh === 'P' ? 'פרמצבטיקה' : 'אלקטרוניקה'}. יחידת מידה בסיסית: ${meins}.\nנוצר לצורך בדיקות ביצועים ועבודה מול רכיבים וירטואליים.`;

    // Date generation (within the last 3 years)
    const currentYear = 2026;
    const createdYear = lcg.nextRange(currentYear - 3, currentYear);
    const createdMonth = lcg.nextRange(1, 12).toString().padStart(2, '0');
    const createdDay = lcg.nextRange(1, 28).toString().padStart(2, '0');
    const ersda = `${createdYear}-${createdMonth}-${createdDay}`;

    const ernam = lcg.pick(USERS);

    // Last change date (either same as creation or later)
    let laeda = ersda;
    let aenam = ernam;
    if (lcg.boolean(0.4)) {
      const changeYear = lcg.nextRange(createdYear, currentYear);
      const changeMonth = lcg.nextRange(createdYear === changeYear ? parseInt(createdMonth) : 1, 12).toString().padStart(2, '0');
      const changeDay = lcg.nextRange(1, 28).toString().padStart(2, '0');
      laeda = `${changeYear}-${changeMonth}-${changeDay}`;
      if (laeda < ersda) laeda = ersda;
      aenam = lcg.pick(USERS);
    }

    // Assign 1 to 3 random plants
    const werksCount = lcg.nextRange(1, 3);
    const werks: string[] = [];
    const availablePlants = [...PLANTS];
    for (let k = 0; k < werksCount; k++) {
      const idx = lcg.nextRange(0, availablePlants.length - 1);
      werks.push(availablePlants[idx]);
      availablePlants.splice(idx, 1);
    }

    const brgew = (lcg.next() * 500 + 0.1).toFixed(3);
    const ntgew = (Number(brgew) * (0.7 + lcg.next() * 0.25)).toFixed(3);
    const volum = (lcg.next() * 20).toFixed(3);
    const laeng = (lcg.next() * 2000 + 1).toFixed(1);
    const breit = (lcg.next() * 800 + 1).toFixed(1);
    const hoehe = (lcg.next() * 500 + 1).toFixed(1);
    // Deterministic 13-digit EAN-like code from matnr + index
    const eanBase = `${matnr}${String(i).padStart(5, '0')}`.replace(/\D/g, '').slice(0, 12);
    const ean11 = eanBase.padStart(12, '0') + String(lcg.nextRange(0, 9));

    materials.push({
      MATNR: matnr,
      MAKTX: maktx,
      LONG_TEXT: longText,
      MTART: mtart,
      MBRSH: mbrsh,
      MEINS: meins,
      ERSDA: ersda,
      ERNAM: ernam,
      LAEDA: laeda,
      AENAM: aenam,
      WERKS: werks,
      MATKL: lcg.pick(MAT_GROUPS),
      SPART: lcg.pick(DIVISIONS),
      BSTME: lcg.boolean(0.4) ? lcg.pick(BASE_UNITS) : meins,
      BRGEW: brgew,
      NTGEW: ntgew,
      GEWEI: lcg.pick(WEIGHT_UNITS),
      VOLUM: volum,
      VOLEH: lcg.pick(VOLUME_UNITS),
      WERKS_DISP: werks
        .map((w) => (DEFAULT_WERKS_LABELS[w] ? `${w} · ${DEFAULT_WERKS_LABELS[w]}` : w))
        .join(', '),
      EAN11: ean11,
      WRKST: lcg.pick(BASIC_MATERIALS),
      EXTWG: lcg.pick(EXT_GROUPS),
      LABOR: lcg.pick(LAB_OFFICES),
      XCHPF: lcg.boolean(0.35),
      LAENG: laeng,
      BREIT: breit,
      HOEHE: hoehe,
      MEABM: lcg.pick(DIM_UNITS),
      MHDRZ: String(lcg.nextRange(0, 90)),
      MHDHB: String(lcg.nextRange(30, 730)),
      TEMPB: lcg.pick(TEMP_CONDS),
      RAUBE: lcg.pick(STORAGE_CONDS),
      BEHVO: lcg.pick(CONTAINER_REQS),
      ZZSLOC: lcg.pick(STORAGE_LOCS),
      ZZPRIO: lcg.pick(PRIORITIES),
    });
  }

  // Sort them by MATNR (SAP search results are usually sorted by ID by default)
  return materials.sort((a, b) => a.MATNR.localeCompare(b.MATNR));
}
