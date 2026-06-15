import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertTriangle, FileText, Sparkles, ArrowRight, ArrowLeft, X, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { ImportSession, ImportAnomaly } from '../types';
import { ANOMALY_LABELS, ANOMALY_SEVERITY } from '../lib/utils';

interface Props { groupId: string; onClose: () => void; }

type Step = 1 | 2 | 3 | 4 | 5;

const SEVERITY_VARIANT: Record<string, 'danger' | 'warning' | 'info'> = {
  error: 'danger', warning: 'warning', info: 'info',
};

export default function ImportWizard({ groupId, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [aiExplaining, setAiExplaining] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('group_id', groupId);
      return api.post('/imports/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
    },
    onSuccess: (data: ImportSession) => {
      setSession(data);
      setStep(2);
      setTimeout(() => setStep(3), 1200);
    },
    onError: () => error('Upload failed', 'Could not process the CSV file'),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/imports/${session!.id}/approve/`, { decisions }).then(r => r.data),
    onSuccess: (data: ImportSession) => {
      setSession(data);
      setStep(5);
      success('Import complete!', `${data.imported_rows} expenses imported`);
    },
    onError: () => error('Import failed', 'Could not complete the import'),
  });

  const explainAnomaly = async (anomaly: ImportAnomaly) => {
    if (aiExplanations[anomaly.id]) return;
    setAiExplaining(anomaly.id);
    try {
      const { data } = await api.post(`/imports/${session!.id}/anomalies/${anomaly.id}/explain/`);
      setAiExplanations(prev => ({ ...prev, [anomaly.id]: data.explanation }));
    } catch { } finally { setAiExplaining(null); }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) { error('Invalid file', 'Only CSV files are supported'); return; }
    uploadMutation.mutate(file);
    setStep(2);
  };

  const anomalies = session?.anomalies ?? [];
  const pending = anomalies.filter(a => !decisions[a.id]);
  const resolved = anomalies.filter(a => decisions[a.id]);

  const STEP_LABELS = ['Upload', 'Parsing', 'Review', 'Approve', 'Done'];

  return (
    <Modal isOpen onClose={onClose} title="CSV Import Wizard" size="2xl">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${step > i + 1 ? 'text-green-400' : step === i + 1 ? 'text-primary-400' : 'text-gray-600'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-500 text-white shadow-glow-sm' : 'bg-white/8 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{label}</span>
            </div>
            {i < 4 && <div className={`flex-1 h-px transition-colors ${step > i + 1 ? 'bg-green-500/40' : 'bg-white/8'}`} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-primary-500/50 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-primary-500/5 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-500/25 transition-colors">
                <Upload className="w-7 h-7 text-primary-400" />
              </div>
              <p className="text-base font-semibold text-white mb-1">Drop your CSV file here</p>
              <p className="text-sm text-gray-500">or click to browse · CSV only · Max 10MB</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300 font-medium mb-1">📋 Expected CSV columns:</p>
              <p className="text-xs text-gray-400 font-mono">title, amount, currency, date, paid_by, split_type, participants, category, description, notes</p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Parsing */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-base font-semibold text-white mb-1">Parsing your file…</p>
            <p className="text-sm text-gray-500">Running anomaly detection engine</p>
            <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
              {['Reading CSV rows', 'Validating fields', 'Detecting duplicates', 'Checking memberships', 'Analysing with AI'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 border border-primary-500/50 border-t-primary-500 rounded-full animate-spin" style={{ animationDelay: `${i * 0.2}s` }} />
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Anomaly Review */}
        {step === 3 && session && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{session.total_rows}</span> rows · {' '}
                <span className="text-yellow-400 font-semibold">{anomalies.length}</span> anomalies · {' '}
                <span className="text-green-400 font-semibold">{resolved.length}</span> resolved
              </p>
              {pending.length === 0 && (
                <Button size="sm" onClick={() => setStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>Review Summary</Button>
              )}
            </div>

            {anomalies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-semibold">No anomalies detected!</p>
                <p className="text-sm text-gray-500 mb-4">All {session.total_rows} rows look clean</p>
                <Button onClick={() => setStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>Proceed to Import</Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {anomalies.map((anomaly) => {
                  const severity = ANOMALY_SEVERITY[anomaly.issue_type] ?? 'info';
                  const decision = decisions[anomaly.id];
                  const isDuplicate = ['duplicate', 'near_duplicate', 'same_event'].includes(anomaly.issue_type);
                  return (
                    <div key={anomaly.id} className={`rounded-xl border p-4 transition-all ${decision ? 'opacity-60 border-green-500/20 bg-green-500/5' : severity === 'error' ? 'border-red-500/25 bg-red-500/5' : severity === 'warning' ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-blue-500/25 bg-blue-500/5'}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severity === 'error' ? 'text-red-400' : severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={SEVERITY_VARIANT[severity]} size="sm">{ANOMALY_LABELS[anomaly.issue_type]}</Badge>
                            <span className="text-xs text-gray-500">Row {anomaly.row_number}{anomaly.row_number_b ? ` & ${anomaly.row_number_b}` : ''}</span>
                          </div>
                          <p className="text-sm text-gray-300">{anomaly.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{anomaly.suggested_action}</p>

                          {/* AI Explanation */}
                          {(aiExplanations[anomaly.id] || anomaly.ai_explanation) && (
                            <div className="mt-2 p-2.5 bg-primary-500/10 rounded-lg border border-primary-500/20">
                              <p className="text-xs text-primary-300 flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" /> AI Explanation</p>
                              <p className="text-xs text-gray-300">{aiExplanations[anomaly.id] || anomaly.ai_explanation}</p>
                            </div>
                          )}

                          {/* Side-by-side for duplicates */}
                          {isDuplicate && anomaly.row_data_b && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {[anomaly.row_data, anomaly.row_data_b].map((row, ri) => (
                                <div key={ri} className="bg-white/5 rounded-lg p-2 text-[10px]">
                                  <p className="text-gray-500 mb-1 font-medium">Row {ri === 0 ? anomaly.row_number : anomaly.row_number_b}</p>
                                  {Object.entries(row ?? {}).filter(([k]) => !k.startsWith('_')).slice(0, 4).map(([k, v]) => (
                                    <p key={k}><span className="text-gray-600">{k}:</span> <span className="text-gray-300">{String(v)}</span></p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {decision ? (
                              <Badge variant="success" size="sm">✓ {decision.replace(/_/g, ' ')}</Badge>
                            ) : (
                              <>
                                {isDuplicate && <>
                                  {['keep_first', 'keep_second', 'merge', 'mark_separate'].map(d => (
                                    <button key={d} onClick={() => setDecisions(p => ({ ...p, [anomaly.id]: d }))}
                                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/8 text-gray-400 hover:bg-primary-500/20 hover:text-white transition-all">
                                      {d.replace(/_/g, ' ')}
                                    </button>
                                  ))}
                                </>}
                                <button onClick={() => setDecisions(p => ({ ...p, [anomaly.id]: 'accept' }))}
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">Accept</button>
                                <button onClick={() => setDecisions(p => ({ ...p, [anomaly.id]: 'skip' }))}
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/8 text-gray-500 hover:bg-red-500/15 hover:text-red-400 transition-all">Skip Row</button>
                                <button onClick={() => explainAnomaly(anomaly)} disabled={aiExplaining === anomaly.id}
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 flex items-center gap-1 transition-all">
                                  {aiExplaining === anomaly.id ? <span className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  AI Explain
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pending.length > 0 && (
              <p className="text-xs text-yellow-400 text-center mt-3">{pending.length} anomalies still need your decision</p>
            )}
            {pending.length === 0 && anomalies.length > 0 && (
              <Button className="w-full mt-4" onClick={() => setStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>All resolved — Continue</Button>
            )}
          </motion.div>
        )}

        {/* Step 4: Approval */}
        {step === 4 && session && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Import Summary</h3>
              {[
                { label: 'Total Rows', value: session.total_rows, color: 'text-white' },
                { label: 'Valid Rows', value: session.valid_rows, color: 'text-green-400' },
                { label: 'Anomalies Found', value: anomalies.length, color: 'text-yellow-400' },
                { label: 'Resolved', value: resolved.length, color: 'text-blue-400' },
                { label: 'Will be Skipped', value: Object.values(decisions).filter(d => d === 'skip' || d === 'ignore').length, color: 'text-red-400' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-sm text-yellow-300">⚠️ This action will create expenses in your group. Review the summary above before confirming.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              <Button className="flex-1" onClick={() => approveMutation.mutate()} isLoading={approveMutation.isPending}>
                Confirm Import
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Done */}
        {step === 5 && session && (
          <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-1">Import Complete!</h3>
            <p className="text-gray-400 mb-5">{session.imported_rows} expenses imported successfully</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Imported', value: session.imported_rows, color: 'text-green-400' },
                { label: 'Skipped', value: session.skipped_rows, color: 'text-yellow-400' },
                { label: 'Anomalies', value: anomalies.length, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-3">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={async () => {
                const { data } = await api.get(`/imports/${session.id}/report/`);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `import-report-${session.id}.json`; a.click();
              }} leftIcon={<Download className="w-4 h-4" />}>
                Download Report
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
