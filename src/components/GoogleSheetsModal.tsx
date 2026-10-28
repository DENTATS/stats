import React, { useState } from 'react';
import { readGoogleSheet, createAndExportGoogleSheet } from '../services/sheetsService';
import { ConfirmationModal } from './common/ConfirmationModal';
import { FileSpreadsheet, ArrowDownToLine, ArrowUpRight, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  mode: 'import' | 'export';
  exportData?: {
    title: string;
    rows: (string | number)[][];
  };
  onImportSuccess?: (data: { headers: string[]; rows: any[][]; title: string }) => void;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  mode,
  exportData,
  onImportSuccess,
  onClose,
}) => {
  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [sheetRange, setSheetRange] = useState('A1:Z500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [showConfirmExport, setShowConfirmExport] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!sheetUrlOrId.trim()) {
      setError('Please provide a Google Spreadsheet URL or ID.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await readGoogleSheet(sheetUrlOrId, sheetRange);
      if (onImportSuccess) {
        onImportSuccess(result);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExport = async () => {
    setShowConfirmExport(false);
    if (!exportData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createAndExportGoogleSheet(exportData.title, exportData.rows);
      setExportUrl(result.url);
    } catch (err: any) {
      setError(err.message || 'Failed to export spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'import' ? 'Import from Google Sheets' : 'Export to Google Sheets'}
              </h3>
              <p className="text-2xs text-slate-500">Google Workspace Sheets Integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'import' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Spreadsheet URL or Sheet ID:
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit or Sheet ID"
                  value={sheetUrlOrId}
                  onChange={(e) => setSheetUrlOrId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p className="text-3xs text-slate-500 mt-1">
                  Ensure the spreadsheet is shared with your signed-in Google account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Range / Sheet Tab (Optional):
                </label>
                <input
                  type="text"
                  value={sheetRange}
                  onChange={(e) => setSheetRange(e.target.value)}
                  placeholder="e.g. Sheet1!A1:Z500"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <ArrowDownToLine className="w-4 h-4" />
                  Import Data
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {exportUrl ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">Spreadsheet Created Successfully!</h4>
                  <p className="text-xs text-emerald-800">
                    Your research dataset and calculation records have been exported directly to your Google Drive.
                  </p>
                  <a
                    href={exportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                  >
                    Open Google Sheet <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This will create a new Google Spreadsheet titled{' '}
                    <strong className="text-slate-900">"StatsMate — {exportData?.title}"</strong> in your Google Drive with {exportData?.rows.length || 0} formatted row(s).
                  </p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                    <span className="text-2xs font-semibold uppercase text-slate-500">Preview Headers:</span>
                    <div className="text-2xs font-mono text-slate-700 mt-1 truncate">
                      {exportData?.rows[0]?.join(' | ')}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmExport(true)}
                      disabled={loading}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Google Spreadsheet
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mandatory user confirmation dialog before creating/modifying Workspace files */}
      <ConfirmationModal
        isOpen={showConfirmExport}
        title="Confirm Google Drive Export"
        message={`Are you sure you want to create a new spreadsheet in your Google Drive containing ${exportData?.rows.length || 0} rows of statistical research data?`}
        confirmLabel="Export to Sheets"
        onConfirm={handleConfirmExport}
        onCancel={() => setShowConfirmExport(false)}
      />
    </div>
  );
};
