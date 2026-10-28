import { StudyPlan } from '../types/planner';

export interface MethodologicalAdviceResponse {
  guidanceText: string;
  recommendedDesign: string;
  recommendedStatisticalTest: string;
  experimentalUnitWarning?: string;
  biasConsiderations: string[];
  disclaimer: string;
}

/**
 * Calls backend API proxy for Gemini study methodology advice.
 * If backend is unavailable or unconfigured, falls back to structured expert rules.
 */
export async function getMethodologicalAdvice(plan: Partial<StudyPlan>): Promise<MethodologicalAdviceResponse> {
  const disclaimer =
    'DISCLAIMER: This guidance provides educational methodological recommendations based on reporting guidelines (CONSORT, STROBE, STARD, CRIS Guidelines for In-Vitro Dental Studies). It does not substitute for consultation with a qualified institutional biostatistician or formal ethics review board.';

  try {
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: plan.category,
        title: plan.title,
        hypothesis: plan.hypothesis,
        primaryOutcome: plan.primaryOutcome,
        outcomeType: plan.outcomeType,
        experimentalUnit: plan.experimentalUnit,
        numberOfGroups: plan.numberOfGroups,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        guidanceText: data.guidanceText,
        recommendedDesign: data.recommendedDesign,
        recommendedStatisticalTest: data.recommendedStatisticalTest,
        experimentalUnitWarning: data.experimentalUnitWarning,
        biasConsiderations: data.biasConsiderations || [],
        disclaimer,
      };
    }
  } catch (e) {
    console.warn('API assist proxy call failed, using built-in biostatistical knowledge base:', e);
  }

  // Built-in expert biostatistical guidance matrix
  return getBuiltinBiostatisticalAdvice(plan, disclaimer);
}

function getBuiltinBiostatisticalAdvice(
  plan: Partial<StudyPlan>,
  disclaimer: string
): MethodologicalAdviceResponse {
  const category = plan.category || 'in_vitro';
  const unit = (plan.experimentalUnit || '').toLowerCase();
  const k = plan.numberOfGroups || 2;
  const isContinuous = plan.outcomeType === 'continuous';

  let unitWarning: string | undefined;
  if (unit.includes('tooth') || unit.includes('implant') || unit.includes('site')) {
    unitWarning =
      'Unit of Analysis Issue: When multiple teeth/sites are sampled from the same patient, observations are clustered and not independent. You must either use generalized estimating equations (GEE), linear mixed models, or cluster-adjusted sample size.';
  } else if (unit.includes('specimen') || unit.includes('disk') || unit.includes('sample')) {
    unitWarning =
      'In-Vitro Specimen Discipline: Ensure specimens within each group undergo identical standardization (e.g., surface grit, storage medium, temperature) and blinding during mechanical testing (CRIS Checklist).';
  }

  let recommendedDesign = 'Two Independent Means';
  let recommendedTest = "Student's / Welch's Two-Sample t-Test";
  const biasList: string[] = [];

  if (category === 'in_vitro') {
    recommendedDesign = k > 2 ? 'One-Way ANOVA (Multiple Groups)' : 'Two Independent Groups';
    recommendedTest = k > 2 ? 'One-Way ANOVA with Tukey HSD Post-Hoc' : "Two-Sample t-Test (or Mann-Whitney U if non-normal)";
    biasList.push('Randomization of specimen sequence during fabrication and testing to prevent machine drift bias.');
    biasList.push('Blinding of the mechanical testing operator to experimental group allocations.');
    biasList.push('Report both adhesive and cohesive failure modes alongside numerical bond strength (MPa).');
  } else if (category === 'rct') {
    recommendedDesign = 'Randomized Controlled Trial (Parallel-Group)';
    recommendedTest = isContinuous ? (k > 2 ? 'ANCOVA adjusting for baseline' : 'ANCOVA or Independent t-test') : 'Chi-Square / Relative Risk';
    biasList.push('Allocation concealment via central web randomization or sequentially numbered opaque sealed envelopes (SNOSE).');
    biasList.push('Intention-to-treat (ITT) primary analysis accounting for participant dropouts.');
    biasList.push('Pre-registration on ClinicalTrials.gov or equivalent ICMJE-approved primary registry.');
  } else if (category === 'diagnostic') {
    recommendedDesign = 'Diagnostic Accuracy Study (STARD)';
    recommendedTest = 'Sensitivity, Specificity, Likelihood Ratios with Wilson 95% CIs';
    biasList.push('Avoid verification bias: all subjects must receive the definitive reference standard.');
    biasList.push('Blinded interpretation: index test reader must be blinded to reference standard and vice versa.');
  } else if (category === 'reliability') {
    recommendedDesign = 'Reliability & Agreement Study';
    recommendedTest = isContinuous ? 'Intraclass Correlation Coefficient (ICC) & Bland-Altman Limits of Agreement' : "Cohen's / Fleiss' Kappa";
    biasList.push('Ensure raters evaluate specimens in independently randomized order without cross-consultation.');
    biasList.push('Report both inter-examiner and intra-examiner calibration metrics.');
  } else {
    recommendedDesign = k > 2 ? 'One-Way ANOVA' : 'Two Independent Groups';
    recommendedTest = isContinuous ? "Two-Sample t-Test" : 'Pearson Chi-Square';
    biasList.push('Assess distribution normality (Shapiro-Wilk) and variance homogeneity before selecting test.');
    biasList.push('Prespecify the Minimal Clinically Important Difference (MCID) prior to data collection.');
  }

  return {
    guidanceText: `For a study evaluating "${plan.primaryOutcome || 'the primary outcome'}" with ${k} group(s), the recommended design is ${recommendedDesign}. Ensure the experimental unit (${plan.experimentalUnit || 'unit'}) aligns with the statistical unit of analysis.`,
    recommendedDesign,
    recommendedStatisticalTest: recommendedTest,
    experimentalUnitWarning: unitWarning,
    biasConsiderations: biasList,
    disclaimer,
  };
}
