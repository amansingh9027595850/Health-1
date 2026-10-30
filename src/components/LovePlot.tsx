import React, { useState } from 'react';
import { CovariateBalanceMetric } from '../services/causalEngine';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface LovePlotProps {
  metrics: CovariateBalanceMetric[];
  title?: string;
  methodLabel?: string;
}

export const LovePlot: React.FC<LovePlotProps> = ({
  metrics,
  title = 'Covariate Balance Love Plot',
  methodLabel = 'After Adjustment (IPTW/PSM)',
}) => {
  const [hoveredCovariate, setHoveredCovariate] = useState<CovariateBalanceMetric | null>(null);

  const width = 640;
  const rowHeight = 36;
  const height = Math.max(260, metrics.length * rowHeight + 90);
  const leftPadding = 190;
  const rightPadding = 50;
  const plotWidth = width - leftPadding - rightPadding;

  const smdValues = metrics.map(m => Math.max(Math.abs(m.unadjustedSMD), Math.abs(m.adjustedSMD)));
  const maxAbsSMD = Math.max(0.35, ...(smdValues.length > 0 ? smdValues : [0.35])) * 1.15;

  const getX = (smd: number) => {
    // Map [-maxAbsSMD, maxAbsSMD] to [leftPadding, width - rightPadding]
    const ratio = (smd + maxAbsSMD) / (2 * maxAbsSMD);
    return leftPadding + ratio * plotWidth;
  };

  const zeroX = getX(0);
  const threshPos01 = getX(0.1);
  const threshNeg01 = getX(-0.1);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>{title}</h3>
            <span className="badge badge-cyan">Standardized Mean Differences</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Standard clinical benchmark: Covariates with <strong style={{ color: '#34d399' }}>|SMD| &lt; 0.10</strong> are considered balanced (Rubin's criteria).
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ color: '#94a3b8' }}>Unadjusted (Raw)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', transform: 'rotate(45deg)', background: '#06b6d4', display: 'inline-block' }}></span>
            <span style={{ color: '#22d3ee', fontWeight: 600 }}>{methodLabel}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '550px' }}>
          {/* Shaded Acceptable Zone: |SMD| <= 0.1 */}
          <rect
            x={threshNeg01}
            y={25}
            width={threshPos01 - threshNeg01}
            height={height - 65}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeDasharray="4 3"
          />

          {/* Reference Lines */}
          <line x1={zeroX} y1={25} x2={zeroX} y2={height - 40} stroke="#475569" strokeWidth="1.5" />
          <line x1={threshPos01} y1={25} x2={threshPos01} y2={height - 40} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={threshNeg01} y1={25} x2={threshNeg01} y2={height - 40} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />

          {/* Top Label for Threshold */}
          <text x={threshPos01} y={18} fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
            +0.10 SMD
          </text>
          <text x={threshNeg01} y={18} fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
            -0.10 SMD
          </text>
          <text x={zeroX} y={18} fill="#94a3b8" fontSize="10" textAnchor="middle">
            0 (Exact Balance)
          </text>

          {/* Covariate Rows */}
          {metrics.map((metric, idx) => {
            const y = 50 + idx * rowHeight;
            const rawX = getX(metric.unadjustedSMD);
            const adjX = getX(metric.adjustedSMD);
            const isHovered = hoveredCovariate?.name === metric.name;

            return (
              <g
                key={metric.name}
                onMouseEnter={() => setHoveredCovariate(metric)}
                onMouseLeave={() => setHoveredCovariate(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Row Hover Background */}
                <rect
                  x={10}
                  y={y - rowHeight / 2 + 4}
                  width={width - 20}
                  height={rowHeight - 4}
                  rx={6}
                  fill={isHovered ? 'rgba(30, 41, 59, 0.7)' : 'transparent'}
                  style={{ transition: 'fill 0.15s ease' }}
                />

                {/* Covariate Name Label */}
                <text
                  x={leftPadding - 14}
                  y={y + 4}
                  fill={isHovered ? '#22d3ee' : '#cbd5e1'}
                  fontSize="12"
                  textAnchor="end"
                  fontWeight={isHovered ? '600' : '400'}
                  fontFamily="inherit"
                >
                  {metric.name.replace(/_/g, ' ')}
                </text>

                {/* Connecting Arrow/Line showing reduction in bias */}
                <line
                  x1={rawX}
                  y1={y}
                  x2={adjX}
                  y2={y}
                  stroke={Math.abs(metric.adjustedSMD) < Math.abs(metric.unadjustedSMD) ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />

                {/* Raw SMD Circle (Red) */}
                <circle cx={rawX} cy={y} r={5} fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />

                {/* Adjusted SMD Diamond (Cyan) */}
                <polygon
                  points={`${adjX},${y - 6} ${adjX + 6},${y} ${adjX},${y + 6} ${adjX - 6},${y}`}
                  fill="#06b6d4"
                  stroke="#0891b2"
                  strokeWidth="1.5"
                />

                {/* Balance Status Indicator on Far Right */}
                {metric.isBalanced ? (
                  <text x={width - 32} y={y + 4} fill="#10b981" fontSize="11" fontWeight="bold">
                    ✓
                  </text>
                ) : (
                  <text x={width - 32} y={y + 4} fill="#f59e0b" fontSize="11" fontWeight="bold">
                    !
                  </text>
                )}
              </g>
            );
          })}

          {/* Bottom X-Axis line and ticks */}
          <line x1={leftPadding} y1={height - 35} x2={width - rightPadding} y2={height - 35} stroke="#334155" strokeWidth="1" />
          {[-maxAbsSMD, -0.2, 0, 0.2, maxAbsSMD].map((val, i) => {
            const x = getX(val);
            return (
              <g key={i}>
                <line x1={x} y1={height - 35} x2={x} y2={height - 30} stroke="#64748b" strokeWidth="1" />
                <text x={x} y={height - 18} fill="#64748b" fontSize="10" textAnchor="middle">
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Popover Card */}
        {hoveredCovariate && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--border-highlight)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              fontSize: '12px',
            }}
          >
            <div>
              <strong style={{ color: '#22d3ee', fontSize: '13px' }}>
                {hoveredCovariate.name.replace(/_/g, ' ').toUpperCase()}
              </strong>
              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                Raw Treated Mean: <span style={{ color: '#f8fafc' }}>{hoveredCovariate.unadjustedTreatedMean.toFixed(2)}</span> vs Control:{' '}
                <span style={{ color: '#f8fafc' }}>{hoveredCovariate.unadjustedControlMean.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Raw SMD</div>
                <div style={{ color: '#ef4444', fontWeight: 'bold' }}>{hoveredCovariate.unadjustedSMD.toFixed(3)}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Adjusted SMD</div>
                <div style={{ color: hoveredCovariate.isBalanced ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                  {hoveredCovariate.adjustedSMD.toFixed(3)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hoveredCovariate.isBalanced ? (
                  <span className="badge badge-emerald">
                    <CheckCircle2 size={12} /> Balanced (&lt;0.10)
                  </span>
                ) : (
                  <span className="badge badge-amber">
                    <AlertTriangle size={12} /> Residual Bias
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
