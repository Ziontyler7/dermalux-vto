export type YouCamMetricKey =
  | 'moisture'
  | 'oiliness'
  | 'redness'
  | 'texture'
  | 'wrinkles'
  | 'pores'
  | 'darkSpots'
  | 'acne'
  | 'radiance'
  | 'firmness'
  | 'tearTrough'
  | 'upperEyelid'
  | 'lowerEyelid'
  | 'skinAgeIndex';

export const YOUCAM_14_METRIC_KEYS: readonly YouCamMetricKey[] = [
  'moisture',
  'oiliness',
  'redness',
  'texture',
  'wrinkles',
  'pores',
  'darkSpots',
  'acne',
  'radiance',
  'firmness',
  'tearTrough',
  'upperEyelid',
  'lowerEyelid',
  'skinAgeIndex',
] as const;

export interface YouCam14Metrics {
  moisture: number;
  oiliness: number;
  redness: number;
  texture: number;
  wrinkles: number;
  pores: number;
  darkSpots: number;
  acne: number;
  radiance: number;
  firmness: number;
  tearTrough: number;
  upperEyelid: number;
  lowerEyelid: number;
  skinAgeIndex: number;
}

export interface CieLabColor {
  /** Lightness L* in [0, 100] */
  L: number;
  /** Red-Green axis a* in [-128, 127] */
  a: number;
  /** Yellow-Blue axis b* in [-128, 127] */
  b: number;
}

export type FitzpatrickBand =
  | 'FITZPATRICK_I'
  | 'FITZPATRICK_II'
  | 'FITZPATRICK_III'
  | 'FITZPATRICK_IV'
  | 'FITZPATRICK_V'
  | 'FITZPATRICK_VI';

export type ItaCategoryLabel =
  | 'VERY_LIGHT'
  | 'LIGHT'
  | 'INTERMEDIATE'
  | 'TAN_OLIVE'
  | 'BROWN'
  | 'DEEP_MELANIN_RICH';

export type BarrierIntegrityStatus =
  | 'COMPROMISED_BARRIER'
  | 'WATCH_SENSITIVITY'
  | 'RESILIENT_BARRIER';

export interface FacialZoneTelemetry {
  zoneId: string;
  zoneLabel: string;
  primaryMetric: YouCamMetricKey;
  score: number;
  svgCx: number;
  svgCy: number;
  svgRadius: number;
}

export interface ClinicalSkinProfile {
  profileId: string;
  displayName: string;
  clinicalSummary: string;
  chronologicalAge: number;
  cieLab: CieLabColor;
  raw14Metrics: YouCam14Metrics;
  primaryConcerns: YouCamMetricKey[];
  defaultUserGoal: string;
}

export interface CalibratedSkinDiagnostic {
  profileId: string;
  displayName: string;
  chronologicalAge: number;
  cieLab: CieLabColor;
  itaDegrees: number;
  fitzpatrickBand: FitzpatrickBand;
  itaCategoryLabel: ItaCategoryLabel;
  rawMetrics: YouCam14Metrics;
  calibratedMetrics: YouCam14Metrics;
  erythemaCompensationDelta: number;
  melaninFairnessBaselineLift: number;
  overallSkinHealthScore: number;
  barrierIntegrityStatus: BarrierIntegrityStatus;
  topPriorityConcerns: YouCamMetricKey[];
  facialZones: FacialZoneTelemetry[];
}

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Computes Individual Typology Angle (ITA°) from CIE L*a*b* coordinates:
 * ITA° = atan2(L* - 50, b*) * (180 / pi)
 */
export function computeItaDegrees(cieLab: CieLabColor): number {
  const safeB = Math.abs(cieLab.b) < 0.001 ? 0.001 : cieLab.b;
  const radians = Math.atan2(cieLab.L - 50, safeB);
  const degrees = radians * (180 / Math.PI);
  return Math.round(degrees * 100) / 100;
}

