export type StudyDesignType =
  | 'one_sample_mean'
  | 'two_independent_means'
  | 'paired_means'
  | 'one_way_anova'
  | 'two_independent_proportions'
  | 'one_sample_proportion'
  | 'correlation'
  | 'diagnostic_accuracy'
  | 'non_inferiority_means'
  | 'cluster_randomized_means';

export type HypothesisType = 'two_sided' | 'one_sided';

export interface SampleSizeInputs {
  studyDesign: StudyDesignType;
  studyTitle: string;
  primaryOutcome: string;
  researcherName?: string;
  institution?: string;

  // Hypothesis & Errors
  alpha: number; // e.g. 0.05
  power: number; // e.g. 0.80 or 0.90
  hypothesis: HypothesisType;

  // Means
  mean1?: number;
  mean2?: number;
  meanDiff?: number;
  sd?: number;
  sd1?: number;
  sd2?: number;
  sdDiff?: number; // for paired

  // ANOVA
  numGroups?: number;
  cohensF?: number;
  groupMeans?: number[];
  pooledSd?: number;

  // Proportions
  prop1?: number; // e.g. 0.30
  prop2?: number; // e.g. 0.50
  expectedProp?: number; // e.g. 0.15 for one-sample / prevalence
  marginOfError?: number; // precision d, e.g. 0.05
  populationSize?: number; // for finite population correction

  // Correlation
  expectedCorrelation?: number; // r, e.g. 0.40
  nullCorrelation?: number; // r0, default 0

  // Diagnostic
  sensitivity?: number; // e.g. 0.90
  specificity?: number; // e.g. 0.85
  prevalence?: number; // e.g. 0.20
  diagnosticPrecision?: number; // e.g. 0.05

  // Non-inferiority
  marginNonInferiority?: number; // delta margin e.g. 1.0

  // Cluster
  clusterSize?: number; // m, e.g. 20
  icc?: number; // intracluster correlation coefficient rho, e.g. 0.05

  // Study management
  allocationRatio: number; // k = N2 / N1, default 1.0
  dropoutRate: number; // percentage e.g. 10 or 15%
}

export interface CalculationStep {
  name: string;
  description: string;
  formula: string;
  intermediateValue: string | number;
}

export interface SampleSizeResult {
  studyDesign: StudyDesignType;
  evaluableN: number;
  recruitmentN: number;
  n1?: number;
  n2?: number;
  nPerGroup?: number;
  totalN: number;
  allocationRatio: number;
  dropoutRate: number;
  effectSizeName: string;
  effectSizeValue: number;
  effectSizeInterpretation: string;
  alpha: number;
  power: number;
  criticalValues: {
    zAlpha: number;
    zBeta: number;
    other?: Record<string, number>;
  };
  formulaLaTeX: string;
  formulaExplanation: string;
  assumptions: string[];
  steps: CalculationStep[];
  warnings: string[];
  scientificReference: string;
  calculationTimestamp: string;
  hash: string;
}
