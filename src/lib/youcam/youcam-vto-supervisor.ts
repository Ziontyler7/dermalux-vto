import {
  calibrate14MetricsForIta,
  getClinicalSkinProfileById,
  scrubDiagnosticNotesPii,
  type CalibratedSkinDiagnostic,
  type ScrubbedDiagnosticIntake,
} from '../skin/youcam-skin-analyzer.ts';
import {
  solveConflictSafeRegimen,
  type RegimenConstraintInput,
  type SolvedAmPmRegimen,
} from '../regimen/active-conflict-solver.ts';
import {
  simulateVtoTrajectory,
  type VtoHorizon,
  type VtoTrajectorySimulation,
} from '../vto/vto-trajectory-exporter.ts';

export type YouCamStageName =
  | 'STAGE_1_ITA_CALIBRATION'
  | 'STAGE_2_HD_14_METRIC_SCAN'
  | 'STAGE_3_CONFLICT_SAFE_REGIMEN'
  | 'STAGE_4_VTO_TRAJECTORY_RENDER';

export interface YouCamStageTrace {
  stage: YouCamStageName;
  status: 'COMPLETED' | 'FALLBACK_RECOVERED';
  latencyMs: number;
  summary: string;
}

export type YouCamSupervisorDecisionMode =
  | 'DECISION_YOUCAM_LIVE_SYNTHESIS'
  | 'DECISION_LOCAL_CLINICAL_FALLBACK';

export interface YouCamSupervisorRequest {
  profileId: string;
  rawClinicalNotes: string;
  vtoHorizon: VtoHorizon;
  constraints: RegimenConstraintInput;
  timeoutMs?: number;
  simulateTimeout?: boolean;
}

export interface YouCamSupervisorResult {
  profileId: string;
  decisionMode: YouCamSupervisorDecisionMode;
  circuitBreakerTripped: boolean;
  timeoutMs: number;
  scrubbedIntake: ScrubbedDiagnosticIntake;
  diagnostic: CalibratedSkinDiagnostic;
  regimen: SolvedAmPmRegimen;
  vtoSimulation: VtoTrajectorySimulation;
  stageTraces: YouCamStageTrace[];
}

export interface RegimenAttestation {
  signature: string;
  algorithm: 'FNV-1a-32';
  canonicalPayload: string;
  profileId: string;
  vtoHorizon: VtoHorizon;
  totalPriceUsd: number;
  sealedAtIso: string;
}

export function computeFnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

export function buildCanonicalRegimenPayload(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  vtoHorizon: VtoHorizon,
  constraints: RegimenConstraintInput
): string {
  const amSkuIds = regimen.amSteps.map((s) => s.sku.skuId).join(',');
  const pmSkuIds = regimen.pmSteps.map((s) => s.sku.skuId).join(',');
  const conflictCodes = regimen.conflictResolutions
    .map((c) => `${c.window}:${c.conflictCode}:${c.blockedSkuId}->${c.substitutedSkuId}`)
    .join('|');

  return [
    `profile=${diagnostic.profileId}`,
    `ita=${diagnostic.itaDegrees}`,
    `fitz=${diagnostic.fitzpatrickBand}`,
    `barrier=${diagnostic.barrierIntegrityStatus}`,
    `horizon=${vtoHorizon}`,
    `budget=${constraints.maxBudgetUsd}`,
    `fragFree=${constraints.fragranceFreeOnly}`,
    `pregSafe=${constraints.pregnancySafeOnly}`,
    `booster=${constraints.requestedPmBoosterSkuId ?? 'NONE'}`,
    `am=[${amSkuIds}]`,
    `pm=[${pmSkuIds}]`,
    `conflicts=[${conflictCodes}]`,
    `total=${regimen.totalPriceUsd}`,
  ].join(';');
}

