import React, { useState } from 'react';
import { StudyPlan, StudyCategory } from '../types/planner';
import { getMethodologicalAdvice, MethodologicalAdviceResponse } from '../services/geminiAdvisor';
import {
  Compass,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  FlaskConical,
  Activity,
  Microscope,
  Stethoscope,
  Scale,
} from 'lucide-react';

interface StudyPlannerProps {
  onTransferToCalculator: (params: {
    studyDesign: any;
    studyTitle: string;
    primaryOutcome: string;
    numGroups?: number;
  }) => void;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({ onTransferToCalculator }) => {
  const [plan, setPlan] = useState<Partial<StudyPlan>>({
    category: 'in_vitro',
    title: 'Bond Strength and Microleakage of Nanohybrid Restorative Composites',
    hypothesis: 'Application of universal adhesive in self-etch mode yields non-inferior microtensile bond strength compared to total-etch control.',
    primaryOutcome: 'Microtensile Bond Strength (MPa)',
    outcomeType: 'continuous',
    experimentalUnit: 'Extracted human molar coronal dentin specimen disk',
    numberOfGroups: 3,
    groupLabels: ['Total-Etch Control', 'Universal Self-Etch', 'Bioactive Resin'],
    mcid: '3.0 MPa (Minimal Clinically Important Difference)',
    proposedAnalysis: 'One-Way ANOVA with Tukey HSD post-hoc comparisons',
    sampleSizeRationale: 'Based on pilot study SD of 4.2 MPa with 80% power at alpha=0.05.',
    confirmedByResearcher: false,
  });

  const [advice, setAdvice] = useState<MethodologicalAdviceResponse | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const categories: { id: StudyCategory; label: string; icon: any; guidelines: string }[] = [
    { id: 'in_vitro', label: 'In-Vitro Laboratory Study', icon: FlaskConical, guidelines: 'CRIS Guidelines (Checklist for Reporting In-vitro Studies)' },
    { id: 'rct', label: 'Randomized Controlled Trial', icon: Stethoscope, guidelines: 'CONSORT 2010 Statement' },
    { id: 'observational', label: 'Observational Cohort / Cross-Sectional', icon: Activity, guidelines: 'STROBE Guidelines' },
    { id: 'diagnostic', label: 'Diagnostic Test Accuracy', icon: Microscope, guidelines: 'STARD 2015 Statement' },
    { id: 'reliability', label: 'Reliability & Agreement Study', icon: Scale, guidelines: 'GRRAS Guidelines' },
  ];

  const handleFetchAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const res = await getMethodologicalAdvice(plan);
      setAdvice(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleApplyToCalculator = () => {
    let targetDesign = 'two_independent_means';
    if (plan.category === 'in_vitro' && (plan.numberOfGroups || 2) > 2) {
      targetDesign = 'one_way_anova';
    } else if (plan.category === 'diagnostic') {
      targetDesign = 'diagnostic_accuracy';
    } else if (plan.category === 'observational' && plan.outcomeType === 'binary') {
      targetDesign = 'two_independent_proportions';
    }

    onTransferToCalculator({
      studyDesign: targetDesign,
      studyTitle: plan.title || 'Research Protocol',
      primaryOutcome: plan.primaryOutcome || 'Primary Metric',
      numGroups: plan.numberOfGroups,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200/60">
                Module C
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Research Study Planning &amp; Protocol Wizard
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Structured protocol framework adhering to reporting checklists (CONSORT, STROBE, STARD, CRIS) with unit-of-analysis safeguards.
            </p>
          </div>
          <button
            onClick={handleApplyToCalculator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
          >
            Apply to Sample Size Calculator <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Form & Guidance Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Study Category Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Study Methodology Category:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = plan.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPlan({ ...plan, category: cat.id })}
                    className={`flex items-start gap-2.5 p-3 rounded-lg text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold">{cat.label}</div>
                      <div className="text-3xs text-slate-500 mt-0.5">{cat.guidelines}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Protocol Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Protocol Objectives &amp; Design Variables
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Study Title:
                </label>
                <input
                  type="text"
                  value={plan.title}
                  onChange={(e) => setPlan({ ...plan, title: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Primary Research Hypothesis:
                </label>
                <textarea
                  rows={2}
                  value={plan.hypothesis}
                  onChange={(e) => setPlan({ ...plan, hypothesis: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Primary Outcome Metric:
                  </label>
                  <input
                    type="text"
                    value={plan.primaryOutcome}
                    onChange={(e) => setPlan({ ...plan, primaryOutcome: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Outcome Data Type:
                  </label>
                  <select
                    value={plan.outcomeType}
                    onChange={(e) => setPlan({ ...plan, outcomeType: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="continuous">Continuous (Interval/Ratio e.g. MPa, mm)</option>
                    <option value="binary">Binary (Success/Failure, Cured/Uncured)</option>
                    <option value="ordinal">Ordinal (Likert Score, Severity Grade)</option>
                    <option value="time_to_event">Time-to-Event / Survival</option>
                  </select>
                </div>
              </div>

              {/* Experimental Unit (CRITICAL BIOMEDICAL DISCIPLINE) */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <label className="text-2xs font-bold text-amber-900 uppercase">
                    Statistical Unit of Analysis / Experimental Unit:
                  </label>
                </div>
                <input
                  type="text"
                  value={plan.experimentalUnit}
                  onChange={(e) => setPlan({ ...plan, experimentalUnit: e.target.value })}
                  placeholder="e.g. Patient, Extracted human tooth, or Specimen disk"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-3xs text-amber-800 leading-relaxed">
                  Crucial: Avoid unit-of-analysis errors! If multiple teeth, specimens, or biopsy cuts belong to the same patient or tooth block, observations are clustered and cannot be treated as statistically independent without cluster adjustments.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Number of Study Arms / Groups:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={plan.numberOfGroups}
                    onChange={(e) => setPlan({ ...plan, numberOfGroups: parseInt(e.target.value, 10) || 2 })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Clinical Relevance (MCID threshold):
                  </label>
                  <input
                    type="text"
                    value={plan.mcid}
                    onChange={(e) => setPlan({ ...plan, mcid: e.target.value })}
                    placeholder="e.g. 2.5 MPa difference"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Proposed Primary Statistical Analysis:
                </label>
                <input
                  type="text"
                  value={plan.proposedAnalysis}
                  onChange={(e) => setPlan({ ...plan, proposedAnalysis: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.confirmedByResearcher}
                    onChange={(e) => setPlan({ ...plan, confirmedByResearcher: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-2xs font-semibold text-slate-800">
                    I confirm that the proposed study design, endpoints, and experimental unit represent the final protocol.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Guidance Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Methodological Guidance Engine
                </h4>
              </div>
              <button
                onClick={handleFetchAdvice}
                disabled={loadingAdvice}
                className="text-2xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {loadingAdvice ? 'Analyzing...' : 'Refresh Advice'}
              </button>
            </div>

            {/* Prominent Mandatory AI Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-3xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Statistical Authority Notice:</strong>
              This assistance provides educational guidance aligned with international reporting guidelines (CONSORT, STROBE, STARD, CRIS). It is not a substitute for formal consultation with a qualified institutional biostatistician or ethics review committee.
            </div>

            {advice ? (
              <div className="space-y-4 animate-in fade-in">
                {/* Method Summary */}
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2">
                  <div className="text-2xs font-bold text-indigo-900 uppercase">
                    Recommended Statistical Strategy:
                  </div>
                  <div className="text-xs font-semibold text-indigo-950">
                    {advice.recommendedStatisticalTest}
                  </div>
                  <p className="text-2xs text-indigo-900/90 leading-relaxed">
                    {advice.guidanceText}
                  </p>
                </div>

                {/* Experimental Unit Safeguard */}
                {advice.experimentalUnitWarning && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-2xs text-amber-900 space-y-1">
                    <strong className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Unit of Analysis Check:
                    </strong>
                    <p className="text-3xs text-amber-800 leading-relaxed">
                      {advice.experimentalUnitWarning}
                    </p>
                  </div>
                )}

                {/* Bias Considerations Checklist */}
                <div className="space-y-2">
                  <span className="text-3xs uppercase font-bold text-slate-500">
                    Key Bias Minimization Directives:
                  </span>
                  <div className="space-y-1.5">
                    {advice.biasConsiderations.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-2xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click below to generate methodological recommendations and bias safeguards tailored to your research objectives.
                </p>
                <button
                  onClick={handleFetchAdvice}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition cursor-pointer"
                >
                  Generate Methodological Review
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
