-- ==============================================================================
-- CAUSAL INFERENCE FOR OBSERVATIONAL HEALTHCARE DATA — SUPABASE SCHEMA
-- Platform: Supabase PostgreSQL Database
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLINICAL COHORTS TABLE
CREATE TABLE IF NOT EXISTS clinical_cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL, -- 'Cardiology', 'Critical Care / ICU', 'Oncology', 'Nephrology', 'Synthetic Sandbox', 'Custom Upload'
    description TEXT,
    sample_size INTEGER NOT NULL,
    treated_count INTEGER NOT NULL,
    control_count INTEGER NOT NULL,
    treatment_variable VARCHAR(100) NOT NULL,
    outcome_variable VARCHAR(100) NOT NULL,
    outcome_type VARCHAR(50) DEFAULT 'binary',
    confounders JSONB NOT NULL DEFAULT '[]',
    ground_truth_ate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CAUSAL EXPERIMENTS & BENCHMARK RUNS
CREATE TABLE IF NOT EXISTS causal_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES clinical_cohorts(id) ON DELETE CASCADE,
    experiment_title VARCHAR(255) NOT NULL,
    method VARCHAR(100) NOT NULL,
    ate NUMERIC NOT NULL,
    ci_lower NUMERIC NOT NULL,
    ci_upper NUMERIC NOT NULL,
    std_error NUMERIC NOT NULL,
    p_value NUMERIC NOT NULL,
    effective_sample_size NUMERIC,
    parameters JSONB NOT NULL DEFAULT '{}',
    is_statistically_significant BOOLEAN GENERATED ALWAYS AS (ci_lower > 0 OR ci_upper < 0) STORED,
    bias_against_ground_truth NUMERIC,
    e_value_point NUMERIC,
    e_value_ci NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COVARIATE BALANCE DIAGNOSTICS (LOVE PLOT & RUBIN'S CRITERIA)
CREATE TABLE IF NOT EXISTS balance_diagnostics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES causal_experiments(id) ON DELETE CASCADE,
    covariate_name VARCHAR(100) NOT NULL,
    raw_smd NUMERIC NOT NULL,
    adjusted_smd NUMERIC NOT NULL,
    raw_treated_mean NUMERIC,
    raw_control_mean NUMERIC,
    adjusted_treated_mean NUMERIC,
    adjusted_control_mean NUMERIC,
    rubin_b_score NUMERIC,
    rubin_r_ratio NUMERIC,
    is_balanced BOOLEAN GENERATED ALWAYS AS (abs(adjusted_smd) < 0.10) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PATIENT-LEVEL COUNTERFACTUAL RECORDS
CREATE TABLE IF NOT EXISTS patient_counterfactuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES clinical_cohorts(id) ON DELETE CASCADE,
    patient_identifier VARCHAR(100) NOT NULL,
    features JSONB NOT NULL,
    observed_treatment INTEGER NOT NULL CHECK (observed_treatment IN (0, 1)),
    observed_outcome NUMERIC NOT NULL,
    propensity_score NUMERIC NOT NULL CHECK (propensity_score >= 0.0 AND propensity_score <= 1.0),
    predicted_y0 NUMERIC NOT NULL,
    predicted_y1 NUMERIC NOT NULL,
    individual_treatment_effect NUMERIC NOT NULL,
    weights NUMERIC DEFAULT 1.0,
    matched_pair_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PERSONAL USER HEALTH ASSESSMENTS (INDIVIDUAL CAUSAL EFFECT ESTIMATIONS)
CREATE TABLE IF NOT EXISTS personal_health_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous Patient',
    domain VARCHAR(100) NOT NULL,
    treatment_name VARCHAR(150) NOT NULL,
    target_condition VARCHAR(150) NOT NULL,
    inputs JSONB NOT NULL, -- Biomarkers: age, systolic_bp, ldl, hba1c, smoking, egfr, sofa, etc.
    propensity_score NUMERIC NOT NULL,
    baseline_risk_y0 NUMERIC NOT NULL,
    treated_risk_y1 NUMERIC NOT NULL,
    causal_risk_reduction_arr NUMERIC NOT NULL,
    relative_risk_reduction_rrr NUMERIC NOT NULL,
    number_needed_to_treat_nnt NUMERIC NOT NULL,
    clinical_recommendation TEXT NOT NULL,
    e_value_point NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AUDIT LOGS & REPORT GENERATIONS
CREATE TABLE IF NOT EXISTS causal_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL,
    user_identifier VARCHAR(255) DEFAULT 'clinical_investigator',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE clinical_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_counterfactuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read-write for research demo
CREATE POLICY "Allow public read-write for research demo" ON clinical_cohorts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for research experiments" ON causal_experiments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for balance diagnostics" ON balance_diagnostics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for patient counterfactuals" ON patient_counterfactuals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for personal health assessments" ON personal_health_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for audit logs" ON causal_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_experiments_cohort ON causal_experiments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_experiment ON balance_diagnostics(experiment_id);
CREATE INDEX IF NOT EXISTS idx_counterfactuals_cohort ON patient_counterfactuals(cohort_id);
CREATE INDEX IF NOT EXISTS idx_personal_assessments_user ON personal_health_assessments(user_name);
