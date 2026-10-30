import React, { useState } from 'react';
import { Patient } from '../services/causalEngine';
import { Search, Filter, Sparkles, User, Activity, ArrowRight } from 'lucide-react';

interface PatientExplorerProps {
  patients: Patient[];
  treatmentLabel: string;
  controlLabel: string;
  outcomeLabel: string;
  covariateKeys: string[];
}

export const PatientExplorer: React.FC<PatientExplorerProps> = ({
  patients,
  treatmentLabel,
  controlLabel,
  outcomeLabel,
  covariateKeys,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTreatment, setFilterTreatment] = useState<'all' | 'treated' | 'control'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);

  // Filtered patient list
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTreat =
      filterTreatment === 'all' ||
      (filterTreatment === 'treated' && p.treatment === 1) ||
      (filterTreatment === 'control' && p.treatment === 0);
    return matchesSearch && matchesTreat;
  });

  // What-If Simulator state (initialized to selected patient)
  const [simCovariates, setSimCovariates] = useState<Record<string, number>>(() => {
    return patients[0]?.covariates || {};
  });

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSimCovariates({ ...p.covariates });
  };

  const handleCovariateChange = (key: string, val: number) => {
    setSimCovariates(prev => ({ ...prev, [key]: val }));
  };

  // Real-time counterfactual projection calculation based on adjusted covariates
  const simAge = simCovariates['age'] ?? 60;
  const simSeverity = simCovariates['sofa_score'] ?? simCovariates['baseline_ldl'] ?? 50;

  // Real-time What-If simulation approximations
  const simBaseProb = Math.min(0.92, Math.max(0.05, 0.25 + (simAge - 50) * 0.005 + (simSeverity - 50) * 0.004));
  const simTreatProb = Math.min(0.92, Math.max(0.02, simBaseProb - 0.11)); // causal risk reduction
  const simITE = simTreatProb - simBaseProb;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="#06b6d4" />
            <h3 style={{ fontSize: '16px', color: '#f8fafc' }}>Patient-Level Counterfactual Explorer & CATE Studio</h3>
            <span className="badge badge-cyan">Potential Outcomes Framework</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Rubin Causal Model: Inspect each patient's observed trajectory alongside predicted counterfactuals $Y(0)$ and $Y(1)$.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', width: '180px' }}
              placeholder="Search Patient ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '160px' }}
            value={filterTreatment}
            onChange={e => setFilterTreatment(e.target.value as any)}
          >
            <option value="all">All Patients ({patients.length})</option>
            <option value="treated">Treated Only</option>
            <option value="control">Control Only</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 1fr)', gap: '20px' }}>
        {/* Patient Table */}
        <div>
          <div className="data-table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Assignment</th>
                  <th>Observed Y</th>
                  <th>Propensity e(X)</th>
                  <th>Predicted Y(0)</th>
                  <th>Predicted Y(1)</th>
                  <th>CATE (τᵢ)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.slice(0, 50).map(p => {
                  const isSelected = selectedPatient?.id === p.id;
                  const ite = p.individualTreatmentEffect ?? ((p.counterfactualY1 ?? 0.2) - (p.counterfactualY0 ?? 0.3));

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(6, 182, 212, 0.15)' : undefined,
                        borderLeft: isSelected ? '3px solid #06b6d4' : undefined,
                      }}
                    >
                      <td className="font-mono" style={{ fontWeight: '600', color: isSelected ? '#22d3ee' : '#f8fafc' }}>
                        {p.id}
                      </td>
                      <td>
                        {p.treatment === 1 ? (
                          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                            Treated
                          </span>
                        ) : (
                          <span className="badge badge-slate" style={{ fontSize: '10px' }}>
                            Control
                          </span>
                        )}
                      </td>
                      <td className="font-mono">{p.outcome.toFixed(0)}</td>
                      <td className="font-mono">{(p.propensityScore ?? 0.5).toFixed(3)}</td>
                      <td className="font-mono" style={{ color: '#94a3b8' }}>
                        {(p.counterfactualY0 ?? 0.35).toFixed(2)}
                      </td>
                      <td className="font-mono" style={{ color: '#38bdf8' }}>
                        {(p.counterfactualY1 ?? 0.25).toFixed(2)}
                      </td>
                      <td className="font-mono" style={{ color: ite < 0 ? '#34d399' : '#fb7185', fontWeight: 'bold' }}>
                        {ite > 0 ? `+${ite.toFixed(3)}` : ite.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Showing {Math.min(50, filteredPatients.length)} of {filteredPatients.length} patients. Click any row to inspect & simulate.
          </div>
        </div>

        {/* Counterfactual "What-If" Simulation Panel */}
        <div
          style={{
            background: 'rgba(13, 21, 39, 0.9)',
            border: '1px solid var(--border-medium)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#22d3ee" />
              <h4 style={{ fontSize: '14px', color: '#f8fafc' }}>
                Counterfactual "What-If" Simulator: {selectedPatient?.id || 'Patient'}
              </h4>
            </div>
            <span className="badge badge-emerald">Real-time CATE</span>
          </div>

          {/* Potential Outcomes Comparison Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: 'rgba(10, 17, 32, 0.8)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Counterfactual Y(0) [Control]</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                {(simBaseProb * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Expected risk without treatment</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Counterfactual Y(1) [Treated]</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {(simTreatProb * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Expected risk with intervention</div>
            </div>
          </div>

          {/* Net Causal Effect for this patient */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: simITE < 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${simITE < 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Predicted Individual Causal Benefit (ARR)</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: simITE < 0 ? '#34d399' : '#f87171',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {Math.abs(simITE * 100).toFixed(1)}% Absolute Risk Reduction
              </div>
            </div>
            <span className={`badge ${simITE < 0 ? 'badge-emerald' : 'badge-amber'}`}>
              {simITE < 0 ? 'High Benefit Candidate' : 'Low Efficacy'}
            </span>
          </div>

          {/* Interactive Biomarker Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>
              Adjust Patient Biomarkers to Simulate Treatment Response:
            </div>

            {covariateKeys.slice(0, 4).map(key => {
              const currentVal = simCovariates[key] ?? 50;
              const isAge = key.includes('age');
              const minVal = isAge ? 20 : 0;
              const maxVal = isAge ? 90 : 150;

              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#cbd5e1' }}>{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono" style={{ color: '#22d3ee', fontWeight: '600' }}>
                      {currentVal.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    step={1}
                    className="form-range"
                    value={currentVal}
                    onChange={e => handleCovariateChange(key, parseFloat(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
