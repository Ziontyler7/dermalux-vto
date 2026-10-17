import type {
  CalibratedSkinDiagnostic,
  FitzpatrickBand,
  YouCamMetricKey,
} from '../skin/youcam-skin-analyzer.ts';

export type RoutineWindow = 'AM' | 'PM';

export type RoutineStepSlot = 'CLEANSE' | 'TREAT' | 'MOISTURIZE' | 'SPF_FINISH' | 'REPAIR';

export type ActiveIngredientClass =
  | 'GENTLE_SURFACTANT'
  | 'BENZOYL_PEROXIDE'
  | 'VITAMIN_C_LAA'
  | 'AZELAIC_NIACINAMIDE'
  | 'AHA_BHA'
  | 'RETINOID'
  | 'CERAMIDE_PEPTIDE'
  | 'MINERAL_SPF_TINT';

export type ConflictCode =
  | 'CONFLICT_OVER_EXFOLIATION'
  | 'CONFLICT_OXIDATIVE_DEACTIVATION'
  | 'CONFLICT_LOW_PH_IRRITATION'
  | 'BARRIER_RECOVERY_LOCK'
  | 'PREGNANCY_TERATOGEN_GUARDRAIL'
  | 'FRAGRANCE_SENSITIVITY_FILTER';

export interface SkincareProductSku {
  skuId: string;
  brandName: string;
  productName: string;
  windowSupport: RoutineWindow[];
  stepSlot: RoutineStepSlot;
  activeClass: ActiveIngredientClass;
  keyActivesSummary: string;
  phLevel: number;
  priceUsd: number;
  pregnancySafe: boolean;
  containsFragrance: boolean;
  barrierSafeWhenCompromised: boolean;
  whiteCastZeroFitzpatrickBands: FitzpatrickBand[];
  targetMetrics: YouCamMetricKey[];
  vtoFinishTintDeltaLab?: { dL: number; da: number; db: number };
}

export interface RegimenConstraintInput {
  maxBudgetUsd: number;
  fragranceFreeOnly: boolean;
  pregnancySafeOnly: boolean;
  requestedPmBoosterSkuId?: string;
}

export interface ConflictResolutionRecord {
  conflictCode: ConflictCode;
  window: RoutineWindow;
  blockedSkuId: string;
  blockedProductName: string;
  substitutedSkuId: string;
  substitutedProductName: string;
  clinicalRationale: string;
}

export interface ScheduledRoutineStep {
  window: RoutineWindow;
  stepOrder: number;
  stepSlot: RoutineStepSlot;
  sku: SkincareProductSku;
  selectionReason: string;
}

export type RegimenSolveStatus =
  | 'OPTIMAL_CLINICAL_REGIMEN'
  | 'CONFLICT_RESOLVED_REGIMEN'
  | 'BUDGET_ADAPTED_SUBSTITUTION'
  | 'BUDGET_FLOOR_HOLD';

export interface SolvedAmPmRegimen {
  profileId: string;
  status: RegimenSolveStatus;
  amSteps: ScheduledRoutineStep[];
  pmSteps: ScheduledRoutineStep[];
  totalPriceUsd: number;
  budgetCeilingUsd: number;
  withinBudget: boolean;
  barrierLockActive: boolean;
  conflictResolutions: ConflictResolutionRecord[];
}

