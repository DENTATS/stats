import React, { useState } from 'react';
import { BookOpen, Search, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';

export const StatisticalGlossary: React.FC = () => {
  const [search, setSearch] = useState('');

  const terms = [
    {
      term: 'Alpha (α) / Significance Level',
      category: 'Hypothesis Testing',
      definition: 'The probability of committing a Type-I error (rejecting the null hypothesis when it is true; false positive rate). Conventionally set at 0.05, corresponding to a 95% confidence level.',
      formula: 'α = P(\\text{Reject } H_0 \\mid H_0 \\text{ is true})',
    },
    {
      term: 'Statistical Power (1 - β)',
      category: 'Sample Size',
      definition: 'The probability of correctly detecting a true effect of specified magnitude and rejecting a false null hypothesis. Standard thresholds are 80% (β=0.20), 90% (β=0.10), or 95% (β=0.05).',
      formula: '\\text{Power} = 1 - \\beta = P(\\text{Reject } H_0 \\mid H_1 \\text{ is true})',
    },
    {
      term: "Cohen's d (Standardized Mean Difference)",
      category: 'Effect Size',
      definition: 'The difference between two population means divided by their common standard deviation. Standard benchmarks: d = 0.2 (small), d = 0.5 (medium), d = 0.8 (large).',
      formula: 'd = \\frac{|\\mu_1 - \\mu_2|}{\\sigma}',
    },
    {
      term: "Cohen's f (ANOVA Effect Size)",
      category: 'Effect Size',
      definition: 'The standard deviation of k group means divided by the pooled within-group standard deviation. Benchmarks: f = 0.10 (small), f = 0.25 (medium), f = 0.40 (large). Related to eta-squared by f = sqrt(η² / (1 - η²)).',
      formula: 'f = \\frac{\\sigma_m}{\\sigma_{\\text{within}}}',
    },
    {
      term: "Cohen's h (Proportions Difference)",
      category: 'Effect Size',
      definition: 'Standardized measure of distance between two independent proportions using an arcsine transformation. Prevents variance stabilization artifacts at extreme proportions near 0 or 1.',
      formula: 'h = 2 |\\arcsin\\sqrt{p_1} - \\arcsin\\sqrt{p_2}|',
    },
    {
      term: "Student's t-Test vs Welch's t-Test",
      category: 'Parametric Inference',
      definition: "Student's t-test assumes homogeneous population variances (homoscedasticity). Welch's t-test does not assume equal variances and uses the Welch-Satterthwaite approximation for fractional degrees of freedom, maintaining robust Type-I error rates.",
      formula: 't_{\\text{Welch}} = \\frac{\\bar{X}_1 - \\bar{X}_2}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}}',
    },
    {
      term: 'Minimal Clinically Important Difference (MCID)',
      category: 'Clinical Significance',
      definition: 'The smallest change or difference in a clinical or patient-reported outcome that clinicians or patients consider meaningful. Sample size calculations should be powered on the MCID rather than an arbitrary mathematical convenience.',
      formula: '\\Delta \\ge \\text{MCID}',
    },
    {
      term: 'Dropout / Attrition Compensation',
      category: 'Study Protocol',
      definition: 'Sample sizes calculated by statistical formulas represent evaluable completions. Total recruitment must be inflated to guarantee the evaluable target is met after participant withdrawal, specimen loss, or non-evaluable fractures.',
      formula: 'N_{\\text{recruitment}} = \\left\\lceil \\frac{N_{\\text{evaluable}}}{1 - (\\text{dropout}\\% / 100)} \\right\\rceil',
    },
    {
      term: 'Variance Inflation Factor (VIF) & Intracluster Correlation (ICC)',
      category: 'Cluster Trials',
      definition: 'In cluster-randomized trials or repeated measures where subjects are grouped into clusters (e.g., teeth within a patient or patients within a clinic), the effective sample size is reduced by clustering. VIF = 1 + (m - 1)ρ.',
      formula: '\\text{VIF} = 1 + (m - 1)\\rho',
    },
    {
      term: "Cochran's Rule & Fisher's Exact Test",
      category: 'Categorical Analysis',
      definition: "For Chi-square tests of independence, no cell in the contingency table should have an expected frequency < 1, and no more than 20% of cells should have expected frequency < 5. If violated in a 2x2 table, Fisher's Exact Test must be used.",
      formula: 'P = \\frac{(a+b)!(c+d)!(a+c)!(b+d)!}{a! b! c! d! N!}',
    },
    {
      term: 'CRIS Checklist (In-Vitro Dental Studies)',
      category: 'Reporting Standards',
      definition: 'Checklist for Reporting In-vitro Studies (CRIS) establishes reporting standards for specimen preparation, randomization, blinding of test operators, sample size justification, and failure mode analysis in dental materials research.',
      formula: 'CRIS 2014 Framework',
    },
  ];

  const filtered = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200/60">
              Reference
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Biostatistical Glossary &amp; Methodological Foundations
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative definitions, mathematical formulas, and clinical significance principles.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search glossary terms..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900">{t.term}</h3>
              <span className="text-3xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 shrink-0">
                {t.category}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{t.definition}</p>
            {t.formula && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 font-mono text-2xs text-indigo-900 font-medium overflow-x-auto">
                {t.formula}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
