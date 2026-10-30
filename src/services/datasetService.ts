// ==============================================================================
// CLINICAL OBSERVATIONAL HEALTHCARE DATASETS & GENERATOR
// Preloaded Cohorts: Sepsis ICU, Cardiology, Oncology, Nephrology & Sandbox
// ==============================================================================

import { Patient } from './causalEngine';

export interface ClinicalCohort {
  id: string;
  name: string;
  domain: string;
  description: string;
  clinicalContext: string;
  treatmentName: string;
  controlName: string;
  outcomeName: string;
  outcomeType: 'binary' | 'continuous';
  outcomeUnit?: string;
  groundTruthATE?: number; // True causal effect if known
  covariateMetadata: Array<{
    key: string;
    label: string;
    unit: string;
    description: string;
    isConfounder: boolean;
  }>;
  patients: Patient[];
}

// Pseudo-random Gaussian generator with Box-Muller transform
function sampleNormal(mean: number, std: number): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ----------------------------------------------------------------------------
// COHORT 1: ICU SEPSIS (MIMIC-IV INSPIRED: EARLY NOREPINEPHRINE THERAPY)
// ----------------------------------------------------------------------------
export function generateSepsisICUCohort(sampleSize: number = 850): ClinicalCohort {
  const patients: Patient[] = [];
  const trueATE = -0.092; // Vasopressor reduces 28-day mortality by 9.2 percentage points

  for (let i = 1; i <= sampleSize; i++) {
    // Clinical covariates with realistic ICU distributions
    const age = Math.round(clamp(sampleNormal(64, 13), 20, 92));
    const sofa = Math.round(clamp(sampleNormal(7.5, 3.2), 1, 19)); // SOFA score
    const lactate = Number(clamp(sampleNormal(3.4, 1.8), 0.6, 12.0).toFixed(1)); // Serum lactate mmol/L
    const map = Math.round(clamp(sampleNormal(63, 11), 38, 95)); // Mean arterial pressure mmHg
    const mechVent = Math.random() < (sofa > 8 ? 0.72 : 0.28) ? 1 : 0;
    const akiStage = Math.round(clamp(sampleNormal(sofa * 0.18, 0.8), 0, 3));
    const charlson = Math.round(clamp(sampleNormal(3.2, 1.9), 0, 9));

    // Treatment Assignment Model (Severe Confounding by Indication:
    // Clinicians urgently administer vasopressors when MAP is low, lactate is high, SOFA is high)
    const logitTreatment =
      -2.4 +
      0.02 * (age - 60) +
      0.28 * (sofa - 7) +
      0.45 * (lactate - 3) -
      0.08 * (map - 65) +
      0.85 * mechVent +
      0.35 * akiStage;

    const probTreatment = 1 / (1 + Math.exp(-logitTreatment));
    const treatment = Math.random() < probTreatment ? 1 : 0;

    // Outcome Model (28-day Mortality):
    // Baseline risk depends heavily on disease severity (SOFA, lactate, age)
    const baselineLogit =
      -1.6 +
      0.03 * (age - 60) +
      0.24 * (sofa - 7) +
      0.35 * (lactate - 3) -
      0.03 * (map - 65) +
      0.65 * mechVent +
      0.25 * akiStage;

    const probY0 = 1 / (1 + Math.exp(-baselineLogit));
    const probY1 = clamp(probY0 + trueATE, 0.02, 0.98);

    const Y0 = Math.random() < probY0 ? 1 : 0;
    const Y1 = Math.random() < probY1 ? 1 : 0;
    const observedOutcome = treatment === 1 ? Y1 : Y0;

    patients.push({
      id: `ICU-${1000 + i}`,
      treatment,
      outcome: observedOutcome,
      counterfactualY0: probY0,
      counterfactualY1: probY1,
      individualTreatmentEffect: probY1 - probY0,
      covariates: {
        age,
        sofa_score: sofa,
        lactate_mmol_L: lactate,
        mean_arterial_pressure: map,
        mechanical_vent: mechVent,
        aki_stage: akiStage,
        charlson_comorbidity: charlson,
      },
    });
  }

  return {
    id: 'cohort_sepsis_icu',
    name: 'ICU Septic Shock — Early Norepinephrine Cohort',
    domain: 'Critical Care / ICU',
    description: 'EHR observational registry of ICU patients meeting Sepsis-3 criteria, examining early vasopressor initiation within 6 hours.',
    clinicalContext: 'Severe Confounding by Indication: Clinicians aggressively administer vasopressors to patients presenting with hemodynamic collapse (high lactate, low MAP, high SOFA). Naive unadjusted analysis wrongly suggests vasopressors increase mortality; causal adjustment reveals the true life-saving reduction.',
    treatmentName: 'Early Norepinephrine (<6h)',
    controlName: 'Standard Fluid Resuscitation Only',
    outcomeName: '28-Day In-Hospital Mortality',
    outcomeType: 'binary',
    groundTruthATE: trueATE,
    covariateMetadata: [
      { key: 'sofa_score', label: 'SOFA Organ Failure Score', unit: '0-24 points', description: 'Sequential Organ Failure Assessment score at triage', isConfounder: true },
      { key: 'lactate_mmol_L', label: 'Serum Lactate', unit: 'mmol/L', description: 'Circulating lactate biomarker of tissue hypoperfusion', isConfounder: true },
      { key: 'mean_arterial_pressure', label: 'Mean Arterial Pressure (MAP)', unit: 'mmHg', description: 'Systemic vascular pressure', isConfounder: true },
      { key: 'age', label: 'Patient Age', unit: 'years', description: 'Chronological age', isConfounder: true },
      { key: 'mechanical_vent', label: 'Mechanical Ventilation', unit: '0/1', description: 'Invasive mechanical ventilation requirement', isConfounder: true },
      { key: 'aki_stage', label: 'KDIGO AKI Stage', unit: '0-3', description: 'Acute kidney injury staging', isConfounder: true },
      { key: 'charlson_comorbidity', label: 'Charlson Comorbidity Index', unit: 'points', description: 'Pre-existing chronic disease burden', isConfounder: true },
    ],
    patients,
  };
}