export const DERMALUX_SKU_CATALOG: readonly SkincareProductSku[] = [
  // CLEANSERS
  {
    skuId: 'SKU-CLEANSE-OAT-PH54',
    brandName: 'DermaLux Clinical',
    productName: 'Lipid-Oat & Ectoin Barrier Gel Cleanser (pH 5.4)',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'CLEANSE',
    activeClass: 'GENTLE_SURFACTANT',
    keyActivesSummary: 'Colloidal Oat 2%, Ectoin 1%, Glycerin 5%',
    phLevel: 5.4,
    priceUsd: 18,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness', 'texture'],
  },
  {
    skuId: 'SKU-CLEANSE-OAT-ESSENTIAL',
    brandName: 'DermaLux Essentials',
    productName: 'Micellar Amino Hydrating Wash',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'CLEANSE',
    activeClass: 'GENTLE_SURFACTANT',
    keyActivesSummary: 'Sodium Cocoyl Glutamate, Panthenol 1%',
    phLevel: 5.5,
    priceUsd: 11,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness'],
  },
  {
    skuId: 'SKU-CLEANSE-BPO-4',
    brandName: 'DermaLux Clarify',
    productName: 'Micronized 4% Benzoyl Peroxide Creamy Wash',
    windowSupport: ['AM'],
    stepSlot: 'CLEANSE',
    activeClass: 'BENZOYL_PEROXIDE',
    keyActivesSummary: 'Micronized Benzoyl Peroxide 4%, Bisabolol 0.5%',
    phLevel: 5.3,
    priceUsd: 22,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: false,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['acne', 'oiliness', 'pores'],
  },

  // AM / PM TREATMENTS
  {
    skuId: 'SKU-TREAT-VITC-15',
    brandName: 'DermaLux Lumina',
    productName: '15% L-Ascorbic Acid + Ferulic + Tocopherol Serum',
    windowSupport: ['AM'],
    stepSlot: 'TREAT',
    activeClass: 'VITAMIN_C_LAA',
    keyActivesSummary: 'L-Ascorbic Acid 15%, Ferulic Acid 0.5%, Vitamin E 1%',
    phLevel: 3.3,
    priceUsd: 38,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: false,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['radiance', 'darkSpots', 'firmness', 'wrinkles'],
  },
  {
    skuId: 'SKU-TREAT-AZELAIC-10',
    brandName: 'DermaLux CalmTone',
    productName: '10% Azelaic Acid + 5% Niacinamide PIH & Redness Emulsion',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'TREAT',
    activeClass: 'AZELAIC_NIACINAMIDE',
    keyActivesSummary: 'Potassium Azeloyl Diglycinate 10%, Niacinamide 5%, Centella 2%',
    phLevel: 5.2,
    priceUsd: 26,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['redness', 'darkSpots', 'pores', 'acne', 'oiliness'],
  },
  {
    skuId: 'SKU-TREAT-AZELAIC-ESSENTIAL',
    brandName: 'DermaLux Essentials',
    productName: 'Niacinamide 5% + Zinc PCA Balancing Drops',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'TREAT',
    activeClass: 'AZELAIC_NIACINAMIDE',
    keyActivesSummary: 'Niacinamide 5%, Zinc PCA 1%, Allantoin 0.5%',
    phLevel: 5.5,
    priceUsd: 14,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['redness', 'darkSpots', 'pores', 'oiliness'],
  },
  {
    skuId: 'SKU-TREAT-RETINOL-03',
    brandName: 'DermaLux Chrono',
    productName: 'Encapsulated 0.3% Retinol + Bakuchiol Cellular Night Serum',
    windowSupport: ['PM'],
    stepSlot: 'TREAT',
    activeClass: 'RETINOID',
    keyActivesSummary: 'Encapsulated Retinol 0.3%, Bakuchiol 1%, Squalane',
    phLevel: 5.6,
    priceUsd: 42,
    pregnancySafe: false,
    containsFragrance: false,
    barrierSafeWhenCompromised: false,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['wrinkles', 'firmness', 'acne', 'pores', 'darkSpots', 'texture'],
  },
  {
    skuId: 'SKU-TREAT-AHA-BHA-10',
    brandName: 'DermaLux Resurface',
    productName: '8% Glycolic + 2% Salicylic Acid Keratolytic Night Peel',
    windowSupport: ['PM'],
    stepSlot: 'TREAT',
    activeClass: 'AHA_BHA',
    keyActivesSummary: 'Glycolic Acid 8%, Salicylic Acid 2%, Tasmanian Pepperberry',
    phLevel: 3.6,
    priceUsd: 34,
    pregnancySafe: false,
    containsFragrance: false,
    barrierSafeWhenCompromised: false,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['texture', 'pores', 'acne', 'oiliness'],
  },
  {
    skuId: 'SKU-TREAT-BPO-LEAVEON-25',
    brandName: 'DermaLux Clarify',
    productName: '2.5% Benzoyl Peroxide Blemish Target Gel',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'TREAT',
    activeClass: 'BENZOYL_PEROXIDE',
    keyActivesSummary: 'Micronized Benzoyl Peroxide 2.5%',
    phLevel: 5.1,
    priceUsd: 21,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: false,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['acne', 'oiliness'],
  },

  // MOISTURIZERS / BARRIER REPAIR
  {
    skuId: 'SKU-MOIST-CERAMIDE-NP',
    brandName: 'DermaLux BarrierLab',
    productName: '3:1:1 Ceramide NP + Cholesterol + Panthenol 5% Barrier Cream',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'MOISTURIZE',
    activeClass: 'CERAMIDE_PEPTIDE',
    keyActivesSummary: 'Ceramide NP/AP/EOP, Panthenol 5%, Madecassoside, Hexapeptide-8',
    phLevel: 5.5,
    priceUsd: 32,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness', 'firmness', 'tearTrough', 'upperEyelid'],
  },
  {
    skuId: 'SKU-MOIST-CERAMIDE-ESSENTIAL',
    brandName: 'DermaLux Essentials',
    productName: 'Daily Ceramide & Squalane Hydro-Gel Cream',
    windowSupport: ['AM', 'PM'],
    stepSlot: 'MOISTURIZE',
    activeClass: 'CERAMIDE_PEPTIDE',
    keyActivesSummary: 'Ceramide NP, Plant Squalane 4%, Hyaluronic Acid',
    phLevel: 5.5,
    priceUsd: 16,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness', 'texture'],
  },
  {
    skuId: 'SKU-REPAIR-ECTOIN-BALM',
    brandName: 'DermaLux BarrierLab',
    productName: 'Overnight Ectoin 2% + Copper Tripeptide Barrier Recovery Balm',
    windowSupport: ['PM'],
    stepSlot: 'REPAIR',
    activeClass: 'CERAMIDE_PEPTIDE',
    keyActivesSummary: 'Ectoin 2%, GHK-Cu Peptide, Shea Tristerin, Bisabolol',
    phLevel: 5.5,
    priceUsd: 34,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness', 'firmness', 'lowerEyelid', 'tearTrough'],
  },
  {
    skuId: 'SKU-REPAIR-ESSENTIAL-CREAM',
    brandName: 'DermaLux Essentials',
    productName: 'Cica-Panthenol Overnight Soothing Cream',
    windowSupport: ['PM'],
    stepSlot: 'REPAIR',
    activeClass: 'CERAMIDE_PEPTIDE',
    keyActivesSummary: 'Panthenol 4%, Centella Asiatica, Ceramide NP',
    phLevel: 5.5,
    priceUsd: 15,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['moisture', 'redness'],
  },

  // SPF FINISH (VTO-ENABLED)
  {
    skuId: 'SKU-SPF-IRON-OXIDE-50',
    brandName: 'DermaLux VTO Shield',
    productName: 'Tone-Adaptive Iron Oxide & Zinc SPF 50+ PA++++ Serum Tint',
    windowSupport: ['AM'],
    stepSlot: 'SPF_FINISH',
    activeClass: 'MINERAL_SPF_TINT',
    keyActivesSummary: 'Non-Nano Zinc Oxide 16%, Encapsulated Iron Oxides (HEV/PIH Shield), Ectoin',
    phLevel: 6.4,
    priceUsd: 30,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['darkSpots', 'radiance', 'redness', 'wrinkles'],
    vtoFinishTintDeltaLab: { dL: 0.8, da: -2.4, db: 0.4 },
  },
  {
    skuId: 'SKU-SPF-ESSENTIAL-FLUID',
    brandName: 'DermaLux Essentials',
    productName: 'Invisible Sheer Mineral Hybrid Fluid SPF 50',
    windowSupport: ['AM'],
    stepSlot: 'SPF_FINISH',
    activeClass: 'MINERAL_SPF_TINT',
    keyActivesSummary: 'Micronized Zinc Oxide 14%, Niacinamide 2%, Tocopherol',
    phLevel: 6.5,
    priceUsd: 16,
    pregnancySafe: true,
    containsFragrance: false,
    barrierSafeWhenCompromised: true,
    whiteCastZeroFitzpatrickBands: [
      'FITZPATRICK_I',
      'FITZPATRICK_II',
      'FITZPATRICK_III',
      'FITZPATRICK_IV',
      'FITZPATRICK_V',
      'FITZPATRICK_VI',
    ],
    targetMetrics: ['darkSpots', 'radiance', 'wrinkles'],
    vtoFinishTintDeltaLab: { dL: 0.4, da: -1.5, db: 0.2 },
  },
] as const;

