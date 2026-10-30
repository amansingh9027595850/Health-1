import React, { useState, useEffect } from 'react';
import { supabaseService, CausalExperimentRecord } from '../services/supabaseClient';
import { Database, CheckCircle2, AlertCircle, Copy, Download, RefreshCw, X, Shield, Cloud } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCurrentExperiment: () => Promise<void>;
  isSyncing: boolean;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncCurrentExperiment,
  isSyncing,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [experiments, setExperiments] = useState<CausalExperimentRecord[]>([]);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const config = supabaseService.getConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      loadSavedExperiments();
    }
  }, [isOpen]);

  const loadSavedExperiments = async () => {
    const list = await supabaseService.fetchRemoteExperiments();
    setExperiments(list);
  };

  const handleTestAndSave = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    const res = await supabaseService.setConfig(url, anonKey);
    setIsTesting(false);
    setIsSuccess(res.success);
    setStatusMessage(res.message);
    if (res.success) {
      loadSavedExperiments();
    }
  };

  const handleDisconnect = () => {
    supabaseService.disconnect();
    setUrl('');
    setAnonKey('');
    setIsSuccess(false);
    setStatusMessage('Disconnected from Supabase. Reverted to resilient local storage vault.');
    loadSavedExperiments();
  };

  const handleCopySchemaSQL = () => {
    const sqlText = `-- Supabase Schema for CausalHealth AI
CREATE TABLE IF NOT EXISTS clinical_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    sample_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS causal_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_title VARCHAR(255) NOT NULL,
    method VARCHAR(100) NOT NULL,
    ate NUMERIC NOT NULL,
    ci_lower NUMERIC NOT NULL,
    ci_upper NUMERIC NOT NULL,
    std_error NUMERIC NOT NULL,
    p_value NUMERIC NOT NULL,
    effective_sample_size NUMERIC,
    e_value_point NUMERIC,
    parameters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE clinical_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON clinical_cohorts FOR ALL USING (true);
CREATE POLICY "Allow public all" ON causal_experiments FOR ALL USING (true);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(experiments, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `causalhealth_experiments_${Date.now()}.json`;
    link.click();
  };

  if (!isOpen) return null;

  const currentConfig = supabaseService.getConfig();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '8px' }}>
              <Database size={22} color="#06b6d4" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#f8fafc' }}>Supabase Cloud Database & Data Vault</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Store observational healthcare cohorts, causal experiment runs, and patient counterfactuals securely in Supabase.
              </p>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Status banner */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: currentConfig.isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.7)',
            border: `1px solid ${currentConfig.isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentConfig.isConnected ? (
              <Cloud size={18} color="#10b981" />
            ) : (
              <Shield size={18} color="#94a3b8" />
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: currentConfig.isConnected ? '#34d399' : '#cbd5e1' }}>
                {currentConfig.isConnected
                  ? 'Connected to Live Supabase Cloud Database'
                  : 'Operating in Local Storage Vault Mode (Instant & Offline Resilient)'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {currentConfig.isConnected
                  ? `Active Host: ${currentConfig.url}`
                  : 'Experiments are safely saved in browser storage. Connect Supabase below to sync to cloud.'}
              </div>
            </div>
          </div>

          <span className={`badge ${currentConfig.isConnected ? 'badge-emerald' : 'badge-slate'}`}>
            {currentConfig.isConnected ? 'LIVE CLOUD' : 'LOCAL VAULT'}
          </span>
        </div>

        {/* Supabase Connection Form */}
        <div style={{ background: 'rgba(10, 17, 32, 0.7)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '12px' }}>Supabase Project Credentials</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Supabase Project URL (e.g. https://xyzcompany.supabase.co)
              </label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="https://YOUR_PROJECT_REF.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                className="form-input font-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
              />
            </div>

            {statusMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isSuccess ? '#34d399' : '#f87171',
                  border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleTestAndSave}
                disabled={isTesting || !url || !anonKey}
              >
                <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                {isTesting ? 'Testing Connection...' : 'Connect & Verify Supabase'}
              </button>

              {currentConfig.isConnected && (
                <button className="btn btn-secondary" onClick={handleDisconnect}>
                  Disconnect
                </button>
              )}

              <button className="btn btn-secondary" onClick={handleCopySchemaSQL}>
                <Copy size={14} />
                {copiedSql ? 'Copied SQL Script!' : 'Copy Supabase Schema SQL'}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Current Experiment Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ fontSize: '14px', color: '#f8fafc' }}>
              Saved Causal Inference Benchmark Runs ({experiments.length})
            </h4>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Auto-persisted experiment runs containing point estimates, 95% CIs, and E-values.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-emerald btn-sm"
              onClick={onSyncCurrentExperiment}
              disabled={isSyncing}
            >
              <Database size={13} />
              {isSyncing ? 'Syncing...' : 'Sync Current Run'}
            </button>

            <button className="btn btn-secondary btn-sm" onClick={handleExportJSON}>
              <Download size={13} /> Export JSON
            </button>
          </div>
        </div>

        {/* Experiments Table */}
        <div className="data-table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cohort / Method</th>
                <th>ATE Point</th>
                <th>95% CI</th>
                <th>P-Value</th>
                <th>E-Value</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {experiments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No experiments saved yet. Click "Sync Current Run" above to persist your causal findings!
                  </td>
                </tr>
              ) : (
                experiments.map(exp => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#22d3ee' }}>{exp.method}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{exp.domain}</div>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 'bold' }}>
                      {exp.ate > 0 ? `+${exp.ate.toFixed(3)}` : exp.ate.toFixed(3)}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      [{exp.ci_lower.toFixed(3)}, {exp.ci_upper.toFixed(3)}]
                    </td>
                    <td className="font-mono" style={{ color: exp.p_value < 0.05 ? '#34d399' : '#94a3b8' }}>
                      {exp.p_value < 0.001 ? '<0.001' : exp.p_value.toFixed(3)}
                    </td>
                    <td className="font-mono" style={{ color: '#fbbf24' }}>
                      {exp.e_value_point ? exp.e_value_point.toFixed(2) : '—'}
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
