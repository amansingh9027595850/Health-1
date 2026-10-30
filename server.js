import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PORT = 3001;

// ─── Initial Seed Data ────────────────────────────────────────────────────────
const INITIAL_SEED = {
  assessments: [
    {
      id: crypto.randomUUID(),
      userName: 'Robert Chen',
      domain: 'Cardiovascular Care',
      treatmentName: 'High-Intensity Statin (Atorvastatin 80mg)',
      targetCondition: '5-Year Major Adverse Cardiac Event (MACE)',
      inputs: {
        age: 67,
        sex: 'male',
        systolicBp: 154,
        ldlCholesterol: 168,
        hba1c: 8.4,
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
      clinicalRecommendation: 'High Clinical Benefit: ARR 14.6% strongly favors statin therapy. NNT=7.',
      eValuePoint: 2.38,
      storageSource: 'backend',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      userName: 'Elena Rodriguez',
      domain: 'Cardiovascular Care',
      treatmentName: 'High-Intensity Statin (Atorvastatin 80mg)',
      targetCondition: '5-Year Major Adverse Cardiac Event (MACE)',
      inputs: {
        age: 55,
        sex: 'female',
        systolicBp: 148,
        ldlCholesterol: 152,
        hba1c: 6.2,
        smokingStatus: 'active',
        priorCardioHistory: false,
        egfr: 82,
        bmi: 27.2,
      },
      propensityScore: 0.62,
      baselineRiskY0: 0.225,
      treatedRiskY1: 0.158,
      causalRiskReductionARR: -0.067,
      relativeRiskReductionRRR: 29.8,
      numberNeededToTreatNNT: 15,
      clinicalRecommendation: 'Moderate Benefit: ARR 6.7%. Combined statin + smoking cessation recommended.',
      eValuePoint: 1.86,
      storageSource: 'backend',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

// ─── Database Helpers ────────────────────────────────────────────────────────
function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    saveDB(INITIAL_SEED);
    return structuredClone(INITIAL_SEED);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.assessments) parsed.assessments = [];
    return parsed;
  } catch (err) {
    console.error('Error reading db.json, resetting to seed:', err);
    saveDB(INITIAL_SEED);
    return structuredClone(INITIAL_SEED);
  }
}

function saveDB(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ─── Clinical Report Parser / Extractor ──────────────────────────────────────
function parseMedicalReportText(text) {
  const clean = text.replace(/\r\n/g, '\n');
  const extracted = {};
  const findings = [];

  // Systolic BP: e.g. "BP: 145/90", "Blood Pressure 154/92 mmHg", "Systolic: 150"
  const bpMatch = clean.match(/(?:BP|Blood\s*Pressure|Systolic|SBP)[\s:=]+(\d{2,3})(?:\s*\/\s*(\d{2,3}))?/i);
  if (bpMatch && bpMatch[1]) {
    const sbp = parseInt(bpMatch[1], 10);
    if (sbp >= 80 && sbp <= 240) {
      extracted.systolicBp = sbp;
      findings.push(`Blood Pressure: ${sbp}${bpMatch[2] ? '/' + bpMatch[2] : ''} mmHg`);
    }
  }

  // LDL Cholesterol: e.g. "LDL: 168 mg/dL", "LDL-C 142", "LDL Cholesterol: 175"
  const ldlMatch = clean.match(/(?:LDL(?:-C)?|Low[\s-]Density\s*Lipoprotein)[\s:=]+(\d{2,3}(?:\.\d+)?)/i);
  if (ldlMatch && ldlMatch[1]) {
    const ldl = Math.round(parseFloat(ldlMatch[1]));
    if (ldl >= 40 && ldl <= 400) {
      extracted.ldlCholesterol = ldl;
      findings.push(`LDL Cholesterol: ${ldl} mg/dL (${ldl >= 160 ? 'High' : ldl >= 130 ? 'Borderline High' : 'Optimal'})`);
    }
  }

  // HbA1c: e.g. "HbA1c: 8.4%", "Glycated Hemoglobin 7.2 %", "A1C 6.5"
  const a1cMatch = clean.match(/(?:HbA1c|A1C|Glycated\s*Hemoglobin)[\s:=]+(\d{1,2}(?:\.\d+)?)\s*%?/i);
  if (a1cMatch && a1cMatch[1]) {
    const a1c = parseFloat(a1cMatch[1]);
    if (a1c >= 4.0 && a1c <= 18.0) {
      extracted.hba1c = parseFloat(a1c.toFixed(1));
      findings.push(`HbA1c: ${extracted.hba1c}% (${extracted.hba1c >= 6.5 ? 'Diabetic range' : extracted.hba1c >= 5.7 ? 'Prediabetes' : 'Normal'})`);
    }
  }

  // eGFR: e.g. "eGFR: 58 mL/min", "GFR: 65", "Estimated GFR: 72"
  const egfrMatch = clean.match(/(?:eGFR|GFR|Glomerular\s*Filtration)[\s:=]+(\d{1,3}(?:\.\d+)?)/i);
  if (egfrMatch && egfrMatch[1]) {
    const egfr = Math.round(parseFloat(egfrMatch[1]));
    if (egfr >= 10 && egfr <= 160) {
      extracted.egfr = egfr;
      findings.push(`eGFR: ${egfr} mL/min/1.73m² (${egfr < 60 ? 'Mild-Moderate CKD' : 'Adequate'})`);
    }
  }

  // BMI: e.g. "BMI: 29.5", "Body Mass Index: 31.2"
  const bmiMatch = clean.match(/(?:BMI|Body\s*Mass\s*Index)[\s:=]+(\d{2}(?:\.\d+)?)/i);
  if (bmiMatch && bmiMatch[1]) {
    const bmi = parseFloat(parseFloat(bmiMatch[1]).toFixed(1));
    if (bmi >= 14 && bmi <= 65) {
      extracted.bmi = bmi;
      findings.push(`BMI: ${bmi} kg/m² (${bmi >= 30 ? 'Obese' : bmi >= 25 ? 'Overweight' : 'Normal weight'})`);
    }
  }

  // Age: e.g. "Age: 62", "64yo", "Age: 55 years"
  const ageMatch = clean.match(/(?:Age|Patient\s*Age)[\s:=]+(\d{1,3})|(\d{1,3})\s*(?:yo|y\/o|years\s*old)/i);
  if (ageMatch) {
    const ageVal = parseInt(ageMatch[1] || ageMatch[2], 10);
    if (ageVal >= 18 && ageVal <= 105) {
      extracted.age = ageVal;
      findings.push(`Age: ${ageVal} years`);
    }
  }

  // Sex / Gender: e.g. "Sex: Male", "Gender: F", "Female"
  const sexMatch = clean.match(/(?:Sex|Gender)[\s:=]+(Male|Female|M|F)\b/i);
  if (sexMatch) {
    const s = sexMatch[1].toUpperCase();
    extracted.sex = s.startsWith('F') ? 'female' : 'male';
    findings.push(`Biological Sex: ${extracted.sex === 'female' ? 'Female' : 'Male'}`);
  }

  // Smoking: e.g. "Smoking: Active smoker", "Smoker: No", "Non-smoker", "Former smoker"
  if (/active\s*smok|current\s*smok|smokes\s*daily/i.test(clean)) {
    extracted.smokingStatus = 'active';
    findings.push('Smoking Status: Active Smoker');
  } else if (/former\s*smok|ex-smok|quit\s*smoking/i.test(clean)) {
    extracted.smokingStatus = 'former';
    findings.push('Smoking Status: Former Smoker');
  } else if (/never\s*smok|non-smok|denies\s*tobacco/i.test(clean)) {
    extracted.smokingStatus = 'never';
    findings.push('Smoking Status: Never Smoked');
  }

  // Prior Cardiovascular History
  if (/prior\s*(?:MI|myocardial|stroke|TIA|CAD|coronary|stent|CABG|heart\s*attack)/i.test(clean)) {
    extracted.priorCardioHistory = true;
    findings.push('Prior Cardiovascular Event: Yes (Documented History)');
  } else if (/no\s*(?:prior\s*)?(?:cardiac|MI|CAD|heart\s*disease)/i.test(clean)) {
    extracted.priorCardioHistory = false;
    findings.push('Prior Cardiovascular Event: None Documented');
  }

  // ICU biomarkers (if present)
  const sofaMatch = clean.match(/(?:SOFA|Sequential\s*Organ\s*Failure)[\s:=]+(\d{1,2})/i);
  if (sofaMatch) {
    extracted.sofaScore = parseInt(sofaMatch[1], 10);
    findings.push(`SOFA Score: ${extracted.sofaScore}`);
  }

  const lactateMatch = clean.match(/(?:Lactate|Serum\s*Lactate)[\s:=]+(\d{1,2}(?:\.\d+)?)/i);
  if (lactateMatch) {
    extracted.lactate = parseFloat(parseFloat(lactateMatch[1]).toFixed(1));
    findings.push(`Lactate: ${extracted.lactate} mmol/L`);
  }

  // Patient Name if detected
  const nameMatch = clean.match(/(?:Patient\s*Name|Name|Subject)[\s:=]+([A-Za-z\s]{3,30})/i);
  if (nameMatch && nameMatch[1]) {
    const rawName = nameMatch[1].trim().split('\n')[0];
    if (rawName.length > 2 && !/^(male|female|none|normal|date)$/i.test(rawName)) {
      extracted.userName = rawName;
    }
  }

  return {
    extracted,
    findings,
    confidence: Object.keys(extracted).length >= 3 ? 'High' : Object.keys(extracted).length >= 1 ? 'Moderate' : 'Low',
    matchedFieldsCount: Object.keys(extracted).length,
  };
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = reqUrl;

  const json = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const readBody = (callback) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(parsed);
      } catch (err) {
        json(400, { error: 'Invalid JSON payload' });
      }
    });
  };

  // 1. Health Status
  if (pathname === '/api/health' && req.method === 'GET') {
    const db = loadDB();
    return json(200, {
      status: 'ok',
      service: 'CausalHealth AI Backend REST Engine',
      version: '2.0.0',
      port: PORT,
      storage: 'data/db.json',
      assessmentsCount: db.assessments.length,
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  // 2. GET Assessments
  if (pathname === '/api/assessments' && req.method === 'GET') {
    const db = loadDB();
    const search = (reqUrl.searchParams.get('search') || '').trim().toLowerCase();
    let list = db.assessments || [];
    if (search) {
      list = list.filter(a =>
        (a.userName && a.userName.toLowerCase().includes(search)) ||
        (a.domain && a.domain.toLowerCase().includes(search)) ||
        (a.treatmentName && a.treatmentName.toLowerCase().includes(search))
      );
    }
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return json(200, list);
  }

  // 3. POST Assessment
  if (pathname === '/api/assessments' && req.method === 'POST') {
    return readBody(body => {
      if (!body.treatmentName || !body.inputs) {
        return json(400, { error: 'Missing required assessment fields (treatmentName, inputs).' });
      }
      const db = loadDB();
      const newRecord = {
        id: body.id || crypto.randomUUID(),
        createdAt: body.createdAt || new Date().toISOString(),
        userName: body.userName || 'Anonymous Patient',
        domain: body.domain || 'Cardiovascular Care',
        treatmentName: body.treatmentName,
        targetCondition: body.targetCondition || '5-Year MACE',
        inputs: body.inputs,
        propensityScore: body.propensityScore ?? 0.5,
        baselineRiskY0: body.baselineRiskY0 ?? 0.2,
        treatedRiskY1: body.treatedRiskY1 ?? 0.15,
        causalRiskReductionARR: body.causalRiskReductionARR ?? -0.05,
        relativeRiskReductionRRR: body.relativeRiskReductionRRR ?? 25.0,
        numberNeededToTreatNNT: body.numberNeededToTreatNNT ?? 20,
        clinicalRecommendation: body.clinicalRecommendation || 'Evaluated via Doubly Robust Causal Engine',
        eValuePoint: body.eValuePoint ?? 2.0,
        storageSource: 'backend',
      };

      // Add to beginning of array
      db.assessments.unshift(newRecord);
      saveDB(db);
      return json(201, newRecord);
    });
  }

  // 4. DELETE Assessment
  const deleteMatch = pathname.match(/^\/api\/assessments\/([^/]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const targetId = deleteMatch[1];
    const db = loadDB();
    const originalLength = db.assessments.length;
    db.assessments = db.assessments.filter(a => a.id !== targetId);
    if (db.assessments.length < originalLength) {
      saveDB(db);
      return json(200, { success: true, message: `Deleted assessment ${targetId}` });
    }
    return json(404, { success: false, error: 'Assessment not found' });
  }

  // 5. GET Stats
  if (pathname === '/api/stats' && req.method === 'GET') {
    const db = loadDB();
    const assessments = db.assessments || [];
    const count = assessments.length;
    const highBenefit = assessments.filter(a => Math.abs(a.causalRiskReductionARR) >= 0.07).length;
    const avgARR = count
      ? assessments.reduce((acc, a) => acc + Math.abs(a.causalRiskReductionARR), 0) / count
      : 0;
    const avgNNT = count
      ? assessments.reduce((acc, a) => acc + (a.numberNeededToTreatNNT || 10), 0) / count
      : 0;

    return json(200, {
      totalAssessments: count,
      highBenefitCount: highBenefit,
      averageARR: parseFloat(avgARR.toFixed(4)),
      averageNNT: Math.round(avgNNT),
      latestAssessmentDate: assessments[0]?.createdAt || null,
    });
  }

  // 6. POST Medical Report / Lab Slip OCR & Extraction
  if (pathname === '/api/extract-report' && req.method === 'POST') {
    return readBody(body => {
      let rawText = body.text || '';

      // If fileName and fileData (base64 or text) were passed
      if (!rawText && body.fileData) {
        try {
          if (body.fileType?.includes('text') || body.fileName?.endsWith('.txt') || body.fileName?.endsWith('.csv')) {
            const base64Content = body.fileData.split(',')[1] || body.fileData;
            rawText = Buffer.from(base64Content, 'base64').toString('utf-8');
          } else {
            // For images or PDFs, simulate OCR extraction using embedded sample data or heuristic text
            rawText = body.simulatedOcrText || `
PATIENT LABORATORY MEDICAL RECORD
Patient Name: ${body.fileName?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Alex Morgan'}
Age: 61 years old | Sex: Male
Blood Pressure: 152/88 mmHg
Total Cholesterol: 248 mg/dL
LDL Cholesterol: 165 mg/dL
HDL Cholesterol: 42 mg/dL
HbA1c: 7.9 %
Fasting Glucose: 142 mg/dL
Estimated GFR (eGFR): 62 mL/min/1.73m2
BMI: 28.7 kg/m2
Smoking Status: Former smoker (15 pack-years, quit 2 years ago)
Medical History: Hypertension, Dyslipidemia, Family history of CAD.
`;
          }
        } catch (e) {
          rawText = '';
        }
      }

      const result = parseMedicalReportText(rawText);
      return json(200, {
        success: true,
        fileName: body.fileName || 'Report',
        ...result,
        previewText: rawText.slice(0, 500),
      });
    });
  }

  // 7. POST Chat Assistant Endpoint
  if (pathname === '/api/chat' && req.method === 'POST') {
    return readBody(body => {
      const messages = body.messages || [];
      const userMessage = messages[messages.length - 1]?.content || '';
      const context = body.context || {};

      if (process.env.OPENROUTER_API_KEY) {
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        })
          .then(async response => {
            if (!response.ok) {
              console.error(`OpenRouter request failed with status ${response.status}`);
              return json(502, { error: 'Chat provider request failed' });
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;
            if (typeof content !== 'string' || !content) {
              return json(502, { error: 'Chat provider returned an invalid response' });
            }

            return json(200, {
              role: 'assistant',
              content,
              timestamp: new Date().toISOString(),
            });
          })
          .catch(error => {
            console.error('OpenRouter request failed:', error);
            if (!res.headersSent) {
              json(502, { error: 'Chat provider request failed' });
            }
          });
        return;
      }

      // If user is asking clinical or causal inference questions
      const lower = userMessage.toLowerCase();
      let reply = '';

      if (lower.includes('arr') || lower.includes('absolute risk reduction')) {
        reply = `**Absolute Risk Reduction (ARR)** measures the exact difference in probability of an adverse event happening between taking a treatment versus not taking it.\n\n` +
          `• For example, if untreated 5-year risk is **${(context.baselineRiskY0 ? context.baselineRiskY0 * 100 : 38.4).toFixed(1)}%** and treated risk is **${(context.treatedRiskY1 ? context.treatedRiskY1 * 100 : 23.8).toFixed(1)}%**, your ARR is **${(context.causalRiskReductionARR ? Math.abs(context.causalRiskReductionARR) * 100 : 14.6).toFixed(1)}%**.\n` +
          `• This represents pure causal benefit after adjusting for confounding variables!`;
      } else if (lower.includes('nnt') || lower.includes('number needed to treat')) {
        const nnt = context.numberNeededToTreatNNT || 7;
        reply = `**Number Needed to Treat (NNT)** tells you how many people with your risk profile need to take this treatment to prevent **one** adverse clinical event (like a heart attack or stroke).\n\n` +
          `• In your current profile, NNT is **${nnt}**.\n` +
          `• In clinical cardiology, an NNT below 25 is considered **very strong evidence** of high therapeutic impact.`;
      } else if (lower.includes('ldl') || lower.includes('cholesterol')) {
        const ldl = context.inputs?.ldlCholesterol || 168;
        reply = `Your current recorded LDL Cholesterol is **${ldl} mg/dL**.\n\n` +
          `• Clinical guidelines (AHA/ACC) classify LDL above 160 mg/dL as **High**, and above 190 mg/dL as **Very High**.\n` +
          `• High-intensity statins (such as Atorvastatin 80mg) typically lower LDL by 50% or more, shifting cardiovascular hazard downwards.`;
      } else if (lower.includes('bp') || lower.includes('blood pressure') || lower.includes('hypertension')) {
        const bp = context.inputs?.systolicBp || 154;
        reply = `Your systolic blood pressure is entered as **${bp} mmHg**.\n\n` +
          `• A systolic pressure > 140 mmHg falls in the **Stage 2 Hypertension** range.\n` +
          `• Controlling systolic BP to < 130 mmHg significantly compounds the risk reduction achieved by statins or lipid-lowering therapies.`;
      } else {
        reply = `Thank you for your question regarding your health assessment. Based on the causal analysis:\n\n` +
          `• **Target Condition**: ${context.targetCondition || '5-Year MACE'}\n` +
          `• **Estimated Causal Benefit**: Absolute Risk Reduction of ${context.causalRiskReductionARR ? (Math.abs(context.causalRiskReductionARR) * 100).toFixed(1) : '14.6'}% (NNT = ${context.numberNeededToTreatNNT || 7})\n` +
          `• **Clinical Recommendation**: ${context.clinicalRecommendation || 'High clinical benefit observed with high-intensity therapy.'}\n\n` +
          `Feel free to ask about specific biomarkers (LDL, Blood Pressure, HbA1c), medication mechanisms, or how causal AI removes selection bias!`;
      }

      return json(200, {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // 404 Handler
  json(404, { error: 'Route not found', path: pathname });
});

server.listen(PORT, () => {
  console.log(`[CausalHealth AI] REST Server active on http://localhost:${PORT}`);
});
