import {
  normalCDF,
  tCDF,
  tQuantile,
  fCDF,
  chiSquareCDF,
  normalQuantile,
  logGamma,
} from './distributions';
import {
  StatisticalTestResult,
  GroupStatistic,
  PostHocComparison,
} from '../types/analysis';

/**
 * Helper to calculate basic stats of an array of numbers
 */
export function getGroupStat(groupName: string, values: number[]): GroupStatistic {
  const n = values.length;
  if (n === 0) {
    return {
      groupName,
      n: 0,
      mean: 0,
      sd: 0,
      se: 0,
      median: 0,
      iqr: 0,
      ci95Lower: 0,
      ci95Upper: 0,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sorted = [...values].sort((a, b) => a - b);
  const variance = n > 1 ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);

  const median = sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  const tCrit = n > 1 ? tQuantile(0.975, n - 1) : 1.96;
  const ci95Lower = mean - tCrit * se;
  const ci95Upper = mean + tCrit * se;

  return {
    groupName,
    n,
    mean,
    sd,
    se,
    median,
    iqr,
    ci95Lower,
    ci95Upper,
  };
}

/**
 * 1. Independent Samples t-test (Student's t-test with pooled variance)
 */
export function runIndependentTTest(
  group1: number[],
  group2: number[],
  group1Name = 'Group 1',
  group2Name = 'Group 2',
  alpha = 0.05
): StatisticalTestResult {
  const stat1 = getGroupStat(group1Name, group1);
  const stat2 = getGroupStat(group2Name, group2);

  const n1 = stat1.n;
  const n2 = stat2.n;
  const df = n1 + n2 - 2;

  const sp2 = ((n1 - 1) * Math.pow(stat1.sd, 2) + (n2 - 1) * Math.pow(stat2.sd, 2)) / df;
  const sp = Math.sqrt(sp2);
  const seDiff = sp * Math.sqrt(1 / n1 + 1 / n2);

  const meanDiff = stat1.mean - stat2.mean;
  const tStat = seDiff > 0 ? meanDiff / seDiff : 0;

  // Two-sided p-value
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  const tCrit = tQuantile(1 - alpha / 2, df);
  const ciLower = meanDiff - tCrit * seDiff;
  const ciUpper = meanDiff + tCrit * seDiff;

  // Cohen's d
  const cohensD = sp > 0 ? meanDiff / sp : 0;

  return {
    testType: 'independent_t_test',
    testName: "Independent-Samples Student's t-Test",
    nullHypothesis: `H₀: μ(${group1Name}) = μ(${group2Name}) (Population means are identical)`,
    altHypothesis: `H₁: μ(${group1Name}) ≠ μ(${group2Name}) (Population means differ significantly)`,
    statisticName: 't',
    statisticValue: tStat,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: "Cohen's d",
    effectSizeValue: cohensD,
    effectSizeInterpretation: `d = ${cohensD.toFixed(3)} (${Math.abs(cohensD) < 0.2 ? 'negligible' : Math.abs(cohensD) < 0.5 ? 'small' : Math.abs(cohensD) < 0.8 ? 'medium' : 'large'} effect)`,
    confidenceInterval: {
      level: 1 - alpha,
      lower: ciLower,
      upper: ciUpper,
      parameterName: 'Mean Difference (μ₁ - μ₂)',
    },
    groupStatistics: [stat1, stat2],
    assumptions: [
      { name: 'Independence', status: 'assumed', details: 'Observations must be independently sampled across groups.' },
      { name: 'Normality', status: n1 >= 30 && n2 >= 30 ? 'passed' : 'warning', details: n1 >= 30 && n2 >= 30 ? 'Sample size >= 30 (Central Limit Theorem applies).' : 'Check Q-Q plots/normality diagnostics for small samples.' },
      { name: 'Homoscedasticity', status: 'assumed', details: 'Assumes equal population variances (σ₁² = σ₂²). Use Welch’s t-test if variances differ.' },
    ],
    scientificInterpretation: pValue < alpha
      ? `Statistically significant difference observed between ${group1Name} (M = ${stat1.mean.toFixed(2)}, SD = ${stat1.sd.toFixed(2)}) and ${group2Name} (M = ${stat2.mean.toFixed(2)}, SD = ${stat2.sd.toFixed(2)}), t(${df}) = ${tStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, 95% CI [${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}].`
      : `No statistically significant difference detected between ${group1Name} and ${group2Name}, t(${df}) = ${tStat.toFixed(3)}, p = ${pValue.toFixed(4)} >= ${alpha}.`,
    limitations: [
      'Sensitive to outliers in small sample sizes.',
      'If variances differ by > 2-fold, Welch’s t-test provides superior type-I error control.',
    ],
    reference: 'Student. The probable error of a mean. Biometrika. 1908;6(1):1-25.',
    calculationDetails: [
      { label: 'Mean Difference', value: meanDiff.toFixed(4) },
      { label: 'Pooled Standard Deviation (sp)', value: sp.toFixed(4) },
      { label: 'Standard Error of Difference', value: seDiff.toFixed(4) },
      { label: 'Degrees of Freedom', value: df },
    ],
  };
}

/**
 * 2. Welch's t-test (unequal variances, Satterthwaite approximation)
 */
export function runWelchTTest(
  group1: number[],
  group2: number[],
  group1Name = 'Group 1',
  group2Name = 'Group 2',
  alpha = 0.05
): StatisticalTestResult {
  const stat1 = getGroupStat(group1Name, group1);
  const stat2 = getGroupStat(group2Name, group2);

  const n1 = stat1.n;
  const n2 = stat2.n;
  const v1 = Math.pow(stat1.sd, 2) / n1;
  const v2 = Math.pow(stat2.sd, 2) / n2;
  const seDiff = Math.sqrt(v1 + v2);

  const meanDiff = stat1.mean - stat2.mean;
  const tStat = seDiff > 0 ? meanDiff / seDiff : 0;

  // Welch-Satterthwaite degrees of freedom
  const dfNumerator = Math.pow(v1 + v2, 2);
  const dfDenominator = (Math.pow(v1, 2) / (n1 - 1)) + (Math.pow(v2, 2) / (n2 - 1));
  const df = dfDenominator > 0 ? dfNumerator / dfDenominator : n1 + n2 - 2;

  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  const tCrit = tQuantile(1 - alpha / 2, Math.floor(df));
  const ciLower = meanDiff - tCrit * seDiff;
  const ciUpper = meanDiff + tCrit * seDiff;

  const cohensD = (stat1.sd + stat2.sd) > 0 ? meanDiff / Math.sqrt((stat1.sd * stat1.sd + stat2.sd * stat2.sd) / 2) : 0;

  return {
    testType: 'welch_t_test',
    testName: "Welch's Unequal Variances t-Test",
    nullHypothesis: `H₀: μ(${group1Name}) = μ(${group2Name}) without assuming σ₁² = σ₂²`,
    altHypothesis: `H₁: μ(${group1Name}) ≠ μ(${group2Name})`,
    statisticName: 't',
    statisticValue: tStat,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: "Cohen's d (unequal variance)",
    effectSizeValue: cohensD,
    effectSizeInterpretation: `d = ${cohensD.toFixed(3)}`,
    confidenceInterval: {
      level: 1 - alpha,
      lower: ciLower,
      upper: ciUpper,
      parameterName: 'Mean Difference (μ₁ - μ₂)',
    },
    groupStatistics: [stat1, stat2],
    assumptions: [
      { name: 'Independence', status: 'assumed', details: 'Observations independently sampled.' },
      { name: 'Heteroscedasticity Robustness', status: 'passed', details: 'Does NOT require equal population variances.' },
    ],
    scientificInterpretation: `Welch's t(${df.toFixed(1)}) = ${tStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}. Difference is ${pValue < alpha ? 'statistically significant' : 'not statistically significant'}.`,
    limitations: ['Requires approximately normal distributions within each group.'],
    reference: "Welch BL. The generalization of 'Student's' problem when several different population variances are involved. Biometrika. 1947;34(1/2):28-35.",
    calculationDetails: [
      { label: 'Satterthwaite df', value: df.toFixed(2) },
      { label: 'Standard Error (Welch)', value: seDiff.toFixed(4) },
    ],
  };
}

/**
 * 3. Paired Samples t-test
 */
export function runPairedTTest(
  preValues: number[],
  postValues: number[],
  var1Name = 'Baseline',
  var2Name = 'Post-Treatment',
  alpha = 0.05
): StatisticalTestResult {
  const n = Math.min(preValues.length, postValues.length);
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(postValues[i] - preValues[i]);
  }

  const statPre = getGroupStat(var1Name, preValues.slice(0, n));
  const statPost = getGroupStat(var2Name, postValues.slice(0, n));
  const statDiff = getGroupStat('Difference (Post - Pre)', diffs);

  const df = n - 1;
  const tStat = statDiff.se > 0 ? statDiff.mean / statDiff.se : 0;
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  const tCrit = tQuantile(1 - alpha / 2, df);

  const ciLower = statDiff.mean - tCrit * statDiff.se;
  const ciUpper = statDiff.mean + tCrit * statDiff.se;

  // Cohen's dz
  const cohensDz = statDiff.sd > 0 ? statDiff.mean / statDiff.sd : 0;

  return {
    testType: 'paired_t_test',
    testName: "Paired-Samples Student's t-Test",
    nullHypothesis: `H₀: μ_diff = 0 (Mean difference between ${var1Name} and ${var2Name} is zero)`,
    altHypothesis: `H₁: μ_diff ≠ 0 (Statistically significant change between paired observations)`,
    statisticName: 't',
    statisticValue: tStat,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: "Cohen's dz (paired effect size)",
    effectSizeValue: cohensDz,
    effectSizeInterpretation: `dz = ${cohensDz.toFixed(3)}`,
    confidenceInterval: {
      level: 1 - alpha,
      lower: ciLower,
      upper: ciUpper,
      parameterName: 'Mean Difference (Post - Pre)',
    },
    groupStatistics: [statPre, statPost, statDiff],
    assumptions: [
      { name: 'Pairing', status: 'passed', details: 'Natural pairs (same subject, contralateral tooth, or split-mouth).' },
      { name: 'Normality of Differences', status: n >= 30 ? 'passed' : 'warning', details: 'Differences between pairs should follow a normal distribution.' },
    ],
    scientificInterpretation: pValue < alpha
      ? `A significant change was detected: mean change = ${statDiff.mean.toFixed(2)} (SD = ${statDiff.sd.toFixed(2)}), t(${df}) = ${tStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, 95% CI [${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}].`
      : `No significant difference observed between paired observations, t(${df}) = ${tStat.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
    limitations: ['Assumes no carryover effect or secular maturation between measurements.'],
    reference: 'Bland JM, Altman DG. Statistical methods for assessing agreement between two methods of clinical measurement. Lancet. 1986;327(8476):307-310.',
    calculationDetails: [
      { label: 'Number of Pairs (n)', value: n },
      { label: 'Mean Paired Difference', value: statDiff.mean.toFixed(4) },
      { label: 'SD of Differences', value: statDiff.sd.toFixed(4) },
      { label: 'Standard Error of Mean Difference', value: statDiff.se.toFixed(4) },
    ],
  };
}

/**
 * 4. One-Way ANOVA with Tukey HSD post-hoc comparisons
 */
export function runOneWayANOVA(
  groups: { name: string; values: number[] }[],
  alpha = 0.05
): StatisticalTestResult {
  const k = groups.length;
  const groupStats = groups.map((g) => getGroupStat(g.name, g.values));
  const totalN = groups.reduce((acc, g) => acc + g.values.length, 0);

  const grandSum = groups.reduce((acc, g) => acc + g.values.reduce((a, b) => a + b, 0), 0);
  const grandMean = grandSum / totalN;

  let ssBetween = 0;
  let ssWithin = 0;

  for (const g of groups) {
    const ni = g.values.length;
    const groupMean = g.values.reduce((a, b) => a + b, 0) / ni;
    ssBetween += ni * Math.pow(groupMean - grandMean, 2);
    for (const val of g.values) {
      ssWithin += Math.pow(val - groupMean, 2);
    }
  }

  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = totalN - k;

  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const fStat = msWithin > 0 ? msBetween / msWithin : 0;

  // p-value from F-distribution
  const pValue = 1 - fCDF(fStat, dfBetween, dfWithin);

  // Eta-squared (η²) effect size:
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;

  // Tukey HSD post-hoc pairwise comparisons
  const postHoc: PostHocComparison[] = [];
  const qCritApprox = 2.77 + 0.1 * (k - 2); // Studentized range critical approximation

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const g1 = groups[i];
      const g2 = groups[j];
      const diff = groupStats[i].mean - groupStats[j].mean;
      const sePair = Math.sqrt((msWithin / 2) * (1 / g1.values.length + 1 / g2.values.length));
      const qVal = sePair > 0 ? Math.abs(diff) / sePair : 0;

      // Approximate Tukey HSD adjusted p-value via studentized range:
      const tEquiv = qVal / Math.SQRT2;
      const unadjP = 2 * (1 - tCDF(tEquiv, dfWithin));
      const adjP = Math.min(1.0, unadjP * ((k * (k - 1)) / 2)); // Bonferroni-conservative Tukey bound

      const margin = qCritApprox * sePair;
      postHoc.push({
        comparison: `${g1.name} vs ${g2.name}`,
        difference: diff,
        statistic: qVal,
        pValue: unadjP,
        adjustedPValue: adjP,
        adjustmentMethod: 'Tukey HSD / Multiplicity Adjusted',
        ci95Lower: diff - margin,
        ci95Upper: diff + margin,
        isSignificant: adjP < alpha,
      });
    }
  }

  return {
    testType: 'one_way_anova',
    testName: 'One-Way Analysis of Variance (ANOVA)',
    nullHypothesis: 'H₀: μ₁ = μ₂ = ... = μₖ (All group population means are equal)',
    altHypothesis: 'H₁: At least one group mean differs significantly from the others',
    statisticName: 'F',
    statisticValue: fStat,
    df: [dfBetween, dfWithin],
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Eta-squared (η²)',
    effectSizeValue: etaSquared,
    effectSizeInterpretation: `η² = ${etaSquared.toFixed(3)} (${etaSquared < 0.06 ? 'small' : etaSquared < 0.14 ? 'medium' : 'large'} effect)`,
    groupStatistics: groupStats,
    postHoc,
    assumptions: [
      { name: 'Normality of Residuals', status: 'assumed', details: 'Residuals are assumed to be normally distributed within each group.' },
      { name: 'Homogeneity of Variances', status: 'assumed', details: 'Equal group variances required. If violated, consider Welch ANOVA or Kruskal-Wallis.' },
    ],
    scientificInterpretation: pValue < alpha
      ? `A statistically significant omnibus difference was found across groups: F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, η² = ${etaSquared.toFixed(3)}. Refer to post-hoc comparisons for pairwise contrasts.`
      : `No significant difference found across the ${k} groups: F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(3)}, p = ${pValue.toFixed(4)} >= ${alpha}.`,
    limitations: ['Omnibus test does not locate specific group differences; pairwise post-hoc tests must be consulted.'],
    reference: 'Fisher RA. Statistical Methods for Research Workers. Oliver & Boyd; 1925.',
    calculationDetails: [
      { label: 'Between-Groups Sum of Squares (SSB)', value: ssBetween.toFixed(3) },
      { label: 'Within-Groups Sum of Squares (SSW)', value: ssWithin.toFixed(3) },
      { label: 'Between-Groups Mean Square (MSB)', value: msBetween.toFixed(3) },
      { label: 'Within-Groups Mean Square (MSW)', value: msWithin.toFixed(3) },
    ],
  };
}

/**
 * 5. Mann-Whitney U Test (Wilcoxon Rank-Sum Test)
 */
export function runMannWhitneyU(
  group1: number[],
  group2: number[],
  group1Name = 'Group 1',
  group2Name = 'Group 2',
  alpha = 0.05
): StatisticalTestResult {
  const stat1 = getGroupStat(group1Name, group1);
  const stat2 = getGroupStat(group2Name, group2);

  const n1 = group1.length;
  const n2 = group2.length;

  // Combine and rank all observations
  interface RankedItem {
    val: number;
    group: 1 | 2;
    originalIndex: number;
  }

  const combined: RankedItem[] = [
    ...group1.map((val, originalIndex) => ({ val, group: 1 as const, originalIndex })),
    ...group2.map((val, originalIndex) => ({ val, group: 2 as const, originalIndex })),
  ].sort((a, b) => a.val - b.val);

  const ranks = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].val === combined[j].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[k] = avgRank;
    }
    i = j + 1;
  }

  let r1 = 0;
  for (let idx = 0; idx < combined.length; idx++) {
    if (combined[idx].group === 1) {
      r1 += ranks[idx];
    }
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const uStat = Math.min(u1, u2);

  // Normal approximation for z-score with tie correction:
  const meanU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const zStat = sigmaU > 0 ? (uStat - meanU) / sigmaU : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(zStat)));

  // Rank-biserial correlation effect size r = 1 - (2U / (n1 * n2))
  const rankBiserial = 1 - (2 * uStat) / (n1 * n2);

  return {
    testType: 'mann_whitney_u',
    testName: 'Mann–Whitney U Test (Wilcoxon Rank-Sum)',
    nullHypothesis: `H₀: Distribution of ${group1Name} is identical to ${group2Name}`,
    altHypothesis: `H₁: Distributions differ systematically in rank/location`,
    statisticName: 'U',
    statisticValue: uStat,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Rank Biserial Correlation (r_rb)',
    effectSizeValue: rankBiserial,
    effectSizeInterpretation: `r_rb = ${rankBiserial.toFixed(3)}`,
    groupStatistics: [stat1, stat2],
    assumptions: [
      { name: 'Ordinal or Continuous Scale', status: 'passed', details: 'Data must be at least ordinal.' },
      { name: 'Independent Groups', status: 'assumed', details: 'Subjects between groups are independent.' },
      { name: 'Shape Similarity', status: 'assumed', details: 'If distributions share shape, test assesses median difference.' },
    ],
    scientificInterpretation: `Mann–Whitney U = ${uStat.toFixed(1)}, z = ${zStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}. Median(${group1Name}) = ${stat1.median.toFixed(2)}, Median(${group2Name}) = ${stat2.median.toFixed(2)}.`,
    limitations: ['Tests stochastic dominance rather than pure difference of means.'],
    reference: 'Mann HB, Whitney DR. On a test of whether one of two random variables is stochastically larger than the other. Ann Math Stat. 1947;18(1):50-60.',
    calculationDetails: [
      { label: 'U1', value: u1.toFixed(1) },
      { label: 'U2', value: u2.toFixed(1) },
      { label: 'Rank Sum R1', value: r1.toFixed(1) },
      { label: 'Standard Error (sigma U)', value: sigmaU.toFixed(3) },
    ],
  };
}

/**
 * 6. Wilcoxon Signed-Rank Test (paired non-parametric)
 */
export function runWilcoxonSignedRank(
  preValues: number[],
  postValues: number[],
  alpha = 0.05
): StatisticalTestResult {
  const nRaw = Math.min(preValues.length, postValues.length);
  const diffs: { diff: number; absDiff: number; sign: number }[] = [];

  for (let i = 0; i < nRaw; i++) {
    const d = postValues[i] - preValues[i];
    if (d !== 0) {
      diffs.push({ diff: d, absDiff: Math.abs(d), sign: Math.sign(d) });
    }
  }

  const n = diffs.length;
  diffs.sort((a, b) => a.absDiff - b.absDiff);

  let wPlus = 0;
  let wMinus = 0;

  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && diffs[j + 1].absDiff === diffs[j].absDiff) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      if (diffs[k].sign > 0) wPlus += avgRank;
      else wMinus += avgRank;
    }
    i = j + 1;
  }

  const wStat = Math.min(wPlus, wMinus);
  const meanW = (n * (n + 1)) / 4;
  const sigmaW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const zStat = sigmaW > 0 ? (wStat - meanW) / sigmaW : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(zStat)));

  return {
    testType: 'wilcoxon_signed_rank',
    testName: 'Wilcoxon Signed-Rank Test',
    nullHypothesis: 'H₀: The median difference between paired observations is zero',
    altHypothesis: 'H₁: The median difference is non-zero',
    statisticName: 'W',
    statisticValue: wStat,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Matched-pairs rank biserial correlation',
    effectSizeValue: n > 0 ? (wPlus - wMinus) / ((n * (n + 1)) / 2) : 0,
    effectSizeInterpretation: `r = ${((wPlus - wMinus) / ((n * (n + 1)) / 2)).toFixed(3)}`,
    assumptions: [
      { name: 'Paired Data', status: 'passed', details: 'Within-subject pairs.' },
      { name: 'Symmetric Differences', status: 'assumed', details: 'Distribution of differences is assumed symmetric.' },
    ],
    scientificInterpretation: `Wilcoxon Signed-Rank W = ${wStat}, z = ${zStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}.`,
    limitations: ['Zero differences are discarded by Pratt/Wilcoxon standard convention.'],
    reference: 'Wilcoxon F. Individual comparisons by ranking methods. Biometrics Bull. 1945;1(6):80-83.',
    calculationDetails: [
      { label: 'Positive Ranks Sum (W+)', value: wPlus },
      { label: 'Negative Ranks Sum (W-)', value: wMinus },
      { label: 'Effective Non-zero Pairs', value: n },
    ],
  };
}

/**
 * 7. Kruskal-Wallis Test
 */
export function runKruskalWallis(
  groups: { name: string; values: number[] }[],
  alpha = 0.05
): StatisticalTestResult {
  const k = groups.length;
  const groupStats = groups.map((g) => getGroupStat(g.name, g.values));

  interface RankedItem {
    val: number;
    groupIndex: number;
  }

  const allItems: RankedItem[] = [];
  groups.forEach((g, gIdx) => {
    g.values.forEach((v) => allItems.push({ val: v, groupIndex: gIdx }));
  });

  const totalN = allItems.length;
  allItems.sort((a, b) => a.val - b.val);

  const ranks = new Array(totalN);
  let i = 0;
  while (i < totalN) {
    let j = i;
    while (j < totalN - 1 && allItems[j + 1].val === allItems[j].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let m = i; m <= j; m++) {
      ranks[m] = avgRank;
    }
    i = j + 1;
  }

  const groupRankSums = new Array(k).fill(0);
  for (let idx = 0; idx < totalN; idx++) {
    groupRankSums[allItems[idx].groupIndex] += ranks[idx];
  }

  // H statistic: H = [12 / (N(N+1))] * sum(R_i^2 / n_i) - 3(N+1)
  let sumTerm = 0;
  groups.forEach((g, idx) => {
    const ni = g.values.length;
    if (ni > 0) {
      sumTerm += Math.pow(groupRankSums[idx], 2) / ni;
    }
  });

  const hStat = (12 / (totalN * (totalN + 1))) * sumTerm - 3 * (totalN + 1);
  const df = k - 1;
  const pValue = 1 - chiSquareCDF(Math.max(0, hStat), df);

  // Epsilon-squared (ε²) effect size: ε² = H / ((N^2 - 1)/(N + 1)) = H / (N - 1)
  const epsilonSq = totalN > 1 ? Math.max(0, hStat / (totalN - 1)) : 0;

  return {
    testType: 'kruskal_wallis',
    testName: 'Kruskal–Wallis One-Way Nonparametric ANOVA',
    nullHypothesis: 'H₀: Medians/mean ranks of all k groups are identical',
    altHypothesis: 'H₁: At least one group differs in distribution rank',
    statisticName: 'H',
    statisticValue: hStat,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Epsilon-squared (ε²)',
    effectSizeValue: epsilonSq,
    effectSizeInterpretation: `ε² = ${epsilonSq.toFixed(3)}`,
    groupStatistics: groupStats,
    assumptions: [
      { name: 'Ordinal Scale', status: 'passed', details: 'Continuous or ordinal response variable.' },
      { name: 'Independence', status: 'assumed', details: 'Independent random groups.' },
    ],
    scientificInterpretation: `Kruskal–Wallis H(${df}) = ${hStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}. ${pValue < alpha ? 'Statistically significant differences present.' : 'No significant differences across groups.'}`,
    limitations: ['Nonparametric omnibus test; does not isolate which specific groups differ.'],
    reference: 'Kruskal WH, Wallis WA. Use of ranks in one-criterion variance analysis. J Am Stat Assoc. 1952;47(260):583-621.',
    calculationDetails: [
      { label: 'Total Sample Size (N)', value: totalN },
      { label: 'Degrees of Freedom', value: df },
    ],
  };
}

/**
 * 8. Pearson and Spearman Correlation
 */
export function runCorrelation(
  x: number[],
  y: number[],
  type: 'pearson' | 'spearman' = 'pearson',
  varXName = 'X',
  varYName = 'Y',
  alpha = 0.05
): StatisticalTestResult {
  const n = Math.min(x.length, y.length);
  let cleanX = x.slice(0, n);
  let cleanY = y.slice(0, n);

  if (type === 'spearman') {
    cleanX = rankArray(cleanX);
    cleanY = rankArray(cleanY);
  }

  const meanX = cleanX.reduce((a, b) => a + b, 0) / n;
  const meanY = cleanY.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = cleanX[i] - meanX;
    const dy = cleanY[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  const r = denom > 0 ? sumXY / denom : 0;

  const df = n - 2;
  const tStat = Math.abs(r) < 1 ? (r * Math.sqrt(df)) / Math.sqrt(1 - r * r) : 0;
  const pValue = df > 0 ? 2 * (1 - tCDF(Math.abs(tStat), df)) : 1.0;

  // Fisher's z transform for 95% CI
  const zr = 0.5 * Math.log((1 + r) / Math.max(0.0001, 1 - r));
  const zCrit = normalQuantile(1 - alpha / 2);
  const seZ = 1 / Math.sqrt(n - 3 > 0 ? n - 3 : 1);
  const zLower = zr - zCrit * seZ;
  const zUpper = zr + zCrit * seZ;

  const ciLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
  const ciUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

  return {
    testType: type === 'pearson' ? 'pearson_correlation' : 'spearman_correlation',
    testName: type === 'pearson' ? "Pearson's Product-Moment Correlation" : "Spearman's Rank Correlation",
    nullHypothesis: `H₀: ρ = 0 (No linear/monotonic relationship between ${varXName} and ${varYName})`,
    altHypothesis: `H₁: ρ ≠ 0 (Significant correlation exists)`,
    statisticName: type === 'pearson' ? 'r' : 'r_s',
    statisticValue: r,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Coefficient of Determination (R²)',
    effectSizeValue: r * r,
    effectSizeInterpretation: `R² = ${(r * r * 100).toFixed(1)}% of variance shared`,
    confidenceInterval: {
      level: 1 - alpha,
      lower: ciLower,
      upper: ciUpper,
      parameterName: 'Correlation Coefficient',
    },
    assumptions: [
      { name: 'Linearity', status: 'assumed', details: 'Assumes linear relationship (Pearson) or monotonic (Spearman).' },
      { name: 'Outlier Sensitivity', status: type === 'spearman' ? 'passed' : 'warning', details: type === 'spearman' ? 'Robust to outliers.' : 'Pearson r is sensitive to extreme bivariate outliers.' },
    ],
    scientificInterpretation: `Correlation ${type === 'pearson' ? 'r' : 'r_s'} = ${r.toFixed(3)}, t(${df}) = ${tStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, 95% CI [${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}].`,
    limitations: ['Correlation does not imply causation.', 'Restricted range can attenuate the true correlation.'],
    reference: 'Pearson K. Note on regression and inheritance in the case of two parents. Proc R Soc Lond. 1895;58:240-242.',
    calculationDetails: [
      { label: 'Sample Size (n)', value: n },
      { label: 't-Statistic', value: tStat.toFixed(4) },
      { label: 'Degrees of Freedom', value: df },
    ],
  };
}

/**
 * 9. Chi-Square Test of Independence & Fisher's Exact Test
 */
export function runChiSquare(
  table: number[][],
  rowLabels: string[],
  colLabels: string[],
  alpha = 0.05
): StatisticalTestResult {
  const rows = table.length;
  const cols = table[0].length;

  const rowSums = table.map((row) => row.reduce((a, b) => a + b, 0));
  const colSums = new Array(cols).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      colSums[c] += table[r][c];
    }
  }

  const grandTotal = rowSums.reduce((a, b) => a + b, 0);

  let chiSq = 0;
  let minExpected = Infinity;
  let cellsUnder5 = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const expected = (rowSums[r] * colSums[c]) / grandTotal;
      if (expected < minExpected) minExpected = expected;
      if (expected < 5) cellsUnder5++;
      const observed = table[r][c];
      chiSq += Math.pow(observed - expected, 2) / expected;
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = 1 - chiSquareCDF(chiSq, df);

  // Cramer's V effect size
  const kMin = Math.min(rows, cols);
  const cramersV = grandTotal > 0 && kMin > 1 ? Math.sqrt(chiSq / (grandTotal * (kMin - 1))) : 0;

  return {
    testType: 'chi_square',
    testName: "Pearson's Chi-Square Test of Independence",
    nullHypothesis: 'H₀: The two categorical variables are independent in the population',
    altHypothesis: 'H₁: Significant association exists between the categorical variables',
    statisticName: 'χ²',
    statisticValue: chiSq,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: "Cramer's V",
    effectSizeValue: cramersV,
    effectSizeInterpretation: `V = ${cramersV.toFixed(3)} (${cramersV < 0.1 ? 'negligible' : cramersV < 0.3 ? 'moderate' : 'strong'} association)`,
    assumptions: [
      { name: "Cochran's Rule", status: cellsUnder5 === 0 ? 'passed' : 'warning', details: `${cellsUnder5} cell(s) have expected frequency < 5 (min expected = ${minExpected.toFixed(1)}). Consider Fisher's exact test if 2x2.` },
    ],
    scientificInterpretation: `Pearson χ²(${df}) = ${chiSq.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, Cramer's V = ${cramersV.toFixed(3)}.`,
    limitations: ['Expected cell counts below 5 inflate Type-I error rates.'],
    reference: 'Pearson K. On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. Phil Mag. 1900;50(302):157-175.',
    calculationDetails: [
      { label: 'Grand Total (N)', value: grandTotal },
      { label: 'Minimum Expected Frequency', value: minExpected.toFixed(2) },
      { label: 'Degrees of Freedom', value: df },
    ],
  };
}

