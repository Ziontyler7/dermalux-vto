# DermaLux Studio — Real-Time 14-Metric Skin AI Diagnostic, ITA° Tone Calibration & Virtual Regimen Try-On

Built for the **Perfect Corp YouCam API Skin AI & eCommerce VTO Hackathon**.

DermaLux Studio bridges **Perfect Corp YouCam 14-Metric HD Skin AI** with **CIE $L^*a^*b^*$ Individual Typology Angle ($\text{ITA}^\circ$) melanin-fairness calibration**, a **biochemical active-ingredient conflict solver**, and a **time-horizon Virtual Try-On (VTO) trajectory simulator** (`Day 0 SPF Tint`, `Week 4 Turnover`, `Week 8 Remodel`).

---

## Core Capabilities

1. **YouCam 14-Metric HD Skin AI + CIE $L^*a^*b^*$ $\text{ITA}^\circ$ Calibration (`src/lib/skin/youcam-skin-analyzer.ts`)**:
   - Evaluates all 14 YouCam HD metrics (`moisture`, `oiliness`, `redness`, `texture`, `wrinkles`, `pores`, `darkSpots`, `acne`, `radiance`, `firmness`, `tearTrough`, `upperEyelid`, `lowerEyelid`, `skinAgeIndex`).
   - Computes $\text{ITA}^\circ = \text{atan2}(L^* - 50, b^*) \times \frac{180}{\pi}$ across Fitzpatrick I–VI to prevent melanin-biased hyperpigmentation false positives and surface masked subclinical erythema on deeper complexions (`FITZPATRICK_V`–`FITZPATRICK_VI`).
   - Scrubs biometric image data URIs, EXIF GPS coordinates, email addresses, and phone numbers prior to diagnostic processing.

2. **Biochemical Active-Ingredient Conflict Solver & Barrier Lock (`src/lib/regimen/active-conflict-solver.ts`)**:
   - Prevents unsafe co-application of conflicting dermatological actives in the same routine window (`RETINOID` + `AHA_BHA` over-exfoliation, `RETINOID` + `BENZOYL_PEROXIDE` oxidative deactivation, `VITAMIN_C_LAA` + `BENZOYL_PEROXIDE` oxidation).
   - Enforces automatic `BARRIER_RECOVERY_LOCK` when stratum corneum hydration (`moisture < 48`) or erythema (`redness < 52`) is compromised, and enforces `PREGNANCY_TERATOGEN_GUARDRAIL` when pregnancy-safe filtering is enabled.

3. **Time-Horizon VTO Trajectory Simulator & Multi-Format Exporter (`src/lib/vto/vto-trajectory-exporter.ts`)**:
   - Simulates `IMMEDIATE_VTO` (Day 0 Mineral Tint SPF 50 with verified zero white-cast $\Delta L^* \le 1.5$), `WEEK_4_VTO`, and `WEEK_8_VTO` across 14 facial zones.
   - Exports JSON Schema Draft 2020-12 VTO cart payloads, RFC 5545 `.ics` 8-week adherence schedules, and Clinical Regimen Markdown Passports.

4. **4-Stage YouCam VTO Supervisor & FNV-1a-32 Attestation Seal (`src/lib/youcam/youcam-vto-supervisor.ts`)**:
   - Orchestrates the 4-stage pipeline with a `4500ms` `AbortController` circuit breaker fallback and deterministic `DLX-YCAM-<HEX>` cryptographic prescription attestation.

---

## Quick Start (Port `5187`)

```bash
# Run 6/6 deterministic verification gates
npm test

# Typecheck & build production bundle
npm run build

# Start development server on http://127.0.0.1:5187
npm run dev
```