export function getSkuById(skuId: string): SkincareProductSku {
  const found = DERMALUX_SKU_CATALOG.find((item) => item.skuId === skuId);
  if (!found) {
    throw new Error(`Unknown DermaLux SKU: ${skuId}`);
  }
  return found;
}

/**
 * Evaluates whether two active ingredient classes conflict when layered in the same routine window (AM or PM).
 */
export function detectPairwiseActiveConflict(
  classA: ActiveIngredientClass,
  classB: ActiveIngredientClass
): { conflictCode: ConflictCode; rationale: string } | null {
  const pair = new Set<ActiveIngredientClass>([classA, classB]);

  if (pair.has('RETINOID') && pair.has('AHA_BHA')) {
    return {
      conflictCode: 'CONFLICT_OVER_EXFOLIATION',
      rationale:
        'Combining a keratolytic AHA/BHA acid peel and a Retinoid in the same PM window accelerates corneocyte desquamation beyond barrier recovery capacity, causing acute retinoid dermatitis.',
    };
  }

  if (pair.has('RETINOID') && pair.has('BENZOYL_PEROXIDE')) {
    return {
      conflictCode: 'CONFLICT_OXIDATIVE_DEACTIVATION',
      rationale:
        'Benzoyl Peroxide is a potent oxidizing agent that chemically degrades Retinol/Tretinoin upon co-application while compounding stratum corneum irritation.',
    };
  }

  if (pair.has('VITAMIN_C_LAA') && pair.has('BENZOYL_PEROXIDE')) {
    return {
      conflictCode: 'CONFLICT_OXIDATIVE_DEACTIVATION',
      rationale:
        'Benzoyl Peroxide oxidizes pure L-Ascorbic Acid into dehydroascorbic acid before epidermal penetration, neutralizing antioxidant efficacy.',
    };
  }

  if (classA === 'AHA_BHA' && classB === 'AHA_BHA') {
    return {
      conflictCode: 'CONFLICT_OVER_EXFOLIATION',
      rationale:
        'Stacking dual AHA/BHA exfoliants in a single routine window strips intercellular ceramides and triggers rebound inflammation.',
    };
  }

  if (pair.has('VITAMIN_C_LAA') && pair.has('AHA_BHA')) {
    return {
      conflictCode: 'CONFLICT_LOW_PH_IRRITATION',
      rationale:
        'Layering low-pH L-Ascorbic Acid (pH 3.3) with Glycolic/Salicylic Acid (pH 3.6) in the same window induces cumulative acid sting and erythema.',
    };
  }

  return null;
}

