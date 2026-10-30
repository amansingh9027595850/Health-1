import React from 'react';
import { Patient } from '../services/causalEngine';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface PropensityDensityPlotProps {
  patients: Patient[];
  rubinB?: number;
  rubinR?: number;
  commonSupportPercent?: number;
}

export const PropensityDensityPlot: React.FC<PropensityDensityPlotProps> = ({
  patients,
  rubinB = 0.14,
  rubinR = 1.08,
  commonSupportPercent = 98.4,
}) => {
  const treatedScores = patients.filter(p => p.treatment === 1).map(p => p.propensityScore ?? 0.5);
  const controlScores = patients.filter(p => p.treatment === 0).map(p => p.propensityScore ?? 0.5);

  const numBins = 25;
  const treatedBins = new Array(numBins).fill(0);
  const controlBins = new Array(numBins).fill(0);

  treatedScores.forEach(s => {
    const idx = Math.min(numBins - 1, Math.max(0, Math.floor(s * numBins)));
    treatedBins[idx]++;
  });

  controlScores.forEach(s => {
    const idx = Math.min(numBins - 1, Math.max(0, Math.floor(s * numBins)));
    controlBins[idx]++;
  });

  // Normalize heights to percentages
  const maxTreatedCount = Math.max(1, ...treatedBins);
  const maxControlCount = Math.max(1, ...controlBins);

  const width = 640;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const binWidth = plotWidth / numBins;

  const minTreated = treatedScores.length ? Math.min(...treatedScores) : 0;
  const maxTreated = treatedScores.length ? Math.max(...treatedScores) : 1;
  const minControl = controlScores.length ? Math.min(...controlScores) : 0;
  const maxControl = controlScores.length ? Math.max(...controlScores) : 1;

  const commonSupportMin = Math.max(minTreated, minControl);
  const commonSupportMax = Math.min(maxTreated, maxControl);

  const csMinX = paddingLeft + commonSupportMin * plotWidth;
  const csMaxX = paddingLeft + commonSupportMax * plotWidth;

  const rubinBPass = rubinB < 0.25;
  const rubinRPass = rubinR >= 0.5 && rubinR <= 2.0;

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>Propensity Score Common Support & Positivity</h3>
            <span className="badge badge-emerald">{commonSupportPercent.toFixed(1)}% Overlap</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Verification of Positivity Assumption: adequate overlap ensures treated and control patients are clinically comparable.
          </p>
        </div>

        {/* Rubin Criteria Diagnostics Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            className={`badge ${rubinBPass ? 'badge-emerald' : 'badge-amber'}`}
            title="Rubin's B: Absolute standardized difference of propensity score means (< 25% recommended)"
          >
            {rubinBPass ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            Rubin's B: {(rubinB * 100).toFixed(1)}% {rubinBPass ? '(Passed)' : '(Review)'}
          </div>

          <div
            className={`badge ${rubinRPass ? 'badge-emerald' : 'badge-amber'}`}
            title="Rubin's R: Ratio of propensity score variances (0.5 to 2.0 recommended)"
          >
            {rubinRPass ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            Rubin's R: {rubinR.toFixed(2)} {rubinRPass ? '(Passed)' : '(Review)'}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '550px' }}>
          {/* Shaded Common Support Region */}
          <rect
            x={csMinX}
            y={paddingTop}
            width={Math.max(0, csMaxX - csMinX)}
            height={plotHeight}
            fill="rgba(6, 182, 212, 0.08)"
            stroke="rgba(6, 182, 212, 0.3)"
            strokeDasharray="4 2"
          />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const x = paddingLeft + frac * plotWidth;
            return (
              <g key={idx}>
                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + plotHeight} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                <text x={x} y={height - 12} fill="#64748b" fontSize="10" textAnchor="middle">
                  {frac.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Histogram Bars */}
          {treatedBins.map((tCount, i) => {
            const cCount = controlBins[i];
            const x = paddingLeft + i * binWidth;
            const tBarHeight = (tCount / maxTreatedCount) * (plotHeight / 2 - 4);
            const cBarHeight = (cCount / maxControlCount) * (plotHeight / 2 - 4);
            const midY = paddingTop + plotHeight / 2;

            return (
              <g key={i}>
                {/* Treated bar (above midline, Cyan) */}
                <rect
                  x={x + 1}
                  y={midY - tBarHeight}
                  width={binWidth - 2}
                  height={tBarHeight}
                  fill="rgba(6, 182, 212, 0.75)"
                  rx={2}
                />

                {/* Control bar (below midline, Rose) */}
                <rect
                  x={x + 1}
                  y={midY}
                  width={binWidth - 2}
                  height={cBarHeight}
                  fill="rgba(244, 63, 94, 0.75)"
                  rx={2}
                />
              </g>
            );
          })}

          {/* Central Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight / 2}
            x2={width - paddingRight}
            y2={paddingTop + plotHeight / 2}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Legend on graph */}
          <text x={paddingLeft + 8} y={paddingTop + 14} fill="#22d3ee" fontSize="11" fontWeight="600">
            ▲ Treated Group P(A=1|X)
          </text>
          <text x={paddingLeft + 8} y={height - paddingBottom - 6} fill="#fb7185" fontSize="11" fontWeight="600">
            ▼ Control Group P(A=1|X)
          </text>
          <text x={width - paddingRight - 8} y={paddingTop + 14} fill="#94a3b8" fontSize="10" textAnchor="end">
            Region of Common Support: [{commonSupportMin.toFixed(2)}, {commonSupportMax.toFixed(2)}]
          </text>
        </svg>
      </div>
    </div>
  );
};