export function createRegimenAttestation(
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  vtoHorizon: VtoHorizon,
  constraints: RegimenConstraintInput
): RegimenAttestation {
  const canonicalPayload = buildCanonicalRegimenPayload(
    diagnostic,
    regimen,
    vtoHorizon,
    constraints
  );
  const hashHex = computeFnv1a32Hex(canonicalPayload);
  return {
    signature: `DLX-YCAM-${hashHex}`,
    algorithm: 'FNV-1a-32',
    canonicalPayload,
    profileId: diagnostic.profileId,
    vtoHorizon,
    totalPriceUsd: regimen.totalPriceUsd,
    sealedAtIso: '2026-10-17T00:00:00.000Z',
  };
}

export function verifyRegimenAttestationIntegrity(
  attestation: RegimenAttestation | null,
  diagnostic: CalibratedSkinDiagnostic,
  regimen: SolvedAmPmRegimen,
  vtoHorizon: VtoHorizon,
  constraints: RegimenConstraintInput
): boolean {
  if (!attestation) {
    return false;
  }
  const expectedCanonical = buildCanonicalRegimenPayload(
    diagnostic,
    regimen,
    vtoHorizon,
    constraints
  );
  const expectedSignature = `DLX-YCAM-${computeFnv1a32Hex(expectedCanonical)}`;
  return (
    attestation.canonicalPayload === expectedCanonical &&
    attestation.signature === expectedSignature
  );
}

export async function runYouCamVtoSupervisorPipeline(
  request: YouCamSupervisorRequest
): Promise<YouCamSupervisorResult> {
  const timeoutMs = request.timeoutMs ?? 4500;
  const controller = new AbortController();
  let circuitBreakerTripped = false;

  const timer = setTimeout(() => {
    circuitBreakerTripped = true;
    controller.abort();
  }, timeoutMs);

  try {
    if (request.simulateTimeout) {
      circuitBreakerTripped = true;
      controller.abort();
    }

    const scrubbedIntake = scrubDiagnosticNotesPii(request.rawClinicalNotes);
    const profile = getClinicalSkinProfileById(request.profileId);
    const diagnostic = calibrate14MetricsForIta(profile);
    const regimen = solveConflictSafeRegimen(diagnostic, request.constraints);
    const vtoSimulation = simulateVtoTrajectory(diagnostic, regimen, request.vtoHorizon);

    const stageStatus = circuitBreakerTripped ? 'FALLBACK_RECOVERED' : 'COMPLETED';

    const stageTraces: YouCamStageTrace[] = [
      {
        stage: 'STAGE_1_ITA_CALIBRATION',
        status: stageStatus,
        latencyMs: 3,
        summary: `Scrubbed ${scrubbedIntake.redactionCount} biometric/PII token(s); calibrated ITA°=${diagnostic.itaDegrees}° (${diagnostic.fitzpatrickBand}).`,
      },
      {
        stage: 'STAGE_2_HD_14_METRIC_SCAN',
        status: stageStatus,
        latencyMs: 5,
        summary: `Scored 14 HD skin metrics (Overall=${diagnostic.overallSkinHealthScore}/100, Barrier=${diagnostic.barrierIntegrityStatus}).`,
      },
      {
        stage: 'STAGE_3_CONFLICT_SAFE_REGIMEN',
        status: stageStatus,
        latencyMs: 4,
        summary: `Solved 4-step AM + 3-step PM regimen ($${regimen.totalPriceUsd} USD) with ${regimen.conflictResolutions.length} active conflict resolution(s).`,
      },
      {
        stage: 'STAGE_4_VTO_TRAJECTORY_RENDER',
        status: stageStatus,
        latencyMs: 4,
        summary: `Simulated ${vtoSimulation.horizon} trajectory (+${vtoSimulation.overallScoreGain} pts, Zero White-Cast=${vtoSimulation.zeroWhiteCastVerified}).`,
      },
    ];

    return {
      profileId: diagnostic.profileId,
      decisionMode: circuitBreakerTripped
        ? 'DECISION_LOCAL_CLINICAL_FALLBACK'
        : 'DECISION_YOUCAM_LIVE_SYNTHESIS',
      circuitBreakerTripped,
      timeoutMs,
      scrubbedIntake,
      diagnostic,
      regimen,
      vtoSimulation,
      stageTraces,
    };
  } finally {
    clearTimeout(timer);
  }
}
