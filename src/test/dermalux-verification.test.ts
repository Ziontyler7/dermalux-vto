import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CLINICAL_SKIN_PROFILES,
  YOUCAM_14_METRIC_KEYS,
  calibrate14MetricsForIta,
  classifyFitzpatrickFromIta,
  computeItaDegrees,
  getClinicalSkinProfileById,
  scrubDiagnosticNotesPii,
  verifyZeroBiometricLeakage,
} from '../lib/skin/youcam-skin-analyzer.ts';
import {
  detectPairwiseActiveConflict,
  solveConflictSafeRegimen,
  verifyZeroActiveConflicts,
} from '../lib/regimen/active-conflict-solver.ts';
import {
  exportClinicalRegimenMarkdown,
  exportRegimenAdherenceIcs,
  exportYouCamVtoJson,
  simulateVtoTrajectory,
} from '../lib/vto/vto-trajectory-exporter.ts';
import {
  createRegimenAttestation,
  runYouCamVtoSupervisorPipeline,
  verifyRegimenAttestationIntegrity,
} from '../lib/youcam/youcam-vto-supervisor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

test('Gate 1: YouCam 14-Metric HD Schema, CIE L*a*b* ITA° Calibration & Zero-Biometric PII Scrubber', () => {
  assert.equal(YOUCAM_14_METRIC_KEYS.length, 14, 'Must define all 14 YouCam HD skin metrics');
  assert.equal(CLINICAL_SKIN_PROFILES.length, 4, 'Must provide 4 clinical reference profiles');

  // Verify Fitzpatrick I Sensitive profile
  const fitz1 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-I-SENSITIVE'));
  assert.ok(fitz1.itaDegrees > 55, `Expected Fitzpatrick I ITA° > 55, got ${fitz1.itaDegrees}`);
  assert.equal(fitz1.fitzpatrickBand, 'FITZPATRICK_I');
  assert.equal(fitz1.barrierIntegrityStatus, 'COMPROMISED_BARRIER');
  assert.equal(fitz1.facialZones.length, 14, 'Must map 14 facial diagnostic zones');

  // Verify Fitzpatrick V PIH melanin-fairness lift
  const fitz5 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-V-PIH'));
  assert.equal(fitz5.fitzpatrickBand, 'FITZPATRICK_V');
  assert.equal(fitz5.melaninFairnessBaselineLift, 5);
  assert.equal(
    fitz5.calibratedMetrics.darkSpots,
    fitz5.rawMetrics.darkSpots + 5,
    'Fitzpatrick V darkSpots must receive +5 melanin-fairness baseline normalization'
  );

  // Verify Fitzpatrick VI subclinical erythema detection
  const fitz6 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-VI-BARRIER'));
  assert.ok(fitz6.itaDegrees <= -30, `Expected Fitzpatrick VI ITA° <= -30, got ${fitz6.itaDegrees}`);
  assert.equal(fitz6.fitzpatrickBand, 'FITZPATRICK_VI');
  assert.ok(
    fitz6.erythemaCompensationDelta < 0,
    'Subclinical hemoglobin inflammation on Fitzpatrick VI must adjust redness downward'
  );
  assert.equal(
    fitz6.barrierIntegrityStatus,
    'COMPROMISED_BARRIER',
    'Calibrated redness on Fitzpatrick VI must trigger COMPROMISED_BARRIER protection'
  );

  // Check ITA band boundaries directly
  assert.equal(classifyFitzpatrickFromIta(48).fitzpatrickBand, 'FITZPATRICK_II');
  assert.equal(classifyFitzpatrickFromIta(35).fitzpatrickBand, 'FITZPATRICK_III');
  assert.equal(classifyFitzpatrickFromIta(18).fitzpatrickBand, 'FITZPATRICK_IV');
  assert.ok(Math.abs(computeItaDegrees({ L: 50, a: 10, b: 15 })) < 0.01);

  // Verify Zero-Biometric & PII Scrubber
  const rawDirty =
    'Intake frame data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDA== EXIF_GPS=37.7749,-122.4194 email patient@clinic.org phone (415) 890-2341';
  const scrubbed = scrubDiagnosticNotesPii(rawDirty);
  assert.equal(scrubbed.redactionCount, 4);
  assert.equal(verifyZeroBiometricLeakage(scrubbed.sanitizedText), true);
  assert.ok(scrubbed.sanitizedText.includes('[REDACTED_BIOMETRIC_URI]'));
  assert.ok(scrubbed.sanitizedText.includes('[REDACTED_EXIF_GPS]'));
  assert.ok(scrubbed.sanitizedText.includes('[REDACTED_EMAIL]'));
  assert.ok(scrubbed.sanitizedText.includes('[REDACTED_PHONE]'));
});

