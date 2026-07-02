import type { Material, MaterialType, IndustrySector, BaseUnitOfMeasure } from '../types/material';

// Deterministic Pseudo-Random Generator (LCG)
class LCG {
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
const PLANTS = ['1000', '2000', '3000', '4000', '5000'];

export function generateMockMaterials(count: number = 4000): Material[] {
  const lcg = new LCG(123456); // Use a fixed seed for deterministic outputs
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

    // Deletion flag (around 3% of materials are deleted)
    const lvorm = lcg.boolean(0.03);

    // Assign 1 to 3 random plants
    const werksCount = lcg.nextRange(1, 3);
    const werks: string[] = [];
    const availablePlants = [...PLANTS];
    for (let k = 0; k < werksCount; k++) {
      const idx = lcg.nextRange(0, availablePlants.length - 1);
      werks.push(availablePlants[idx]);
      availablePlants.splice(idx, 1);
    }

    materials.push({
      MATNR: matnr,
      MAKTX: maktx,
      LONG_TEXT: longText,
      MTART: mtart,
      MBRSH: mbrsh,
      MEINS: meins,
      LVORM: lvorm,
      ERSDA: ersda,
      ERNAM: ernam,
      LAEDA: laeda,
      AENAM: aenam,
      WERKS: werks
    });
  }

  // Sort them by MATNR (SAP search results are usually sorted by ID by default)
  return materials.sort((a, b) => a.MATNR.localeCompare(b.MATNR));
}
