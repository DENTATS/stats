import { jsPDF } from 'jspdf';
import { CalculationCertificate } from '../types/certificate';

export function generateCertificatePDF(cert: CalculationCertificate) {
  // A4 Landscape for formal certificate layout (297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background and borders
  doc.setFillColor(252, 253, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border - Navy
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner border - Gold
  doc.setDrawColor(180, 130, 40); // gold
  doc.setLineWidth(0.6);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Corner decorative marks
  const cornerSize = 6;
  doc.setFillColor(180, 130, 40);
  doc.rect(13, 13, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 13 - cornerSize, 13, cornerSize, cornerSize, 'F');
  doc.rect(13, pageHeight - 13 - cornerSize, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 13 - cornerSize, pageHeight - 13 - cornerSize, cornerSize, cornerSize, 'F');

  // Header Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CERTIFICATE OF STATISTICAL CALCULATION', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Record: ${cert.certificateId}   |   Issued: ${new Date(cert.issuedAt).toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });

  // Main study box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(20, 40, pageWidth - 40, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.studyTitle, 26, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Primary Endpoint: ${cert.primaryOutcome}`, 26, 55);
  doc.text(`Investigator: ${cert.researcherName || 'Not recorded'}   |   Institution: ${cert.institution || 'Academic Center'}`, 26, 62);

  // Key Result Banner (Sample Size Highlight)
  doc.setFillColor(238, 242, 255); // Indigo light
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.roundedRect(20, 72, pageWidth - 40, 32, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CALCULATED SAMPLE SIZE TARGETS', 28, 81);

  // Left Metric: Evaluable N
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`${cert.parameters.evaluableN}`, 35, 96);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Required Evaluable Subjects (N_eval)', 55, 95);

  // Right Metric: Recruitment Target (with Dropout)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text(`${cert.parameters.recruitmentN}`, 165, 96);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Recruitment Target (with ${cert.parameters.dropoutRate}% Attrition / Dropout)`, 188, 95);

  // Parameters Grid
  const startY = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('METHODOLOGICAL PARAMETERS & ASSUMPTIONS', 20, startY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const col1X = 22;
  const col2X = 95;
  const col3X = 170;

  doc.text(`Study Design: ${cert.studyDesign}`, col1X, startY + 7);
  doc.text(`Significance Level (α): ${cert.parameters.alpha} (${cert.parameters.hypothesis})`, col1X, startY + 13);
  doc.text(`Statistical Power (1 - β): ${(cert.parameters.power * 100).toFixed(0)}%`, col1X, startY + 19);

  doc.text(`Effect Size (${cert.parameters.effectSizeName}): ${cert.parameters.effectSize.toFixed(3)}`, col2X, startY + 7);
  doc.text(`Allocation Ratio: k = ${cert.parameters.allocationRatio}`, col2X, startY + 13);
  if (cert.parameters.groupBreakdown) {
    doc.text(`Group Breakdown: ${cert.parameters.groupBreakdown}`, col2X, startY + 19);
  } else {
    doc.text(`Group Breakdown: Equal allocation`, col2X, startY + 19);
  }

  doc.text(`Software Engine: ${cert.softwareName} ${cert.softwareVersion}`, col3X, startY + 7);
  doc.text(`Build Stamp: ${cert.engineBuild}`, col3X, startY + 13);
  doc.text(`Calculation Date: ${new Date(cert.issuedAt).toUTCString()}`, col3X, startY + 19);

  // Verification & Hash Section
  const verifY = 138;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(20, verifY, pageWidth - 20, verifY);

  // QR Code on right if present
  if (cert.qrCodeDataUrl) {
    try {
      doc.addImage(cert.qrCodeDataUrl, 'PNG', pageWidth - 55, verifY + 4, 32, 32);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to Verify Record', pageWidth - 39, verifY + 39, { align: 'center' });
    } catch (e) {
      console.warn('QR image render error:', e);
    }
  }

  // Record Hash
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CRYPTOGRAPHIC RECORD HASH (SHA-256):', 20, verifY + 8);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(cert.recordHash, 20, verifY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Verification Portal URL: ${cert.verificationUrl}`, 20, verifY + 19);

  // Mandatory Scope & Limitation Disclosure Box (EXACT required text)
  const discY = 166;
  doc.setFillColor(254, 242, 242); // very light warm red/slate
  doc.setDrawColor(252, 165, 165);
  doc.setLineWidth(0.4);
  doc.roundedRect(20, discY, pageWidth - 78, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('MANDATORY REGULATORY & CERTIFICATION DISCLOSURE', 24, discY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(127, 29, 29);
  const disclosureLines = doc.splitTextToSize(cert.mandatoryDisclosure, pageWidth - 86);
  doc.text(disclosureLines, 24, discY + 10);

  // Footer notes
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated deterministically by StatsMate Research. Retain this certificate with your IRB / Ethics Protocol submission file.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Trigger download
  doc.save(`${cert.certificateId}_Certificate.pdf`);
}