export function classifyFitzpatrickFromIta(itaDegrees: number): {
  fitzpatrickBand: FitzpatrickBand;
  itaCategoryLabel: ItaCategoryLabel;
} {
  if (itaDegrees > 55) {
    return { fitzpatrickBand: 'FITZPATRICK_I', itaCategoryLabel: 'VERY_LIGHT' };
  }
  if (itaDegrees > 41) {
    return { fitzpatrickBand: 'FITZPATRICK_II', itaCategoryLabel: 'LIGHT' };
  }
  if (itaDegrees > 28) {
    return { fitzpatrickBand: 'FITZPATRICK_III', itaCategoryLabel: 'INTERMEDIATE' };
  }
  if (itaDegrees > 10) {
    return { fitzpatrickBand: 'FITZPATRICK_IV', itaCategoryLabel: 'TAN_OLIVE' };
  }
  if (itaDegrees > -30) {
    return { fitzpatrickBand: 'FITZPATRICK_V', itaCategoryLabel: 'BROWN' };
  }
  return { fitzpatrickBand: 'FITZPATRICK_VI', itaCategoryLabel: 'DEEP_MELANIN_RICH' };
}

/**
 * Calibrates raw 14-metric YouCam scores using CIE L*a*b* ITA° and a* chromophore telemetry:
 * 1. Melanin-Fairness Hyperpigmentation Normalization: Removes baseline melanin optical penalty
 *    on Fitzpatrick IV–VI so darkSpots reflects focal dyschromia/PIH rather than constitutional tone.
 * 2. Subclinical Erythema Sensitivity Compensation: Detects masked hemoglobin inflammation (high a*)
 *    in deeper skin tones (ITA° <= 10°) so barrier compromise is never missed prior to acid/retinoid prescription.
 */
