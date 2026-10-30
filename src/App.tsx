import React, { useState, useEffect } from 'react';
import { PersonalHealthEstimator } from './components/PersonalHealthEstimator';
import { HealthChatbot } from './components/HealthChatbot';
import { apiClient } from './services/apiClient';
import {
  Activity,
  Heart,
  Database,
  HelpCircle,
  X,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check backend health on mount and periodically
    const checkStatus = async () => {
      const ok = await apiClient.checkHealth();
      setIsBackendConnected(ok);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #070b14)' }}>
      {/* =========================================================================
          PERSISTENT TOP HEADER & SYSTEM STATUS BAR
         ========================================================================= */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          background: 'rgba(7, 11, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
              }}
            >
              <Activity size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc', margin: 0 }}>
                  CausalHealth <span style={{ color: '#22d3ee' }}>AI</span>
                </h1>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  Industry Edition v2.0
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Individual Health Risk & Causal Treatment Benefit Engine
              </div>
            </div>
          </div>

          {/* Real-time System Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Live Reactive Calculator Pill */}
            <span
              className="badge badge-cyan"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'none',
              }}
            >
              <Heart size={14} color="#22d3ee" />
              <span>Personal Health Calculator</span>
            </span>

            {/* Backend REST Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: isBackendConnected
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(6, 182, 212, 0.12)',
                border: isBackendConnected
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(6, 182, 212, 0.35)',
                fontSize: '12px',
                color: isBackendConnected ? '#34d399' : '#22d3ee',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isBackendConnected ? '#10b981' : '#06b6d4',
                  boxShadow: isBackendConnected ? '0 0 8px #10b981' : '0 0 8px #06b6d4',
                }}
              />
              <Database size={13} />
              <span>
                {isBackendConnected
                  ? 'REST Backend Connected (:3001)'
                  : 'Resilient Local Vault Active'}
              </span>
            </div>

            {/* Help / Guide Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsHelpOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
            >
              <HelpCircle size={14} />
              <span>How It Works</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN APPLICATION WORKSPACE
         ========================================================================= */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', flex: 1, width: '100%' }}>
        <PersonalHealthEstimator />
      </main>

      {/* =========================================================================
          HELP & METHODOLOGY MODAL
         ========================================================================= */}
      {isHelpOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '620px',
              width: '100%',
              padding: '28px',
              background: '#0d1527',
              border: '1px solid var(--border-highlight)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '10px' }}>
                  <FileCheck2 size={20} color="#22d3ee" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                    How CausalHealth AI Works
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Causal Inference & Biomarker Intelligence Guide
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsHelpOpen(false)}
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <div style={{ padding: '12px 14px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <strong style={{ color: '#22d3ee' }}>1. Upload or Adjust Biomarkers:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Upload a photo or document of your lab report (Lipid Panel, Blood Pressure slip, Metabolic Panel), or adjust the interactive sliders directly. The OCR parser extracts key clinical markers.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <strong style={{ color: '#34d399' }}>2. Causal Effect vs Simple Correlation:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Standard calculators merely show observational correlation. Our doubly robust causal model adjusts for confounding factors (age, smoking, comorbidities) to reveal the <strong>true causal risk reduction (ARR)</strong> and <strong>Number Needed to Treat (NNT)</strong>.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <strong style={{ color: '#fbbf24' }}>3. Evidence-Based Decision Recommendation:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  The engine evaluates whether preventative therapy (e.g. High-Intensity Statin) provides High, Moderate, or Minimal clinical benefit for your specific profile, and saves your records to the local/backend database.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(147, 51, 234, 0.08)', borderRadius: '8px', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
                <strong style={{ color: '#c084fc' }}>4. AI Clinical Assistant:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Click the floating chat button in the bottom-right corner to ask questions about your lab results, medication benefits, or what to discuss with your physician.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-cyan btn-sm" onClick={() => setIsHelpOpen(false)}>
                <CheckCircle2 size={14} /> Got It, Back to Estimator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING AI HEALTH CHATBOT ASSISTANT
         ========================================================================= */}
      <HealthChatbot />
    </div>
  );
};
