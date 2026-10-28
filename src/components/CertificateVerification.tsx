import React, { useState, useEffect } from 'react';
import { lookupCertificate } from '../services/certificateStore';
import { CalculationCertificate } from '../types/certificate';
import { generateCertificatePDF } from '../pdf/certificatePdf';
import {
  FileCheck2,
  Search,
  ShieldCheck,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface CertificateVerificationProps {
  initialCertId?: string;
}

export const CertificateVerification: React.FC<CertificateVerificationProps> = ({
  initialCertId,
}) => {
  const [query, setQuery] = useState(initialCertId || '');
  const [cert, setCert] = useState<CalculationCertificate | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check URL parameters for ?verify=...
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify') || initialCertId;
      if (verifyParam) {
        setQuery(verifyParam);
        handleSearch(verifyParam);
      }
    }
  }, [initialCertId]);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    try {
      const found = await lookupCertificate(q);
      setCert(found);
    } catch (e) {
      console.error(e);
      setCert(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Bar Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Official Certificate &amp; Calculation Verification Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Verify the authenticity, cryptographic record hash, and recorded methodological inputs of a StatsMate Research Certificate.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2 max-w-md mx-auto"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Certificate ID (e.g. CERT-STAT-2026-...) or Record Hash"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Record'}
          </button>
        </form>
      </div>

      {/* Verification Result Card */}
      {searched && (
        <div>
          {cert ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              {/* Authenticity Header */}
              <div className="bg-emerald-600 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-3xs uppercase tracking-wider text-emerald-100 font-bold">
                      Cryptographically Validated
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Verified Certificate: {cert.certificateId}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => generateCertificatePDF(cert)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Verified PDF
                </button>
              </div>

              {/* Study Details */}
              <div className="p-6 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-bold text-slate-900">{cert.studyTitle}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-2xs text-slate-600">
                    <div>
                      Primary Outcome: <strong className="text-slate-800">{cert.primaryOutcome}</strong>
                    </div>
                    <div>
                      Investigator: <strong className="text-slate-800">{cert.researcherName || 'Not recorded'}</strong>
                    </div>
                    <div>
                      Institution: <strong className="text-slate-800">{cert.institution || 'Academic Center'}</strong>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Comparison */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs uppercase text-slate-500 font-semibold">Evaluable N</span>
                    <div className="text-xl font-bold font-mono text-indigo-700 mt-0.5">
                      {cert.parameters.evaluableN}
                    </div>
                    <span className="text-3xs text-slate-500">Required Subjects</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs uppercase text-slate-500 font-semibold">Recruitment Target</span>
                    <div className="text-xl font-bold font-mono text-amber-600 mt-0.5">
                      {cert.parameters.recruitmentN}
                    </div>
                    <span className="text-3xs text-slate-500">+{cert.parameters.dropoutRate}% Attrition</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs uppercase text-slate-500 font-semibold">Power &amp; Alpha</span>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                      {(cert.parameters.power * 100).toFixed(0)}% / α={cert.parameters.alpha}
                    </div>
                    <span className="text-3xs text-slate-500">{cert.parameters.hypothesis}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs uppercase text-slate-500 font-semibold">Effect Size</span>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                      {cert.parameters.effectSize.toFixed(3)}
                    </div>
                    <span className="text-3xs text-slate-500">{cert.parameters.effectSizeName}</span>
                  </div>
                </div>

                {/* Method & Software Version */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>
                      Study Design: <strong className="text-slate-800">{cert.studyDesign}</strong>
                    </span>
                    <span>
                      Software Version: <strong className="text-slate-800">{cert.softwareName} {cert.softwareVersion}</strong>
                    </span>
                  </div>
                  <div className="text-2xs text-slate-500">
                    Date of Calculation: {new Date(cert.issuedAt).toUTCString()}
                  </div>
                </div>

                {/* Cryptographic SHA-256 Hash Verification */}
                <div className="p-3.5 bg-slate-900 rounded-xl text-white space-y-1">
                  <div className="flex items-center gap-2 text-3xs uppercase tracking-wider text-slate-400 font-bold">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Cryptographic Deterministic Record Hash:
                  </div>
                  <div className="font-mono text-xs text-emerald-400 break-all select-all py-1">
                    {cert.recordHash}
                  </div>
                  <div className="text-3xs text-slate-400">
                    Matches exact mathematical inputs and algorithmic calculation output timestamp.
                  </div>
                </div>

                {/* Mandatory Regulatory Disclosure Box */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-950 space-y-1">
                  <span className="text-3xs uppercase font-bold text-rose-800 block">
                    Statutory Certification Scope &amp; Limitation Disclosure:
                  </span>
                  <p className="text-2xs text-rose-900 leading-relaxed">
                    {cert.mandatoryDisclosure}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Certificate Record Not Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified calculation record matching "{query}" exists in the calculation store. Verify that the certificate ID was entered accurately.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
