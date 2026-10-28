export type VariableType = 'continuous' | 'discrete' | 'categorical' | 'binary' | 'id';

export interface VariableSummary {
  name: string;
  type: VariableType;
  totalCount: number;
  validCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  // Numerical metrics
  mean?: number;
  sd?: number;
  variance?: number;
  median?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  min?: number;
  max?: number;
  skewness?: number;
  kurtosis?: number;
  // Categorical frequency
  categories?: { label: string; count: number; percentage: number }[];
}

export interface NormalityCheckResult {
  variableName: string;
  statisticName: string;
  statisticValue: number;
  pValue: number;
  isNormal: boolean;
  skewness: number;
  kurtosis: number;
  interpretation: string;
}

export interface HomogeneityResult {
  testName: string;
  statistic: number;
  df1: number;
  df2: number;
  pValue: number;
  equalVariancesAssumed: boolean;
  interpretation: string;
}

export type StatisticalTestType =
  | 'independent_t_test'
  | 'welch_t_test'
  | 'paired_t_test'
  | 'one_way_anova'
  | 'mann_whitney_u'
  | 'wilcoxon_signed_rank'
  | 'kruskal_wallis'
  | 'chi_square'
  | 'fisher_exact'
  | 'pearson_correlation'
  | 'spearman_correlation'
  | 'linear_regression'
  | 'logistic_regression';

export interface GroupStatistic {
  groupName: string;
  n: number;
  mean: number;
  sd: number;
  se: number;
  median: number;
  iqr: number;
  ci95Lower: number;
  ci95Upper: number;
}

export interface PostHocComparison {
  comparison: string;
  difference: number;
  statistic: number;
  pValue: number;
  adjustedPValue: number;
  adjustmentMethod: string;
  ci95Lower: number;
  ci95Upper: number;
  isSignificant: boolean;
}

export interface StatisticalTestResult {
  testType: StatisticalTestType;
  testName: string;
  nullHypothesis: string;
  altHypothesis: string;
  statisticName: string;
  statisticValue: number;
  df?: number | [number, number];
  pValue: number;
  isSignificant: boolean;
  alpha: number;
  effectSizeName: string;
  effectSizeValue: number;
  effectSizeInterpretation: string;
  confidenceInterval?: {
    level: number;
    lower: number;
    upper: number;
    parameterName: string;
  };
  groupStatistics?: GroupStatistic[];
  postHoc?: PostHocComparison[];
  assumptions: {
    name: string;
    status: 'passed' | 'violated' | 'warning' | 'assumed';
    details: string;
  }[];
  scientificInterpretation: string;
  limitations: string[];
  reference: string;
  calculationDetails: {
    label: string;
    value: string | number;
  }[];
}
