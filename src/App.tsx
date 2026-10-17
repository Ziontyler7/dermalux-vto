import { useMemo, useState } from 'react';
import {
  CLINICAL_SKIN_PROFILES,
  YOUCAM_14_METRIC_KEYS,
  calibrate14MetricsForIta,
  getClinicalSkinProfileById,
  scrubDiagnosticNotesPii,
  type YouCamMetricKey,
} from './lib/skin/youcam-skin-analyzer.ts';
import {
  solveConflictSafeRegimen,
  verifyZeroActiveConflicts,
  type RegimenConstraintInput,
} from './lib/regimen/active-conflict-solver.ts';
import {
  exportClinicalRegimenMarkdown,
  exportRegimenAdherenceIcs,
  exportYouCamVtoJson,
  simulateVtoTrajectory,
  type VtoHorizon,
} from './lib/vto/vto-trajectory-exporter.ts';
import {
  createRegimenAttestation,
  verifyRegimenAttestationIntegrity,
  type RegimenAttestation,
} from './lib/youcam/youcam-vto-supervisor.ts';

type ExportTabFormat = 'MARKDOWN' | 'JSON' | 'ICS';

const METRIC_LABELS: Record<YouCamMetricKey, string> = {
  moisture: 'Stratum Corneum Moisture',
  oiliness: 'Sebum Balance (Oiliness)',
  redness: 'Erythema Calm (Redness)',
  texture: 'Micro-Relief Texture',
  wrinkles: 'Rhytid Smoothness (Wrinkles)',
  pores: 'Pore Architecture',
  darkSpots: 'Pigment & PIH Clarity',
  acne: 'Blemish Clarity (Acne)',
  radiance: 'Optical Radiance',
  firmness: 'Elastin Contour Firmness',
  tearTrough: 'Tear Trough Smoothness',
  upperEyelid: 'Upper Eyelid Elasticity',
  lowerEyelid: 'Infraorbital Bag Clarity',
  skinAgeIndex: 'Biological Skin Age (Yrs)',
};

function scoreBadgeColor(score: number): string {
  if (score >= 72) return '#10b981';
  if (score >= 54) return '#f59e0b';
  return '#ef4444';
}

