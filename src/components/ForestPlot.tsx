import React from 'react';
import { CausalMethodResult } from '../services/causalEngine';
import { Award, Zap } from 'lucide-react';

interface ForestPlotProps {
  results: CausalMethodResult[];
  groundTruthATE?: number;
  outcomeUnit?: string;
}

export const ForestPlot: React.FC<ForestPlotProps> = ({
  results,
  groundTruthATE,
  outcomeUnit = '',
}) => {
  const width = 760;
  const rowHeight = 44;
  const height = Math.max(280, results.length * rowHeight + 80);
  const leftPadding = 240;
  const rightPadding = 190;
  const plotWidth = width - leftPadding - rightPadding;

  // Determine scale bounds
  const allValues: number[] = [];
  results.forEach(r => {
    allValues.push(r.ciLower, r.ciUpper, r.ate);
  });
  if (groundTruthATE !== undefined) allValues.push(groundTruthATE);
  allValues.push(0); // always include zero

  const minVal = Math.min(...allValues) - 0.03;
  const maxVal = Math.max(...allValues) + 0.03;
  const range = maxVal - minVal || 0.1;

  const getX = (val: number) => {
    const ratio = (val - minVal) / range;
    return leftPadding + ratio * plotWidth;
  };

  const zeroX = getX(0);
  const groundTruthX = groundTruthATE !== undefined ? getX(groundTruthATE) : null;

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>Causal Forest Plot — Treatment Effect Benchmark</h3>
            <span className="badge badge-cyan">95% Confidence Intervals</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Direct comparison of treatment effect point estimates (ATE) and statistical uncertainty across causal estimators.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '2px', background: '#64748b', display: 'inline-block' }}></span>
            <span style={{ color: '#94a3b8' }}>Null Effect (0)</span>
          </div>
          {groundTruthATE !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '2px', background: '#fbbf24', display: 'inline-block' }}></span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Ground Truth ({groundTruthATE.toFixed(3)})</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '650px' }}>
          {/* Grid lines */}
          <line x1={zeroX} y1={25} x2={zeroX} y2={height - 35} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />

          {groundTruthX !== null && (
            <line
              x1={groundTruthX}
              y1={25}
              x2={groundTruthX}
              y2={height - 35}
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
          )}

          {/* Top Axis Header */}
          <text x={leftPadding - 12} y={18} fill="#64748b" fontSize="11" textAnchor="end" fontWeight="600">
            ESTIMATOR
          </text>
          <text x={zeroX} y={18} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
            0.0 (Null)
          </text>
          {groundTruthX !== null && (
            <text x={groundTruthX} y={18} fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">
              ★ Truth
            </text>
          )}
          <text x={width - rightPadding + 14} y={18} fill="#64748b" fontSize="11" fontWeight="600">
            ATE [95% CI] (P-Val)
          </text>

          {/* Estimator Rows */}
          {results.map((res, idx) => {
            const y = 45 + idx * rowHeight;
            const ptX = getX(res.ate);
            const lowerX = getX(res.ciLower);
            const upperX = getX(res.ciUpper);
            const isAIPW = res.methodId === 'aipw';
            const isNaive = res.methodId === 'naive';

            // Point and CI Colors
            let color = '#06b6d4'; // Cyan default
            if (isAIPW) color = '#10b981'; // Emerald for State-of-the-Art Doubly Robust
            if (isNaive) color = '#ef4444'; // Red for naive biased

            return (
              <g key={res.methodId} className="estimator-row">
                {/* Highlight background for Doubly Robust */}
                {isAIPW && (
                  <rect
                    x={8}
                    y={y - rowHeight / 2 + 3}
                    width={width - 16}
                    height={rowHeight - 6}
                    rx={6}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="rgba(16, 185, 129, 0.25)"
                  />
                )}

                {/* Estimator Label on Left */}
                <text
                  x={leftPadding - 12}
                  y={y + 4}
                  fill={isAIPW ? '#34d399' : isNaive ? '#f87171' : '#f1f5f9'}
                  fontSize="12"
                  textAnchor="end"
                  fontWeight={isAIPW ? '700' : '500'}
                >
                  {res.name}
                </text>

                {/* Confidence Interval Whisker Bar */}
                <line x1={lowerX} y1={y} x2={upperX} y2={y} stroke={color} strokeWidth={isAIPW ? 3 : 2} />
                {/* Whiskers tick ends */}
                <line x1={lowerX} y1={y - 5} x2={lowerX} y2={y + 5} stroke={color} strokeWidth="1.5" />
                <line x1={upperX} y1={y - 5} x2={upperX} y2={y + 5} stroke={color} strokeWidth="1.5" />

                {/* Point Estimate marker */}
                {isAIPW ? (
                  <polygon
                    points={`${ptX},${y - 6} ${ptX + 6},${y} ${ptX},${y + 6} ${ptX - 6},${y}`}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                ) : (
                  <circle cx={ptX} cy={y} r={isNaive ? 5 : 4.5} fill={color} stroke="#0f172a" strokeWidth="1" />
                )}

                {/* Text Summary on Right */}
                <text x={width - rightPadding + 14} y={y + 4} fill="#e2e8f0" fontSize="11" fontFamily="var(--font-mono)">
                  <tspan fontWeight="bold" fill={color}>
                    {res.ate > 0 ? `+${res.ate.toFixed(3)}` : res.ate.toFixed(3)}
                  </tspan>{' '}
                  <tspan fill="#94a3b8">
                    [{res.ciLower.toFixed(3)}, {res.ciUpper.toFixed(3)}]
                  </tspan>{' '}
                  <tspan fill={res.pValue < 0.05 ? '#34d399' : '#64748b'}>
                    (p={res.pValue < 0.001 ? '<0.001' : res.pValue.toFixed(3)})
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Bottom X-Axis ticks */}
          <line x1={leftPadding} y1={height - 25} x2={width - rightPadding} y2={height - 25} stroke="#334155" strokeWidth="1" />
          {[minVal, minVal / 2, 0, maxVal / 2, maxVal].map((val, idx) => {
            const x = getX(val);
            return (
              <g key={idx}>
                <line x1={x} y1={height - 25} x2={x} y2={height - 20} stroke="#64748b" strokeWidth="1" />
                <text x={x} y={height - 8} fill="#64748b" fontSize="10" textAnchor="middle">
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Doubly Robust Highlight Card */}
      <div
        style={{
          marginTop: '16px',
          background: 'rgba(16, 185, 129, 0.09)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        <Award size={20} color="#10b981" style={{ flexShrink: 0 }} />
        <div style={{ color: '#cbd5e1' }}>
          <strong style={{ color: '#34d399' }}>Doubly Robust AIPW Property:</strong> In observational healthcare cohorts, AIPW combines both an outcome regression model μ(X) and a propensity model e(X). Even if the clinical treatment assignment policy is non-linear or misspecified, AIPW guarantees an unbiased causal effect estimate as long as the outcome model is correctly adjusted (and vice-versa).
        </div>
      </div>
    </div>
  );
};