// ----------------------------------------------------------------------------
// COHORT 2: CARDIOLOGY (HIGH-INTENSITY STATIN IN CORONARY DISEASE)
// ----------------------------------------------------------------------------
export function generateCardiologyCohort(sampleSize: number = 900): ClinicalCohort {
  const patients: Patient[] = [];
  const trueATE = -0.076; // Statins reduce 3-year MACE risk by 7.6 percentage points

  for (let i = 1; i <= sampleSize; i++) {
    const age = Math.round(clamp(sampleNormal(66, 9), 42, 88));
    const ldl = Math.round(clamp(sampleNormal(136, 28), 70, 240)); // mg/dL
    const sbp = Math.round(clamp(sampleNormal(138, 16), 100, 195)); // mmHg
    const hba1c = Number(clamp(sampleNormal(6.8, 1.2), 4.8, 12.5).toFixed(1)); // %
    const smoking = Math.random() < 0.26 ? 1 : 0;
    const priorMI = Math.random() < 0.32 ? 1 : 0;
    const egfr = Math.round(clamp(sampleNormal(74, 18), 25, 115));

    // Prescription propensity
    const logitTreat =
      -2.1 +
      0.025 * (ldl - 130) +
      0.85 * priorMI +
      0.015 * (sbp - 135) +
      0.35 * (hba1c > 7 ? 1 : 0) +
      0.02 * (age - 60);

    const probTreat = 1 / (1 + Math.exp(-logitTreat));
    const treatment = Math.random() < probTreat ? 1 : 0;

    // Outcome model: 3-year MACE (Myocardial Infarction, Stroke, CV Death)
    const baseRisk =
      0.12 +
      0.0015 * (ldl - 100) +
      0.14 * priorMI +
      0.002 * (sbp - 120) +
      0.04 * (hba1c - 6) +
      0.08 * smoking;

    const probY0 = clamp(baseRisk, 0.05, 0.85);
    const probY1 = clamp(probY0 + trueATE, 0.02, 0.80);

    const Y0 = Math.random() < probY0 ? 1 : 0;
    const Y1 = Math.random() < probY1 ? 1 : 0;

    patients.push({
      id: `CARD-${2000 + i}`,
      treatment,
      outcome: treatment === 1 ? Y1 : Y0,
      counterfactualY0: probY0,
      counterfactualY1: probY1,
      individualTreatmentEffect: probY1 - probY0,
      covariates: {
        baseline_ldl: ldl,
        prior_mi: priorMI,
        systolic_bp: sbp,
        hba1c,
        age,
        smoking_status: smoking,
        egfr,
      },
    });
  }

  return {
    id: 'cohort_cardiology_statin',
    name: 'Cardiology — High-Intensity Statin & 3-Year MACE',
    domain: 'Cardiovascular Care',
    description: 'Outpatient cardiology registry evaluating the causal efficacy of high-intensity atorvastatin/rosuvastatin vs moderate/standard care.',
    clinicalContext: 'Patients with prior myocardial infarction and sky-high LDL cholesterol are disproportionately prescribed high-intensity statins. Unadjusted analyses miss the magnitude of benefit without propensity score balancing.',
    treatmentName: 'High-Intensity Statin (Atorvastatin 80mg)',
    controlName: 'Standard/Moderate Statin Therapy',
    outcomeName: '3-Year Major Adverse Cardiac Event (MACE)',
    outcomeType: 'binary',
    groundTruthATE: trueATE,
    covariateMetadata: [
      { key: 'baseline_ldl', label: 'Baseline LDL Cholesterol', unit: 'mg/dL', description: 'Circulating low-density lipoprotein', isConfounder: true },
      { key: 'prior_mi', label: 'History of Myocardial Infarction', unit: '0/1', description: 'Documented prior coronary event', isConfounder: true },
      { key: 'systolic_bp', label: 'Systolic Blood Pressure', unit: 'mmHg', description: 'Office seated systolic blood pressure', isConfounder: true },
      { key: 'hba1c', label: 'Glycated Hemoglobin (HbA1c)', unit: '%', description: 'Average glycemic control over prior 3 months', isConfounder: true },
      { key: 'age', label: 'Age', unit: 'years', description: 'Patient chronological age', isConfounder: true },
      { key: 'smoking_status', label: 'Active Tobacco Smoker', unit: '0/1', description: 'Current cigarette smoking status', isConfounder: true },
      { key: 'egfr', label: 'Estimated GFR', unit: 'mL/min/1.73m²', description: 'Renal filtration rate biomarker', isConfounder: true },
    ],
    patients,
  };
}