test('Gate 2: Biochemical Active-Ingredient Conflict Solver, Barrier Lock & Budget Adaptation', () => {
  // Direct pairwise matrix checks
  const conflictRetinoidAcid = detectPairwiseActiveConflict('RETINOID', 'AHA_BHA');
  assert.equal(conflictRetinoidAcid?.conflictCode, 'CONFLICT_OVER_EXFOLIATION');

  const conflictRetinoidBpo = detectPairwiseActiveConflict('RETINOID', 'BENZOYL_PEROXIDE');
  assert.equal(conflictRetinoidBpo?.conflictCode, 'CONFLICT_OXIDATIVE_DEACTIVATION');

  const conflictVitCBpo = detectPairwiseActiveConflict('VITAMIN_C_LAA', 'BENZOYL_PEROXIDE');
  assert.equal(conflictVitCBpo?.conflictCode, 'CONFLICT_OXIDATIVE_DEACTIVATION');

  // Solve on Fitzpatrick III Combination/Acne profile with forced AHA/BHA PM booster conflict
  const fitz3 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-III-COMBO'));
  const constraintsConflict = {
    maxBudgetUsd: 185,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
    requestedPmBoosterSkuId: 'SKU-TREAT-AHA-BHA-10',
  };
  const solvedConflict = solveConflictSafeRegimen(fitz3, constraintsConflict);
  assert.ok(
    solvedConflict.conflictResolutions.some(
      (c) => c.conflictCode === 'CONFLICT_OVER_EXFOLIATION'
    ),
    'Forcing AHA/BHA peel onto a Retinoid PM routine must record CONFLICT_OVER_EXFOLIATION and substitute safely'
  );
  const auditConflict = verifyZeroActiveConflicts(solvedConflict, fitz3, constraintsConflict);
  assert.equal(auditConflict.valid, true, auditConflict.violations.join('; '));

  // Verify Barrier Recovery Lock on Fitzpatrick VI compromised barrier
  const fitz6 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-VI-BARRIER'));
  const constraintsBarrier = {
    maxBudgetUsd: 185,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
    requestedPmBoosterSkuId: 'SKU-TREAT-AHA-BHA-10',
  };
  const solvedBarrier = solveConflictSafeRegimen(fitz6, constraintsBarrier);
  assert.equal(solvedBarrier.barrierLockActive, true);
  assert.ok(
    solvedBarrier.conflictResolutions.some((c) => c.conflictCode === 'BARRIER_RECOVERY_LOCK')
  );
  assert.equal(
    verifyZeroActiveConflicts(solvedBarrier, fitz6, constraintsBarrier).valid,
    true
  );

  // Verify Pregnancy-Safe Teratogen Guardrail blocks Retinoid on Fitzpatrick V
  const fitz5 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-V-PIH'));
  const constraintsPreg = {
    maxBudgetUsd: 185,
    fragranceFreeOnly: true,
    pregnancySafeOnly: true,
  };
  const solvedPreg = solveConflictSafeRegimen(fitz5, constraintsPreg);
  assert.ok(
    solvedPreg.conflictResolutions.some(
      (c) => c.conflictCode === 'PREGNANCY_TERATOGEN_GUARDRAIL'
    )
  );
  assert.equal(verifyZeroActiveConflicts(solvedPreg, fitz5, constraintsPreg).valid, true);

  // Verify Dynamic Budget Adaptation down to $90 USD and Budget Floor Hold at $55 USD
  const fitz1 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-I-SENSITIVE'));
  const solvedTightBudget = solveConflictSafeRegimen(fitz1, {
    maxBudgetUsd: 90,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
  });
  assert.equal(solvedTightBudget.withinBudget, true);
  assert.ok(solvedTightBudget.totalPriceUsd <= 90);

  const solvedFloorHold = solveConflictSafeRegimen(fitz1, {
    maxBudgetUsd: 55,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
  });
  assert.equal(solvedFloorHold.status, 'BUDGET_FLOOR_HOLD');
});

