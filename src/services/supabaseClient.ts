import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys in localStorage
const STORAGE_KEY_URL = 'causalhealth_supabase_url';
const STORAGE_KEY_ANON = 'causalhealth_supabase_anon_key';
const LOCAL_STORE_EXPERIMENTS = 'causalhealth_local_experiments';
const LOCAL_STORE_COHORTS = 'causalhealth_local_cohorts';
const LOCAL_STORE_LOGS = 'causalhealth_local_logs';
const LOCAL_STORE_ASSESSMENTS = 'causalhealth_local_assessments';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
  errorMessage?: string;
}

export interface CausalExperimentRecord {
  id: string;
  cohort_name: string;
  domain: string;
  method: string;
  ate: number;
  ci_lower: number;
  ci_upper: number;
  std_error: number;
  p_value: number;
  effective_sample_size?: number;
  parameters: Record<string, any>;
  e_value_point?: number;
  e_value_ci?: number;
  bias_against_ground_truth?: number;
  created_at: string;
}

export interface PersonalHealthAssessment {
  id: string;
  userName: string;
  domain: string;
  treatmentName: string;
  targetCondition: string;
  inputs: {
    age: number;
    sex: string;
    systolicBp: number;
    ldlCholesterol: number;
    hba1c: number;
    smokingStatus: string;
    priorCardioHistory: boolean;
    egfr: number;
    bmi: number;
    sofaScore?: number;
    lactate?: number;
  };
  propensityScore: number;
  baselineRiskY0: number; // Risk under Standard Care
  treatedRiskY1: number; // Risk with Treatment
  causalRiskReductionARR: number; // Potential Outcome Difference (Y1 - Y0)
  relativeRiskReductionRRR: number; // (Y0 - Y1) / Y0
  numberNeededToTreatNNT: number; // 1 / |ARR|
  clinicalRecommendation: string;
  eValuePoint: number;
  createdAt: string;
  storageSource?: 'supabase' | 'local_vault';
}

