import React, { useState } from 'react';
import { GitBranch, Info, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface CausalDAGProps {
  treatmentName: string;
  outcomeName: string;
  confounders: string[];
}

export const CausalDAG: React.FC<CausalDAGProps> = ({
  treatmentName,
  outcomeName,
  confounders,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>('X');
  const [showUnmeasured, setShowUnmeasured] = useState<boolean>(true);
  const [adjustedStatus, setAdjustedStatus] = useState<boolean>(true);

  // SVG Coordinates for DAG nodes
  // Layout:
  //           [X: Measured Confounders]
  //            /                      \
  //           v                        v
  // [A: Treatment] ==============> [Y: Outcome]
  //           ^                        ^
  //            \                      /
  //          [U: Unmeasured Confounder]

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={20} color="#06b6d4" />
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>Structural Causal Model & Directed Acyclic Graph (DAG)</h3>
            <span className="badge badge-cyan">Pearl's Back-Door Criterion</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Identifiability of causal treatment effect E[Y(1) - Y(0)] requires blocking all confounding backdoor paths from A to Y.
          </p>
        </div>

        {/* Interactive Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${adjustedStatus ? 'btn-emerald' : 'btn-secondary'}`}
            onClick={() => setAdjustedStatus(!adjustedStatus)}
          >
            {adjustedStatus ? '✓ Backdoor Path: Blocked (Conditioned on X)' : '⚠ Backdoor Path: Open (Confounded)'}
          </button>

          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowUnmeasured(!showUnmeasured)}
          >
            {showUnmeasured ? 'Hide Unmeasured Confounder U' : 'Show Unmeasured Confounder U'}
          </button>
        </div>
      </div>

      {/* SVG Canvas for DAG */}
      <div style={{ width: '100%', background: 'rgba(10, 17, 32, 0.7)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '20px' }}>
        <svg viewBox="0 0 760 360" style={{ width: '100%', height: 'auto', minHeight: '300px' }}>
          <defs>
            {/* Arrowhead Markers */}
            <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#06b6d4" />
            </marker>
            <marker id="arrow-emerald" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
            </marker>
            <marker id="arrow-rose" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-slate" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
            </marker>
          </defs>

          {/* Node Coordinates */}
          {/* Node A (Treatment) at (170, 180) */}
          {/* Node Y (Outcome) at (590, 180) */}
          {/* Node X (Measured Confounders) at (380, 60) */}
          {/* Node U (Unmeasured Confounder) at (380, 300) */}

          {/* 1. Direct Causal Path A -> Y */}
          <line
            x1={235}
            y1={180}
            x2={515}
            y2={180}
            stroke="#10b981"
            strokeWidth="3.5"
            markerEnd="url(#arrow-emerald)"
          />
          <text x={380} y={170} fill="#34d399" fontSize="12" textAnchor="middle" fontWeight="bold">
            Target Causal Effect: A → Y (ATE)
          </text>

          {/* 2. Backdoor Path from Measured Confounders X -> A */}
          <line
            x1={340}
            y1={85}
            x2={210}
            y2={150}
            stroke={adjustedStatus ? '#64748b' : '#ef4444'}
            strokeWidth={adjustedStatus ? 2 : 2.5}
            strokeDasharray={adjustedStatus ? '5 4' : 'none'}
            markerEnd={adjustedStatus ? 'url(#arrow-slate)' : 'url(#arrow-rose)'}
          />
          {/* Backdoor Path from Measured Confounders X -> Y */}
          <line
            x1={420}
            y1={85}
            x2={550}
            y2={150}
            stroke={adjustedStatus ? '#64748b' : '#ef4444'}
            strokeWidth={adjustedStatus ? 2 : 2.5}
            strokeDasharray={adjustedStatus ? '5 4' : 'none'}
            markerEnd={adjustedStatus ? 'url(#arrow-slate)' : 'url(#arrow-rose)'}
          />

          {/* Adjustment Box over X if adjusted */}
          {adjustedStatus && (
            <g>
              <rect x={285} y={15} width={190} height={70} rx={10} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
              <text x={380} y={12} fill="#10b981" fontSize="11" textAnchor="middle" fontWeight="bold">
                [CONDITIONED / BALANCED]
              </text>
            </g>
          )}

          {/* 3. Unmeasured Confounder U Paths (if enabled) */}
          {showUnmeasured && (
            <g>
              {/* U -> A */}
              <line
                x1={340}
                y1={275}
                x2={210}
                y2={210}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
                markerEnd="url(#arrow-amber)"
              />
              {/* U -> Y */}
              <line
                x1={420}
                y1={275}
                x2={550}
                y2={210}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
                markerEnd="url(#arrow-amber)"
              />
            </g>
          )}

          {/* ----------------- NODES RENDERING ----------------- */}

          {/* NODE A: TREATMENT */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedNode('A')}
            transform="translate(170, 180)"
          >
            <circle
              r={55}
              fill="rgba(6, 182, 212, 0.15)"
              stroke={selectedNode === 'A' ? '#22d3ee' : '#06b6d4'}
              strokeWidth={selectedNode === 'A' ? 3 : 2}
            />
            <text y={-10} fill="#22d3ee" fontSize="13" fontWeight="bold" textAnchor="middle">
              TREATMENT (A)
            </text>
            <text y={12} fill="#e2e8f0" fontSize="10" textAnchor="middle">
              {treatmentName.slice(0, 22)}
            </text>
            <text y={26} fill="#94a3b8" fontSize="9" textAnchor="middle">
              Observed Clinical Action
            </text>
          </g>

          {/* NODE Y: OUTCOME */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedNode('Y')}
            transform="translate(590, 180)"
          >
            <circle
              r={55}
              fill="rgba(16, 185, 129, 0.15)"
              stroke={selectedNode === 'Y' ? '#34d399' : '#10b981'}
              strokeWidth={selectedNode === 'Y' ? 3 : 2}
            />
            <text y={-10} fill="#34d399" fontSize="13" fontWeight="bold" textAnchor="middle">
              OUTCOME (Y)
            </text>
            <text y={12} fill="#e2e8f0" fontSize="10" textAnchor="middle">
              {outcomeName.slice(0, 22)}
            </text>
            <text y={26} fill="#94a3b8" fontSize="9" textAnchor="middle">
              Potential Y(0) vs Y(1)
            </text>
          </g>

          {/* NODE X: MEASURED CONFOUNDERS */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedNode('X')}
            transform="translate(380, 50)"
          >
            <rect
              x={-85}
              y={-30}
              width={170}
              height={60}
              rx={12}
              fill="rgba(30, 41, 59, 0.9)"
              stroke={selectedNode === 'X' ? '#38bdf8' : '#64748b'}
              strokeWidth={selectedNode === 'X' ? 2.5 : 1.5}
            />
            <text y={-8} fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
              CONFOUNDERS (X)
            </text>
            <text y={12} fill="#cbd5e1" fontSize="10" textAnchor="middle">
              {confounders.length} Measured Variables
            </text>
          </g>

          {/* NODE U: UNMEASURED CONFOUNDER */}
          {showUnmeasured && (
            <g
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedNode('U')}
              transform="translate(380, 300)"
            >
              <ellipse
                rx={85}
                ry={30}
                fill="rgba(245, 158, 11, 0.12)"
                stroke="#f59e0b"
                strokeWidth={selectedNode === 'U' ? 2.5 : 1.5}
                strokeDasharray="4 3"
              />
              <text y={-4} fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
                UNMEASURED (U)
              </text>
              <text y={14} fill="#fde68a" fontSize="9" textAnchor="middle">
                Hidden Frailty / Clinical Intuition
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Node Description & Backdoor Explanation Card */}
      <div
        style={{
          marginTop: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px',
        }}
      >
        {selectedNode === 'X' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 'bold' }}>
              <Info size={16} />
              Measured Confounders X — Blocking the Back-Door Path
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
              Variables in <strong>X</strong> simultaneously influence clinician prescribing choice (treatment assignment A) and patient recovery/mortality (outcome Y). Without adjustment, the path A ← X → Y creates severe confounding by indication. By applying <strong>Propensity Score Matching</strong>, <strong>IPTW</strong>, or <strong>Doubly Robust AIPW</strong>, we condition on X and block this path.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {confounders.map((c, i) => (
                <span key={i} className="badge badge-slate font-mono">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedNode === 'A' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee', fontWeight: 'bold' }}>
              <CheckCircle2 size={16} />
              Treatment Node A: {treatmentName}
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
              The target intervention. In an observational dataset, treatment assignment is NOT randomized: P(A=1 | X) ≠ P(A=0 | X). The propensity score e(X) models this non-random assignment mechanism.
            </p>
          </div>
        )}

        {selectedNode === 'Y' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 'bold' }}>
              <CheckCircle2 size={16} />
              Outcome Node Y: {outcomeName}
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
              Under the Rubin Causal Model, each patient possesses potential outcomes Y(0) (outcome under standard care) and Y(1) (outcome under treatment). We observe only Y = A·Y(1) + (1-A)·Y(0). Causal methods impute the unobserved counterfactual.
            </p>
          </div>
        )}

        {selectedNode === 'U' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 'bold' }}>
              <AlertOctagon size={16} />
              Unmeasured Confounding U & VanderWeele E-Value Sensitivity
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
              Healthcare databases cannot capture every subtle clinical nuance (e.g. bedside visual impression, patient reserve, unmeasured genetic polymorphisms). Even after balancing X, the open path A ← U → Y could potentially bias findings. We use <strong>Quantitative E-Value Sensitivity Analysis</strong> to prove how strong U must be before our causal conclusions would be overturned!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
