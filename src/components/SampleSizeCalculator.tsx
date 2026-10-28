import React, { useState, useEffect } from 'react';
import {
  StudyDesignType,
  SampleSizeInputs,
  SampleSizeResult,
} from '../types/sampleSize';
import { calculateSampleSize } from '../stats/sampleSizeEngine';
import { createCertificate } from '../services/certificateStore';
import { generateCertificatePDF } from '../pdf/certificatePdf';
import { generateComprehensiveReportPDF } from '../pdf/reportGenerator';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import {
  Calculator,
  Download,
  Award,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface SampleSizeCalculatorProps {
  initialInputs?: Partial<SampleSizeInputs>;
  onCertificateIssued?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SampleSizeCalculator: React.FC<SampleSizeCalculatorProps> = ({
  initialInputs,
  onCertificateIssued,
  onNavigateToTab,
}) => {
  const [inputs, setInputs] = useState<SampleSizeInputs>({
    studyDesign: initialInputs?.studyDesign || 'two_independent_means',
    studyTitle: initialInputs?.studyTitle || 'Comparative Efficacy of Dental Resin Composite vs Glass Ionomer Cement',
    primaryOutcome: initialInputs?.primaryOutcome || 'Microtensile Shear Bond Strength (MPa)',
    researcherName: initialInputs?.researcherName || 'Dr. Alex Rivera, DDS, MSc',
    institution: initialInputs?.institution || 'Department of Biomaterials & Restorative Dentistry',
    alpha: initialInputs?.alpha ?? 0.05,
    power: initialInputs?.power ?? 0.80,
    hypothesis: initialInputs?.hypothesis || 'two_sided',
    allocationRatio: initialInputs?.allocationRatio ?? 1.0,
    dropoutRate: initialInputs?.dropoutRate ?? 15,
    // Defaults for two independent means:
    mean1: 28.5,
    mean2: 24.0,
    sd: 4.5,
    meanDiff: 4.5,
    numGroups: 3,
    cohensF: 0.28,
    prop1: 0.40,
    prop2: 0.65,
    expectedProp: 0.18,
    marginOfError: 0.05,
    expectedCorrelation: 0.45,
    sensitivity: 0.90,
    specificity: 0.88,
    prevalence: 0.25,
    diagnosticPrecision: 0.06,
    marginNonInferiority: 2.0,
    clusterSize: 25,
    icc: 0.04,
  });

  const [result, setResult] = useState<SampleSizeResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [issuedCertId, setIssuedCertId] = useState<string | null>(null);

  // Trigger calculation when inputs change
  useEffect(() => {
    let isCancelled = false;
    const runCalc = async () => {
      setCalculating(true);
      try {
        const res = await calculateSampleSize(inputs);
        if (!isCancelled) {
          setResult(res);
        }
      } catch (e) {
        console.error('Calculation error:', e);
      } finally {
        if (!isCancelled) setCalculating(false);
      }
    };
    runCalc();
    return () => {
      isCancelled = true;
    };
  }, [inputs]);

  const handleStudyDesignChange = (design: StudyDesignType) => {
    setInputs((prev) => ({
      ...prev,
      studyDesign: design,
    }));
  };

  const handleIssueCertificate = async () => {
    if (!result) return;
    try {
      const cert = await createCertificate(inputs, result);
      setIssuedCertId(cert.certificateId);
      generateCertificatePDF(cert);
      if (onCertificateIssued) onCertificateIssued();
    } catch (e) {
      console.error('Failed to issue certificate:', e);
    }
  };

  const handleDownloadFullReport = async () => {
    if (!result) return;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `SMR-REP-2026-${randomSuffix}`;
    await generateComprehensiveReportPDF({
      reportId,
      studyTitle: inputs.studyTitle,
      primaryOutcome: inputs.primaryOutcome,
      researcherName: inputs.researcherName,
      institution: inputs.institution,
      createdAt: new Date().toISOString(),
      sampleSizeInputs: inputs,
      sampleSizeResult: result,
    });
  };

  const getExportRows = (): (string | number)[][] => {
    if (!result) return [];
    return [
      ['StatsMate Research — Sample Size Protocol', ''],
      ['Study Title', inputs.studyTitle],
      ['Primary Outcome', inputs.primaryOutcome],
      ['Principal Investigator', inputs.researcherName || ''],
      ['Institution', inputs.institution || ''],
      ['Study Design', result.studyDesign],
      ['Significance Level (alpha)', result.alpha],
      ['Statistical Power (1 - beta)', result.power],
      ['Hypothesis', inputs.hypothesis],
      ['Effect Size Metric', result.effectSizeName],
      ['Effect Size Value', result.effectSizeValue],
      ['Required Evaluable Sample Size (N_eval)', result.evaluableN],
      ['Dropout / Attrition Buffer (%)', `${result.dropoutRate}%`],
      ['Total Recruitment Target (N_rec)', result.recruitmentN],
      ['Group Breakdown', result.n1 && result.n2 ? `n1 = ${result.n1}, n2 = ${result.n2}` : `n/group = ${result.nPerGroup || result.evaluableN}`],
      ['Record Hash (SHA-256)', result.hash],
      ['Calculation Timestamp', result.calculationTimestamp],
    ];
  };

  const studyDesignOptions: { id: StudyDesignType; label: string; desc: string }[] = [
    { id: 'two_independent_means', label: 'Two Independent Means', desc: 'Parallel trial comparing two active or control group averages' },
    { id: 'paired_means', label: 'Paired Means', desc: 'Pre vs post, matched pairs, or split-mouth contralateral sites' },
    { id: 'one_way_anova', label: 'One-Way ANOVA (>= 3 Groups)', desc: 'Multi-arm trial with Cohen’s f & non-central F power' },
    { id: 'two_independent_proportions', label: 'Two Independent Proportions', desc: 'Binary outcomes (Fleiss continuity-corrected)' },
    { id: 'one_sample_proportion', label: 'Prevalence & Single Proportion', desc: 'Epidemiological prevalence survey with precision margin' },
    { id: 'one_sample_mean', label: 'One-Sample Mean', desc: 'Compare cohort mean to standard or benchmark reference' },
    { id: 'correlation', label: 'Correlation Study', desc: 'Pearson or Spearman association via Fisher z-transformation' },
    { id: 'diagnostic_accuracy', label: 'Diagnostic Sensitivity & Specificity', desc: 'Buderer formula ensuring adequate precision for both metrics' },
    { id: 'non_inferiority_means', label: 'Non-Inferiority Trial (Means)', desc: 'Blackwelder formula testing margin against standard therapy' },
    { id: 'cluster_randomized_means', label: 'Cluster-Randomized Trial', desc: 'Donner & Klar design effect inflated for ICC / clustering' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200/60">
                Module A
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Sample Size & Statistical Power Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic power algorithms with exact degrees of freedom, continuity corrections, and attrition compensation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleIssueCertificate}
              disabled={!result}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Award className="w-4 h-4 text-amber-300" />
              Issue Verifiable Certificate
            </button>
            <button
              onClick={handleDownloadFullReport}
              disabled={!result}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              PDF Protocol Report
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={!result}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export to Google Sheets
            </button>
          </div>
        </div>
      </div>

      {issuedCertId && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Official Certificate Generated: {issuedCertId}
              </h4>
              <p className="text-2xs text-emerald-700">
                Calculation has been recorded with cryptographic hash and stored for audit verification.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('verify')}
              className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
            >
              Verify Record <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Study Design Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Select Study Design & Statistical Model:
            </label>
            <select
              value={inputs.studyDesign}
              onChange={(e) => handleStudyDesignChange(e.target.value as StudyDesignType)}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              {studyDesignOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Research Context Metadata */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Research Study Metadata
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Research Title:
                </label>
                <input
                  type="text"
                  value={inputs.studyTitle}
                  onChange={(e) => setInputs({ ...inputs, studyTitle: e.target.value })}
                  placeholder="e.g. Microtensile Bond Strength of Bioactive Dental Cements"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Primary Outcome Endpoint:
                  </label>
                  <input
                    type="text"
                    value={inputs.primaryOutcome}
                    onChange={(e) => setInputs({ ...inputs, primaryOutcome: e.target.value })}
                    placeholder="e.g. Shear Bond Strength (MPa)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Principal Investigator:
                  </label>
                  <input
                    type="text"
                    value={inputs.researcherName}
                    onChange={(e) => setInputs({ ...inputs, researcherName: e.target.value })}
                    placeholder="e.g. Dr. Jane Smith"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Core Hypothesis & Power Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hypothesis & Error Rates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Alpha */}
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Significance Level (α):
                </label>
                <select
                  value={inputs.alpha}
                  onChange={(e) => setInputs({ ...inputs, alpha: parseFloat(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={0.05}>α = 0.05 (Standard 5%)</option>
                  <option value={0.01}>α = 0.01 (Strict 1%)</option>
                  <option value={0.025}>α = 0.025 (Non-Inferiority)</option>
                  <option value={0.10}>α = 0.10 (Exploratory 10%)</option>
                </select>
              </div>

              {/* Power */}
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Statistical Power (1 - β):
                </label>
                <select
                  value={inputs.power}
                  onChange={(e) => setInputs({ ...inputs, power: parseFloat(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={0.80}>80% Power (Standard β=0.20)</option>
                  <option value={0.85}>85% Power (β=0.15)</option>
                  <option value={0.90}>90% Power (High β=0.10)</option>
                  <option value={0.95}>95% Power (Rigorous β=0.05)</option>
                </select>
              </div>

              {/* Hypothesis Tail */}
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Hypothesis Direction:
                </label>
                <select
                  value={inputs.hypothesis}
                  onChange={(e) => setInputs({ ...inputs, hypothesis: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="two_sided">Two-sided (H₁: μ₁ ≠ μ₂)</option>
                  <option value="one_sided">One-sided (H₁: μ₁ &gt; μ₂)</option>
                </select>
              </div>
            </div>

            {/* Allocation Ratio & Dropout Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-semibold text-slate-600">
                    Allocation Ratio (k = N₂ / N₁):
                  </label>
                  <span className="text-2xs font-mono text-indigo-700 font-bold">
                    {inputs.allocationRatio}:1
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.5"
                  value={inputs.allocationRatio}
                  onChange={(e) => setInputs({ ...inputs, allocationRatio: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-3xs text-slate-400">1:1 equal allocation is most statistically efficient.</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-semibold text-slate-600">
                    Dropout / Unusable Specimen Buffer:
                  </label>
                  <span className="text-2xs font-mono text-amber-700 font-bold">
                    {inputs.dropoutRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={inputs.dropoutRate}
                  onChange={(e) => setInputs({ ...inputs, dropoutRate: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <span className="text-3xs text-slate-400">Inflates evaluable sample size for clinical or lab attrition.</span>
              </div>
            </div>
          </div>

          {/* Model-Specific Parameter Inputs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Model Effect Size & Variability Inputs
            </h3>

            {/* Two independent means */}
            {inputs.studyDesign === 'two_independent_means' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Group 1 Mean (μ₁):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.mean1}
                    onChange={(e) => setInputs({ ...inputs, mean1: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Group 2 Mean (μ₂):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.mean2}
                    onChange={(e) => setInputs({ ...inputs, mean2: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Pooled SD (σ):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.sd}
                    onChange={(e) => setInputs({ ...inputs, sd: parseFloat(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Paired means */}
            {inputs.studyDesign === 'paired_means' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Expected Mean Difference of Pairs (δ):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.meanDiff}
                    onChange={(e) => setInputs({ ...inputs, meanDiff: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    SD of Paired Differences (σ_d):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.sdDiff}
                    onChange={(e) => setInputs({ ...inputs, sdDiff: parseFloat(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* One-way ANOVA */}
            {inputs.studyDesign === 'one_way_anova' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Number of Groups (k ≥ 3):
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={inputs.numGroups}
                    onChange={(e) => setInputs({ ...inputs, numGroups: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Standardized Cohen's f (0.10=small, 0.25=med, 0.40=large):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.cohensF}
                    onChange={(e) => setInputs({ ...inputs, cohensF: parseFloat(e.target.value) || 0.25 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Two proportions */}
            {inputs.studyDesign === 'two_independent_proportions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Group 1 Proportion (p₁ e.g. 0.40):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    value={inputs.prop1}
                    onChange={(e) => setInputs({ ...inputs, prop1: parseFloat(e.target.value) || 0.1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Group 2 Proportion (p₂ e.g. 0.65):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    value={inputs.prop2}
                    onChange={(e) => setInputs({ ...inputs, prop2: parseFloat(e.target.value) || 0.2 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* One sample proportion & prevalence */}
            {inputs.studyDesign === 'one_sample_proportion' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Anticipated Prevalence / Proportion (P):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    value={inputs.expectedProp}
                    onChange={(e) => setInputs({ ...inputs, expectedProp: parseFloat(e.target.value) || 0.1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Absolute Precision Margin (d e.g. 0.05):
                  </label>
                  <input
                    type="number"
                    step="0.005"
                    min="0.005"
                    max="0.2"
                    value={inputs.marginOfError}
                    onChange={(e) => setInputs({ ...inputs, marginOfError: parseFloat(e.target.value) || 0.05 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Correlation */}
            {inputs.studyDesign === 'correlation' && (
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Expected Correlation Coefficient (r between -0.99 and 0.99):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="-0.99"
                  max="0.99"
                  value={inputs.expectedCorrelation}
                  onChange={(e) => setInputs({ ...inputs, expectedCorrelation: parseFloat(e.target.value) || 0.3 })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            )}

            {/* Diagnostic accuracy */}
            {inputs.studyDesign === 'diagnostic_accuracy' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Anticipated Sensitivity (0.50 - 0.99):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.sensitivity}
                    onChange={(e) => setInputs({ ...inputs, sensitivity: parseFloat(e.target.value) || 0.8 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Anticipated Specificity (0.50 - 0.99):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.specificity}
                    onChange={(e) => setInputs({ ...inputs, specificity: parseFloat(e.target.value) || 0.8 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Target Disease Prevalence (0.01 - 0.99):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.prevalence}
                    onChange={(e) => setInputs({ ...inputs, prevalence: parseFloat(e.target.value) || 0.2 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Precision Width (w e.g. 0.05):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.diagnosticPrecision}
                    onChange={(e) => setInputs({ ...inputs, diagnosticPrecision: parseFloat(e.target.value) || 0.05 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Non-inferiority */}
            {inputs.studyDesign === 'non_inferiority_means' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Non-Inferiority Margin (Δ &gt; 0):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.marginNonInferiority}
                    onChange={(e) => setInputs({ ...inputs, marginNonInferiority: parseFloat(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Anticipated Diff (|μT - μC|):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.meanDiff}
                    onChange={(e) => setInputs({ ...inputs, meanDiff: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Common SD (σ):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.sd}
                    onChange={(e) => setInputs({ ...inputs, sd: parseFloat(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Cluster-randomized */}
            {inputs.studyDesign === 'cluster_randomized_means' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Average Cluster Size (m subjects/cluster):
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={inputs.clusterSize}
                    onChange={(e) => setInputs({ ...inputs, clusterSize: parseInt(e.target.value, 10) || 20 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Intracluster Correlation (ICC / ρ):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    max="0.3"
                    value={inputs.icc}
                    onChange={(e) => setInputs({ ...inputs, icc: parseFloat(e.target.value) || 0.05 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calculated Results & Derivation (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white">
                <span className="text-2xs uppercase tracking-widest text-indigo-300 font-bold">
                  Recommended Sample Size Targets
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-4xl font-extrabold text-white tracking-tight">
                      {result.evaluableN}
                    </div>
                    <div className="text-2xs text-slate-300 font-medium mt-0.5">
                      Evaluable Subjects / Specimens (N_eval)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-amber-400 font-mono">
                      {result.recruitmentN}
                    </div>
                    <div className="text-2xs text-amber-200/80 font-medium mt-0.5">
                      Recruitment Target (+{result.dropoutRate}% Attrition)
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown if multiple groups */}
                {result.n1 && result.n2 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-2xs text-slate-300">
                    <span>
                      Arm 1: <strong className="text-white font-mono">{result.n1}</strong>
                    </span>
                    <span>
                      Arm 2: <strong className="text-white font-mono">{result.n2}</strong>
                    </span>
                    <span>
                      Ratio: <strong className="text-white font-mono">{result.allocationRatio}:1</strong>
                    </span>
                  </div>
                )}
                {result.nPerGroup && !result.n1 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-2xs text-slate-300">
                    <span>
                      Subjects per group: <strong className="text-white font-mono">{result.nPerGroup}</strong>
                    </span>
                    <span>
                      Groups: <strong className="text-white font-mono">{inputs.numGroups || 2}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Effect Size & Interpretation */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-semibold text-slate-600 uppercase">
                    Standardized Effect Size:
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    {result.effectSizeName} = {result.effectSizeValue.toFixed(3)}
                  </span>
                </div>
                <div className="text-2xs text-slate-500 mt-1 font-medium">
                  Interpretation: <span className="text-slate-800 font-semibold">{result.effectSizeInterpretation}</span>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border-b border-amber-200 text-2xs text-amber-800 space-y-1">
                  {result.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Intermediate Steps Breakdown */}
              <div className="p-4 space-y-3">
                <h4 className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                  Step-by-Step Derivation & Intermediate Steps:
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {result.steps.map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-2xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{step.name}</span>
                        <span className="font-mono text-indigo-600">{step.intermediateValue}</span>
                      </div>
                      <p className="text-slate-500 text-3xs">{step.description}</p>
                    </div>
                  ))}
                </div>

                {/* Formula Box */}
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-1">
                  <span className="text-3xs uppercase font-bold text-indigo-900">
                    Exact Mathematical Model:
                  </span>
                  <div className="font-mono text-xs text-indigo-950 font-bold overflow-x-auto py-1">
                    {result.formulaLaTeX}
                  </div>
                  <p className="text-3xs text-indigo-800/80">{result.formulaExplanation}</p>
                </div>

                {/* Assumptions List */}
                <div className="space-y-1 pt-1">
                  <span className="text-3xs uppercase font-bold text-slate-500">
                    Required Assumptions:
                  </span>
                  <ul className="text-3xs text-slate-600 space-y-0.5 list-disc list-inside">
                    {result.assumptions.map((assump, i) => (
                      <li key={i}>{assump}</li>
                    ))}
                  </ul>
                </div>

                {/* Deterministic Hash */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400 font-mono">
                  <span>Record Hash:</span>
                  <span className="truncate max-w-[200px]" title={result.hash}>
                    {result.hash}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export to Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={showExportModal}
        mode="export"
        exportData={{
          title: `Sample Size Protocol — ${inputs.studyTitle.substring(0, 30)}`,
          rows: getExportRows(),
        }}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};
