import React from 'react';
import { SensitivityAnalysisResult } from '../services/causalEngine';
import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

interface SensitivityViewerProps {
  sensitivity: SensitivityAnalysisResult;
  ate: number;
}

export const SensitivityViewer: React.FC<SensitivityViewerProps> = ({
  sensitivity,
  ate,
}) => {
  const { eValuePoint, eValueCI, riskRatio, interpretation, rosenbaumBounds } = sensitivity;

  // Visual SVG Curve for E-Value
  // Shows confounder association with treatment (RR_EU) vs confounder association with outcome (RR_UD)
  // Hyperbola boundary: RR_EU * RR_UD / (RR_EU + RR_UD - 1) >= RR_observed
  const width = 580;
  const height = 220;
  const paddingLeft = 45;
  const paddingBottom = 35;
  const plotW = width - paddingLeft - 20;
  const plotH = height - 20 - paddingBottom;

  const maxScale = Math.max(3.5, Math.ceil(eValuePoint * 1.3));

  const getCoord = (rr: number) => {
    return {
      x: paddingLeft + (rr / maxScale) * plotW,
      y: 20 + plotH - (rr / maxScale) * plotH,
    };
  };

  const pointCoord = getCoord(eValuePoint);
  const ciCoord = getCoord(eValueCI);

  // Generate hyperbola path points
  const curvePoints: string[] = [];
  const targetRR = Math.max(1.05, riskRatio >= 1 ? riskRatio : 1 / riskRatio);
  for (let u = targetRR + 0.05; u <= maxScale; u += 0.15) {
    // Equation: d = (targetRR * (u - 1)) / (u - targetRR)
    const d = (targetRR * (u - 1)) / (u - targetRR);
    if (d > 0 && d <= maxScale) {
      const pt = {
        x: paddingLeft + (u / maxScale) * plotW,
        y: 20 + plotH - (d / maxScale) * plotH,
      };
      curvePoints.push(`${pt.x},${pt.y}`);
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#10b981" />
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>Quantitative Sensitivity Analysis for Unmeasured Confounding</h3>
            <span className="badge badge-emerald">VanderWeele & Ding E-Value</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Evaluates the minimum strength of an unmeasured confounder needed to nullify the estimated treatment effect.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
        {/* Metric Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'rgba(13, 21, 39, 0.8)',
              border: '1px solid var(--border-medium)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Point Estimate E-Value
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                {eValuePoint.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Risk Ratio scale to shift ATE to 0</div>
            </div>
            <div className="badge badge-cyan" style={{ fontSize: '12px' }}>
              Substantial Robustness
            </div>
          </div>

          <div
            style={{
              background: 'rgba(13, 21, 39, 0.8)',
              border: '1px solid var(--border-medium)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                95% Confidence Interval Limit E-Value
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {eValueCI.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Minimum association to move CI to null</div>
            </div>
            <div className="badge badge-emerald" style={{ fontSize: '12px' }}>
              CI Resistant
            </div>
          </div>

          {/* Clinical Interpretation text */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '12px',
              color: '#cbd5e1',
              lineHeight: '1.6',
            }}
          >
            <strong style={{ color: '#22d3ee' }}>Clinical Interpretation:</strong> {interpretation}
          </div>
        </div>

        {/* E-Value Hyperbola Curve SVG */}
        <div style={{ background: 'rgba(10, 17, 32, 0.75)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Confounder Association Space (RR_EU × RR_UD)</span>
            <span style={{ color: '#22d3ee' }}>Nullification Boundary</span>
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            {/* Axes */}
            <line x1={paddingLeft} y1={20 + plotH} x2={width - 20} y2={20 + plotH} stroke="#334155" strokeWidth="1.5" />
            <line x1={paddingLeft} y1={20} x2={paddingLeft} y2={20 + plotH} stroke="#334155" strokeWidth="1.5" />

            {/* Labels */}
            <text x={width - 20} y={height - 10} fill="#64748b" fontSize="10" textAnchor="end">
              RR(Confounder, Treatment) →
            </text>
            <text x={paddingLeft} y={14} fill="#64748b" fontSize="10">
              ↑ RR(Confounder, Outcome)
            </text>

            {/* Grid ticks */}
            {[1, 2, 3, 4].filter(v => v <= maxScale).map(val => {
              const x = paddingLeft + (val / maxScale) * plotW;
              const y = 20 + plotH - (val / maxScale) * plotH;
              return (
                <g key={val}>
                  <line x1={x} y1={20 + plotH} x2={x} y2={20 + plotH + 4} stroke="#475569" />
                  <text x={x} y={20 + plotH + 16} fill="#64748b" fontSize="9" textAnchor="middle">
                    {val}x
                  </text>
                  <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#475569" />
                  <text x={paddingLeft - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">
                    {val}x
                  </text>
                </g>
              );
            })}

            {/* Shaded Area: Region where unmeasured confounder WOULD explain away effect */}
            <rect
              x={pointCoord.x}
              y={20}
              width={width - 20 - pointCoord.x}
              height={pointCoord.y - 20}
              fill="rgba(244, 63, 94, 0.08)"
            />

            {/* E-Value Symmetric Point Marker */}
            <circle cx={pointCoord.x} cy={pointCoord.y} r={6} fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
            <text x={pointCoord.x + 8} y={pointCoord.y - 8} fill="#22d3ee" fontSize="11" fontWeight="bold">
              E-Value = {eValuePoint.toFixed(2)}
            </text>

            {/* E-Value CI Marker */}
            <circle cx={ciCoord.x} cy={ciCoord.y} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <text x={ciCoord.x + 8} y={ciCoord.y + 14} fill="#34d399" fontSize="10">
              CI E-Value = {eValueCI.toFixed(2)}
            </text>
          </svg>
        </div>
      </div>

      {/* Rosenbaum's Gamma Sensitivity Table */}
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '14px', color: '#f1f5f9', marginBottom: '8px' }}>
          Rosenbaum's Sensitivity Bounds (Γ) — Resistance to Hidden Selection Odds Bias
        </h4>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hidden Bias Parameter (Γ)</th>
                <th>Odds Ratio of Differential Assignment</th>
                <th>Upper Bound P-Value</th>
                <th>Causal Significance Retained</th>
              </tr>
            </thead>
            <tbody>
              {rosenbaumBounds.map(rb => (
                <tr key={rb.gamma}>
                  <td className="font-mono">Γ = {rb.gamma.toFixed(1)}</td>
                  <td>Patients with identical covariates have up to {rb.gamma.toFixed(1)}× differing odds of treatment</td>
                  <td className="font-mono" style={{ color: rb.significant ? '#34d399' : '#f87171' }}>
                    p &lt; {rb.pValueUpper < 0.001 ? '0.001' : rb.pValueUpper.toFixed(4)}
                  </td>
                  <td>
                    {rb.significant ? (
                      <span className="badge badge-emerald">Statistically Robust (p &lt; 0.05)</span>
                    ) : (
                      <span className="badge badge-rose">Sensitive to Bias</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