export function calibrate14MetricsForIta(
  profile: ClinicalSkinProfile
): CalibratedSkinDiagnostic {
  const itaDegrees = computeItaDegrees(profile.cieLab);
  const { fitzpatrickBand, itaCategoryLabel } = classifyFitzpatrickFromIta(itaDegrees);

  let erythemaCompensationDelta = 0;
  if (itaDegrees <= 10 && profile.cieLab.a >= 12.5) {
    // Subclinical erythema masked by epidermal melanin absorption in RGB capture
    const hemoglobinIntensity = Math.min(10, Math.round((profile.cieLab.a - 11.0) * 2.3));
    erythemaCompensationDelta = -hemoglobinIntensity;
  } else if (itaDegrees <= 28 && profile.cieLab.a >= 14.0) {
    erythemaCompensationDelta = -4;
  }

  let melaninFairnessBaselineLift = 0;
  if (itaDegrees <= -30) {
    melaninFairnessBaselineLift = 7;
  } else if (itaDegrees <= 10) {
    melaninFairnessBaselineLift = 5;
  } else if (itaDegrees <= 28) {
    melaninFairnessBaselineLift = 3;
  }

  const calibratedRedness = clampScore(profile.raw14Metrics.redness + erythemaCompensationDelta);
  const calibratedDarkSpots = clampScore(
    profile.raw14Metrics.darkSpots + melaninFairnessBaselineLift
  );

  const calibratedMetrics: YouCam14Metrics = {
    ...profile.raw14Metrics,
    redness: calibratedRedness,
    darkSpots: calibratedDarkSpots,
  };

  const healthMetricKeys: (keyof YouCam14Metrics)[] = [
    'moisture',
    'oiliness',
    'redness',
    'texture',
    'wrinkles',
    'pores',
    'darkSpots',
    'acne',
    'radiance',
    'firmness',
    'tearTrough',
    'upperEyelid',
    'lowerEyelid',
  ];

  const sumScores = healthMetricKeys.reduce(
    (sum, key) => sum + calibratedMetrics[key],
    0
  );
  const overallSkinHealthScore = Math.round((sumScores / healthMetricKeys.length) * 10) / 10;

  let barrierIntegrityStatus: BarrierIntegrityStatus = 'RESILIENT_BARRIER';
  if (calibratedMetrics.moisture < 48 || calibratedMetrics.redness < 52) {
    barrierIntegrityStatus = 'COMPROMISED_BARRIER';
  } else if (calibratedMetrics.moisture < 58 || calibratedMetrics.redness < 62) {
    barrierIntegrityStatus = 'WATCH_SENSITIVITY';
  }

  const rankedConcerns = [...healthMetricKeys]
    .sort((a, b) => calibratedMetrics[a] - calibratedMetrics[b])
    .slice(0, 4);

  const facialZones: FacialZoneTelemetry[] = [
    {
      zoneId: 'ZONE-FOREHEAD-GLABELLA',
      zoneLabel: 'Forehead & Glabella Rhytids',
      primaryMetric: 'wrinkles',
      score: calibratedMetrics.wrinkles,
      svgCx: 160,
      svgCy: 74,
      svgRadius: 24,
    },
    {
      zoneId: 'ZONE-UPPER-EYELID-L',
      zoneLabel: 'Superior Orbital Lid Elasticity',
      primaryMetric: 'upperEyelid',
      score: calibratedMetrics.upperEyelid,
      svgCx: 118,
      svgCy: 110,
      svgRadius: 14,
    },
    {
      zoneId: 'ZONE-LOWER-EYELID-R',
      zoneLabel: 'Infraorbital Bag & Puffiness',
      primaryMetric: 'lowerEyelid',
      score: calibratedMetrics.lowerEyelid,
      svgCx: 202,
      svgCy: 126,
      svgRadius: 15,
    },
    {
      zoneId: 'ZONE-TEAR-TROUGH-L',
      zoneLabel: 'Medial Tear Trough Hollow',
      primaryMetric: 'tearTrough',
      score: calibratedMetrics.tearTrough,
      svgCx: 124,
      svgCy: 132,
      svgRadius: 14,
    },
    {
      zoneId: 'ZONE-TZONE-SEBUM',
      zoneLabel: 'Nasal Bridge & T-Zone Sebum',
      primaryMetric: 'oiliness',
      score: calibratedMetrics.oiliness,
      svgCx: 160,
      svgCy: 138,
      svgRadius: 18,
    },
    {
      zoneId: 'ZONE-MEDIAL-PORES',
      zoneLabel: 'Medial Malar Pore Architecture',
      primaryMetric: 'pores',
      score: calibratedMetrics.pores,
      svgCx: 132,
      svgCy: 164,
      svgRadius: 17,
    },
    {
      zoneId: 'ZONE-MALAR-ERYTHEMA-L',
      zoneLabel: 'Left Malar Barrier Erythema',
      primaryMetric: 'redness',
      score: calibratedMetrics.redness,
      svgCx: 102,
      svgCy: 172,
      svgRadius: 22,
    },
    {
      zoneId: 'ZONE-MALAR-PIH-R',
      zoneLabel: 'Right Malar Pigmentation & PIH',
      primaryMetric: 'darkSpots',
      score: calibratedMetrics.darkSpots,
      svgCx: 218,
      svgCy: 172,
      svgRadius: 22,
    },
    {
      zoneId: 'ZONE-CHEEK-MOISTURE-L',
      zoneLabel: 'Stratum Corneum Hydration Matrix',
      primaryMetric: 'moisture',
      score: calibratedMetrics.moisture,
      svgCx: 112,
      svgCy: 210,
      svgRadius: 20,
    },
    {
      zoneId: 'ZONE-CHEEK-TEXTURE-R',
      zoneLabel: 'Lateral Micro-Relief Texture',
      primaryMetric: 'texture',
      score: calibratedMetrics.texture,
      svgCx: 208,
      svgCy: 210,
      svgRadius: 20,
    },
    {
      zoneId: 'ZONE-PERIORAL-ACNE',
      zoneLabel: 'Perioral & Chin Blemish Zone',
      primaryMetric: 'acne',
      score: calibratedMetrics.acne,
      svgCx: 160,
      svgCy: 244,
      svgRadius: 21,
    },
    {
      zoneId: 'ZONE-JAWLINE-FIRMNESS',
      zoneLabel: 'Mandibular Contour Firmness',
      primaryMetric: 'firmness',
      score: calibratedMetrics.firmness,
      svgCx: 160,
      svgCy: 278,
      svgRadius: 19,
    },
    {
      zoneId: 'ZONE-HIGHLIGHT-RADIANCE',
      zoneLabel: 'Zygomatic Optical Radiance',
      primaryMetric: 'radiance',
      score: calibratedMetrics.radiance,
      svgCx: 224,
      svgCy: 146,
      svgRadius: 15,
    },
    {
      zoneId: 'ZONE-BIOLOGICAL-AGE',
      zoneLabel: 'Dermal Age Index Marker',
      primaryMetric: 'skinAgeIndex',
      score: clampScore(100 - Math.max(0, calibratedMetrics.skinAgeIndex - 20) * 1.4),
      svgCx: 160,
      svgCy: 46,
      svgRadius: 14,
    },
  ];

  return {
    profileId: profile.profileId,
    displayName: profile.displayName,
    chronologicalAge: profile.chronologicalAge,
    cieLab: profile.cieLab,
    itaDegrees,
    fitzpatrickBand,
    itaCategoryLabel,
    rawMetrics: profile.raw14Metrics,
    calibratedMetrics,
    erythemaCompensationDelta,
    melaninFairnessBaselineLift,
    overallSkinHealthScore,
    barrierIntegrityStatus,
    topPriorityConcerns: rankedConcerns,
    facialZones,
  };
}

