import type {
  CalibratedSkinDiagnostic,
  CieLabColor,
  FacialZoneTelemetry,
  YouCam14Metrics,
  YouCamMetricKey,
} from '../skin/youcam-skin-analyzer.ts';
import { YOUCAM_14_METRIC_KEYS } from '../skin/youcam-skin-analyzer.ts';
import type { SolvedAmPmRegimen } from '../regimen/active-conflict-solver.ts';

export type VtoHorizon = 'IMMEDIATE_VTO' | 'WEEK_4_VTO' | 'WEEK_8_VTO';

export interface VtoMetricDelta {
  metric: YouCamMetricKey;
  baselineScore: number;
  projectedScore: number;
  delta: number;
}

export interface VtoTrajectorySimulation {
  profileId: string;
  horizon: VtoHorizon;
  horizonLabel: string;
  baselineMetrics: YouCam14Metrics;
  projectedMetrics: YouCam14Metrics;
  metricDeltas: VtoMetricDelta[];
  baselineOverallScore: number;
  projectedOverallScore: number;
  overallScoreGain: number;
  baselineCieLab: CieLabColor;
  projectedCieLab: CieLabColor;
  zeroWhiteCastVerified: boolean;
  projectedZones: FacialZoneTelemetry[];
}

function clampMetric(value: number, min = 0, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function simulateVtoTrajectory(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  horizon: VtoHorizon
): VtoTrajectorySimulation {
  const base = diagnostic.calibratedMetrics;
  const targetedSet = new Set<YouCamMetricKey>();
  for (const step of [...regimen.amSteps, ...regimen.pmSteps]) {
    for (const metric of step.sku.targetMetrics) {
      targetedSet.add(metric);
    }
  }

  const horizonMultiplier =
    horizon === 'IMMEDIATE_VTO' ? 0.28 : horizon === 'WEEK_4_VTO' ? 0.65 : 1.0;

  const computeProjectedScore = (key: YouCamMetricKey, current: number): number => {
    if (key === 'skinAgeIndex') {
      const ageDrop =
        horizon === 'IMMEDIATE_VTO' ? 1 : horizon === 'WEEK_4_VTO' ? 2 : 4;
      return Math.max(18, current - ageDrop);
    }

    if (horizon === 'IMMEDIATE_VTO') {
      if (key === 'radiance') return clampMetric(current + 8);
      if (key === 'redness') return clampMetric(current + 6);
      if (key === 'pores') return clampMetric(current + 5);
      if (key === 'moisture') return clampMetric(current + 7);
      if (key === 'darkSpots') return clampMetric(current + 4);
      return clampMetric(current + 2);
    }

    const headroom = Math.max(6, 94 - current);
    const targetedBoost = targetedSet.has(key) ? 0.32 : 0.16;
    const rawGain = Math.round(headroom * targetedBoost * horizonMultiplier);
    return clampMetric(current + Math.max(3, rawGain));
  };

  const projectedMetrics: YouCam14Metrics = {
    moisture: computeProjectedScore('moisture', base.moisture),
    oiliness: computeProjectedScore('oiliness', base.oiliness),
    redness: computeProjectedScore('redness', base.redness),
    texture: computeProjectedScore('texture', base.texture),
    wrinkles: computeProjectedScore('wrinkles', base.wrinkles),
    pores: computeProjectedScore('pores', base.pores),
    darkSpots: computeProjectedScore('darkSpots', base.darkSpots),
    acne: computeProjectedScore('acne', base.acne),
    radiance: computeProjectedScore('radiance', base.radiance),
    firmness: computeProjectedScore('firmness', base.firmness),
    tearTrough: computeProjectedScore('tearTrough', base.tearTrough),
    upperEyelid: computeProjectedScore('upperEyelid', base.upperEyelid),
    lowerEyelid: computeProjectedScore('lowerEyelid', base.lowerEyelid),
    skinAgeIndex: computeProjectedScore('skinAgeIndex', base.skinAgeIndex),
  };

  const metricDeltas: VtoMetricDelta[] = YOUCAM_14_METRIC_KEYS.map((metric) => ({
    metric,
    baselineScore: base[metric],
    projectedScore: projectedMetrics[metric],
    delta: projectedMetrics[metric] - base[metric],
  }));

  const healthKeys = YOUCAM_14_METRIC_KEYS.filter((k) => k !== 'skinAgeIndex');
  const projectedSum = healthKeys.reduce((acc, k) => acc + projectedMetrics[k], 0);
  const projectedOverallScore = Math.round((projectedSum / healthKeys.length) * 10) / 10;
  const overallScoreGain =
    Math.round((projectedOverallScore - diagnostic.overallSkinHealthScore) * 10) / 10;

  const spfStep = regimen.amSteps.find((s) => s.stepSlot === 'SPF_FINISH');
  const tintDelta = spfStep?.sku.vtoFinishTintDeltaLab ?? { dL: 0.5, da: -1.5, db: 0.2 };

  const projectedCieLab: CieLabColor = {
    L: Math.round((diagnostic.cieLab.L + tintDelta.dL) * 100) / 100,
    a:
      Math.round(
        (diagnostic.cieLab.a + tintDelta.da * (horizon === 'IMMEDIATE_VTO' ? 0.6 : 1.0)) * 100
      ) / 100,
    b: Math.round((diagnostic.cieLab.b + tintDelta.db) * 100) / 100,
  };

  const whiteCastDeltaL = Math.abs(projectedCieLab.L - diagnostic.cieLab.L);
  const zeroWhiteCastVerified = whiteCastDeltaL <= 1.5;

  const projectedZones: FacialZoneTelemetry[] = diagnostic.facialZones.map((zone) => ({
    ...zone,
    score:
      zone.primaryMetric === 'skinAgeIndex'
        ? clampMetric(100 - Math.max(0, projectedMetrics.skinAgeIndex - 20) * 1.4)
        : projectedMetrics[zone.primaryMetric],
  }));

  const horizonLabel =
    horizon === 'IMMEDIATE_VTO'
      ? 'Immediate Optical SPF Tint & Barrier Blur (Day 0 VTO)'
      : horizon === 'WEEK_4_VTO'
        ? 'Week 4 Epidermal Turnover & Barrier Recovery VTO'
        : 'Week 8 Dermal Matrix & Chromophore Remodeling VTO';

  return {
    profileId: diagnostic.profileId,
    horizon,
    horizonLabel,
    baselineMetrics: base,
    projectedMetrics,
    metricDeltas,
    baselineOverallScore: diagnostic.overallSkinHealthScore,
    projectedOverallScore,
    overallScoreGain,
    baselineCieLab: diagnostic.cieLab,
    projectedCieLab,
    zeroWhiteCastVerified,
    projectedZones,
  };
}

export function exportYouCamVtoJson(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  vto: VtoTrajectorySimulation,
  attestationSignature?: string
): string {
  const payload = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    platform: 'DermaLux Studio · Perfect Corp YouCam Skin AI & eCommerce VTO',
    exportedAtIso: '2026-10-17T00:00:00.000Z',
    attestationSignature: attestationSignature ?? 'UNSEALED_PREVIEW',
    skinDiagnostic: {
      profileId: diagnostic.profileId,
      displayName: diagnostic.displayName,
      itaDegrees: diagnostic.itaDegrees,
      fitzpatrickBand: diagnostic.fitzpatrickBand,
      itaCategoryLabel: diagnostic.itaCategoryLabel,
      barrierIntegrityStatus: diagnostic.barrierIntegrityStatus,
      erythemaCompensationDelta: diagnostic.erythemaCompensationDelta,
      melaninFairnessBaselineLift: diagnostic.melaninFairnessBaselineLift,
      overallSkinHealthScore: diagnostic.overallSkinHealthScore,
      calibrated14Metrics: diagnostic.calibratedMetrics,
    },
    vtoSimulation: {
      horizon: vto.horizon,
      horizonLabel: vto.horizonLabel,
      baselineOverallScore: vto.baselineOverallScore,
      projectedOverallScore: vto.projectedOverallScore,
      overallScoreGain: vto.overallScoreGain,
      zeroWhiteCastVerified: vto.zeroWhiteCastVerified,
      projected14Metrics: vto.projectedMetrics,
    },
    ecommerceRegimenCart: {
      status: regimen.status,
      totalPriceUsd: regimen.totalPriceUsd,
      budgetCeilingUsd: regimen.budgetCeilingUsd,
      withinBudget: regimen.withinBudget,
      barrierLockActive: regimen.barrierLockActive,
      amRoutine: regimen.amSteps.map((s) => ({
        stepOrder: s.stepOrder,
        stepSlot: s.stepSlot,
        skuId: s.sku.skuId,
        productName: s.sku.productName,
        activeClass: s.sku.activeClass,
        priceUsd: s.sku.priceUsd,
      })),
      pmRoutine: regimen.pmSteps.map((s) => ({
        stepOrder: s.stepOrder,
        stepSlot: s.stepSlot,
        skuId: s.sku.skuId,
        productName: s.sku.productName,
        activeClass: s.sku.activeClass,
        priceUsd: s.sku.priceUsd,
      })),
      conflictResolutions: regimen.conflictResolutions,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function exportRegimenAdherenceIcs(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen
): string {
  const amSummary = regimen.amSteps
    .map((s) => `${s.stepOrder}. [${s.stepSlot}] ${s.sku.productName}`)
    .join('\\n');
  const pmSummary = regimen.pmSteps
    .map((s) => `${s.stepOrder}. [${s.stepSlot}] ${s.sku.productName}`)
    .join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DermaLux Studio//YouCam Skin AI VTO Regimen 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:dermalux-am-${diagnostic.profileId.toLowerCase()}@dermalux.local`,
    'DTSTAMP:20261102T073000Z',
    'DTSTART:20261102T073000Z',
    'DTEND:20261102T074500Z',
    'RRULE:FREQ=DAILY;COUNT=56',
    `SUMMARY:DermaLux AM 4-Step Barrier & UV Shield (${diagnostic.fitzpatrickBand})`,
    `DESCRIPTION:${amSummary}`,
    'END:VEVENT',
    'BEGIN:VEVENT',
    `UID:dermalux-pm-${diagnostic.profileId.toLowerCase()}@dermalux.local`,
    'DTSTAMP:20261102T213000Z',
    'DTSTART:20261102T213000Z',
    'DTEND:20261102T214500Z',
    'RRULE:FREQ=DAILY;COUNT=56',
    `SUMMARY:DermaLux PM 3-Step Cellular & Lipid Recovery (${diagnostic.fitzpatrickBand})`,
    `DESCRIPTION:${pmSummary}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function exportClinicalRegimenMarkdown(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  vto: VtoTrajectorySimulation,
  attestationSignature?: string
): string {
  const amLines = regimen.amSteps
    .map(
      (s) =>
        `- **AM Step ${s.stepOrder} (${s.stepSlot})**: ${s.sku.productName} (\`${s.sku.skuId}\`, $${s.sku.priceUsd}) — *${s.sku.keyActivesSummary}*`
    )
    .join('\n');

  const pmLines = regimen.pmSteps
    .map(
      (s) =>
        `- **PM Step ${s.stepOrder} (${s.stepSlot})**: ${s.sku.productName} (\`${s.sku.skuId}\`, $${s.sku.priceUsd}) — *${s.sku.keyActivesSummary}*`
    )
    .join('\n');

  const conflictLines =
    regimen.conflictResolutions.length === 0
      ? '- Zero active ingredient conflicts detected; baseline prescription is biochemically compatible.'
      : regimen.conflictResolutions
          .map(
            (c) =>
              `- **[${c.conflictCode}] (${c.window})**: Blocked \`${c.blockedSkuId}\` (${c.blockedProductName}) -> Substituted \`${c.substitutedSkuId}\` (${c.substitutedProductName}). *${c.clinicalRationale}*`
          )
          .join('\n');

  return [
    `# DermaLux Studio — Clinical Skin AI & VTO Regimen Passport`,
    ``,
    `- **Profile**: ${diagnostic.displayName} (\`${diagnostic.profileId}\`)`,
    `- **Tone Calibration**: ITA° \`${diagnostic.itaDegrees}°\` · \`${diagnostic.fitzpatrickBand}\` (\`${diagnostic.itaCategoryLabel}\`)`,
    `- **Barrier Integrity**: \`${diagnostic.barrierIntegrityStatus}\``,
    `- **VTO Horizon**: ${vto.horizonLabel} (\`${vto.baselineOverallScore}\` -> \`${vto.projectedOverallScore}\`, \`+${vto.overallScoreGain}\` pts)`,
    `- **Bundle Total**: **$${regimen.totalPriceUsd} USD** (Budget Ceiling: $${regimen.budgetCeilingUsd} USD)`,
    `- **Attestation Seal**: \`${attestationSignature ?? 'UNSEALED'}\``,
    ``,
    `## Morning (AM) 4-Step Protection Protocol`,
    amLines,
    ``,
    `## Evening (PM) 3-Step Cellular & Barrier Protocol`,
    pmLines,
    ``,
    `## Biochemical Active-Ingredient Guardrail Log`,
    conflictLines,
  ].join('\n');
}