export interface SaveAssessmentResponse {
  record: PersonalHealthAssessment;
  mode: 'supabase_and_local' | 'local_vault';
  success: boolean;
  message: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    isConnected: false,
  };

  constructor() {
    this.loadInitialConfig();
    this.seedDemoAssessmentsIfEmpty();
  }

  private loadInitialConfig() {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const envAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.causalhealth_supabase_jwt_public_key_local_emulator';

    const savedUrl = localStorage.getItem(STORAGE_KEY_URL) || envUrl;
    const savedAnon = localStorage.getItem(STORAGE_KEY_ANON) || envAnon;

    if (savedUrl && savedAnon) {
      this.config.url = savedUrl;
      this.config.anonKey = savedAnon;
      try {
        this.client = createClient(savedUrl, savedAnon);
        this.testCurrentConnection().catch(() => {});
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    }
  }

  // Seed default demonstration records so the database is populated on first load
  public seedDemoAssessmentsIfEmpty() {
    try {
      const existing = localStorage.getItem(LOCAL_STORE_ASSESSMENTS);
      if (!existing || JSON.parse(existing).length === 0) {
        const demoRecords: PersonalHealthAssessment[] = [
          {
            id: 'pha_demo_1',
            userName: 'Robert Chen (CAD & T2D)',
            domain: 'Cardiovascular Care',
            treatmentName: 'High-Intensity Statin (Atorvastatin 80mg)',
            targetCondition: '5-Year Major Adverse Cardiac Event (MACE)',
            inputs: {
              age: 67,
              sex: 'male',
              systolicBp: 154,
              ldlCholesterol: 168,
              hba1c: 8.2,
              smokingStatus: 'former',
              priorCardioHistory: true,
              egfr: 58,
              bmi: 29.5,
            },
            propensityScore: 0.88,
            baselineRiskY0: 0.384,
            treatedRiskY1: 0.238,
            causalRiskReductionARR: -0.146,
            relativeRiskReductionRRR: 38.0,
            numberNeededToTreatNNT: 7,
            clinicalRecommendation:
              'High Clinical Benefit: Individual absolute risk reduction of 14.6% strongly favors initiating High-Intensity Statin. Treating 7 patients with this clinical phenotype prevents 1 major adverse event.',
            eValuePoint: 2.38,
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            storageSource: 'local_vault',
          },
          {
            id: 'pha_demo_2',
            userName: 'Elena Rodriguez (Hypertensive Smoker)',
            domain: 'Cardiovascular Care',
            treatmentName: 'High-Intensity Statin (Atorvastatin 80mg)',
            targetCondition: '5-Year Major Adverse Cardiac Event (MACE)',
            inputs: {
              age: 55,
              sex: 'female',
              systolicBp: 146,
              ldlCholesterol: 148,
              hba1c: 6.1,
              smokingStatus: 'active',
              priorCardioHistory: false,
              egfr: 84,
              bmi: 27.2,
            },
            propensityScore: 0.62,
            baselineRiskY0: 0.225,
            treatedRiskY1: 0.158,
            causalRiskReductionARR: -0.067,
            relativeRiskReductionRRR: 29.8,
            numberNeededToTreatNNT: 15,
            clinicalRecommendation:
              'High Clinical Benefit: Individual absolute risk reduction of 6.7% indicates meaningful preventive efficacy. Smoking cessation combined with statin therapy offers maximum risk reduction.',
            eValuePoint: 1.86,
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            storageSource: 'local_vault',
          },
          {
            id: 'pha_demo_3',
            userName: 'Marcus Vance (ICU Sepsis Shock)',
            domain: 'Critical Care / ICU',
            treatmentName: 'Early Norepinephrine Vasopressor (<6h)',
            targetCondition: '28-Day In-Hospital Sepsis Mortality',
            inputs: {
              age: 72,
              sex: 'male',
              systolicBp: 78,
              ldlCholesterol: 105,
              hba1c: 6.9,
              smokingStatus: 'never',
              priorCardioHistory: false,
              egfr: 40,
              bmi: 26.0,
              sofaScore: 11,
              lactate: 4.6,
            },
            propensityScore: 0.92,
            baselineRiskY0: 0.442,
            treatedRiskY1: 0.347,
            causalRiskReductionARR: -0.095,
            relativeRiskReductionRRR: 21.5,
            numberNeededToTreatNNT: 11,
            clinicalRecommendation:
              'High Clinical Benefit: Urgent hemodynamic vasopressor initiation indicated. Causal adjustment confirms 9.5% reduction in 28-day in-hospital mortality.',
            eValuePoint: 1.74,
            createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
            storageSource: 'local_vault',
          },
        ];
        localStorage.setItem(LOCAL_STORE_ASSESSMENTS, JSON.stringify(demoRecords));
      }
    } catch {
      // ignore
    }
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public async setConfig(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim();
    const cleanAnon = anonKey.trim();

    if (!cleanUrl || !cleanAnon) {
      return { success: false, message: 'Supabase URL and Anon Key cannot be empty.' };
    }

    try {
      const testClient = createClient(cleanUrl, cleanAnon);
      const { error } = await testClient.from('personal_health_assessments').select('id').limit(1);

      this.client = testClient;
      this.config = {
        url: cleanUrl,
        anonKey: cleanAnon,
        isConnected: !error || error.code === 'PGRST116',
        lastChecked: new Date().toISOString(),
        errorMessage: error ? error.message : undefined,
      };

      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_ANON, cleanAnon);

      this.logAction('supabase_configured', { url: cleanUrl, success: this.config.isConnected });

      if (error && error.code !== 'PGRST116') {
        return {
          success: true,
          message: `Connected to Supabase endpoint! Note: Ensure you run the SQL migration script from 'supabase_schema.sql' in your Supabase SQL editor to create all tables: ${error.message}`,
        };
      }

      return { success: true, message: 'Successfully connected and verified Supabase cloud database!' };
    } catch (err: any) {
      this.config.isConnected = false;
      this.config.errorMessage = err.message || 'Connection failed';
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  public async testCurrentConnection(): Promise<boolean> {
    if (!this.client) {
      this.config.isConnected = false;
      return false;
    }
    try {
      const { error } = await this.client.from('personal_health_assessments').select('id').limit(1);
      const ok = !error || error.code === 'PGRST116';
      this.config.isConnected = ok;
      this.config.lastChecked = new Date().toISOString();
      return ok;
    } catch {
      this.config.isConnected = false;
      return false;
    }
  }

  public disconnect() {
    this.client = null;
    this.config.isConnected = false;
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    this.logAction('supabase_disconnected', {});
  }

  // --------------------------------------------------------------------------
  // USER PERSONAL HEALTH ASSESSMENTS PERSISTENCE
  // --------------------------------------------------------------------------

  public async savePersonalAssessment(
    assessmentData: Omit<PersonalHealthAssessment, 'id' | 'createdAt'>
  ): Promise<SaveAssessmentResponse> {
    const recordId = 'pha_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString();

    let supabaseSuccess = false;
    let supabaseMsg = '';

    // 1. If Supabase client is initialized, push directly to Supabase table
    if (this.client) {
      try {
        const { error } = await this.client.from('personal_health_assessments').insert([
          {
            id: recordId,
            user_name: assessmentData.userName,
            domain: assessmentData.domain,
            treatment_name: assessmentData.treatmentName,
            target_condition: assessmentData.targetCondition,
            inputs: assessmentData.inputs,
            propensity_score: assessmentData.propensityScore,
            baseline_risk_y0: assessmentData.baselineRiskY0,
            treated_risk_y1: assessmentData.treatedRiskY1,
            causal_risk_reduction_arr: assessmentData.causalRiskReductionARR,
            relative_risk_reduction_rrr: assessmentData.relativeRiskReductionRRR,
            number_needed_to_treat_nnt: assessmentData.numberNeededToTreatNNT,
            clinical_recommendation: assessmentData.clinicalRecommendation,
            e_value_point: assessmentData.eValuePoint,
            created_at: createdAt,
          },
        ]);

        if (error) {
          supabaseSuccess = false;
          supabaseMsg = `Supabase write notice: ${error.message}`;
          console.warn('Supabase remote insert warning:', error);
        } else {
          supabaseSuccess = true;
          this.config.isConnected = true;
          supabaseMsg = 'Successfully synchronized to Supabase Database (PostgreSQL / Local PostgREST)!';
          this.logAction('supabase_assessment_synced', { user: assessmentData.userName, domain: assessmentData.domain });
        }
      } catch (err: any) {
        supabaseSuccess = false;
        supabaseMsg = `Supabase network error: ${err.message}`;
      }
    }

    const record: PersonalHealthAssessment = {
      ...assessmentData,
      id: recordId,
      createdAt,
      storageSource: supabaseSuccess ? 'supabase' : 'local_vault',
    };

    // 2. Save in local database vault as resilient local cache
    const local = this.getPersonalAssessments();
    // Avoid duplicates
    const filtered = local.filter(x => x.id !== recordId);
    filtered.unshift(record);
    localStorage.setItem(LOCAL_STORE_ASSESSMENTS, JSON.stringify(filtered.slice(0, 100)));

    if (supabaseSuccess) {
      return {
        record,
        mode: 'supabase_and_local',
        success: true,
        message: 'Successfully persisted to Supabase Database and Synchronized Live!',
      };
    } else {
      return {
        record,
        mode: 'local_vault',
        success: true,
        message: this.client
          ? `Saved to Local Database Vault. (${supabaseMsg})`
          : 'Saved successfully to Local Healthcare Database Vault! (Connect remote Supabase in Supabase Vault to enable cloud sync).',
      };
    }
  }

  public getPersonalAssessments(): PersonalHealthAssessment[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_ASSESSMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async fetchRemotePersonalAssessments(): Promise<PersonalHealthAssessment[]> {
    if (!this.client) {
      return this.getPersonalAssessments();
    }
    try {
      const { data, error } = await this.client
        .from('personal_health_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        return this.getPersonalAssessments();
      }

      const remoteList: PersonalHealthAssessment[] = data.map((item: any) => ({
        id: item.id,
        userName: item.user_name || item.userName || 'Unnamed Patient',
        domain: item.domain || 'Cardiovascular Care',
        treatmentName: item.treatment_name || item.treatmentName || 'Treatment',
        targetCondition: item.target_condition || item.targetCondition || 'Primary Outcome',
        inputs: item.inputs || {},
        propensityScore: Number(item.propensity_score ?? item.propensityScore ?? 0.5),
        baselineRiskY0: Number(item.baseline_risk_y0 ?? item.baselineRiskY0 ?? 0.2),
        treatedRiskY1: Number(item.treated_risk_y1 ?? item.treatedRiskY1 ?? 0.15),
        causalRiskReductionARR: Number(item.causal_risk_reduction_arr ?? item.causalRiskReductionARR ?? -0.05),
        relativeRiskReductionRRR: Number(item.relative_risk_reduction_rrr ?? item.relativeRiskReductionRRR ?? 25),
        numberNeededToTreatNNT: Number(item.number_needed_to_treat_nnt ?? item.numberNeededToTreatNNT ?? 20),
        clinicalRecommendation: item.clinical_recommendation || item.clinicalRecommendation || '',
        eValuePoint: Number(item.e_value_point ?? item.eValuePoint ?? 1.5),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        storageSource: 'supabase' as const,
      }));

      this.config.isConnected = true;
      localStorage.setItem(LOCAL_STORE_ASSESSMENTS, JSON.stringify(remoteList));
      return remoteList;
    } catch {
      return this.getPersonalAssessments();
    }
  }

  public async deletePersonalAssessment(id: string) {
    try {
      const current = this.getPersonalAssessments().filter(a => a.id !== id);
      localStorage.setItem(LOCAL_STORE_ASSESSMENTS, JSON.stringify(current));

      if (this.client) {
        await this.client.from('personal_health_assessments').delete().eq('id', id);
      }
    } catch {
      // ignore
    }
  }

  // --------------------------------------------------------------------------
  // RESEARCH EXPERIMENTS PERSISTENCE
  // --------------------------------------------------------------------------

  public async saveExperiment(experiment: Omit<CausalExperimentRecord, 'id' | 'created_at'>): Promise<CausalExperimentRecord> {
    const record: CausalExperimentRecord = {
      ...experiment,
      id: 'exp_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };

    const local = this.getLocalExperiments();
    local.unshift(record);
    localStorage.setItem(LOCAL_STORE_EXPERIMENTS, JSON.stringify(local.slice(0, 50)));

    if (this.client) {
      try {
        const { error } = await this.client.from('causal_experiments').insert([
          {
            experiment_title: `${experiment.domain} - ${experiment.method}`,
            method: experiment.method,
            ate: experiment.ate,
            ci_lower: experiment.ci_lower,
            ci_upper: experiment.ci_upper,
            std_error: experiment.std_error,
            p_value: experiment.p_value,
            effective_sample_size: experiment.effective_sample_size || null,
            parameters: experiment.parameters,
            e_value_point: experiment.e_value_point || null,
            e_value_ci: experiment.e_value_ci || null,
            bias_against_ground_truth: experiment.bias_against_ground_truth || null,
          },
        ]);
        if (!error) {
          this.config.isConnected = true;
          this.logAction('supabase_experiment_synced', { method: experiment.method });
        }
      } catch (err) {
        console.warn('Supabase remote sync error:', err);
      }
    }

    return record;
  }

  public getLocalExperiments(): CausalExperimentRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_EXPERIMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async fetchRemoteExperiments(): Promise<CausalExperimentRecord[]> {
    if (!this.client) {
      return this.getLocalExperiments();
    }
    try {
      const { data, error } = await this.client
        .from('causal_experiments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !data) {
        return this.getLocalExperiments();
      }

      return data.map((item: any) => ({
        id: item.id,
        cohort_name: item.experiment_title || 'Clinical Cohort',
        domain: item.experiment_title?.split(' - ')[0] || 'Healthcare',
        method: item.method,
        ate: Number(item.ate),
        ci_lower: Number(item.ci_lower),
        ci_upper: Number(item.ci_upper),
        std_error: Number(item.std_error),
        p_value: Number(item.p_value),
        effective_sample_size: item.effective_sample_size ? Number(item.effective_sample_size) : undefined,
        parameters: item.parameters || {},
        e_value_point: item.e_value_point ? Number(item.e_value_point) : undefined,
        e_value_ci: item.e_value_ci ? Number(item.e_value_ci) : undefined,
        bias_against_ground_truth: item.bias_against_ground_truth ? Number(item.bias_against_ground_truth) : undefined,
        created_at: item.created_at,
      }));
    } catch {
      return this.getLocalExperiments();
    }
  }

  public logAction(action: string, details: any) {
    try {
      const logs = this.getAuditLogs();
      logs.unshift({
        id: 'log_' + Date.now(),
        action,
        details,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_STORE_LOGS, JSON.stringify(logs.slice(0, 100)));

      if (this.client && this.config.isConnected) {
        this.client.from('causal_audit_logs').insert([{ action, details }]).then();
      }
    } catch {
      // ignore
    }
  }

  public getAuditLogs(): Array<{ id: string; action: string; details: any; timestamp: string }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