export const CLINICAL_SKIN_PROFILES: readonly ClinicalSkinProfile[] = [
  {
    profileId: 'DLX-FITZ-I-SENSITIVE',
    displayName: 'Profile 01 · Nordic Reactive & Barrier-Impaired (Fitzpatrick I)',
    clinicalSummary:
      'High transepidermal water loss (TEWL) and acute malar erythema following over-exfoliation; requires immediate barrier lipid replenishment.',
    chronologicalAge: 29,
    cieLab: { L: 74.2, a: 15.8, b: 14.3 },
    raw14Metrics: {
      moisture: 41,
      oiliness: 76,
      redness: 43,
      texture: 58,
      wrinkles: 74,
      pores: 79,
      darkSpots: 72,
      acne: 68,
      radiance: 54,
      firmness: 78,
      tearTrough: 69,
      upperEyelid: 81,
      lowerEyelid: 75,
      skinAgeIndex: 32,
    },
    primaryConcerns: ['moisture', 'redness', 'radiance', 'texture'],
    defaultUserGoal: 'Calm visible redness, repair stinging moisture barrier, and add sheer mineral UV protection.',
  },
  {
    profileId: 'DLX-FITZ-III-COMBO',
    displayName: 'Profile 02 · Mediterranean Combination & Blemish-Prone (Fitzpatrick III)',
    clinicalSummary:
      'Elevated T-zone sebum output, congested medial pores, and inflammatory blemishes with intact stratum corneum hydration.',
    chronologicalAge: 27,
    cieLab: { L: 63.5, a: 11.4, b: 19.5 },
    raw14Metrics: {
      moisture: 66,
      oiliness: 46,
      redness: 68,
      texture: 55,
      wrinkles: 82,
      pores: 49,
      darkSpots: 64,
      acne: 47,
      radiance: 63,
      firmness: 84,
      tearTrough: 74,
      upperEyelid: 85,
      lowerEyelid: 79,
      skinAgeIndex: 28,
    },
    primaryConcerns: ['oiliness', 'acne', 'pores', 'texture'],
    defaultUserGoal: 'Clear congested pores and blemishes while preventing retinoid/peroxide oxidation conflicts.',
  },
  {
    profileId: 'DLX-FITZ-V-PIH',
    displayName: 'Profile 03 · South Asian PIH & Photo-Texture (Fitzpatrick V)',
    clinicalSummary:
      'Focal post-inflammatory hyperpigmentation (PIH) and early periorbital fine lines with resilient barrier hydration.',
    chronologicalAge: 34,
    cieLab: { L: 47.2, a: 11.8, b: 18.4 },
    raw14Metrics: {
      moisture: 64,
      oiliness: 68,
      redness: 71,
      texture: 59,
      wrinkles: 54,
      pores: 63,
      darkSpots: 44,
      acne: 69,
      radiance: 56,
      firmness: 65,
      tearTrough: 58,
      upperEyelid: 72,
      lowerEyelid: 67,
      skinAgeIndex: 36,
    },
    primaryConcerns: ['darkSpots', 'wrinkles', 'radiance', 'tearTrough'],
    defaultUserGoal: 'Target focal dark spots and fine lines without white-cast sunscreen or melanin-biased scoring.',
  },
  {
    profileId: 'DLX-FITZ-VI-BARRIER',
    displayName: 'Profile 04 · Melanin-Rich Subclinical Erythema (Fitzpatrick VI)',
    clinicalSummary:
      'Deep melanin-rich complexion where standard RGB sensors mask underlying barrier erythema (a* = 14.5); ITA° calibration prevents harsh keratolytic burns.',
    chronologicalAge: 31,
    cieLab: { L: 34.8, a: 14.5, b: 19.2 },
    raw14Metrics: {
      moisture: 49,
      oiliness: 62,
      redness: 55,
      texture: 57,
      wrinkles: 79,
      pores: 64,
      darkSpots: 48,
      acne: 58,
      radiance: 61,
      firmness: 83,
      tearTrough: 73,
      upperEyelid: 84,
      lowerEyelid: 78,
      skinAgeIndex: 31,
    },
    primaryConcerns: ['redness', 'moisture', 'darkSpots', 'texture'],
    defaultUserGoal: 'Detect subclinical irritation early and brighten uneven tone safely without barrier stripping.',
  },
] as const;

