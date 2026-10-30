import React, { useState } from 'react';
import { ClinicalCohort } from '../services/datasetService';
import { Patient } from '../services/causalEngine';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileSpreadsheet } from 'lucide-react';

interface CustomCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCohortLoaded: (cohort: ClinicalCohort) => void;
}

export const CustomCsvModal: React.FC<CustomCsvModalProps> = ({
  isOpen,
  onClose,
  onCohortLoaded,
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [treatmentCol, setTreatmentCol] = useState<string>('');
  const [outcomeCol, setOutcomeCol] = useState<string>('');
  const [selectedConfounders, setSelectedConfounders] = useState<string[]>([]);
  const [cohortName, setCohortName] = useState<string>('Custom Healthcare Registry');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (!text) return;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.trim().split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setErrorMessage('CSV file must have a header line and at least 2 data rows.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      setColumns(headers);

      const parsedRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const num = Number(parts[idx]);
          row[h] = isNaN(num) ? parts[idx] : num;
        });
        parsedRows.push(row);
      }

      setRows(parsedRows);
      setErrorMessage(null);

      // Heuristically suggest treatment and outcome columns
      const likelyTreat = headers.find(h => /treat|rx|drug|vaso|statin|group/i.test(h)) || headers[0];
      const likelyOut = headers.find(h => /out|mace|mort|surv|death|fail/i.test(h)) || headers[1];
      setTreatmentCol(likelyTreat);
      setOutcomeCol(likelyOut);
      setSelectedConfounders(headers.filter(h => h !== likelyTreat && h !== likelyOut));
    } catch (err: any) {
      setErrorMessage(`Failed to parse CSV: ${err.message}`);
    }
  };

  const toggleConfounder = (col: string) => {
    if (selectedConfounders.includes(col)) {
      setSelectedConfounders(selectedConfounders.filter(c => c !== col));
    } else {
      setSelectedConfounders([...selectedConfounders, col]);
    }
  };

  const handleBuildCohort = () => {
    if (!treatmentCol || !outcomeCol) {
      setErrorMessage('Please designate both a Treatment variable and an Outcome variable.');
      return;
    }
    if (selectedConfounders.length === 0) {
      setErrorMessage('Please select at least 1 confounder variable to adjust for.');
      return;
    }

    try {
      const patients: Patient[] = rows.map((r, i) => {
        const tVal = Number(r[treatmentCol]);
        const yVal = Number(r[outcomeCol]);
        const covs: Record<string, number> = {};
        for (const c of selectedConfounders) {
          covs[c] = typeof r[c] === 'number' ? r[c] : 0;
        }

        return {
          id: `CUSTOM-${1000 + i}`,
          treatment: tVal >= 0.5 ? 1 : 0,
          outcome: yVal,
          covariates: covs,
        };
      });

      const newCohort: ClinicalCohort = {
        id: 'cohort_custom_' + Date.now(),
        name: cohortName,
        domain: 'Custom Healthcare Data',
        description: `Imported observational clinical cohort with ${patients.length} records.`,
        clinicalContext: `Observational study analyzing the causal effect of ${treatmentCol} on ${outcomeCol}, adjusting for ${selectedConfounders.join(', ')}.`,
        treatmentName: treatmentCol,
        controlName: `Non-${treatmentCol}`,
        outcomeName: outcomeCol,
        outcomeType: 'binary',
        covariateMetadata: selectedConfounders.map(c => ({
          key: c,
          label: c.replace(/_/g, ' '),
          unit: 'units',
          description: `User-specified covariate: ${c}`,
          isConfounder: true,
        })),
        patients,
      };

      onCohortLoaded(newCohort);
      onClose();
    } catch (err: any) {
      setErrorMessage(`Error building clinical cohort: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={22} color="#06b6d4" />
            <div>
              <h3 style={{ fontSize: '18px', color: '#f8fafc' }}>Upload Custom Clinical Observational CSV</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Map your clinical columns (treatment, outcome, confounders) and run causal inference models instantly.
              </p>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          style={{
            border: '2px dashed var(--border-medium)',
            borderRadius: '12px',
            padding: '32px 20px',
            textAlign: 'center',
            background: 'rgba(10, 17, 32, 0.6)',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('csv-file-input')?.click()}
        >
          <UploadCloud size={36} color="#06b6d4" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
            Click to upload your healthcare CSV dataset
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Supports EHR registries, claims data, and observational trial exports (Max 5,000 rows)
          </div>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {columns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Cohort Study Title
              </label>
              <input
                type="text"
                className="form-input"
                value={cohortName}
                onChange={e => setCohortName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#22d3ee', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Treatment Variable (A = 0 or 1)
                </label>
                <select
                  className="form-select"
                  value={treatmentCol}
                  onChange={e => setTreatmentCol(e.target.value)}
                >
                  {columns.map(col => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Outcome Variable (Y)
                </label>
                <select
                  className="form-select"
                  value={outcomeCol}
                  onChange={e => setOutcomeCol(e.target.value)}
                >
                  {columns.map(col => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Select Baseline Confounders to Balance (X):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {columns
                  .filter(c => c !== treatmentCol && c !== outcomeCol)
                  .map(col => {
                    const isSelected = selectedConfounders.includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleConfounder(col)}
                        className={`badge ${isSelected ? 'badge-cyan' : 'badge-slate'}`}
                        style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}
                      >
                        {isSelected ? '✓ ' : '+ '} {col}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleBuildCohort}>
                <CheckCircle2 size={16} /> Load & Estimate Causal Effects ({rows.length} Patients)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
