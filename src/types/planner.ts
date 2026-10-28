export type StudyCategory =
  | 'in_vitro'
  | 'rct'
  | 'observational'
  | 'diagnostic'
  | 'reliability'
  | 'method_validation'
  | 'correlation_regression';

export interface StudyPlan {
  id: string;
  category: StudyCategory;
  title: string;
  hypothesis: string;
  primaryOutcome: string;
  outcomeType: 'continuous' | 'binary' | 'time_to_event' | 'ordinal';
  experimentalUnit: string; // e.g., 'patient', 'tooth', 'specimen disk', 'cell culture well'
  numberOfGroups: number;
  groupLabels: string[];
  mcid?: string; // Minimal Clinically Important Difference
  proposedAnalysis: string;
  sampleSizeRationale: string;
  aiGuidance?: string;
  checklistStatus: {
    guidelineName: string; // e.g., CONSORT, STROBE, STARD, CRIS
    items: { item: string; completed: boolean; recommendation: string }[];
  };
  confirmedByResearcher: boolean;
  createdAt: string;
}
