import QRCode from 'qrcode';
import { CalculationCertificate, ResearchReportRecord } from '../types/certificate';
import { SampleSizeInputs, SampleSizeResult } from '../types/sampleSize';

const STORAGE_KEY_CERTS = 'statsmate_certificates_v1';
const STORAGE_KEY_REPORTS = 'statsmate_reports_v1';

export async function createCertificate(
  inputs: SampleSizeInputs,
  result: SampleSizeResult
): Promise<CalculationCertificate> {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const year = new Date().getFullYear();
  const certId = `CERT-STAT-${year}-${randomSuffix}`;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const verificationUrl = `${currentOrigin}/?verify=${encodeURIComponent(certId)}#verify`;

  // Generate QR code data URL
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (e) {
    console.error('QR code generation error:', e);
  }

  const cert: CalculationCertificate = {
    certificateId: certId,
    recordHash: result.hash,
    studyTitle: inputs.studyTitle || 'Biomedical Research Study',
    primaryOutcome: inputs.primaryOutcome || 'Primary Endpoint',
    researcherName: inputs.researcherName || 'Principal Investigator',
    institution: inputs.institution || 'University / Academic Medical Center',
    issuedAt: result.calculationTimestamp,
    softwareName: 'StatsMate Research',
    softwareVersion: 'v2.4 (Engine build 2026.1)',
    engineBuild: '2026.1-PROD-STABLE',
    studyDesign: formatStudyDesignName(result.studyDesign),
    methodName: result.formulaExplanation,
    parameters: {
      alpha: result.alpha,
      power: result.power,
      hypothesis: inputs.hypothesis === 'two_sided' ? 'Two-sided (α/2)' : 'One-sided (α)',
      effectSize: result.effectSizeValue,
      effectSizeName: result.effectSizeName,
      evaluableN: result.evaluableN,
      dropoutRate: result.dropoutRate,
      recruitmentN: result.recruitmentN,
      allocationRatio: result.allocationRatio,
      groupBreakdown: result.n1 && result.n2 ? `Arm 1 = ${result.n1}, Arm 2 = ${result.n2}` : undefined,
    },
    assumptions: result.assumptions,
    mandatoryDisclosure:
      'This certificate documents the statistical calculation performed by StatsMate Research using the recorded inputs, method and software version. It does not constitute institutional accreditation, ethics approval, independent statistical review, or a guarantee of study validity.',
    verificationUrl,
    qrCodeDataUrl,
    isSessionOnly: false,
  };

  // Persist locally
  saveCertificate(cert);

  // Sync with backend API silently if available
  try {
    await fetch('/api/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cert),
    }).catch(() => {});
  } catch {}

  return cert;
}

export function saveCertificate(cert: CalculationCertificate) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getAllCertificates();
    const updated = [cert, ...existing.filter((c) => c.certificateId !== cert.certificateId)];
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save certificate locally:', e);
  }
}

export function getAllCertificates(): CalculationCertificate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CERTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function lookupCertificate(idOrHash: string): Promise<CalculationCertificate | null> {
  const query = idOrHash.trim();
  // 1. Check local storage
  const all = getAllCertificates();
  const localMatch = all.find(
    (c) => c.certificateId.toLowerCase() === query.toLowerCase() || c.recordHash === query
  );
  if (localMatch) return localMatch;

  // 2. Try backend API
  try {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(query)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return null;
}

export function saveReportRecord(report: ResearchReportRecord) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    const existing: ResearchReportRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [report, ...existing.filter((r) => r.reportId !== report.reportId)];
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save report locally:', e);
  }
}

export function getAllReportRecords(): ResearchReportRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatStudyDesignName(design: string): string {
  const names: Record<string, string> = {
    one_sample_mean: 'One-Sample Mean Test',
    two_independent_means: 'Two Independent Means (Student/Welch)',
    paired_means: 'Paired Means (Matched Pairs / Pre-Post)',
    one_way_anova: 'One-Way Analysis of Variance (ANOVA)',
    two_independent_proportions: 'Two Independent Proportions (Fleiss)',
    one_sample_proportion: 'One-Sample Proportion & Prevalence Estimation',
    correlation: 'Correlation Study (Pearson/Spearman Fisher z)',
    diagnostic_accuracy: 'Diagnostic Sensitivity & Specificity Precision',
    non_inferiority_means: 'Non-Inferiority Trial (Means)',
    cluster_randomized_means: 'Cluster-Randomized Trial (Donner & Klar)',
  };
  return names[design] || design;
}