test('Gate 3: Time-Horizon VTO Trajectory Simulator & Multi-Format Clinical/eCommerce Exporters', () => {
  const fitz5 = calibrate14MetricsForIta(getClinicalSkinProfileById('DLX-FITZ-V-PIH'));
  const regimen = solveConflictSafeRegimen(fitz5, {
    maxBudgetUsd: 180,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
  });

  const vtoDay0 = simulateVtoTrajectory(fitz5, regimen, 'IMMEDIATE_VTO');
  const vtoWeek4 = simulateVtoTrajectory(fitz5, regimen, 'WEEK_4_VTO');
  const vtoWeek8 = simulateVtoTrajectory(fitz5, regimen, 'WEEK_8_VTO');

  assert.equal(vtoDay0.zeroWhiteCastVerified, true, 'Mineral SPF tint must verify zero white-cast');
  assert.ok(
    vtoDay0.projectedOverallScore < vtoWeek4.projectedOverallScore &&
      vtoWeek4.projectedOverallScore < vtoWeek8.projectedOverallScore,
    'VTO overall skin health score must monotonically improve from Day 0 -> Week 4 -> Week 8'
  );
  assert.ok(
    vtoWeek8.projectedMetrics.skinAgeIndex < fitz5.calibratedMetrics.skinAgeIndex,
    'Week 8 VTO trajectory must reduce biological skinAgeIndex'
  );

  const jsonStr = exportYouCamVtoJson(fitz5, regimen, vtoWeek8, 'DLX-YCAM-TEST1234');
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(parsed.attestationSignature, 'DLX-YCAM-TEST1234');
  assert.equal(parsed.ecommerceRegimenCart.amRoutine.length, 4);
  assert.equal(parsed.ecommerceRegimenCart.pmRoutine.length, 3);

  const icsStr = exportRegimenAdherenceIcs(fitz5, regimen);
  assert.ok(icsStr.includes('BEGIN:VCALENDAR'));
  assert.ok(icsStr.includes('RRULE:FREQ=DAILY;COUNT=56'));
  assert.ok(icsStr.includes('END:VCALENDAR'));

  const mdStr = exportClinicalRegimenMarkdown(fitz5, regimen, vtoWeek8, 'DLX-YCAM-TEST1234');
  assert.ok(mdStr.includes('# DermaLux Studio — Clinical Skin AI & VTO Regimen Passport'));
  assert.ok(mdStr.includes('DLX-YCAM-TEST1234'));
});

