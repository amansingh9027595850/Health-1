# CausalHealth AI — Causal Inference Engine for Observational Healthcare Data

A research-grade, user-friendly platform engineered to estimate true treatment effects (**ATE, ATT, CATE**) in observational healthcare datasets, electronic health records (EHR), and personalized clinical assessments where **confounding by indication** distorts naive comparisons.

---

## 🌟 Key Capabilities & Architecture

### 1. 🏥 Personalized Health Estimator (User-Centric Causal Assessment)
Users and clinicians can enter their own clinical biomarkers or select 1-click clinical presets to compute their personalized causal health estimation under the **Potential Outcomes Framework**:
- **Inputs**: Age, Sex, Systolic Blood Pressure, Total & LDL Cholesterol, Fasting Glucose / HbA1c, Smoking Status, History of Prior Cardiovascular Events (CAD / MI), Kidney Filtration Rate (eGFR), and acute biomarkers (SOFA, Lactate).
- **Personalized Potential Outcomes**:
  - **$Y(0)$ (Natural Course / Standard of Care Risk)**: Projected baseline risk without active therapy.
  - **$Y(1)$ (Counterfactual Outcome Under Active Therapy)**: Projected risk with the intervention.
  - **Individual Treatment Effect ($\tau_i$) / Absolute Risk Reduction (ARR)**: Net personalized causal risk reduction.
  - **Relative Risk Reduction (RRR)** and **Number Needed to Treat (NNT)**: Practical metrics for shared clinical decision-making.
  - **Personal Propensity Score $e(X)$**: How closely the patient fits current clinical prescribing indications.
  - **Personal E-Value**: How resistant the recommendation is to unmeasured confounding.
  - **1-Click Save to Supabase**: Persists the patient assessment to the `personal_health_assessments` table in Supabase Cloud.

### 2. 📱 Modern Single Page Application (SPA) with Multi-Page Navigation
The application operates as a high-performance SPA with instant, client-side routed pages synchronized to URL hashes:
1. **My Health Estimator** (`#health-estimator`): Flagship personalized intake form and real-time potential outcomes engine.
2. **Estimators Benchmark** (`#benchmark`): Multi-method research suite (Naive, OLS, PSM, IPTW, Doubly Robust AIPW, CATE) with interactive Forest Plot and ground truth comparison.
3. **Covariate Balance** (`#balance`): Interactive Love Plot ($|SMD| < 0.10$ criteria), Propensity Score Common Support distribution, and Rubin's B/R criteria.
4. **Causal DAG** (`#dag`): Judea Pearl's Structural Causal Models with interactive backdoor path blocking and collider bias warnings.
5. **Sensitivity (E-Value)** (`#sensitivity`): VanderWeele & Ding E-Values and Rosenbaum's $\Gamma$ sensitivity bounds for hidden selection bias.
6. **Cohort Explorer** (`#patients`): Filterable patient records browser, "What-If" simulator, and drag-and-drop CSV uploader.
7. **Supabase Vault** (`#supabase-vault`): Database credentials configuration, live connection tester, schema copier, and synced records viewer.

---

## ⚡ Implemented Causal Inference Methods

| Estimator | Mathematical Formulation / Principle | Primary Advantage | Robustness |
| :--- | :--- | :--- | :--- |
| **Naive Association** | $\bar{Y}_{1} - \bar{Y}_{0}$ | Baseline unadjusted contrast showing severe confounding by indication | ⚠️ Biased |
| **Multivariable OLS** | $Y_i = \beta_0 + \tau A_i + \sum \beta_j X_{ij} + \epsilon_i$ | Parametric linear adjustment | Medium |
| **Propensity Score Matching (PSM)** | 1:1 Nearest-Neighbor greedy matching within caliper ($0.2 \times \text{SD}(\text{logit}(e(X)))$) | Non-parametric balancing; discards unmatchable outliers | High |
| **Inverse Probability Weighting (IPTW)** | Stabilized weights $w_i = A_i \frac{\bar{p}}{e_i} + (1-A_i)\frac{1-\bar{p}}{1-e_i}$ with percentile trimming | Creates a balanced pseudo-population with Effective Sample Size (ESS) tracking | High |
| **Doubly Robust AIPW** | Augmented Inverse Probability Weighting combining outcome model $\mu(X)$ and propensity model $e(X)$ | **Consistent if EITHER the propensity model OR the outcome model is correctly specified** | 🏆 **State-of-the-Art** |
| **Meta-Learners (CATE)** | T-Learner ($\hat{\tau}_i = \hat{\mu}_1(X_i) - \hat{\mu}_0(X_i)$) | Quantifies individual treatment effect heterogeneity across patient phenotypes | High |
| **Sensitivity Analysis** | VanderWeele & Ding E-Values + Rosenbaum $\Gamma$ bounds | Quantifies how strong unmeasured confounding must be to overturn effect | Quantitative |

---

## ☁️ Supabase Cloud Database Integration

All observational cohorts, individual user health assessments, and causal experiment runs are persisted directly to **Supabase PostgreSQL**:
- **Automatic Local Vault**: Works out-of-the-box in local storage mode even before Supabase credentials are provided.
- **Dynamic Configurator**: Connect any Supabase project by entering URL and Anon Key with live latency ping.
- **SQL Migration Script**: Complete PostgreSQL schema in [supabase_schema.sql](file:///c:/Users/singh/sem_aman-7/supabase_schema.sql) with Row Level Security (RLS) policies and indexes.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

For OpenRouter-powered chat, set `OPENROUTER_API_KEY` in the environment where the backend runs before starting it with `npm run server`. Keep this key server-side; do not add it to frontend code or commit it.

---

## 🐍 Standalone Python Causal Pipeline

A zero-dependency Python script matching the mathematical engine is provided in [causal_analysis_pipeline.py](file:///c:/Users/singh/sem_aman-7/causal_analysis_pipeline.py):

```bash
python causal_analysis_pipeline.py
```