/**
 * Builds a conflict-free 4-step AM and 3-step PM skincare regimen tailored to the 14-metric
 * calibrated diagnostic, enforcing barrier-first lockouts, pregnancy safety, active conflict resolution,
 * and dynamic budget adaptation.
 */
export function solveConflictSafeRegimen(
  diagnostic: CalibratedSkinDiagnostic,
  constraints: RegimenConstraintInput
): SolvedAmPmRegimen {
  const conflictResolutions: ConflictResolutionRecord[] = [];
  const barrierLockActive = diagnostic.barrierIntegrityStatus === 'COMPROMISED_BARRIER';

  // Step 1: Select initial candidate SKUs for AM (4 steps) and PM (3 steps)
  let amCleanse = getSkuById('SKU-CLEANSE-OAT-PH54');
  let amTreat = getSkuById('SKU-TREAT-AZELAIC-10');
  let amMoist = getSkuById('SKU-MOIST-CERAMIDE-NP');
  let amSpf = getSkuById('SKU-SPF-IRON-OXIDE-50');

  let pmCleanse = getSkuById('SKU-CLEANSE-OAT-PH54');
  let pmTreat = getSkuById('SKU-TREAT-RETINOL-03');
  let pmRepair = getSkuById('SKU-REPAIR-ECTOIN-BALM');

  const hasBlemishPriority =
    diagnostic.calibratedMetrics.acne < 55 || diagnostic.calibratedMetrics.oiliness < 52;
  const hasPhotoAgingOrPihPriority =
    diagnostic.calibratedMetrics.darkSpots < 56 ||
    diagnostic.calibratedMetrics.wrinkles < 60 ||
    diagnostic.calibratedMetrics.radiance < 60;

  if (hasBlemishPriority) {
    amCleanse = getSkuById('SKU-CLEANSE-BPO-4');
    // Notice: if amCleanse is BPO-4 and we also picked Vitamin C for AM treat, they would conflict!
    // Let's test if photo-aging also triggers Vitamin C so our conflict solver resolves it cleanly:
    if (hasPhotoAgingOrPihPriority) {
      amTreat = getSkuById('SKU-TREAT-VITC-15');
    } else {
      amTreat = getSkuById('SKU-TREAT-AZELAIC-10');
    }
    pmTreat = getSkuById('SKU-TREAT-RETINOL-03');
  } else if (hasPhotoAgingOrPihPriority) {
    amTreat = getSkuById('SKU-TREAT-VITC-15');
    pmTreat = getSkuById('SKU-TREAT-RETINOL-03');
  }

  // Step 2: Check if user requested a specific PM booster/active (e.g., AHA/BHA peel or BPO gel)
  if (constraints.requestedPmBoosterSkuId) {
    const requestedSku = getSkuById(constraints.requestedPmBoosterSkuId);
    if (barrierLockActive && !requestedSku.barrierSafeWhenCompromised) {
      const safeSub = getSkuById('SKU-TREAT-AZELAIC-10');
      conflictResolutions.push({
        conflictCode: 'BARRIER_RECOVERY_LOCK',
        window: 'PM',
        blockedSkuId: requestedSku.skuId,
        blockedProductName: requestedSku.productName,
        substitutedSkuId: safeSub.skuId,
        substitutedProductName: safeSub.productName,
        clinicalRationale: `Calibrated moisture (${diagnostic.calibratedMetrics.moisture}/100) or redness (${diagnostic.calibratedMetrics.redness}/100) indicates a compromised barrier; blocked ${requestedSku.productName} to prevent chemical burn.`,
      });
      pmTreat = safeSub;
    } else {
      const pairwise = detectPairwiseActiveConflict(pmTreat.activeClass, requestedSku.activeClass);
      if (pairwise) {
        const safeSub = getSkuById('SKU-TREAT-AZELAIC-10');
        conflictResolutions.push({
          conflictCode: pairwise.conflictCode,
          window: 'PM',
          blockedSkuId: requestedSku.skuId,
          blockedProductName: requestedSku.productName,
          substitutedSkuId: safeSub.skuId,
          substitutedProductName: safeSub.productName,
          clinicalRationale: pairwise.rationale,
        });
      } else {
        pmTreat = requestedSku;
      }
    }
  }

  // Step 3: Enforce Barrier Recovery Lock across AM and PM
  if (barrierLockActive) {
    if (!amCleanse.barrierSafeWhenCompromised) {
      const safeCleanse = getSkuById('SKU-CLEANSE-OAT-PH54');
      conflictResolutions.push({
        conflictCode: 'BARRIER_RECOVERY_LOCK',
        window: 'AM',
        blockedSkuId: amCleanse.skuId,
        blockedProductName: amCleanse.productName,
        substitutedSkuId: safeCleanse.skuId,
        substitutedProductName: safeCleanse.productName,
        clinicalRationale:
          'Active barrier impairment detected; replaced Benzoyl Peroxide wash with pH 5.4 Lipid-Oat & Ectoin Cleanser.',
      });
      amCleanse = safeCleanse;
    }
    if (!amTreat.barrierSafeWhenCompromised) {
      const safeAmTreat = getSkuById('SKU-TREAT-AZELAIC-10');
      conflictResolutions.push({
        conflictCode: 'BARRIER_RECOVERY_LOCK',
        window: 'AM',
        blockedSkuId: amTreat.skuId,
        blockedProductName: amTreat.productName,
        substitutedSkuId: safeAmTreat.skuId,
        substitutedProductName: safeAmTreat.productName,
        clinicalRationale:
          'Low-pH L-Ascorbic Acid (pH 3.3) stings compromised stratum corneum; substituted pH 5.2 Azelaic + Niacinamide calming emulsion.',
      });
      amTreat = safeAmTreat;
    }
    if (!pmTreat.barrierSafeWhenCompromised) {
      const safePmTreat = getSkuById('SKU-TREAT-AZELAIC-10');
      conflictResolutions.push({
        conflictCode: 'BARRIER_RECOVERY_LOCK',
        window: 'PM',
        blockedSkuId: pmTreat.skuId,
        blockedProductName: pmTreat.productName,
        substitutedSkuId: safePmTreat.skuId,
        substitutedProductName: safePmTreat.productName,
        clinicalRationale:
          'Retinoids and keratolytic acids are locked out until barrier hydration (>=48) and erythema (>=52) stabilize; substituted Azelaic + Niacinamide.',
      });
      pmTreat = safePmTreat;
    }
  }

  // Step 4: Enforce Pregnancy-Safe Guardrail
  if (constraints.pregnancySafeOnly) {
    if (!pmTreat.pregnancySafe) {
      const pregSafeSub = getSkuById('SKU-TREAT-AZELAIC-10');
      conflictResolutions.push({
        conflictCode: 'PREGNANCY_TERATOGEN_GUARDRAIL',
        window: 'PM',
        blockedSkuId: pmTreat.skuId,
        blockedProductName: pmTreat.productName,
        substitutedSkuId: pregSafeSub.skuId,
        substitutedProductName: pregSafeSub.productName,
        clinicalRationale:
          'Topical retinoids and high-dose salicylic peels are contraindicated during pregnancy/lactation; substituted pregnancy-safe 10% Azelaic Acid + 5% Niacinamide.',
      });
      pmTreat = pregSafeSub;
    }
  }

  // Step 5: Enforce Pairwise Active Conflict Check within AM and within PM windows
  const amConflict = detectPairwiseActiveConflict(amCleanse.activeClass, amTreat.activeClass);
  if (amConflict) {
    const safeAmSub = getSkuById('SKU-TREAT-AZELAIC-10');
    conflictResolutions.push({
      conflictCode: amConflict.conflictCode,
      window: 'AM',
      blockedSkuId: amTreat.skuId,
      blockedProductName: amTreat.productName,
      substitutedSkuId: safeAmSub.skuId,
      substitutedProductName: safeAmSub.productName,
      clinicalRationale: amConflict.rationale,
    });
    amTreat = safeAmSub;
  }

  const pmConflict = detectPairwiseActiveConflict(pmCleanse.activeClass, pmTreat.activeClass);
  if (pmConflict) {
    const safePmSub = getSkuById('SKU-TREAT-AZELAIC-10');
    conflictResolutions.push({
      conflictCode: pmConflict.conflictCode,
      window: 'PM',
      blockedSkuId: pmTreat.skuId,
      blockedProductName: pmTreat.productName,
      substitutedSkuId: safePmSub.skuId,
      substitutedProductName: safePmSub.productName,
      clinicalRationale: pmConflict.rationale,
    });
    pmTreat = safePmSub;
  }

  // Step 6: Compute distinct SKU cart total (shared AM/PM SKUs are purchased once in an 8-week regimen bundle)
  const computeUniqueCartPrice = (skus: SkincareProductSku[]): number => {
    const uniqueMap = new Map<string, number>();
    for (const s of skus) {
      uniqueMap.set(s.skuId, s.priceUsd);
    }
    return Array.from(uniqueMap.values()).reduce((sum, p) => sum + p, 0);
  };

  let currentTotal = computeUniqueCartPrice([
    amCleanse,
    amTreat,
    amMoist,
    amSpf,
    pmCleanse,
    pmTreat,
    pmRepair,
  ]);
  let budgetSubstituted = false;

  if (currentTotal > constraints.maxBudgetUsd) {
    // Progressive down-tiering to DermaLux Essentials while preserving clinical active safety
    amMoist = getSkuById('SKU-MOIST-CERAMIDE-ESSENTIAL');
    pmRepair = getSkuById('SKU-REPAIR-ESSENTIAL-CREAM');
    budgetSubstituted = true;
    currentTotal = computeUniqueCartPrice([
      amCleanse,
      amTreat,
      amMoist,
      amSpf,
      pmCleanse,
      pmTreat,
      pmRepair,
    ]);
  }

  if (currentTotal > constraints.maxBudgetUsd) {
    amSpf = getSkuById('SKU-SPF-ESSENTIAL-FLUID');
    amCleanse = getSkuById('SKU-CLEANSE-OAT-ESSENTIAL');
    pmCleanse = getSkuById('SKU-CLEANSE-OAT-ESSENTIAL');
    budgetSubstituted = true;
    currentTotal = computeUniqueCartPrice([
      amCleanse,
      amTreat,
      amMoist,
      amSpf,
      pmCleanse,
      pmTreat,
      pmRepair,
    ]);
  }

  if (currentTotal > constraints.maxBudgetUsd) {
    amTreat = getSkuById('SKU-TREAT-AZELAIC-ESSENTIAL');
    if (pmTreat.skuId === 'SKU-TREAT-AZELAIC-10') {
      pmTreat = getSkuById('SKU-TREAT-AZELAIC-ESSENTIAL');
    }
    budgetSubstituted = true;
    currentTotal = computeUniqueCartPrice([
      amCleanse,
      amTreat,
      amMoist,
      amSpf,
      pmCleanse,
      pmTreat,
      pmRepair,
    ]);
  }

  const withinBudget = currentTotal <= constraints.maxBudgetUsd;

  let status: RegimenSolveStatus = 'OPTIMAL_CLINICAL_REGIMEN';
  if (!withinBudget) {
    status = 'BUDGET_FLOOR_HOLD';
  } else if (conflictResolutions.length > 0) {
    status = 'CONFLICT_RESOLVED_REGIMEN';
  } else if (budgetSubstituted) {
    status = 'BUDGET_ADAPTED_SUBSTITUTION';
  }

  const amSteps: ScheduledRoutineStep[] = [
    {
      window: 'AM',
      stepOrder: 1,
      stepSlot: 'CLEANSE',
      sku: amCleanse,
      selectionReason: 'Prepares stratum corneum without disrupting acid mantle pH.',
    },
    {
      window: 'AM',
      stepOrder: 2,
      stepSlot: 'TREAT',
      sku: amTreat,
      selectionReason: `Targets ${diagnostic.topPriorityConcerns.slice(0, 2).join(' & ')} with daytime antioxidant/chromophore balance.`,
    },
    {
      window: 'AM',
      stepOrder: 3,
      stepSlot: 'MOISTURIZE',
      sku: amMoist,
      selectionReason: 'Replenishes physiological 3:1:1 ceramide-cholesterol ratio.',
    },
    {
      window: 'AM',
      stepOrder: 4,
      stepSlot: 'SPF_FINISH',
      sku: amSpf,
      selectionReason: `Zero-white-cast UV + visible light (HEV) shield calibrated for ${diagnostic.fitzpatrickBand}.`,
    },
  ];

  const pmSteps: ScheduledRoutineStep[] = [
    {
      window: 'PM',
      stepOrder: 1,
      stepSlot: 'CLEANSE',
      sku: pmCleanse,
      selectionReason: 'Removes daytime mineral UV filters and urban particulate load.',
    },
    {
      window: 'PM',
      stepOrder: 2,
      stepSlot: 'TREAT',
      sku: pmTreat,
      selectionReason: barrierLockActive
        ? 'Barrier-safe nocturnal pigment & redness calmer while stratum corneum recovers.'
        : 'Nocturnal cellular turnover & dermal matrix remodeling active.',
    },
    {
      window: 'PM',
      stepOrder: 3,
      stepSlot: 'REPAIR',
      sku: pmRepair,
      selectionReason: 'Locks in overnight hydration and prevents transepidermal water loss (TEWL).',
    },
  ];

  return {
    profileId: diagnostic.profileId,
    status,
    amSteps,
    pmSteps,
    totalPriceUsd: currentTotal,
    budgetCeilingUsd: constraints.maxBudgetUsd,
    withinBudget,
    barrierLockActive,
    conflictResolutions,
  };
}

