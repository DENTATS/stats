import {
  normalQuantile,
  fCDF,
  nonCentralFCDF,
} from './distributions';
import {
  SampleSizeInputs,
  SampleSizeResult,
  CalculationStep,
  StudyDesignType,
} from '../types/sampleSize';
import { generateRecordHash } from './hash';

/**
 * Validates sample size inputs and flags missing or out-of-range parameters
 */
export function validateSampleSizeInputs(inputs: SampleSizeInputs): string[] {
  const warnings: string[] = [];

  if (inputs.alpha <= 0 || inputs.alpha >= 0.5) {
    warnings.push(`Significance level alpha (${inputs.alpha}) should typically be between 0.001 and 0.20 (standard is 0.05).`);
  }
  if (inputs.power <= 0.5 || inputs.power >= 1) {
    warnings.push(`Statistical power (${inputs.power}) must be between 0.50 and 0.999 (standard is 0.80, 0.90, or 0.95).`);
  }
  if (inputs.allocationRatio <= 0 || inputs.allocationRatio > 10) {
    warnings.push(`Allocation ratio k (${inputs.allocationRatio}) should typically be between 0.2 and 5.0.`);
  }
  if (inputs.dropoutRate < 0 || inputs.dropoutRate >= 90) {
    warnings.push(`Dropout rate (${inputs.dropoutRate}%) must be between 0% and 89%.`);
  }

  switch (inputs.studyDesign) {
    case 'one_sample_mean':
      if (inputs.meanDiff === undefined || Math.abs(inputs.meanDiff) === 0) {
        warnings.push('Expected mean difference (delta) cannot be zero.');
      }
      if (inputs.sd === undefined || inputs.sd <= 0) {
        warnings.push('Standard deviation (SD) must be greater than zero.');
      }
      break;

    case 'two_independent_means':
      const diff = inputs.meanDiff ?? (inputs.mean1 !== undefined && inputs.mean2 !== undefined ? Math.abs(inputs.mean1 - inputs.mean2) : undefined);
      if (diff === undefined || diff === 0) {
        warnings.push('Expected mean difference (|μ1 - μ2|) cannot be zero.');
      }
      if (inputs.sd === undefined || inputs.sd <= 0) {
        warnings.push('Pooled standard deviation (SD) must be greater than zero.');
      }
      break;

    case 'paired_means':
      if (inputs.meanDiff === undefined || Math.abs(inputs.meanDiff) === 0) {
        warnings.push('Expected mean difference of pairs must be non-zero.');
      }
      if (inputs.sdDiff === undefined || inputs.sdDiff <= 0) {
        warnings.push('Standard deviation of paired differences (SDd) must be greater than zero.');
      }
      break;

    case 'one_way_anova':
      if (!inputs.numGroups || inputs.numGroups < 3) {
        warnings.push('One-way ANOVA requires at least 3 groups (k >= 3).');
      }
      if (!inputs.cohensF && (!inputs.groupMeans || !inputs.pooledSd)) {
        warnings.push("Provide either Cohen's f directly or all group means and pooled within-group SD.");
      }
      break;

    case 'two_independent_proportions':
      if (inputs.prop1 === undefined || inputs.prop1 <= 0 || inputs.prop1 >= 1) {
        warnings.push('Proportion 1 (p1) must be strictly between 0 and 1.');
      }
      if (inputs.prop2 === undefined || inputs.prop2 <= 0 || inputs.prop2 >= 1) {
        warnings.push('Proportion 2 (p2) must be strictly between 0 and 1.');
      }
      if (inputs.prop1 !== undefined && inputs.prop2 !== undefined && inputs.prop1 === inputs.prop2) {
        warnings.push('Expected proportions p1 and p2 cannot be identical (effect size is zero).');
      }
      break;

    case 'one_sample_proportion':
      if (inputs.expectedProp === undefined || inputs.expectedProp <= 0 || inputs.expectedProp >= 1) {
        warnings.push('Expected prevalence/proportion must be strictly between 0 and 1.');
      }
      if (inputs.marginOfError === undefined || inputs.marginOfError <= 0 || inputs.marginOfError >= 0.5) {
        warnings.push('Desired margin of error (precision d) must be between 0.001 and 0.40.');
      }
      break;

    case 'correlation':
      if (inputs.expectedCorrelation === undefined || Math.abs(inputs.expectedCorrelation) >= 1) {
        warnings.push('Expected correlation coefficient r must be strictly between -1 and 1.');
      }
      if (inputs.expectedCorrelation === 0) {
        warnings.push('Expected correlation r cannot be zero.');
      }
      break;

    case 'diagnostic_accuracy':
      if (inputs.sensitivity === undefined || inputs.sensitivity <= 0.5 || inputs.sensitivity >= 1) {
        warnings.push('Expected sensitivity should be between 0.50 and 0.999.');
      }
      if (inputs.specificity === undefined || inputs.specificity <= 0.5 || inputs.specificity >= 1) {
        warnings.push('Expected specificity should be between 0.50 and 0.999.');
      }
      if (inputs.prevalence === undefined || inputs.prevalence <= 0 || inputs.prevalence >= 1) {
        warnings.push('Target disease prevalence must be strictly between 0 and 1.');
      }
      if (inputs.diagnosticPrecision === undefined || inputs.diagnosticPrecision <= 0) {
        warnings.push('Precision margin (w) must be greater than 0.');
      }
      break;

    case 'non_inferiority_means':
      if (inputs.marginNonInferiority === undefined || inputs.marginNonInferiority <= 0) {
        warnings.push('Non-inferiority margin (delta) must be greater than zero.');
      }
      if (inputs.sd === undefined || inputs.sd <= 0) {
        warnings.push('Standard deviation must be greater than zero.');
      }
      break;

    case 'cluster_randomized_means':
      if (!inputs.clusterSize || inputs.clusterSize < 2) {
        warnings.push('Average cluster size (m) must be at least 2 subjects per cluster.');
      }
      if (inputs.icc === undefined || inputs.icc < 0 || inputs.icc > 0.5) {
        warnings.push('Intracluster correlation coefficient (ICC, rho) is typically between 0.001 and 0.20.');
      }
      break;
  }

  return warnings;
}

