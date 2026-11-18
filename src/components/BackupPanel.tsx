import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, RotateCcw, Trash2, Upload } from 'lucide-react';
import { TrackerState } from '../types/tracker';
import { exportMatrixAsCsv, exportStateAsJson, normalizeTrackerState } from '../utils/storage';

interface BackupPanelProps {
  state: TrackerState;
  onImportState: (next: TrackerState) => void;
  onResetStarter: () => void;
  onClearAll: () => void;
}

export function BackupPanel({
  state,
  onImportState,
  onResetStarter,
  onClearAll,
}: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<'starter' | 'clear' | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<TrackerState>;
      const normalized = normalizeTrackerState(parsed);
      if (!normalized) {
        setStatusMessage({
          type: 'err',
          text: 'Invalid backup file. Expected LoadLog JSON format.',
        });
        return;
      }
      onImportState(normalized);
      setStatusMessage({
        type: 'ok',
        text: `Imported ${normalized.exercises.length} exercises and ${normalized.entries.length} weekly entries.`,
      });
    } catch {
      setStatusMessage({
        type: 'err',
        text: 'Could not parse JSON file. Check that the file is valid.',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <section id="backup" aria-labelledby="backup-heading" className="space-y-4">
      <div>
        <h2 id="backup-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Export & Data Management
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Your weekly logs sync automatically across your devices. Export spreadsheets or restore backups anytime.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-1 md:grid-cols-3">
        <div className="p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Spreadsheet Matrix (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Download your full exercise-by-week weight grid for Excel, Numbers, or Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              exportMatrixAsCsv(state);
              setStatusMessage({ type: 'ok', text: 'CSV matrix downloaded.' });
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Full JSON Backup</h3>
            <p className="text-xs text-slate-500 mt-1">
              Save a complete portable backup or restore an earlier LoadLog export file.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportStateAsJson(state);
                setStatusMessage({ type: 'ok', text: 'JSON backup downloaded.' });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Program Reset</h3>
            <p className="text-xs text-slate-500 mt-1">
              Reload the 8-week sample program or clear all entries to start your own cycle from scratch.
            </p>
          </div>

          {confirmAction ? (
            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-xs font-medium text-slate-700">
                {confirmAction === 'starter' ? 'Restore sample 8-week data?' : 'Clear all exercises & logs?'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction === 'starter') {
                      onResetStarter();
                      setStatusMessage({ type: 'ok', text: 'Restored 8-week sample training data.' });
                    } else {
                      onClearAll();
                      setStatusMessage({ type: 'ok', text: 'Cleared all data. Ready for your first lift.' });
                    }
                    setConfirmAction(null);
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction('starter')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Sample Data</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('clear')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-red-200 bg-white text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Start Empty</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <p
          role="status"
          className={`text-xs font-medium ${
            statusMessage.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {statusMessage.text}
        </p>
      )}
    </section>
  );
}
