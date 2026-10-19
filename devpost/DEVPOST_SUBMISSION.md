# ✨🧴 Perfect Corp YouCam API Skin AI & eCommerce VTO — Complete Devpost Submission Package

**Project Title:** DermaLux Studio — YouCam 14-Metric Skin AI, ITA° Fairness Calibration & Active-Conflict VTO  
**Tagline (<= 60 chars):** YouCam 14-metric Skin AI, ITA° fairness & regimen VTO.  
**Competition:** Perfect Corp YouCam API Skin AI & eCommerce VTO Hackathon (`$6,000` Prize Pool)  
**Local Studio Port:** `http://127.0.0.1:5187` (`strictPort: true`)

---

## 1. Inspiration

Standard eCommerce skincare quizzes and optical skin scanners fail consumers in two critical ways:
1. **Melanin-Bias & Subclinical Erythema Masking**: In deeper skin tones (`Fitzpatrick V–VI`, $\text{ITA}^\circ \le 10^\circ$), epidermal melanin absorbs visible green/blue light, causing raw RGB algorithms to miss early barrier inflammation (`redness`) while misclassifying constitutional pigment variation as pathological `darkSpots`.
2. **Unsafe Active-Ingredient Stacking**: Shoppers purchasing products for both blemishes (`acne`) and photo-aging (`wrinkles`, `darkSpots`) frequently layer incompatible actives in the same routine window—such as Retinoids with AHA/BHA exfoliants (causing acute barrier burns) or Retinoids with Benzoyl Peroxide (causing oxidative deactivation).

We built **DermaLux Studio** to pair **Perfect Corp YouCam Server-to-Server (`s2s/v2.0`) 14-Metric HD Skin AI** with **CIE $L^*a^*b^*$ Individual Typology Angle ($\text{ITA}^\circ$) melanin-fairness calibration**, a **biochemical active-ingredient conflict solver**, and a **Time-Horizon Virtual Try-On (VTO) simulator**.

---

## 2. What It Does

1. **YouCam S2S v2.0 14-Metric HD Skin AI + CIE $L^*a^*b^*$ $\text{ITA}^\circ$ Calibration (`youcam-skin-analyzer.ts`)**:
   - Evaluates all 14 YouCam HD metrics (`hd_moisture`, `hd_oiliness`, `hd_redness`, `hd_texture`, `hd_wrinkle`, `hd_pore`, `hd_age_spot`, `hd_acne`, `hd_radiance`, `hd_firmness`, `hd_eye_bag`, `hd_upper_eyelid`, `hd_lower_eyelid`, `skin_type`) and computes $\text{ITA}^\circ = \text{atan2}(L^* - 50, b^*) \times \frac{180}{\pi}$ across Fitzpatrick I–VI after scrubbing EXIF GPS and biometric data URIs.
2. **Biochemical Active-Ingredient Conflict Solver & Barrier Lock (`active-conflict-solver.ts`)**:
   - Prevents unsafe co-application of conflicting dermatological actives (`RETINOID` + `AHA_BHA`, `RETINOID` + `BENZOYL_PEROXIDE`, `VITAMIN_C_LAA` + `BENZOYL_PEROXIDE`), enforces automatic `BARRIER_RECOVERY_LOCK` when moisture (`< 48`) or redness (`< 52`) is compromised, and enforces `PREGNANCY_TERATOGEN_GUARDRAIL`.
3. **14-Zone Facial Mesh VTO Trajectory Simulator & Multi-Format Exporter (`vto-trajectory-exporter.ts`)**:
   - Simulates `IMMEDIATE_VTO` (Day 0 Mineral Tint SPF 50 with verified zero white-cast $\Delta L^* \le 1.5$), `WEEK_4_VTO`, and `WEEK_8_VTO`, and exports JSON Schema 2020-12 VTO carts, RFC 5545 `.ics` 8-week schedules, Clinical Regimen Passports, and the **YouCam S2S v2.0 Task Payload (`YOUCAM_S2S_V2`)**.

---

## 3. How We Built It

- **4 Pure-Math Dermatological & VTO Modules (`src/lib/`)**: Verified by **6/6 automated verification gates (`npm test`, `~85ms`)** with `0` TypeScript errors.
- **Interactive 14-Zone SVG Facial Mesh & Before/After Split Slider**: Visualizes per-zone diagnostic scores and projected 8-week VTO improvements.

---

## 4. Challenges We Ran Into & Accomplishments

- **Eliminating Mineral SPF White-Cast on Fitzpatrick V–VI Complexions**: Standard zinc/titanium oxide SPF tints produce chalky positive luminance shifts ($\Delta L^* > 4.0$) on deeper skin tones. Our `IMMEDIATE_VTO` formulation selector matches iron-oxide tint ratios to the user's $\text{ITA}^\circ$ band, guaranteeing $\Delta L^* \le 1.5$ across all 6 Fitzpatrick phototypes.

---

## 5. "Built With" Tags

`perfect-corp-youcam`, `youcam-s2s-v2`, `skin-ai`, `virtual-try-on`, `cie-lab-color`, `dermatology-ai`, `ecommerce`, `typescript`, `react`, `svg`

---

## 6. 90-Second Demo Video Narration Script

- **`0:00 – 0:25` · YouCam 14-Zone Facial Mesh & CIE $L^*a^*b^*$ $\text{ITA}^\circ$ Fairness Calibration**:
  - *Visual*: Open `http://127.0.0.1:5187`. Switch across the 4 clinical complexion profiles (`Fitzpatrick I` through `Fitzpatrick VI`) and click facial zones on the 14-Zone SVG Mesh to inspect $\text{ITA}^\circ$ subclinical erythema compensation.
- **`0:25 – 0:55` · Active-Ingredient Conflict Solver & Barrier/Pregnancy Guardrails**:
  - *Visual*: Toggle **Force AHA/BHA Peel Conflict** and **Pregnancy-Safe Guardrail** to show `CONFLICT_OVER_EXFOLIATION`, `BARRIER_RECOVERY_LOCK`, and `PREGNANCY_TERATOGEN_GUARDRAIL` automatically protecting the AM/PM regimen.
- **`0:55 – 1:30` · Day 0 ➔ Week 8 VTO Trajectory & YouCam S2S v2.0 Task Inspector**:
  - *Visual*: Scrub the VTO horizon from `IMMEDIATE_VTO` (`ΔL* <= 1.5` zero white-cast) to `WEEK_8_VTO`, click **Seal Regimen Prescription (`DLX-YCAM-...`)**, and inspect the **YouCam S2S v2.0 API Spec (`YOUCAM_S2S_V2`)** tab.
