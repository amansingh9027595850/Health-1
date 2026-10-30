/**
 * ==============================================================================
 * LOCAL SUPABASE-COMPATIBLE DATABASE SERVER (POSTGREST SPECIFICATION)
 * Port: 54321 | Storage: On-Disk JSON Database Engine
 * Compatible with: @supabase/supabase-js client
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'healthcare_supabase_db.json');
const PORT = 54321;
const HOST = '127.0.0.1';

// Initial Database Template with realistic healthcare seed data
const INITIAL_DB = {
  clinical_cohorts: [
    {
      id: crypto.randomUUID(),
      name: 'ICU Septic Shock — Early Norepinephrine Cohort',
      domain: 'Critical Care / ICU',
      sample_size: 850,
      treated_count: 362,
      control_count: 488,
      treatment_variable: 'Early Norepinephrine (<6h)',
      outcome_variable: '28-Day In-Hospital Mortality',
      outcome_type: 'binary',
      confounders: ['sofa_score', 'lactate_mmol_L', 'mean_arterial_pressure', 'age', 'mechanical_vent'],
      ground_truth_ate: -0.092,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Cardiology — High-Intensity Statin & 3-Year MACE',
      domain: 'Cardiovascular Care',
      sample_size: 900,
      treated_count: 410,
      control_count: 490,
      treatment_variable: 'High-Intensity Statin',
      outcome_variable: '3-Year Major Adverse Cardiac Event (MACE)',
      outcome_type: 'binary',
      confounders: ['baseline_ldl', 'prior_mi', 'systolic_bp', 'hba1c', 'age', 'smoking_status'],
      ground_truth_ate: -0.076,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  personal_health_assessments: [
    {
      id: crypto.randomUUID(),
      user_name: 'Robert Chen (CAD & T2D)',
      domain: 'Cardiovascular Care',
      treatment_name: 'High-Intensity Statin (Atorvastatin 80mg)',
      target_condition: '5-Year Major Adverse Cardiac Event (MACE)',
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
      propensity_score: 0.88,
      baseline_risk_y0: 0.384,
      treated_risk_y1: 0.238,
      causal_risk_reduction_arr: -0.146,
      relative_risk_reduction_rrr: 38.0,
      number_needed_to_treat_nnt: 7,
      clinical_recommendation:
        'High Clinical Benefit: Individual absolute risk reduction of 14.6% strongly favors initiating High-Intensity Statin. Treating 7 patients with this clinical phenotype prevents 1 major adverse event.',
      e_value_point: 2.38,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_name: 'Elena Rodriguez (Hypertensive Smoker)',
      domain: 'Cardiovascular Care',
      treatment_name: 'High-Intensity Statin (Atorvastatin 80mg)',
      target_condition: '5-Year Major Adverse Cardiac Event (MACE)',
      inputs: {
        age: 55,
        sex: 'female',
        systolicBp: 148,
        ldlCholesterol: 152,
        hba1c: 6.2,
        smokingStatus: 'active',
        priorCardioHistory: false,
        egfr: 84,
        bmi: 27.2,
      },
      propensity_score: 0.62,
      baseline_risk_y0: 0.225,
      treated_risk_y1: 0.158,
      causal_risk_reduction_arr: -0.067,
      relative_risk_reduction_rrr: 29.8,
      number_needed_to_treat_nnt: 15,
      clinical_recommendation:
        'High Clinical Benefit: Individual absolute risk reduction of 6.7% indicates meaningful preventive efficacy. Smoking cessation combined with statin therapy offers maximum risk reduction.',
      e_value_point: 1.86,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ],
  causal_experiments: [
    {
      id: crypto.randomUUID(),
      experiment_title: 'Critical Care / ICU - Doubly Robust AIPW',
      method: 'Doubly Robust AIPW Estimator',
      ate: -0.091,
      ci_lower: -0.114,
      ci_upper: -0.068,
      std_error: 0.0117,
      p_value: 0.0001,
      effective_sample_size: 780,
      parameters: { caliperFactor: 0.2, weightTruncation: 0.01, sampleSize: 850 },
      e_value_point: 1.74,
      e_value_ci: 1.58,
      bias_against_ground_truth: 0.001,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  balance_diagnostics: [],
  patient_counterfactuals: [],
  causal_audit_logs: [
    {
      id: crypto.randomUUID(),
      action: 'database_initialized',
      details: { engine: 'supabase_local_server', port: PORT },
      timestamp: new Date().toISOString(),
    },
  ],
};

// Database persistence helpers
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file, resetting to template:', err);
  }
  saveDatabase(INITIAL_DB);
  return INITIAL_DB;
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// Ensure database file exists
loadDatabase();

// Create HTTP server handling PostgREST REST API
const server = http.createServer((req, res) => {
  // CORS Headers for Supabase Client
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'apikey, authorization, content-type, prefer, x-client-info, range'
  );
  res.setHeader('Access-Control-Expose-Headers', 'content-range, content-location');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = parsedUrl.pathname;
  const db = loadDatabase();

  // Root Healthcheck
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'supabase-postgrest-emulator',
        version: '12.2.0',
        activeTables: Object.keys(db),
        recordsCount: {
          personal_health_assessments: db.personal_health_assessments?.length || 0,
          causal_experiments: db.causal_experiments?.length || 0,
          clinical_cohorts: db.clinical_cohorts?.length || 0,
        },
      })
    );
    return;
  }

  // Handle PostgREST REST endpoints: /rest/v1/:tableName
  const match = pathname.match(/^\/rest\/v1\/([a-zA-Z0-9_]+)/);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));
    return;
  }

  const tableName = match[1];
  if (!db[tableName]) {
    db[tableName] = [];
    saveDatabase(db);
  }

  const table = db[tableName];

  // 1. GET: Select records
  if (req.method === 'GET' || req.method === 'HEAD') {
    let result = [...table];

    // Filter by query parameters, e.g. ?id=eq.123 or ?user_name=eq.Alex
    for (const [key, value] of parsedUrl.searchParams.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue;
      if (value.startsWith('eq.')) {
        const targetVal = value.slice(3);
        result = result.filter(item => String(item[key]) === targetVal);
      }
    }

    // Handle order, e.g. ?order=created_at.desc
    const orderParam = parsedUrl.searchParams.get('order');
    if (orderParam) {
      const [col, dir] = orderParam.split('.');
      result.sort((a, b) => {
        const valA = a[col] || '';
        const valB = b[col] || '';
        if (dir === 'desc') {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      });
    }

    // Handle limit & offset
    const limitParam = parsedUrl.searchParams.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      result = result.slice(0, limit);
    }

    const totalCount = table.length;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Range', `0-${result.length}/${totalCount}`);

    if (req.method === 'HEAD') {
      res.writeHead(200);
      res.end();
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }

  // 2. POST: Insert records
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const itemsToInsert = Array.isArray(parsed) ? parsed : [parsed];
        const insertedRecords = [];

        for (const item of itemsToInsert) {
          const newRecord = {
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          table.unshift(newRecord);
          insertedRecords.push(newRecord);
        }

        saveDatabase(db);

        res.writeHead(201, {
          'Content-Type': 'application/json; charset=utf-8',
          Prefer: 'return=representation',
        });
        res.end(JSON.stringify(Array.isArray(parsed) ? insertedRecords : insertedRecords[0]));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload', message: err.message }));
      }
    });
    return;
  }

  // 3. DELETE: Remove records
  if (req.method === 'DELETE') {
    let deletedCount = 0;
    // Check ?id=eq.xyz
    for (const [key, value] of parsedUrl.searchParams.entries()) {
      if (value.startsWith('eq.')) {
        const targetVal = value.slice(3);
        const initialLen = db[tableName].length;
        db[tableName] = db[tableName].filter(item => String(item[key]) !== targetVal);
        deletedCount += initialLen - db[tableName].length;
      }
    }

    saveDatabase(db);
    res.writeHead(204);
    res.end();
    return;
  }

  // Default Fallthrough
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
});

server.listen(PORT, HOST, () => {
  console.log(`========================================================================`);
  console.log(`⚡ LOCAL SUPABASE DATABASE SERVER ACTIVE`);
  console.log(`URL:      http://${HOST}:${PORT}`);
  console.log(`Storage:  ${DB_FILE}`);
  console.log(`Status:   Listening for @supabase/supabase-js client connections...`);
  console.log(`========================================================================`);
});