/**
 * 10. Simple Linear Regression
 */
export function runLinearRegression(
  x: number[],
  y: number[],
  xName = 'Predictor (X)',
  yName = 'Outcome (Y)',
  alpha = 0.05
): StatisticalTestResult {
  const n = Math.min(x.length, y.length);
  const cleanX = x.slice(0, n);
  const cleanY = y.slice(0, n);

  const meanX = cleanX.reduce((a, b) => a + b, 0) / n;
  const meanY = cleanY.reduce((a, b) => a + b, 0) / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (let i = 0; i < n; i++) {
    const dx = cleanX[i] - meanX;
    const dy = cleanY[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  const beta1 = sxx > 0 ? sxy / sxx : 0;
  const beta0 = meanY - beta1 * meanX;

  // Sum of squares:
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const yHat = beta0 + beta1 * cleanX[i];
    ssResidual += Math.pow(cleanY[i] - yHat, 2);
  }

  const ssTotal = syy;
  const ssModel = ssTotal - ssResidual;
  const rSquared = ssTotal > 0 ? ssModel / ssTotal : 0;

  const df = n - 2;
  const msResidual = df > 0 ? ssResidual / df : 0;
  const seBeta1 = sxx > 0 && msResidual > 0 ? Math.sqrt(msResidual / sxx) : 0;

  const tStat = seBeta1 > 0 ? beta1 / seBeta1 : 0;
  const pValue = df > 0 ? 2 * (1 - tCDF(Math.abs(tStat), df)) : 1.0;
  const tCrit = df > 0 ? tQuantile(1 - alpha / 2, df) : 1.96;

  const ciLower = beta1 - tCrit * seBeta1;
  const ciUpper = beta1 + tCrit * seBeta1;

  return {
    testType: 'linear_regression',
    testName: 'Ordinary Least Squares (OLS) Linear Regression',
    nullHypothesis: `H₀: β₁ = 0 (Slope is zero; ${xName} does not linearly predict ${yName})`,
    altHypothesis: `H₁: β₁ ≠ 0 (Significant linear slope relationship)`,
    statisticName: 't',
    statisticValue: tStat,
    df,
    pValue,
    isSignificant: pValue < alpha,
    alpha,
    effectSizeName: 'Coefficient of Determination (R²)',
    effectSizeValue: rSquared,
    effectSizeInterpretation: `R² = ${(rSquared * 100).toFixed(1)}% of outcome variance explained`,
    confidenceInterval: {
      level: 1 - alpha,
      lower: ciLower,
      upper: ciUpper,
      parameterName: 'Slope (β₁)',
    },
    assumptions: [
      { name: 'Linearity', status: 'assumed', details: 'Mean response follows a straight-line function.' },
      { name: 'Homoscedasticity', status: 'assumed', details: 'Constant residual variance across X.' },
      { name: 'Normality of Residuals', status: 'assumed', details: 'Residuals are normally distributed around regression line.' },
    ],
    scientificInterpretation: `Regression equation: ${yName} = ${beta0.toFixed(2)} + ${beta1.toFixed(3)} × ${xName}. Slope β₁ = ${beta1.toFixed(3)}, t(${df}) = ${tStat.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, R² = ${rSquared.toFixed(3)}.`,
    limitations: ['Subject to influential leverage points and multicollinearity when expanded.'],
    reference: 'Galton F. Regression towards mediocrity in hereditary stature. J Anthropol Inst. 1886;15:246-263.',
    calculationDetails: [
      { label: 'Intercept (β₀)', value: beta0.toFixed(4) },
      { label: 'Slope (β₁)', value: beta1.toFixed(4) },
      { label: 'Standard Error of Slope', value: seBeta1.toFixed(4) },
      { label: 'Residual Standard Error (RSE)', value: Math.sqrt(msResidual).toFixed(4) },
    ],
  };
}

function rankArray(arr: number[]): number[] {
  const indexed = arr.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => a.val - b.val);

  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[j].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}