/**
 * Verifies that a solved AM/PM regimen contains zero pairwise active conflicts within its AM or PM windows,
 * respects barrier lockouts when compromised, and respects pregnancy-safe/fragrance-free constraints.
 */
export function verifyZeroActiveConflicts(
  regimen: SolvedAmPmRegimen,
  diagnostic: CalibratedSkinDiagnostic,
  constraints: RegimenConstraintInput
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const checkWindowPairs = (steps: ScheduledRoutineStep[], windowLabel: RoutineWindow) => {
    for (let i = 0; i < steps.length; i += 1) {
      const skuA = steps[i].sku;
      if (
        diagnostic.barrierIntegrityStatus === 'COMPROMISED_BARRIER' &&
        !skuA.barrierSafeWhenCompromised
      ) {
        violations.push(
          `${windowLabel} step ${skuA.skuId} violates COMPROMISED_BARRIER lockout.`
        );
      }
      if (constraints.pregnancySafeOnly && !skuA.pregnancySafe) {
        violations.push(`${windowLabel} step ${skuA.skuId} violates pregnancySafeOnly constraint.`);
      }
      if (constraints.fragranceFreeOnly && skuA.containsFragrance) {
        violations.push(`${windowLabel} step ${skuA.skuId} violates fragranceFreeOnly constraint.`);
      }
      for (let j = i + 1; j < steps.length; j += 1) {
        const skuB = steps[j].sku;
        const conflict = detectPairwiseActiveConflict(skuA.activeClass, skuB.activeClass);
        if (conflict) {
          violations.push(
            `${windowLabel} conflict (${conflict.conflictCode}) between ${skuA.skuId} and ${skuB.skuId}`
          );
        }
      }
    }
  };

  checkWindowPairs(regimen.amSteps, 'AM');
  checkWindowPairs(regimen.pmSteps, 'PM');

  if (regimen.amSteps.length !== 4) {
    violations.push(`Expected 4 AM steps, found ${regimen.amSteps.length}`);
  }
  if (regimen.pmSteps.length !== 3) {
    violations.push(`Expected 3 PM steps, found ${regimen.pmSteps.length}`);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
