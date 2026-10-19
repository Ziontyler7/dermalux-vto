# Devpost Submission Checklist — DermaLux Studio (Nov 02 YouCam API Hackathon)

- [x] **Standalone Repository**: `dermalux-vto`
- [x] **Strict Port Isolation**: `http://127.0.0.1:5187` (`strictPort: true` in `vite.config.ts` and `package.json`)
- [x] **Gate 1 (`youcam-skin-analyzer.ts`)**: 14-metric YouCam HD schema, CIE $L^*a^*b^*$ $\text{ITA}^\circ$ Fitzpatrick I–VI calibration, and zero-biometric/PII intake scrubber
- [x] **Gate 2 (`active-conflict-solver.ts`)**: Biochemical conflict matrix (`RETINOID` + `AHA_BHA`, `RETINOID` + `BENZOYL_PEROXIDE`, `VITAMIN_C_LAA` + `BENZOYL_PEROXIDE`), `BARRIER_RECOVERY_LOCK`, `PREGNANCY_TERATOGEN_GUARDRAIL`, and dynamic budget down-tiering
- [x] **Gate 3 (`vto-trajectory-exporter.ts`)**: `IMMEDIATE_VTO` / `WEEK_4_VTO` / `WEEK_8_VTO` simulator, zero white-cast check ($\Delta L^* \le 1.5$), JSON Schema 2020-12, RFC 5545 `.ics`, and Markdown exporters
- [x] **Gate 4 (`youcam-vto-supervisor.ts`)**: 4-stage supervisor with `4500ms` `AbortController` circuit breaker fallback and FNV-1a-32 `DLX-YCAM-...` attestation seal
- [x] **Gate 5 (`App.tsx`, `styles.css`)**: Interactive 14-zone SVG facial mesh, Before/After VTO split slider, and active conflict stress-tester
- [x] **Gate 6 (`dermalux-verification.test.ts`)**: `6/6` automated verification gates passing + clean-room audit

- [x] **Perfect Corp YouCam S2S v2.0 (`/s2s/v2.0/task/skin-analysis`) Inspector (`YOUCAM_S2S_V2`)**: Verified in Gate 4 (all 14 HD `dst_actions` + CIE $L^*a^*b^*$ $\text{ITA}^\circ$ calibration) and interactive studio export tab.