// ----------------------------------------------------------------------------
// COHORT 3: ONCOLOGY (NSCLC IMMUNOTHERAPY VS CHEMOTHERAPY)
// ----------------------------------------------------------------------------
export function generateOncologyCohort(sampleSize: number = 750): ClinicalCohort {
  const patients: Patient[] = [];
  const trueATE = 0.155; // Immunotherapy increases 12-month PFS rate by 15.5 percentage points

  for (let i = 1; i <= sampleSize; i++) {
    const pdl1 = Math.round(clamp(sampleNormal(45, 28), 0, 100)); // % TPS
    const ecog = Math.round(clamp(sampleNormal(1.1, 0.7), 0, 3)); // ECOG 0, 1, 2, 3
    const tumorSize = Math.round(clamp(sampleNormal(62, 22), 15, 140)); // mm
    const brainMets = Math.random() < 0.18 ? 1 : 0;
    const age = Math.round(clamp(sampleNormal(65, 8), 45, 85));
    const priorLines = Math.round(clamp(sampleNormal(1.0, 0.6), 0, 3));

    // Treatment selection
    const logitTreat =
      -1.8 +
      0.038 * (pdl1 - 40) -
      0.55 * ecog -
      0.65 * brainMets +
      0.02 * (age - 60);

    const probTreat = 1 / (1 + Math.exp(-logitTreat));
    const treatment = Math.random() < probTreat ? 1 : 0;

    // 1-Year Progression-Free Survival (1 = alive without disease progression)
    const basePFS =
      0.30 +
      0.002 * pdl1 -
      0.09 * ecog -
      0.001 * tumorSize -
      0.12 * brainMets -
      0.04 * priorLines;

    const probY0 = clamp(basePFS, 0.05, 0.75);
    const probY1 = clamp(probY0 + trueATE + (pdl1 > 50 ? 0.08 : -0.04), 0.05, 0.92); // Treatment effect heterogeneity

    const Y0 = Math.random() < probY0 ? 1 : 0;
    const Y1 = Math.random() < probY1 ? 1 : 0;

    patients.push({
      id: `ONC-${3000 + i}`,
      treatment,
      outcome: treatment === 1 ? Y1 : Y0,
      counterfactualY0: probY0,
      counterfactualY1: probY1,
      individualTreatmentEffect: probY1 - probY0,
      covariates: {
        pdl1_tps: pdl1,
        ecog_score: ecog,
        tumor_size_mm: tumorSize,
        brain_metastases: brainMets,
        age,
        prior_chemo_lines: priorLines,
      },
    });
  }

  return {
    id: 'cohort_oncology_ici',
    name: 'Oncology — Anti-PD-1 Immunotherapy in Advanced NSCLC',
    domain: 'Oncology',
    description: 'Real-world clinical registry of patients with stage IV non-small cell lung cancer treated with immune checkpoint blockade vs platinum doublet chemo.',
    clinicalContext: 'Patients with high PD-L1 expression and favorable ECOG performance are selected for immunotherapy, while frail patients or those with brain metastases historically receive conventional chemo. Causal balancing disentangles biologic biomarker selection from true drug efficacy.',
    treatmentName: 'Anti-PD-1 Immunotherapy (Pembrolizumab)',
    controlName: 'Platinum Doublet Chemotherapy',
    outcomeName: '12-Month Progression-Free Survival (PFS)',
    outcomeType: 'binary',
    groundTruthATE: trueATE,
    covariateMetadata: [
      { key: 'pdl1_tps', label: 'PD-L1 Tumor Proportion Score', unit: '%', description: 'Immunohistochemistry PD-L1 expression level', isConfounder: true },
      { key: 'ecog_score', label: 'ECOG Performance Status', unit: '0-3', description: 'Functional performance rating scale (0=fit, 3=frail)', isConfounder: true },
      { key: 'tumor_size_mm', label: 'Sum of Target Lesions (RECIST)', unit: 'mm', description: 'Baseline baseline CT tumor diameter', isConfounder: true },
      { key: 'brain_metastases', label: 'Presence of CNS Metastases', unit: '0/1', description: 'Baseline MRI-confirmed brain metastasis', isConfounder: true },
      { key: 'age', label: 'Patient Age', unit: 'years', description: 'Chronological age', isConfounder: true },
      { key: 'prior_chemo_lines', label: 'Prior Systemic Lines', unit: 'count', description: 'Number of prior systemic anticancer regimens', isConfounder: true },
    ],
    patients,
  };
}