export function App() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    CLINICAL_SKIN_PROFILES[0].profileId
  );
  const [vtoHorizon, setVtoHorizon] = useState<VtoHorizon>('WEEK_8_VTO');
  const [vtoSplitPercent, setVtoSplitPercent] = useState<number>(65);
  const [maxBudgetUsd, setMaxBudgetUsd] = useState<number>(170);
  const [fragranceFreeOnly, setFragranceFreeOnly] = useState<boolean>(true);
  const [pregnancySafeOnly, setPregnancySafeOnly] = useState<boolean>(false);
  const [requestedPmBoosterSkuId, setRequestedPmBoosterSkuId] = useState<string>('');
  const [rawNotes, setRawNotes] = useState<string>(
    'Patient intake: maya.lin@example.org · (415) 890-2341 · EXIF_GPS=37.7749,-122.4194 · Goal: calm redness & fade PIH.'
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ZONE-MALAR-ERYTHEMA-L');
  const [exportTab, setExportTab] = useState<ExportTabFormat>('MARKDOWN');
  const [attestation, setAttestation] = useState<RegimenAttestation | null>(null);

  const activeProfile = useMemo(
    () => getClinicalSkinProfileById(selectedProfileId),
    [selectedProfileId]
  );

  const scrubbedIntake = useMemo(() => scrubDiagnosticNotesPii(rawNotes), [rawNotes]);

  const diagnostic = useMemo(
    () => calibrate14MetricsForIta(activeProfile),
    [activeProfile]
  );

  const constraints: RegimenConstraintInput = useMemo(
    () => ({
      maxBudgetUsd,
      fragranceFreeOnly,
      pregnancySafeOnly,
      requestedPmBoosterSkuId: requestedPmBoosterSkuId || undefined,
    }),
    [maxBudgetUsd, fragranceFreeOnly, pregnancySafeOnly, requestedPmBoosterSkuId]
  );

  const regimen = useMemo(
    () => solveConflictSafeRegimen(diagnostic, constraints),
    [diagnostic, constraints]
  );

  const safetyAudit = useMemo(
    () => verifyZeroActiveConflicts(regimen, diagnostic, constraints),
    [regimen, diagnostic, constraints]
  );

  const vtoSimulation = useMemo(
    () => simulateVtoTrajectory(diagnostic, regimen, vtoHorizon),
    [diagnostic, regimen, vtoHorizon]
  );

  const attestationValid = useMemo(
    () =>
      verifyRegimenAttestationIntegrity(
        attestation,
        diagnostic,
        regimen,
        vtoHorizon,
        constraints
      ),
    [attestation, diagnostic, regimen, vtoHorizon, constraints]
  );

  const exportContent = useMemo(() => {
    const seal = attestationValid && attestation ? attestation.signature : undefined;
    if (exportTab === 'JSON') {
      return exportYouCamVtoJson(diagnostic, regimen, vtoSimulation, seal);
    }
    if (exportTab === 'ICS') {
      return exportRegimenAdherenceIcs(diagnostic, regimen);
    }
    return exportClinicalRegimenMarkdown(diagnostic, regimen, vtoSimulation, seal);
  }, [exportTab, diagnostic, regimen, vtoSimulation, attestation, attestationValid]);

  const selectedBaselineZone =
    diagnostic.facialZones.find((z) => z.zoneId === selectedZoneId) ??
    diagnostic.facialZones[0];
  const selectedProjectedZone =
    vtoSimulation.projectedZones.find((z) => z.zoneId === selectedZoneId) ??
    vtoSimulation.projectedZones[0];

  const handleSealPrescription = () => {
    const nextSeal = createRegimenAttestation(
      diagnostic,
      regimen,
      vtoHorizon,
      constraints
    );
    setAttestation(nextSeal);
  };

  return (
    <div className="dermalux-shell">
      <header className="dermalux-header">
        <div>
          <div className="eyebrow-badge">
            PERFECT CORP YOUCAM AI SKIN ANALYSIS · CIE L*a*b* ITA° CALIBRATION · VTO ECOMMERCE
          </div>
          <h1>DermaLux Studio — 14-Metric Skin AI &amp; Virtual Regimen Try-On</h1>
          <p className="subtitle">
            Melanin-fair ITA° diagnostic calibration, biochemical active-ingredient conflict guardrails,
            and time-horizon Virtual Try-On (Day 0 SPF Tint · Week 4 · Week 8) on Port 5187.
          </p>
        </div>
        <div className="header-telemetry-Cluster">
          <div className="telemetry-pill">
            <span className="pill-label">ITA° / FITZPATRICK</span>
            <strong>
              {diagnostic.itaDegrees}° · {diagnostic.fitzpatrickBand}
            </strong>
          </div>
          <div className="telemetry-pill">
            <span className="pill-label">BARRIER STATUS</span>
            <strong
              className={
                diagnostic.barrierIntegrityStatus === 'COMPROMISED_BARRIER'
                  ? 'status-danger'
                  : 'status-ok'
              }
            >
              {diagnostic.barrierIntegrityStatus}
            </strong>
          </div>
          <div className="telemetry-pill">
            <span className="pill-label">CONFLICT AUDIT</span>
            <strong className={safetyAudit.valid ? 'status-ok' : 'status-danger'}>
              {safetyAudit.valid ? '0 ACTIVE CONFLICTS' : 'CONFLICT DETECTED'}
            </strong>
          </div>
        </div>
      </header>

      <section className="control-strip">
        <div className="control-card">
          <label htmlFor="profile-select">1. YouCam Clinical Reference Complexion</label>
          <select
            id="profile-select"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
          >
            {CLINICAL_SKIN_PROFILES.map((profile) => (
              <option key={profile.profileId} value={profile.profileId}>
                {profile.displayName}
              </option>
            ))}
          </select>
          <p className="micro-caption">{activeProfile.clinicalSummary}</p>
        </div>

        <div className="control-card">
          <label>2. Virtual Try-On (VTO) Simulation Horizon</label>
          <div className="horizon-btn-group">
            {(
              [
                ['IMMEDIATE_VTO', 'Day 0 SPF Tint'],
                ['WEEK_4_VTO', 'Week 4 Turnover'],
                ['WEEK_8_VTO', 'Week 8 Remodel'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={vtoHorizon === key ? 'btn-horizon active' : 'btn-horizon'}
                onClick={() => setVtoHorizon(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="slider-row">
            <span>Before / After VTO Split: {vtoSplitPercent}% Projected</span>
            <input
              type="range"
              min={0}
              max={100}
              value={vtoSplitPercent}
              onChange={(e) => setVtoSplitPercent(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="control-card">
          <label htmlFor="booster-select">3. Stress-Test PM Active Conflict Guardrail</label>
          <select
            id="booster-select"
            value={requestedPmBoosterSkuId}
            onChange={(e) => setRequestedPmBoosterSkuId(e.target.value)}
          >
            <option value="">Auto-Select Optimal PM Treatment</option>
            <option value="SKU-TREAT-AHA-BHA-10">
              Force-Add: 8% Glycolic + 2% Salicylic Peel (Tests Acid + Retinoid / Barrier Lock)
            </option>
            <option value="SKU-TREAT-BPO-LEAVEON-25">
              Force-Add: 2.5% Benzoyl Peroxide Gel (Tests BPO + Retinoid Oxidation)
            </option>
            <option value="SKU-TREAT-RETINOL-03">
              Force-Add: 0.3% Encapsulated Retinol (Tests Pregnancy &amp; Barrier Guardrail)
            </option>
          </select>
          <div className="toggle-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={pregnancySafeOnly}
                onChange={(e) => setPregnancySafeOnly(e.target.checked)}
              />
              Pregnancy-Safe Guardrail
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={fragranceFreeOnly}
                onChange={(e) => setFragranceFreeOnly(e.target.checked)}
              />
              Fragrance-Free Only
            </label>
          </div>
        </div>

        <div className="control-card">
          <label htmlFor="budget-slider">
            4. eCommerce Bundle Ceiling: <strong>${maxBudgetUsd} USD</strong>
          </label>
          <input
            id="budget-slider"
            type="range"
            min={55}
            max={220}
            step={5}
            value={maxBudgetUsd}
            onChange={(e) => setMaxBudgetUsd(Number(e.target.value))}
          />
          <p className="micro-caption">
            Cart Total: <strong>${regimen.totalPriceUsd} USD</strong> · Status:{' '}
            <code>{regimen.status}</code>
          </p>
        </div>
      </section>

      <main className="studio-grid">
        {/* LEFT COLUMN: 14-ZONE FACIAL MESH & VTO SPLIT CANVAS */}
        <section className="panel-card">
          <div className="panel-header">
            <h2>14-Zone Facial Diagnostic &amp; VTO Mesh</h2>
            <span className="badge-tag">{vtoSimulation.horizonLabel}</span>
          </div>

          <div className="vto-canvas-wrapper">
            <svg
              viewBox="0 0 320 330"
              className="facial-mesh-svg"
              role="img"
              aria-label="YouCam 14-Zone Facial Diagnostic & Virtual Try-On Mesh"
            >
              <defs>
                <clipPath id="vto-after-clip">
                  <rect
                    x={0}
                    y={0}
                    width={(320 * vtoSplitPercent) / 100}
                    height={330}
                  />
                </clipPath>
              </defs>

              {/* Base Face Silhouette */}
              <ellipse
                cx={160}
                cy={168}
                rx={92}
                ry={126}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth={2}
              />
              {/* Projected VTO Overlay Half */}
              <ellipse
                cx={160}
                cy={168}
                rx={92}
                ry={126}
                fill="#0f292a"
                stroke="#14b8a6"
                strokeWidth={2}
                clipPath="url(#vto-after-clip)"
              />

              {/* Midline & Orbital Reference Guides */}
              <line
                x1={160}
                y1={42}
                x2={160}
                y2={294}
                stroke="#334155"
                strokeDasharray="3 3"
              />
              <line
                x1={68}
                y1={168}
                x2={252}
                y2={168}
                stroke="#334155"
                strokeDasharray="3 3"
              />

              {/* VTO Split Divider Line */}
              <line
                x1={(320 * vtoSplitPercent) / 100}
                y1={16}
                x2={(320 * vtoSplitPercent) / 100}
                y2={314}
                stroke="#38bdf8"
                strokeWidth={2}
              />

              {/* 14 Interactive Diagnostic Zones */}
              {diagnostic.facialZones.map((zone) => {
                const projZone =
                  vtoSimulation.projectedZones.find((z) => z.zoneId === zone.zoneId) ??
                  zone;
                const isAfterSide = zone.svgCx <= (320 * vtoSplitPercent) / 100;
                const displayedScore = isAfterSide ? projZone.score : zone.score;
                const fill = scoreBadgeColor(displayedScore);
                const isSelected = zone.zoneId === selectedZoneId;

                return (
                  <g
                    key={zone.zoneId}
                    className="zone-node"
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                  >
                    <circle
                      cx={zone.svgCx}
                      cy={zone.svgCy}
                      r={zone.svgRadius}
                      fill={fill}
                      fillOpacity={isSelected ? 0.45 : 0.24}
                      stroke={isSelected ? '#f8fafc' : fill}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={zone.svgCx}
                      y={zone.svgCy + 4}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="700"
                    >
                      {displayedScore}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="zone-inspector-box">
              <div className="zone-inspector-title">
                <strong>{selectedBaselineZone.zoneLabel}</strong>
                <span>Metric: {METRIC_LABELS[selectedBaselineZone.primaryMetric]}</span>
              </div>
              <div className="zone-score-comparison">
                <div>
                  <span>Baseline Calibrated</span>
                  <strong>{selectedBaselineZone.score} / 100</strong>
                </div>
                <div>
                  <span>Projected ({vtoHorizon})</span>
                  <strong className="status-ok">{selectedProjectedZone.score} / 100</strong>
                </div>
                <div>
                  <span>Zero White-Cast Check</span>
                  <strong className="status-ok">
                    {vtoSimulation.zeroWhiteCastVerified ? 'VERIFIED (ΔL* ≤ 1.5)' : 'REVIEW'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="calibration-callout">
            <h3>CIE L*a*b* Melanin-Fairness &amp; Chromophore Telemetry</h3>
            <div className="calibration-grid">
              <div>
                <span>CIE L*a*b* Baseline</span>
                <strong>
                  L* {diagnostic.cieLab.L} · a* {diagnostic.cieLab.a} · b* {diagnostic.cieLab.b}
                </strong>
              </div>
              <div>
                <span>Erythema Compensation</span>
                <strong>
                  {diagnostic.erythemaCompensationDelta === 0
                    ? '0 pts (Unmasked RGB)'
                    : `${diagnostic.erythemaCompensationDelta} pts (Subclinical Hemoglobin Alert)`}
                </strong>
              </div>
              <div>
                <span>Melanin Fairness Lift</span>
                <strong>+{diagnostic.melaninFairnessBaselineLift} pts PIH Baseline Norm</strong>
              </div>
              <div>
                <span>Overall Health Trajectory</span>
                <strong className="status-ok">
                  {vtoSimulation.baselineOverallScore} → {vtoSimulation.projectedOverallScore} (+
                  {vtoSimulation.overallScoreGain} pts)
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: 14-METRIC HD SKIN AI TELEMETRY MATRIX */}
        <section className="panel-card">
          <div className="panel-header">
            <h2>YouCam 14-Metric HD Skin AI Matrix</h2>
            <span className="badge-tag">Calibrated vs. {vtoHorizon}</span>
          </div>

          <div className="metrics-list">
            {YOUCAM_14_METRIC_KEYS.map((key) => {
              const rawVal = diagnostic.rawMetrics[key];
              const baseVal = diagnostic.calibratedMetrics[key];
              const projVal = vtoSimulation.projectedMetrics[key];
              const delta = projVal - baseVal;
              const isAge = key === 'skinAgeIndex';

              return (
                <div key={key} className="metric-row">
                  <div className="metric-header-line">
                    <span className="metric-name">{METRIC_LABELS[key]}</span>
                    <span className="metric-numbers">
                      {rawVal !== baseVal && (
                        <em className="raw-tag" title="Raw uncalibrated optical score">
                          Raw {rawVal} →{' '}
                        </em>
                      )}
                      <strong>{baseVal}</strong> → <strong className="proj-val">{projVal}</strong>{' '}
                      <span className="delta-badge">
                        {isAge ? `${delta} yrs` : `+${delta} pts`}
                      </span>
                    </span>
                  </div>
                  {!isAge && (
                    <div className="progress-track">
                      <div
                        className="progress-fill-base"
                        style={{
                          width: `${baseVal}%`,
                          backgroundColor: scoreBadgeColor(baseVal),
                        }}
                      />
                      <div
                        className="progress-fill-proj"
                        style={{
                          width: `${projVal}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pii-scrubber-box">
            <h3>Zero-Biometric / Zero-PII Intake Guardrail</h3>
            <input
              type="text"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              aria-label="Clinical intake notes input"
            />
            <p className="scrubbed-output">
              <strong>Sanitized Payload ({scrubbedIntake.redactionCount} redactions):</strong>{' '}
              <code>{scrubbedIntake.sanitizedText}</code>
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN: AM/PM REGIMEN BUILDER, CONFLICT LOG & ATTESTATION */}
        <section className="panel-card">
          <div className="panel-header">
            <h2>Conflict-Safe AM/PM Regimen &amp; VTO Cart</h2>
            <span className="badge-tag">${regimen.totalPriceUsd} USD Total</span>
          </div>

          <div className="routine-section">
            <h3>Morning (AM) 4-Step Protection &amp; VTO Tint Protocol</h3>
            {regimen.amSteps.map((step) => (
              <div key={`AM-${step.stepOrder}`} className="sku-card">
                <div className="sku-top">
                  <span className="step-pill">
                    AM {step.stepOrder} · {step.stepSlot}
                  </span>
                  <span className="sku-price">${step.sku.priceUsd}</span>
                </div>
                <strong>{step.sku.productName}</strong>
                <div className="sku-meta">
                  <code>{step.sku.activeClass}</code> · pH {step.sku.phLevel} ·{' '}
                  {step.sku.keyActivesSummary}
                </div>
                <p className="sku-reason">{step.selectionReason}</p>
              </div>
            ))}
          </div>

          <div className="routine-section">
            <h3>Evening (PM) 3-Step Cellular &amp; Barrier Protocol</h3>
            {regimen.pmSteps.map((step) => (
              <div key={`PM-${step.stepOrder}`} className="sku-card">
                <div className="sku-top">
                  <span className="step-pill pm-pill">
                    PM {step.stepOrder} · {step.stepSlot}
                  </span>
                  <span className="sku-price">${step.sku.priceUsd}</span>
                </div>
                <strong>{step.sku.productName}</strong>
                <div className="sku-meta">
                  <code>{step.sku.activeClass}</code> · pH {step.sku.phLevel} ·{' '}
                  {step.sku.keyActivesSummary}
                </div>
                <p className="sku-reason">{step.selectionReason}</p>
              </div>
            ))}
          </div>

          <div className="conflict-log-box">
            <h3>Biochemical Active-Ingredient Guardrail Log</h3>
            {regimen.conflictResolutions.length === 0 ? (
              <p className="conflict-clean">
                Zero active conflicts detected. All AM &amp; PM formulations are pH-compatible and
                barrier-safe.
              </p>
            ) : (
              <ul className="conflict-list">
                {regimen.conflictResolutions.map((item, idx) => (
                  <li key={`${item.conflictCode}-${idx}`}>
                    <strong>
                      [{item.conflictCode}] ({item.window})
                    </strong>
                    : Blocked <code>{item.blockedProductName}</code> → Substituted{' '}
                    <code>{item.substitutedProductName}</code>. <span>{item.clinicalRationale}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="attestation-box">
            <div className="attestation-actions">
              <button
                type="button"
                className="btn-seal"
                onClick={handleSealPrescription}
              >
                Seal Regimen Prescription (FNV-1a-32)
              </button>
              <span
                className={
                  attestationValid ? 'seal-status valid' : 'seal-status unsealed'
                }
              >
                {attestationValid && attestation
                  ? `SEALED: ${attestation.signature}`
                  : 'UNSEALED / MODIFIED'}
              </span>
            </div>

            <div className="export-tabs">
              {(['MARKDOWN', 'JSON', 'ICS'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={exportTab === tab ? 'tab-btn active' : 'tab-btn'}
                  onClick={() => setExportTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <pre className="export-preview">{exportContent}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}