const BIOMETRIC_DATA_URI_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
const EXIF_GPS_PATTERN =
  /\b(?:GPSLatitude|GPSLongitude|EXIF_GPS)\s*[:=]\s*[-+]?\d{1,3}\.\d+(?:\s*,\s*[-+]?\d{1,3}\.\d+)?/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\b\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

export interface ScrubbedDiagnosticIntake {
  sanitizedText: string;
  redactionCount: number;
  redactedCategories: string[];
}

export function scrubDiagnosticNotesPii(rawInput: string): ScrubbedDiagnosticIntake {
  let sanitizedText = rawInput;
  let redactionCount = 0;
  const redactedCategories: string[] = [];

  const applyPattern = (pattern: RegExp, token: string, category: string) => {
    const matches = sanitizedText.match(pattern);
    if (matches && matches.length > 0) {
      redactionCount += matches.length;
      if (!redactedCategories.includes(category)) {
        redactedCategories.push(category);
      }
      sanitizedText = sanitizedText.replace(pattern, token);
    }
  };

  applyPattern(BIOMETRIC_DATA_URI_PATTERN, '[REDACTED_BIOMETRIC_URI]', 'BIOMETRIC_IMAGE_URI');
  applyPattern(EXIF_GPS_PATTERN, '[REDACTED_EXIF_GPS]', 'EXIF_GPS_COORDINATES');
  applyPattern(EMAIL_PATTERN, '[REDACTED_EMAIL]', 'EMAIL_ADDRESS');
  applyPattern(PHONE_PATTERN, '[REDACTED_PHONE]', 'PHONE_NUMBER');

  return {
    sanitizedText,
    redactionCount,
    redactedCategories,
  };
}

export function verifyZeroBiometricLeakage(text: string): boolean {
  return (
    !BIOMETRIC_DATA_URI_PATTERN.test(text) &&
    !EXIF_GPS_PATTERN.test(text) &&
    !EMAIL_PATTERN.test(text) &&
    !PHONE_PATTERN.test(text)
  );
}

export function getClinicalSkinProfileById(profileId: string): ClinicalSkinProfile {
  const found = CLINICAL_SKIN_PROFILES.find((item) => item.profileId === profileId);
  return found ?? CLINICAL_SKIN_PROFILES[0];
}