// ----------------------------------------------------------------------------
// SYNTHETIC SIMULATION SANDBOX (ADJUSTABLE DATA GENERATING PROCESS)
// ----------------------------------------------------------------------------
export interface SimulationParams {
  sampleSize: number;
  trueATE: number;
  unmeasuredConfounding: number; // 0 = none, 1 = severe
  selectionBiasStrength: number;
  nonLinearTreatmentAssignment: boolean;
}

export function generateSyntheticSandbox(params: SimulationParams): ClinicalCohort {
  const { sampleSize, trueATE, unmeasuredConfounding, selectionBiasStrength, nonLinearTreatmentAssignment } = params;
  const patients: Patient[] = [];

  for (let i = 1; i <= sampleSize; i++) {
    // Measured covariates
    const x1 = sampleNormal(0, 1); // e.g. age standardized
    const x2 = sampleNormal(0, 1); // e.g. severity standardized
    const x3 = Math.random() < 0.4 ? 1 : 0; // binary comorbidity
    const x4 = sampleNormal(0, 1); // biomarker

    // Unmeasured Confounder U (simulates hidden clinical intuition/frailty)
    const u = sampleNormal(0, 1);

    // Propensity equation
    let logitA = selectionBiasStrength * (0.8 * x1 + 0.9 * x2 + 0.6 * x3) + unmeasuredConfounding * 0.95 * u;
    if (nonLinearTreatmentAssignment) {
      logitA += 0.45 * (x1 * x1) + 0.5 * (x1 * x2); // quadratic and interaction
    }

    const probA = 1 / (1 + Math.exp(-logitA));
    const treatment = Math.random() < probA ? 1 : 0;

    // Outcome equation
    const baseRisk =
      0.35 +
      0.12 * x1 +
      0.15 * x2 +
      0.08 * x3 +
      unmeasuredConfounding * 0.18 * u;

    const probY0 = clamp(baseRisk, 0.05, 0.92);
    const probY1 = clamp(probY0 + trueATE, 0.02, 0.95);

    const Y0 = Math.random() < probY0 ? 1 : 0;
    const Y1 = Math.random() < probY1 ? 1 : 0;

    patients.push({
      id: `SIM-${5000 + i}`,
      treatment,
      outcome: treatment === 1 ? Y1 : Y0,
      counterfactualY0: probY0,
      counterfactualY1: probY1,
      individualTreatmentEffect: probY1 - probY0,
      covariates: {
        x1_patient_age_std: Number(x1.toFixed(2)),
        x2_clinical_severity_std: Number(x2.toFixed(2)),
        x3_chronic_comorbidity: x3,
        x4_biomarker_level: Number(x4.toFixed(2)),
      },
    });
  }

  return {
    id: 'cohort_simulation_sandbox',
    name: 'Causal Ground Truth Sandbox',
    domain: 'Synthetic Benchmark',
    description: 'Controlled Data Generating Process (DGP) where true potential outcomes Y(0) and Y(1) and exact ATE are known mathematically.',
    clinicalContext: 'Allows empirical proof of causal theorems: verify how Doubly Robust AIPW remains unbiased even under model misspecification, compare PSM vs IPTW variance, and test sensitivity bounds against unmeasured confounder U.',
    treatmentName: 'Novel Experimental Therapy',
    controlName: 'Standard of Care',
    outcomeName: 'Adverse Clinical Endpoint (Mortality / Failure)',
    outcomeType: 'binary',
    groundTruthATE: trueATE,
    covariateMetadata: [
      { key: 'x1_patient_age_std', label: 'Patient Age (Z-Score)', unit: 'SD', description: 'Standardized age covariate', isConfounder: true },
      { key: 'x2_clinical_severity_std', label: 'Clinical Severity (Z-Score)', unit: 'SD', description: 'Baseline physiological illness index', isConfounder: true },
      { key: 'x3_chronic_comorbidity', label: 'Chronic Comorbidity Flag', unit: '0/1', description: 'Binary indicator for pre-existing illness', isConfounder: true },
      { key: 'x4_biomarker_level', label: 'Biomarker Level', unit: 'SD', description: 'Continuous laboratory measurement', isConfounder: false },
    ],
    patients,
  };
}
