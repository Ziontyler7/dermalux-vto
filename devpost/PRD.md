# Product Requirements Document (PRD) — DermaLux Studio

## 1. Problem Statement
Standard eCommerce skincare quizzes and naive optical skin scanners suffer from two critical clinical failures:
1. **Melanin-Bias & Subclinical Erythema Masking**: In deeper skin tones (`Fitzpatrick V–VI`, $\text{ITA}^\circ \le 10^\circ$), epidermal melanin absorbs visible green/blue light, causing raw RGB algorithms to miss early barrier inflammation (`redness`) while misclassifying constitutional pigment variation as pathological `darkSpots`.
2. **Unsafe Active-Ingredient Stacking**: Shoppers purchasing products for both blemishes (`acne`) and photo-aging/hyperpigmentation (`wrinkles`, `darkSpots`) frequently layer incompatible actives in the same routine window—such as Benzoyl Peroxide with Retinol (causing oxidative deactivation) or Glycolic/Salicylic Acid peels on top of Retinoids or a compromised moisture barrier (causing acute irritant contact dermatitis).

## 2. Solution Overview
**DermaLux Studio** combines **Perfect Corp YouCam 14-Metric HD Skin AI** with:
- **CIE $L^*a^*b^*$ Individual Typology Angle ($\text{ITA}^\circ$) Calibration**: Normalizes chromophore telemetry across Fitzpatrick I–VI.
- **Biochemical Active-Ingredient Conflict Solver**: Enforces barrier-first lockouts (`BARRIER_RECOVERY_LOCK`), pregnancy-safe retinoid/salicylic exclusions (`PREGNANCY_TERATOGEN_GUARDRAIL`), and pairwise AM/PM active compatibility.
- **Interactive 14-Zone VTO Trajectory Engine**: Visualizes `IMMEDIATE_VTO` (zero-white-cast iron-oxide mineral SPF tint), `WEEK_4_VTO`, and `WEEK_8_VTO` zone-by-zone improvements.

## 3. Verification Gates (`6/6`)
- **Gate 1**: 14-Metric YouCam HD Skin AI schema, CIE $L^*a^*b^*$ $\text{ITA}^\circ$ calibration across Fitzpatrick I–VI, and zero-biometric/PII intake scrubbing.
- **Gate 2**: Biochemical active-ingredient conflict solver (`RETINOID` + `AHA_BHA`, `RETINOID` + `BENZOYL_PEROXIDE`, `BARRIER_RECOVERY_LOCK`, `PREGNANCY_TERATOGEN_GUARDRAIL`, dynamic budget adaptation).
- **Gate 3**: VTO trajectory simulator (`IMMEDIATE_VTO`, `WEEK_4_VTO`, `WEEK_8_VTO`), zero white-cast verification ($\Delta L^* \le 1.5$), JSON Schema 2020-12, RFC 5545 `.ics`, and Markdown exports.
- **Gate 4**: 4-Stage YouCam VTO supervisor with `4500ms` `AbortController` circuit breaker fallback and FNV-1a-32 cryptographic prescription attestation (`DLX-YCAM-...`).
- **Gate 5**: Port `5187` (`strictPort: true`) isolation and interactive 14-zone SVG facial mesh UI wiring.
- **Gate 6**: Clean-room repository audit verifying zero external CDN dependencies and zero internal terminology leaks.
