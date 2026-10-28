import React, { useState, useMemo } from 'react';
import { getAllCertificates } from '../services/certificateStore';
import { CalculationCertificate } from '../types/certificate';
import { generateCertificatePDF } from '../pdf/certificatePdf';
import {
  History,
  Search,
  Download,
  RotateCcw,
  Calendar,
  Layers,
  FileCheck2,
  Trash2,
} from 'lucide-react';

interface CalculationHistoryProps {
  onRecalculate: (cert: CalculationCertificate) => void;
  onVerify: (certId: string) => void;
}

export const CalculationHistory: React.FC<CalculationHistoryProps> = ({
  onRecalculate,
  onVerify,
}) => {
  const [certs, setCerts] = useState<CalculationCertificate[]>(() => getAllCertificates());
  const [searchQuery, setSearchQuery] = useState('');
  const [designFilter, setDesignFilter] = useState('all');

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      const matchesSearch =
        c.certificateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.researcherName && c.researcherName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDesign = designFilter === 'all' || c.studyDesign.toLowerCase().includes(designFilter.toLowerCase());

      return matchesSearch && matchesDesign;
    });
  }, [certs, searchQuery, designFilter]);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your local calculation history?')) {
      localStorage.removeItem('statsmate_certificates_v1');
      setCerts([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200/60">
              Module F
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Calculation History &amp; Certificate Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse past sample size runs, re-download certificates, and recalculate studies under altered clinical assumptions.
          </p>
        </div>
        {certs.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Local History
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Certificate ID, title, or researcher..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-2xs text-slate-500 font-semibold uppercase">Filter Design:</span>
          <select
            value={designFilter}
            onChange={(e) => setDesignFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Study Designs</option>
            <option value="mean">Mean Comparisons</option>
            <option value="anova">ANOVA</option>
            <option value="proportion">Proportions & Prevalence</option>
            <option value="correlation">Correlation</option>
          </select>
        </div>
      </div>

      {/* List of Calculation Records */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.certificateId}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                    {c.certificateId}
                  </span>
                  <span className="text-2xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.issuedAt).toLocaleDateString()}
                  </span>
                  <span className="text-2xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {c.studyDesign}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerify(c.certificateId)}
                    className="text-2xs font-bold text-indigo-600 hover:underline"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => onRecalculate(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Recalculate
                  </button>
                  <button
                    onClick={() => generateCertificatePDF(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">{c.studyTitle}</h4>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Endpoint: <span className="text-slate-700 font-medium">{c.primaryOutcome}</span> | Investigator: {c.researcherName || 'Not recorded'}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-2xs font-mono">
                <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-slate-700">
                  N_eval: <strong className="text-indigo-700">{c.parameters.evaluableN}</strong>
                </div>
                <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-slate-700">
                  N_recruitment (+{c.parameters.dropoutRate}%): <strong className="text-amber-700">{c.parameters.recruitmentN}</strong>
                </div>
                <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-slate-700">
                  Effect Size ({c.parameters.effectSizeName}): <strong>{c.parameters.effectSize.toFixed(3)}</strong>
                </div>
                <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-slate-700">
                  Power: {(c.parameters.power * 100).toFixed(0)}% (α = {c.parameters.alpha})
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-2">
          <History className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No Calculation Records Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No calculations match your search criteria.'
              : 'Perform a sample size calculation in Module A and issue a certificate to populate this audit history.'}
          </p>
        </div>
      )}
    </div>
  );
};
