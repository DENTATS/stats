import { SampleSizeInputs, SampleSizeResult } from './sampleSize';
import { StatisticalTestResult } from './analysis';

export interface CalculationCertificate {
  certificateId: string; // e.g., "CERT-STAT-2026-88192"
  recordHash: string; // SHA-256 deterministic hash
  studyTitle: string;
  primaryOutcome: string;
  researcherName?: string;
  institution?: string;
  issuedAt: string; // ISO 8601
  softwareName: string;
  softwareVersion: string;
  engineBuild: string;
  studyDesign: string;
  methodName: string;
  parameters: {
    alpha: number;
    power: number;
    hypothesis: string;
    effectSize: number;
    effectSizeName: string;
    evaluableN: number;
    dropoutRate: number;
    recruitmentN: number;
    allocationRatio: number;
    groupBreakdown?: string;
    additionalParams?: Record<string, any>;
  };
  assumptions: string[];
  mandatoryDisclosure: string;
  verificationUrl: string;
  qrCodeDataUrl?: string;
  isSessionOnly: boolean;
}

export interface ResearchReportRecord {
  reportId: string;
  title: string;
  createdAt: string;
  certificateId?: string;
  sampleSizeInputs?: SampleSizeInputs;
  sampleSizeResult?: SampleSizeResult;
  analysisResults?: StatisticalTestResult[];
  datasetName?: string;
  datasetRowCount?: number;
  datasetColCount?: number;
  recordHash: string;
}