test('Gate 4: 4-Stage YouCam VTO Supervisor, 4.5s Circuit Breaker & FNV-1a-32 Attestation Seal', async () => {
  const normalRun = await runYouCamVtoSupervisorPipeline({
    profileId: 'DLX-FITZ-III-COMBO',
    rawClinicalNotes: 'Contact: alex@domain.com · Goal: refine pores.',
    vtoHorizon: 'WEEK_8_VTO',
    constraints: {
      maxBudgetUsd: 175,
      fragranceFreeOnly: true,
      pregnancySafeOnly: false,
    },
  });

  assert.equal(normalRun.decisionMode, 'DECISION_YOUCAM_LIVE_SYNTHESIS');
  assert.equal(normalRun.circuitBreakerTripped, false);
  assert.equal(normalRun.stageTraces.length, 4);
  assert.equal(normalRun.scrubbedIntake.redactionCount, 1);

  const fallbackRun = await runYouCamVtoSupervisorPipeline({
    profileId: 'DLX-FITZ-VI-BARRIER',
    rawClinicalNotes: 'Test fallback mode',
    vtoHorizon: 'WEEK_4_VTO',
    constraints: {
      maxBudgetUsd: 165,
      fragranceFreeOnly: true,
      pregnancySafeOnly: false,
    },
    simulateTimeout: true,
  });

  assert.equal(fallbackRun.decisionMode, 'DECISION_LOCAL_CLINICAL_FALLBACK');
  assert.equal(fallbackRun.circuitBreakerTripped, true);
  assert.ok(fallbackRun.stageTraces.every((s) => s.status === 'FALLBACK_RECOVERED'));

  const constraints = {
    maxBudgetUsd: 175,
    fragranceFreeOnly: true,
    pregnancySafeOnly: false,
  };
  const seal = createRegimenAttestation(
    normalRun.diagnostic,
    normalRun.regimen,
    'WEEK_8_VTO',
    constraints
  );
  assert.ok(seal.signature.startsWith('DLX-YCAM-'));
  assert.equal(
    verifyRegimenAttestationIntegrity(
      seal,
      normalRun.diagnostic,
      normalRun.regimen,
      'WEEK_8_VTO',
      constraints
    ),
    true
  );

  // Mutating budget or pregnancySafeOnly must immediately invalidate the seal
  assert.equal(
    verifyRegimenAttestationIntegrity(
      seal,
      normalRun.diagnostic,
      normalRun.regimen,
      'WEEK_8_VTO',
      { ...constraints, pregnancySafeOnly: true }
    ),
    false
  );
  assert.equal(
    verifyRegimenAttestationIntegrity(
      seal,
      normalRun.diagnostic,
      normalRun.regimen,
      'IMMEDIATE_VTO',
      constraints
    ),
    false
  );
});

test('Gate 5: Port 5187 Strict Isolation & Interactive 14-Zone VTO Studio Wiring', () => {
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
  );
  assert.ok(
    pkgJson.scripts.dev.includes('--port 5187 --strictPort'),
    'package.json dev script must bind strictly to port 5187'
  );

  const viteCfg = fs.readFileSync(path.join(PROJECT_ROOT, 'vite.config.ts'), 'utf8');
  assert.ok(viteCfg.includes('port: 5187'));
  assert.ok(viteCfg.includes('strictPort: true'));

  const appTsx = fs.readFileSync(path.join(PROJECT_ROOT, 'src/App.tsx'), 'utf8');
  assert.ok(appTsx.includes('YouCam 14-Zone Facial Diagnostic & Virtual Try-On Mesh'));
  assert.ok(appTsx.includes('Seal Regimen Prescription (FNV-1a-32)'));
});

test('Gate 6: Clean-Room Audit (Zero Internal Terminology Leaks & Zero External CDNs)', () => {
  const filesToAudit = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    '.env.example',
    'README.md',
    'HANDOFF_2_0.md',
    'devpost/PRD.md',
    'devpost/ARCHITECTURE.md',
    'devpost/SUBMISSION_CHECKLIST.md',
    'src/main.tsx',
    'src/App.tsx',
    'src/styles.css',
    'src/lib/skin/youcam-skin-analyzer.ts',
    'src/lib/regimen/active-conflict-solver.ts',
    'src/lib/vto/vto-trajectory-exporter.ts',
    'src/lib/youcam/youcam-vto-supervisor.ts',
    'src/test/dermalux-verification.test.ts',
  ];

  const forbiddenTerms = [
    'Edi' + 'os',
    'Sove' + 'reign',
    '3+3 ' + 'Self-Play',
    'Prop' + 'oser',
    'Adver' + 'sary',
    'Cit' + 'adel',
    'Sanc' + 'tuary',
    'No' + 'va',
    'Lu' + 'na',
  ];

  for (const relPath of filesToAudit) {
    const absPath = path.join(PROJECT_ROOT, relPath);
    assert.equal(fs.existsSync(absPath), true, `Missing audited file: ${relPath}`);
    const content = fs.readFileSync(absPath, 'utf8');
    for (const term of forbiddenTerms) {
      assert.equal(
        content.toLowerCase().includes(term.toLowerCase()),
        false,
        `Clean-room violation: found forbidden term "${term}" in ${relPath}`
      );
    }
  }

  const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  assert.equal(
    indexHtml.includes('https://'),
    false,
    'index.html must not load external CDN scripts or fonts'
  );
});
