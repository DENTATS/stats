import React from 'react';
import {
  Calculator,
  BarChart2,
  Compass,
  FileCheck2,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  Layers,
} from 'lucide-react';
import { CalculationCertificate } from '../types/certificate';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  certificates: CalculationCertificate[];
  hasGoogleConnected: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  certificates,
  hasGoogleConnected,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-2xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Biostatistical Calculation Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            StatsMate Research
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Deterministic sample size determination, robust dataset biostatistics, and verifiable statistical certificates for dental researchers, clinicians, universities, and biomedical scientists.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('sample_size')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 transition shadow-sm cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              Launch Sample Size Calculator
            </button>
            <button
              onClick={() => onNavigate('analysis')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
              Analyze Research Dataset
            </button>
            <button
              onClick={() => onNavigate('planner')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              Study Protocol Wizard
            </button>
          </div>
        </div>

        {/* Decorative corner graphic */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Quick Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-3xs uppercase font-bold text-slate-500">Engine Accuracy</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            100% Tested
          </div>
          <span className="text-3xs text-slate-400">Validated vs R pwr package</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-3xs uppercase font-bold text-slate-500">Supported Designs</span>
          <div className="text-xl font-extrabold text-indigo-700 font-mono mt-1">
            10 Models
          </div>
          <span className="text-3xs text-slate-400">Means, ANOVA, proportions, etc.</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-3xs uppercase font-bold text-slate-500">Issued Certificates</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {certificates.length}
          </div>
          <span className="text-3xs text-slate-400">Recorded with SHA-256 hash</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-3xs uppercase font-bold text-slate-500">Google Sheets Sync</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
            <FileSpreadsheet className="w-5 h-5" />
            {hasGoogleConnected ? 'Connected' : 'Ready'}
          </div>
          <span className="text-3xs text-slate-400">Import &amp; export enabled</span>
        </div>
      </div>

      {/* Primary Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module A */}
        <div
          onClick={() => onNavigate('sample_size')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-indigo-600 tracking-wider">Module A</span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
              Sample Size &amp; Power Calculator
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Two-sample means, paired designs, multi-group ANOVA, prevalence estimation, diagnostic sensitivity/specificity, and non-inferiority trials.
            </p>
          </div>
          <div className="text-2xs font-bold text-indigo-600 flex items-center gap-1 pt-1">
            Open Calculator <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module B */}
        <div
          onClick={() => onNavigate('analysis')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-teal-600 tracking-wider">Module B</span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition">
              Dataset Statistical Analysis
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload CSV, Excel, or Google Sheets. Run t-tests, Welch, ANOVA with Tukey HSD, Mann–Whitney, Chi-square, regression, and normality diagnostics.
            </p>
          </div>
          <div className="text-2xs font-bold text-teal-600 flex items-center gap-1 pt-1">
            Open Analysis Suite <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module C */}
        <div
          onClick={() => onNavigate('planner')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-amber-600 tracking-wider">Module C</span>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition">
              Research Study Protocol Planner
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Design in-vitro laboratory studies, clinical trials, and diagnostic evaluations aligned with CRIS, CONSORT, and STARD reporting checklists.
            </p>
          </div>
          <div className="text-2xs font-bold text-amber-600 flex items-center gap-1 pt-1">
            Start Planning Wizard <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Verification & Certification Feature Showcase */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Verifiable Calculation Certificates (Module E)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every sample size calculation produces an official, print-ready Certificate of Statistical Calculation featuring a deterministic SHA-256 record hash and QR code for ethics committee and journal reviewers to verify online.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('verify')}
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition cursor-pointer"
          >
            Verification Portal
          </button>
          <button
            onClick={() => onNavigate('validation')}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition cursor-pointer"
          >
            Scientific Validation Matrix
          </button>
        </div>
      </div>
    </div>
  );
};

function CheckCircle2(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