/**
 * Main Deterministic Sample Size Calculation Engine
 */
export async function calculateSampleSize(inputs: SampleSizeInputs): Promise<SampleSizeResult> {
  const warnings = validateSampleSizeInputs(inputs);
  const steps: CalculationStep[] = [];

  const isTwoSided = inputs.hypothesis === 'two_sided';
  const zAlpha = normalQuantile(1 - (isTwoSided ? inputs.alpha / 2 : inputs.alpha));
  const zBeta = normalQuantile(inputs.power);

  steps.push({
    name: 'Critical Values',
    description: `Calculated from standard normal distribution for alpha=${inputs.alpha} (${inputs.hypothesis}) and power=${(inputs.power * 100).toFixed(0)}%`,
    formula: isTwoSided ? 'Z_{1-\\alpha/2}' : 'Z_{1-\\alpha}',
    intermediateValue: `Z_α = ${zAlpha.toFixed(4)}, Z_β = ${zBeta.toFixed(4)}`,
  });

  let evaluableN = 0;
  let n1: number | undefined;
  let n2: number | undefined;
  let nPerGroup: number | undefined;
  let totalN = 0;
  let effectSizeName = '';
  let effectSizeValue = 0;
  let effectSizeInterpretation = '';
  let formulaLaTeX = '';
  let formulaExplanation = '';
  const assumptions: string[] = [];
  let scientificReference = '';

  const kRatio = inputs.allocationRatio || 1.0;

  switch (inputs.studyDesign) {
    case 'one_sample_mean': {
      const delta = Math.abs(inputs.meanDiff || 1);
      const sd = inputs.sd || 1;
      const cohensD = delta / sd;
      effectSizeName = "Cohen's d";
      effectSizeValue = cohensD;
      effectSizeInterpretation = interpretCohensD(cohensD);

      const nRaw = (Math.pow(zAlpha + zBeta, 2) * Math.pow(sd, 2)) / Math.pow(delta, 2);
      evaluableN = Math.ceil(nRaw);
      totalN = evaluableN;

      formulaLaTeX = 'N = \\frac{(Z_{\\alpha/2} + Z_\\beta)^2 \\cdot \\sigma^2}{\\delta^2}';
      formulaExplanation = 'Calculates required sample size for testing a single population mean against a known standard.';
      assumptions.push('Continuous outcome measured on interval/ratio scale.');
      assumptions.push('Data normally distributed in the target population.');
      assumptions.push('Observations sampled independently.');
      scientificReference = 'Rosner B. Fundamentals of Biostatistics, 8th ed. Cengage Learning; 2015:298-301.';

      steps.push({
        name: 'Standardized Effect Size',
        description: 'Ratio of clinically meaningful difference to standard deviation',
        formula: 'd = \\frac{|\\delta|}{\\sigma}',
        intermediateValue: `${delta} / ${sd} = ${cohensD.toFixed(3)} (${effectSizeInterpretation})`,
      });
      steps.push({
        name: 'Raw Sample Size',
        description: 'Numerator and denominator calculation before rounding',
        formula: 'N_{raw} = \\frac{(' + (zAlpha + zBeta).toFixed(3) + ')^2 \\times ' + (sd * sd).toFixed(2) + '}{' + (delta * delta).toFixed(2) + '}',
        intermediateValue: nRaw.toFixed(2),
      });
      break;
    }

    case 'two_independent_means': {
      const delta = inputs.meanDiff !== undefined
        ? Math.abs(inputs.meanDiff)
        : Math.abs((inputs.mean1 ?? 0) - (inputs.mean2 ?? 0));
      const sd = inputs.sd || 1;
      const cohensD = delta / sd;
      effectSizeName = "Cohen's d";
      effectSizeValue = cohensD;
      effectSizeInterpretation = interpretCohensD(cohensD);

      // Formula for unequal allocation k = n2 / n1:
      // n1 = (1 + 1/k) * (zAlpha + zBeta)^2 * sd^2 / delta^2
      const zSumSq = Math.pow(zAlpha + zBeta, 2);
      const n1Raw = ((1 + 1 / kRatio) * zSumSq * Math.pow(sd, 2)) / Math.pow(delta, 2);
      n1 = Math.ceil(n1Raw);
      n2 = Math.ceil(n1 * kRatio);
      evaluableN = n1 + n2;
      nPerGroup = kRatio === 1.0 ? n1 : undefined;
      totalN = evaluableN;

      formulaLaTeX = 'n_1 = \\frac{(1 + 1/k)(Z_{\\alpha/2} + Z_\\beta)^2 \\cdot \\sigma^2}{(\\mu_1 - \\mu_2)^2}, \\quad n_2 = k \\cdot n_1';
      formulaExplanation = 'Standard two-sample Student t-test sample size with homogeneous variance and arbitrary allocation ratio k = n2/n1.';
      assumptions.push('Independent random samples in both groups.');
      assumptions.push('Continuous outcome normally distributed in both populations.');
      assumptions.push('Homogeneity of variance (homoscedasticity, σ1 ≈ σ2 = σ).');
      scientificReference = 'Cohen J. Statistical Power Analysis for the Behavioral Sciences, 2nd ed. Lawrence Erlbaum; 1988:20-27.';

      steps.push({
        name: 'Standardized Effect Size (Cohen’s d)',
        description: 'Mean difference divided by common standard deviation',
        formula: 'd = \\frac{|\\mu_1 - \\mu_2|}{\\sigma}',
        intermediateValue: `${delta.toFixed(3)} / ${sd.toFixed(3)} = ${cohensD.toFixed(3)} (${effectSizeInterpretation})`,
      });
      steps.push({
        name: 'Group 1 Sample Size (n1)',
        description: `With allocation ratio k = ${kRatio}`,
        formula: 'n_1 = \\frac{(1 + 1/' + kRatio + ') \\times ' + zSumSq.toFixed(3) + ' \\times ' + (sd * sd).toFixed(2) + '}{' + (delta * delta).toFixed(2) + '}',
        intermediateValue: `${n1Raw.toFixed(2)} → ceiling = ${n1}`,
      });
      steps.push({
        name: 'Group 2 Sample Size (n2)',
        description: 'n2 = k * n1',
        formula: `n_2 = ${kRatio} \\times ${n1}`,
        intermediateValue: `${n2}`,
      });
      break;
    }

    case 'paired_means': {
      const delta = Math.abs(inputs.meanDiff || 1);
      const sdd = inputs.sdDiff || 1;
      const dz = delta / sdd;
      effectSizeName = "Cohen's dz";
      effectSizeValue = dz;
      effectSizeInterpretation = interpretCohensD(dz);

      const nRaw = (Math.pow(zAlpha + zBeta, 2) * Math.pow(sdd, 2)) / Math.pow(delta, 2);
      evaluableN = Math.ceil(nRaw);
      totalN = evaluableN;

      formulaLaTeX = 'N_{pairs} = \\frac{(Z_{\\alpha/2} + Z_\\beta)^2 \\cdot \\sigma_d^2}{\\delta^2}';
      formulaExplanation = 'Paired / repeated measures design comparing before-and-after or split-mouth / contralateral matched pairs.';
      assumptions.push('Paired observations (e.g., pre/post or bilateral matched sites).');
      assumptions.push('Differences (d = x1 - x2) are normally distributed.');
      assumptions.push('Independent pairs.');
      scientificReference = 'Bland M. An Introduction to Medical Statistics, 4th ed. Oxford University Press; 2015:335-338.';

      steps.push({
        name: 'Paired Effect Size (dz)',
        description: 'Expected mean paired change divided by standard deviation of differences',
        formula: 'd_z = \\frac{|\\bar{d}|}{\\sigma_d}',
        intermediateValue: `${delta} / ${sdd} = ${dz.toFixed(3)} (${effectSizeInterpretation})`,
      });
      steps.push({
        name: 'Required Number of Pairs',
        description: 'Formula evaluation before rounding',
        formula: 'N = \\frac{(' + (zAlpha + zBeta).toFixed(3) + ')^2 \\times ' + (sdd * sdd).toFixed(2) + '}{' + (delta * delta).toFixed(2) + '}',
        intermediateValue: `${nRaw.toFixed(2)} → ceiling = ${evaluableN} pairs`,
      });
      break;
    }

    case 'one_way_anova': {
      const k = inputs.numGroups || 3;
      let f = inputs.cohensF;

      if (!f && inputs.groupMeans && inputs.pooledSd) {
        const means = inputs.groupMeans;
        const grandMean = means.reduce((a, b) => a + b, 0) / k;
        const varianceBetween = means.reduce((acc, m) => acc + Math.pow(m - grandMean, 2), 0) / k;
        const sigmaM = Math.sqrt(varianceBetween);
        f = sigmaM / inputs.pooledSd;
      }
      f = f || 0.25;

      effectSizeName = "Cohen's f";
      effectSizeValue = f;
      effectSizeInterpretation = interpretCohensF(f);

      // Iterative exact power solution using non-central F distribution
      // Initial estimate from normal approximation: n0 ≈ (zAlpha + zBeta)^2 / (f^2 * k) + 1
      let nGuess = Math.max(3, Math.ceil(Math.pow(zAlpha + zBeta, 2) / (Math.pow(f, 2) * k)));
      let achievedPower = 0;

      for (let n = nGuess; n <= 5000; n++) {
        const df1 = k - 1;
        const df2 = k * (n - 1);
        const fCrit = 1 / fCDF(1 - inputs.alpha, df2, df1); // or via approximation
        // Compute non-centrality lambda = N * f^2 = k * n * f^2
        const lambda = k * n * Math.pow(f, 2);
        // Find critical F from central F CDF:
        // We find fCrit where central fCDF(fCrit, df1, df2) = 1 - alpha:
        // Using binary search for exact fCrit
        let low = 0.5;
        let high = 50.0;
        for (let iter = 0; iter < 30; iter++) {
          const mid = (low + high) / 2;
          if (fCDF(mid, df1, df2) < 1 - inputs.alpha) {
            low = mid;
          } else {
            high = mid;
          }
        }
        const exactFCrit = (low + high) / 2;
        // Non-central F power = 1 - nonCentralFCDF(exactFCrit, df1, df2, lambda)
        achievedPower = 1 - nonCentralFCDF(exactFCrit, df1, df2, lambda);

        if (achievedPower >= inputs.power) {
          nPerGroup = n;
          break;
        }
      }

      if (!nPerGroup) nPerGroup = nGuess;
      evaluableN = nPerGroup * k;
      totalN = evaluableN;

      formulaLaTeX = 'f = \\frac{\\sigma_m}{\\sigma}, \\quad \\lambda = N \\cdot f^2 = k \\cdot n \\cdot f^2, \\quad 1-\\beta = P(F\' > F_{crit} \\mid \\lambda)';
      formulaExplanation = 'One-way ANOVA for k independent groups based on the non-central F-distribution power inversion.';
      assumptions.push('Continuous response variable.');
      assumptions.push('Normally distributed residuals across all k groups.');
      assumptions.push('Homoscedasticity (equal within-group variances).');
      assumptions.push('Independent random allocation to groups.');
      scientificReference = 'Cohen J. Statistical Power Analysis for the Behavioral Sciences. Erlbaum; 1988:273-288.';

      steps.push({
        name: "Standardized Effect Size (Cohen's f)",
        description: 'Standard deviation of group means divided by pooled within-group SD',
        formula: 'f = \\frac{\\sigma_m}{\\sigma}',
        intermediateValue: `${f.toFixed(3)} (${effectSizeInterpretation})`,
      });
      steps.push({
        name: 'Degrees of Freedom',
        description: 'Between-group df1 and within-group df2',
        formula: 'df_1 = k - 1, \\quad df_2 = k(n - 1)',
        intermediateValue: `df1 = ${k - 1}, df2 = ${k * (nPerGroup - 1)}`,
      });
      steps.push({
        name: 'Achieved Statistical Power',
        description: 'Exact non-central F power at selected sample size',
        formula: 'Power = 1 - F_{k-1, k(n-1), \\lambda}(F_{crit})',
        intermediateValue: `${(achievedPower * 100).toFixed(2)}% (Target: ${(inputs.power * 100).toFixed(0)}%)`,
      });
      break;
    }

    case 'two_independent_proportions': {
      const p1 = inputs.prop1 ?? 0.3;
      const p2 = inputs.prop2 ?? 0.5;
      const delta = Math.abs(p1 - p2);
      const cohensH = 2 * Math.abs(Math.asin(Math.sqrt(p1)) - Math.asin(Math.sqrt(p2)));
      effectSizeName = "Cohen's h";
      effectSizeValue = cohensH;
      effectSizeInterpretation = interpretCohensH(cohensH);

      const pPooled = (p1 + kRatio * p2) / (1 + kRatio);
      const qPooled = 1 - pPooled;
      const q1 = 1 - p1;
      const q2 = 1 - p2;

      // Fleiss uncorrected formula with allocation ratio:
      const term1 = zAlpha * Math.sqrt((1 + 1 / kRatio) * pPooled * qPooled);
      const term2 = zBeta * Math.sqrt(p1 * q1 + (p2 * q2) / kRatio);
      const n1Raw = Math.pow(term1 + term2, 2) / Math.pow(delta, 2);

      // Fleiss continuity correction:
      const n1CC = (n1Raw / 4) * Math.pow(1 + Math.sqrt(1 + (2 * (kRatio + 1)) / (n1Raw * kRatio * delta)), 2);

      n1 = Math.ceil(n1CC);
      n2 = Math.ceil(n1 * kRatio);
      evaluableN = n1 + n2;
      nPerGroup = kRatio === 1.0 ? n1 : undefined;
      totalN = evaluableN;

      formulaLaTeX = 'n_1 = \\frac{\\left[Z_{\\alpha/2}\\sqrt{(1+1/k)\\bar{p}\\bar{q}} + Z_\\beta\\sqrt{p_1 q_1 + p_2 q_2/k}\\right]^2}{(p_1 - p_2)^2} \\times \\text{CC}';
      formulaExplanation = 'Two-sample test of proportions using Fleiss formula with continuity correction for clinical trials.';
      assumptions.push('Binary outcome (success/failure, cure/non-cure).');
      assumptions.push('Independent observations between and within groups.');
      assumptions.push('Binomial distribution in both populations.');
      scientificReference = 'Fleiss JL, Levin B, Paik MC. Statistical Methods for Rates and Proportions, 3rd ed. Wiley; 2003:64-85.';

      steps.push({
        name: "Cohen's h Effect Size",
        description: 'Arcsine transformation difference between proportions',
        formula: 'h = 2|\\arcsin(\\sqrt{p_1}) - \\arcsin(\\sqrt{p_2})|',
        intermediateValue: `${cohensH.toFixed(3)} (${effectSizeInterpretation})`,
      });
      steps.push({
        name: 'Pooled Proportion',
        description: 'Weighted average under the null hypothesis',
        formula: '\\bar{p} = (p_1 + k \\cdot p_2) / (1 + k)',
        intermediateValue: `${pPooled.toFixed(3)}`,
      });
      steps.push({
        name: 'Group Sizes (Continuity Corrected)',
        description: 'Fleiss formula with continuity correction',
        formula: 'n_1 = \\lceil n_{1,cc} \\rceil, \\quad n_2 = \\lceil k \\cdot n_1 \\rceil',
        intermediateValue: `n1 = ${n1}, n2 = ${n2} (Total = ${evaluableN})`,
      });
      break;
    }

    case 'one_sample_proportion': {
      const P = inputs.expectedProp ?? 0.2;
      const d = inputs.marginOfError ?? 0.05;

      // Absolute precision formula: n = Z^2 * P * (1-P) / d^2
      const n0 = (Math.pow(zAlpha, 2) * P * (1 - P)) / Math.pow(d, 2);
      let nAdjusted = n0;

      if (inputs.populationSize && inputs.populationSize > 1) {
        // Finite population correction
        nAdjusted = n0 / (1 + (n0 - 1) / inputs.populationSize);
        steps.push({
          name: 'Finite Population Correction (FPC)',
          description: `Applied for finite target population N_pop = ${inputs.populationSize}`,
          formula: 'n = \\frac{n_0}{1 + (n_0 - 1)/N_{pop}}',
          intermediateValue: `${n0.toFixed(2)} → ${nAdjusted.toFixed(2)}`,
        });
      }

      evaluableN = Math.ceil(nAdjusted);
      totalN = evaluableN;
      effectSizeName = 'Precision Margin (d)';
      effectSizeValue = d;
      effectSizeInterpretation = `Absolute margin of ±${(d * 100).toFixed(1)}%`;

      formulaLaTeX = 'n = \\frac{Z_{\\alpha/2}^2 \\cdot P(1 - P)}{d^2}';
      formulaExplanation = 'Sample size for prevalence survey or single-proportion estimation with specified confidence and precision.';
      assumptions.push('Simple random sampling from the target population.');
      assumptions.push('Binary outcome (case/non-case).');
      assumptions.push('Normal approximation to the binomial distribution valid (nP >= 5, n(1-P) >= 5).');
      scientificReference = 'Daniel WW, Cross CL. Biostatistics: A Foundation for Analysis in the Health Sciences, 10th ed. Wiley; 2013:189-191.';

      steps.push({
        name: 'Wilson / Wald Precision Formula',
        description: 'Calculation of uncorrected sample size',
        formula: 'n_0 = \\frac{(' + zAlpha.toFixed(3) + ')^2 \\times ' + (P * (1 - P)).toFixed(4) + '}{' + (d * d).toFixed(4) + '}',
        intermediateValue: `${n0.toFixed(2)} → ceiling = ${evaluableN}`,
      });
      break;
    }

    case 'correlation': {
      const r = inputs.expectedCorrelation ?? 0.3;
      const r0 = inputs.nullCorrelation ?? 0;
      const zr = 0.5 * Math.log((1 + r) / (1 - r));
      const z0 = 0.5 * Math.log((1 + r0) / (1 - r0));
      const deltaZ = Math.abs(zr - z0);

      const nRaw = Math.pow((zAlpha + zBeta) / deltaZ, 2) + 3;
      evaluableN = Math.ceil(nRaw);
      totalN = evaluableN;

      effectSizeName = "Pearson's r";
      effectSizeValue = r;
      effectSizeInterpretation = interpretCorrelation(r);

      formulaLaTeX = 'N = \\left( \\frac{Z_{\\alpha/2} + Z_\\beta}{\\frac{1}{2}\\ln\\frac{1+r}{1-r} - \\frac{1}{2}\\ln\\frac{1+r_0}{1-r_0}} \\right)^2 + 3';
      formulaExplanation = "Fisher's z-transformation sample size formula for Pearson and Spearman correlation coefficients.";
      assumptions.push('Bivariate normal distribution of the two variables.');
      assumptions.push('Linear relationship between variables.');
      assumptions.push('Independent pairs of observations.');
      scientificReference = 'Hulley SB, et al. Designing Clinical Research, 4th ed. Wolters Kluwer; 2013:89-91.';

      steps.push({
        name: "Fisher's z Transformation",
        description: 'Normalizing transform for correlation coefficient r',
        formula: 'z_r = \\frac{1}{2}\\ln\\left(\\frac{1+r}{1-r}\\right)',
        intermediateValue: `z_r = ${zr.toFixed(4)}`,
      });
      steps.push({
        name: 'Sample Size Calculation',
        description: 'Sample size via Fisher transformation with +3 bias adjustment',
        formula: 'N = [(' + (zAlpha + zBeta).toFixed(3) + ') / ' + deltaZ.toFixed(4) + ']^2 + 3',
        intermediateValue: `${nRaw.toFixed(2)} → ceiling = ${evaluableN}`,
      });
      break;
    }

    case 'diagnostic_accuracy': {
      const sens = inputs.sensitivity ?? 0.85;
      const spec = inputs.specificity ?? 0.90;
      const prev = inputs.prevalence ?? 0.20;
      const w = inputs.diagnosticPrecision ?? 0.05;

      // Sample size for sensitivity: n_disease = Z^2 * Sens * (1 - Sens) / w^2
      // Total N based on sensitivity = n_disease / prev
      const nCasesSens = (Math.pow(zAlpha, 2) * sens * (1 - sens)) / Math.pow(w, 2);
      const totalNSens = nCasesSens / prev;

      // Sample size for specificity: n_controls = Z^2 * Spec * (1 - Spec) / w^2
      // Total N based on specificity = n_controls / (1 - prev)
      const nControlsSpec = (Math.pow(zAlpha, 2) * spec * (1 - spec)) / Math.pow(w, 2);
      const totalNSpec = nControlsSpec / (1 - prev);

      const recommendedTotal = Math.max(totalNSens, totalNSpec);
      evaluableN = Math.ceil(recommendedTotal);
      totalN = evaluableN;

      effectSizeName = 'Sens / Spec Precision (w)';
      effectSizeValue = w;
      effectSizeInterpretation = `Margin ±${(w * 100).toFixed(1)}% at ${(prev * 100).toFixed(1)}% prevalence`;

      formulaLaTeX = 'N_{\\text{sens}} = \\frac{Z_{\\alpha/2}^2 \\cdot \\text{Sens}(1-\\text{Sens})}{w^2 \\cdot P}, \\quad N_{\\text{spec}} = \\frac{Z_{\\alpha/2}^2 \\cdot \\text{Spec}(1-\\text{Spec})}{w^2 \\cdot (1-P)}';
      formulaExplanation = 'Buderer formula for diagnostic test accuracy studies ensuring adequate precision for both sensitivity and specificity.';
      assumptions.push('Gold standard / reference standard applied independently and blindly.');
      assumptions.push('Spectrum of patients represents target clinical population.');
      assumptions.push('Prevalence estimate reflects target setting.');
      scientificReference = 'Buderer NM. Statistical methodology: I. Incorporating the prevalence of disease into the sample size calculation for sensitivity and specificity. Acad Emerg Med. 1996;3(9):895-900.';

      steps.push({
        name: 'Diseased Cohort for Sensitivity',
        description: 'Required cases with confirmed target condition',
        formula: 'n_{\\text{cases}} = \\frac{(' + zAlpha.toFixed(3) + ')^2 \\times ' + (sens * (1 - sens)).toFixed(4) + '}{' + (w * w).toFixed(4) + '}',
        intermediateValue: `${Math.ceil(nCasesSens)} cases (Implies total N = ${Math.ceil(totalNSens)})`,
      });
      steps.push({
        name: 'Non-Diseased Cohort for Specificity',
        description: 'Required controls without target condition',
        formula: 'n_{\\text{controls}} = \\frac{(' + zAlpha.toFixed(3) + ')^2 \\times ' + (spec * (1 - spec)).toFixed(4) + '}{' + (w * w).toFixed(4) + '}',
        intermediateValue: `${Math.ceil(nControlsSpec)} controls (Implies total N = ${Math.ceil(totalNSpec)})`,
      });
      steps.push({
        name: 'Governing Recommendation',
        description: 'Maximum of total subjects required to satisfy both endpoints',
        formula: 'N = \\max(N_{\\text{sens}}, N_{\\text{spec}})',
        intermediateValue: `${evaluableN} total patients (expected ${Math.round(evaluableN * prev)} cases, ${Math.round(evaluableN * (1 - prev))} controls)`,
      });
      break;
    }

    case 'non_inferiority_means': {
      const deltaNI = inputs.marginNonInferiority ?? 1.0;
      const expDiff = Math.abs(inputs.meanDiff ?? 0);
      const sd = inputs.sd ?? 1.0;
      const effectiveMargin = deltaNI - expDiff;

      if (effectiveMargin <= 0) {
        warnings.push('True expected difference equals or exceeds the non-inferiority margin, making non-inferiority impossible to prove.');
      }

      // One-sided alpha for non-inferiority (e.g., 0.025 or 0.05)
      const zAlphaOneSided = normalQuantile(1 - inputs.alpha);
      const zSumSq = Math.pow(zAlphaOneSided + zBeta, 2);
      const safeMargin = Math.max(0.001, effectiveMargin);

      const n1Raw = ((1 + 1 / kRatio) * zSumSq * Math.pow(sd, 2)) / Math.pow(safeMargin, 2);
      n1 = Math.ceil(n1Raw);
      n2 = Math.ceil(n1 * kRatio);
      evaluableN = n1 + n2;
      nPerGroup = kRatio === 1.0 ? n1 : undefined;
      totalN = evaluableN;

      effectSizeName = 'Non-Inferiority Margin (Δ)';
      effectSizeValue = deltaNI;
      effectSizeInterpretation = `Margin Δ = ${deltaNI}, Expected Diff = ${expDiff}`;

      formulaLaTeX = 'n_1 = \\frac{(1 + 1/k)(Z_\\alpha + Z_\\beta)^2 \\cdot \\sigma^2}{(\\Delta - |\\mu_T - \\mu_C|)^2}';
      formulaExplanation = 'Blackwelder formula for non-inferiority trials comparing active treatment against standard control.';
      assumptions.push('One-sided hypothesis test (H0: μT - μC <= -Δ vs H1: μT - μC > -Δ).');
      assumptions.push('Clinically validated and pre-specified non-inferiority margin Δ.');
      assumptions.push('Homogeneity of variance between test and reference groups.');
      scientificReference = 'Blackwelder WC. "Proving the null hypothesis" in clinical trials. Control Clin Trials. 1982;3(4):345-353.';

      steps.push({
        name: 'Effective Testing Margin',
        description: 'Non-inferiority margin minus anticipated difference',
        formula: '\\Delta_{\\text{eff}} = \\Delta - |\\mu_T - \\mu_C|',
        intermediateValue: `${deltaNI} - ${expDiff} = ${effectiveMargin.toFixed(3)}`,
      });
      steps.push({
        name: 'Group 1 Allocation',
        description: 'Evaluated with one-sided Z_alpha',
        formula: 'n_1 = \\frac{(1 + 1/' + kRatio + ') \\times ' + zSumSq.toFixed(3) + ' \\times ' + (sd * sd).toFixed(2) + '}{' + (safeMargin * safeMargin).toFixed(4) + '}',
        intermediateValue: `n1 = ${n1}, n2 = ${n2} (Total = ${evaluableN})`,
      });
      break;
    }

    case 'cluster_randomized_means': {
      const delta = inputs.meanDiff !== undefined
        ? Math.abs(inputs.meanDiff)
        : Math.abs((inputs.mean1 ?? 0) - (inputs.mean2 ?? 0));
      const sd = inputs.sd || 1;
      const m = inputs.clusterSize || 20;
      const icc = inputs.icc || 0.05;

      // Variance Inflation Factor (Design Effect)
      const vif = 1 + (m - 1) * icc;

      // Individual-level sample size
      const zSumSq = Math.pow(zAlpha + zBeta, 2);
      const nIndivRaw = (2 * zSumSq * Math.pow(sd, 2)) / Math.pow(delta, 2);
      const nIndivPerGroup = Math.ceil(nIndivRaw);

      // Cluster-adjusted sample size per group:
      const nClusterPerGroupRaw = nIndivPerGroup * vif;
      const clustersPerGroup = Math.ceil(nClusterPerGroupRaw / m);
      const totalClusters = clustersPerGroup * 2;
      const finalNPerGroup = clustersPerGroup * m;

      evaluableN = finalNPerGroup * 2;
      totalN = evaluableN;
      nPerGroup = finalNPerGroup;

      effectSizeName = 'Design Effect (VIF)';
      effectSizeValue = vif;
      effectSizeInterpretation = `VIF = ${vif.toFixed(2)} (Cluster size m=${m}, ICC=${icc})`;

      formulaLaTeX = '\\text{VIF} = 1 + (m - 1)\\rho, \\quad N_{\\text{cluster}} = N_{\\text{indiv}} \\times \\text{VIF}, \\quad k = \\lceil N_{\\text{cluster}} / m \\rceil';
      formulaExplanation = 'Cluster-randomized trial sample size inflated for intracluster correlation (Donner & Klar formula).';
      assumptions.push('Equal cluster sizes across trial arms.');
      assumptions.push('Constant intracluster correlation coefficient (ICC) across clusters.');
      assumptions.push('Normally distributed cluster-level and individual-level errors.');
      scientificReference = 'Donner A, Klar N. Design and Analysis of Cluster Randomization Trials in Health Research. Arnold; 2000:37-45.';

      steps.push({
        name: 'Variance Inflation Factor (Design Effect)',
        description: 'VIF = 1 + (m - 1) * ICC',
        formula: '\\text{VIF} = 1 + (' + m + ' - 1) \\times ' + icc,
        intermediateValue: `${vif.toFixed(3)}`,
      });
      steps.push({
        name: 'Individual-Level Requirement (Unadjusted)',
        description: 'Standard two-sample mean requirement per group',
        formula: 'n_{\\text{indiv}} = \\frac{2 \\times (' + (zAlpha + zBeta).toFixed(3) + ')^2 \\times ' + (sd * sd).toFixed(2) + '}{' + (delta * delta).toFixed(2) + '}',
        intermediateValue: `${nIndivPerGroup} subjects/group`,
      });
      steps.push({
        name: 'Cluster Allocation',
        description: `Total clusters required across both arms`,
        formula: `k = \\lceil (${nIndivPerGroup} \\times ${vif.toFixed(2)}) / ${m} \\rceil`,
        intermediateValue: `${clustersPerGroup} clusters/arm (${totalClusters} total clusters, ${evaluableN} total participants)`,
      });
      break;
    }
  }

  // Dropout / Attrition Adjustment
  const dropoutRate = inputs.dropoutRate || 0;
  const retentionFraction = Math.max(0.1, 1 - dropoutRate / 100);
  const recruitmentN = Math.ceil(evaluableN / retentionFraction);

  steps.push({
    name: 'Recruitment Target (Dropout Adjustment)',
    description: `Inflates evaluable sample size for expected ${dropoutRate}% attrition or unusable specimens`,
    formula: 'N_{\\text{recruitment}} = \\left\\lceil \\frac{N_{\\text{evaluable}}}{1 - \\text{dropout}\\%} \\right\\rceil',
    intermediateValue: `⌈ ${evaluableN} / ${retentionFraction.toFixed(2)} ⌉ = ${recruitmentN} subjects/specimens`,
  });

  const calculationTimestamp = new Date().toISOString();

  // Create hash payload
  const hashPayload = {
    studyDesign: inputs.studyDesign,
    alpha: inputs.alpha,
    power: inputs.power,
    hypothesis: inputs.hypothesis,
    effectSizeValue,
    evaluableN,
    recruitmentN,
    dropoutRate,
    timestamp: calculationTimestamp,
  };
  const hash = await generateRecordHash(hashPayload);

  return {
    studyDesign: inputs.studyDesign,
    evaluableN,
    recruitmentN,
    n1,
    n2,
    nPerGroup,
    totalN,
    allocationRatio: kRatio,
    dropoutRate,
    effectSizeName,
    effectSizeValue,
    effectSizeInterpretation,
    alpha: inputs.alpha,
    power: inputs.power,
    criticalValues: {
      zAlpha,
      zBeta,
    },
    formulaLaTeX,
    formulaExplanation,
    assumptions,
    steps,
    warnings,
    scientificReference,
    calculationTimestamp,
    hash,
  };
}

// Helpers for effect size interpretation
function interpretCohensD(d: number): string {
  if (d < 0.2) return 'Negligible effect';
  if (d < 0.5) return 'Small effect';
  if (d < 0.8) return 'Medium effect';
  return 'Large effect';
}

function interpretCohensF(f: number): string {
  if (f < 0.1) return 'Negligible effect';
  if (f < 0.25) return 'Small effect';
  if (f < 0.4) return 'Medium effect';
  return 'Large effect';
}

function interpretCohensH(h: number): string {
  if (h < 0.2) return 'Small effect';
  if (h < 0.5) return 'Medium effect';
  return 'Large effect';
}

function interpretCorrelation(r: number): string {
  const absR = Math.abs(r);
  if (absR < 0.1) return 'Negligible correlation';
  if (absR < 0.3) return 'Weak correlation';
  if (absR < 0.5) return 'Moderate correlation';
  if (absR < 0.7) return 'Strong correlation';
  return 'Very strong correlation';
}
