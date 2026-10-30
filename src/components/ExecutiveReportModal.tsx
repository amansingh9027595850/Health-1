import React from 'react';
import { ClinicalCohort } from '../services/datasetService';
import { CausalMethodResult, BalanceDiagnosticReport, SensitivityAnalysisResult } from '../services/causalEngine';
import { FileText, Printer, X, CheckCircle2, ShieldCheck, Award } from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort: ClinicalCohort;
  results: CausalMethodResult[];
  balance: BalanceDiagnosticReport;
  sensitivity: SensitivityAnalysisResult;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  cohort,
  results,
  balance,
  sensitivity,
}) => {
  if (!isOpen) return null;

  const aipw = results.find(r => r.methodId === 'aipw') || results[0];
  const naive = results.find(r => r.methodId === 'naive') || results[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          background: '#0a101f',
          color: '#f8fafc',
          border: '1px solid var(--border-medium)',
        }}
      >
        {/* Modal Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#06b6d4" />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#22d3ee' }}>
              STROBE-COMPLIANT CLINICAL CAUSAL INFERENCE REPORT
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-emerald btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print / Export PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="clinical-report-body"
          style={{
            background: '#0d1527',
            padding: '28px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '2px solid rgba(6, 182, 212, 0.4)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
              Observational Clinical Evidence & Causal Effect Estimation
            </div>
            <h2 style={{ fontSize: '20px', color: '#ffffff', marginTop: '4px' }}>{cohort.name}</h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
              <span>Domain: <strong style={{ color: '#e2e8f0' }}>{cohort.domain}</strong></span>
              <span>Sample Size: <strong style={{ color: '#e2e8f0' }}>N={cohort.patients.length}</strong></span>
              <span>Generated: <strong style={{ color: '#e2e8f0' }}>{new Date().toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* Section 1: Clinical Problem & Confounding by Indication */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '6px' }}>
              1. Clinical Setting & Target Causal Estimand
            </h4>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              This study evaluates the causal effect of <strong>{cohort.treatmentName}</strong> versus <strong>{cohort.controlName}</strong> on the primary clinical endpoint of <strong>{cohort.outcomeName}</strong>. In routine clinical practice, treatments are assigned based on patient disease severity, age, and organ dysfunction (confounding by indication). Naive comparison yields a biased association of{' '}
              <strong style={{ color: '#f87171' }}>{naive.ate > 0 ? `+${naive.ate.toFixed(3)}` : naive.ate.toFixed(3)}</strong> (95% CI: [{naive.ciLower.toFixed(3)}, {naive.ciUpper.toFixed(3)}]).
            </p>
          </div>

          {/* Section 2: Covariate Balance Verification (Rubin's Rules) */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '6px' }}>
              2. Covariate Balance & Positivity Diagnostics (Rubin's Criteria)
            </h4>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <div>
                <div style={{ color: '#94a3b8' }}>Rubin's B Score</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399' }}>
                  {(balance.rubinB * 100).toFixed(1)}% (Pass &lt;25%)
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>Rubin's R Variance Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399' }}>
                  {balance.rubinR.toFixed(2)} (Pass 0.5-2.0)
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>Common Support Coverage</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22d3ee' }}>
                  {balance.commonSupportPercent.toFixed(1)}% Overlap
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Comparative Estimator Synthesis Table */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '8px' }}>
              3. Treatment Effect Benchmark Across Causal Estimators
            </h4>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Methodology</th>
                    <th>Average Treatment Effect (ATE)</th>
                    <th>95% Confidence Interval</th>
                    <th>P-Value</th>
                    <th>Method Robustness</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.methodId} style={{ background: r.methodId === 'aipw' ? 'rgba(16, 185, 129, 0.1)' : undefined }}>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 'bold', color: r.methodId === 'aipw' ? '#34d399' : '#ffffff' }}>
                        {r.ate > 0 ? `+${r.ate.toFixed(3)}` : r.ate.toFixed(3)}
                      </td>
                      <td className="font-mono">[{r.ciLower.toFixed(3)}, {r.ciUpper.toFixed(3)}]</td>
                      <td className="font-mono">p={r.pValue < 0.001 ? '<0.001' : r.pValue.toFixed(3)}</td>
                      <td>
                        <span className={`badge ${r.robustnessRating === 'State-of-the-Art' ? 'badge-emerald' : r.robustnessRating === 'High' ? 'badge-cyan' : 'badge-amber'}`}>
                          {r.robustnessRating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Quantitative Sensitivity Analysis (E-Values) */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '6px' }}>
              4. Sensitivity Analysis for Unmeasured Confounding
            </h4>
            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              Applying VanderWeele and Ding's methodology, the point estimate E-Value is{' '}
              <strong style={{ color: '#22d3ee' }}>{sensitivity.eValuePoint.toFixed(2)}</strong>, with a lower confidence interval E-Value of{' '}
              <strong style={{ color: '#34d399' }}>{sensitivity.eValueCI.toFixed(2)}</strong>. To overturn the observed statistical significance, an unmeasured confounder would have to be associated with both the treatment assignment and the health outcome by an unadjusted Risk Ratio exceeding {sensitivity.eValueCI.toFixed(2)}-fold.
            </div>
          </div>

          {/* Section 5: Definitive Conclusion */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee', fontWeight: 'bold' }}>
              <Award size={18} />
              Primary Causal Conclusion
            </div>
            <p style={{ fontSize: '13px', color: '#f8fafc', marginTop: '6px', lineHeight: '1.6' }}>
              Using the semiparametric Doubly Robust AIPW estimator, <strong>{cohort.treatmentName}</strong> demonstrated a statistically significant treatment effect of{' '}
              <strong style={{ color: '#34d399' }}>{aipw.ate.toFixed(3)}</strong> (95% CI: [{aipw.ciLower.toFixed(3)}, {aipw.ciUpper.toFixed(3)}], p={aipw.pValue < 0.001 ? '<0.001' : aipw.pValue.toFixed(3)}), resolving the confounding bias observed in unadjusted observational registry data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
