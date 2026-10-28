import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { SampleSizeInputs, SampleSizeResult } from '../types/sampleSize';
import { StatisticalTestResult, VariableSummary } from '../types/analysis';

export interface ComprehensiveReportData {
  reportId: string;
  studyTitle: string;
  primaryOutcome: string;
  researcherName?: string;
  institution?: string;
  createdAt: string;
  sampleSizeInputs?: SampleSizeInputs;
  sampleSizeResult?: SampleSizeResult;
  datasetName?: string;
  variableSummaries?: VariableSummary[];
  analysisResults?: StatisticalTestResult[];
}

export async function generateComprehensiveReportPDF(data: ComprehensiveReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('STATSMATE RESEARCH — STATISTICAL PROTOCOL REPORT', margin, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Biostatistics, Sample Size & Reproducible Research Documentation', margin, 18);
  doc.text(`Report ID: ${data.reportId}`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 32;

  // Study Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.studyTitle || 'Untitled Research Study', margin + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Primary Endpoint: ${data.primaryOutcome || 'Primary variable'}`, margin + 5, currentY + 13);
  doc.text(`Principal Investigator: ${data.researcherName || 'Not specified'}   |   Institution: ${data.institution || 'Academic Center'}`, margin + 5, currentY + 19);
  doc.text(`Date & Time: ${new Date(data.createdAt).toLocaleString()}   |   Software: StatsMate Research v2.4 (Build 2026.1)`, margin + 5, currentY + 24);

  currentY += 32;

  // SECTION 1: SAMPLE SIZE DETERMINATION
  if (data.sampleSizeResult && data.sampleSizeInputs) {
    const res = data.sampleSizeResult;
    const inp = data.sampleSizeInputs;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. SAMPLE SIZE & POWER DETERMINATION PROTOCOL', margin, currentY);
    currentY += 5;

    // Recommendation Banner
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(99, 102, 241);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

    doc.setTextColor(67, 56, 202);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Evaluable Sample Size: N = ${res.evaluableN}`, margin + 6, currentY + 9);
    doc.setTextColor(15, 118, 110);
    doc.text(`Recruitment Target: N = ${res.recruitmentN}`, margin + 100, currentY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Accounting for a ${res.dropoutRate}% expected dropout or non-evaluable specimen buffer.`, margin + 6, currentY + 16);
    if (res.n1 && res.n2) {
      doc.text(`Group breakdown: Arm 1 (n1) = ${res.n1}, Arm 2 (n2) = ${res.n2}`, margin + 100, currentY + 16);
    }
    currentY += 27;

    // Parameters table
    const paramRows = [
      ['Study Design', res.studyDesign.replace(/_/g, ' ').toUpperCase(), 'Allocation Ratio (k)', `${res.allocationRatio}:1`],
      ['Significance Level (α)', `${res.alpha} (${inp.hypothesis})`, 'Desired Power (1 - β)', `${(res.power * 100).toFixed(0)}%`],
      ['Effect Size Metric', res.effectSizeName, 'Effect Size Value', `${res.effectSizeValue.toFixed(3)} (${res.effectSizeInterpretation})`],
      ['Critical Z_alpha', res.criticalValues.zAlpha.toFixed(4), 'Critical Z_beta', res.criticalValues.zBeta.toFixed(4)],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Parameter', 'Configured Value', 'Parameter', 'Configured Value']],
      body: paramRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Intermediate Steps Table
    const stepRows = res.steps.map((st, idx) => [
      `Step ${idx + 1}: ${st.name}`,
      st.description,
      st.formula,
      String(st.intermediateValue),
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Step', 'Description', 'Formula / Equation', 'Calculated Value']],
      body: stepRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Assumptions & Reference
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Methodological Assumptions:', margin, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    for (const a of res.assumptions) {
      doc.text(`• ${a}`, margin + 3, currentY);
      currentY += 3.8;
    }

    doc.setFont('helvetica', 'italic');
    doc.text(`Reference: ${res.scientificReference}`, margin, currentY + 1);
    currentY += 10;
  }

  // Check if new page needed
  if (currentY > pageHeight - 60 && data.analysisResults && data.analysisResults.length > 0) {
    doc.addPage();
    currentY = 20;
  }

  // SECTION 2: STATISTICAL ANALYSIS RESULTS
  if (data.analysisResults && data.analysisResults.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. DATASET STATISTICAL ANALYSIS & HYPOTHESIS TESTS', margin, currentY);
    currentY += 6;

    for (const test of data.analysisResults) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(test.testName, margin + 3, currentY + 5);

      const pStr = test.pValue < 0.001 ? 'p < 0.001' : `p = ${test.pValue.toFixed(4)}`;
      doc.text(`${test.statisticName} = ${test.statisticValue.toFixed(3)},  ${pStr} (${test.isSignificant ? 'Significant' : 'Not Significant'})`, pageWidth - margin - 3, currentY + 5, { align: 'right' });
      currentY += 10;

      // Interpretation text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitInterp = doc.splitTextToSize(test.scientificInterpretation, contentWidth);
      doc.text(splitInterp, margin, currentY);
      currentY += splitInterp.length * 3.5 + 4;

      // Group statistics if available
      if (test.groupStatistics && test.groupStatistics.length > 0) {
        const groupRows = test.groupStatistics.map((g) => [
          g.groupName,
          String(g.n),
          g.mean.toFixed(2),
          g.sd.toFixed(2),
          g.se.toFixed(2),
          g.median.toFixed(2),
          `[${g.ci95Lower.toFixed(2)}, ${g.ci95Upper.toFixed(2)}]`,
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Group', 'N', 'Mean', 'SD', 'SE', 'Median', '95% CI']],
          body: groupRows,
          theme: 'grid',
          headStyles: { fillColor: [100, 116, 139], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 6;
      }
    }
  }

  // Footer / Verification QR block on final page
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  const certOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrDataUrl = await QRCode.toDataURL(`${certOrigin}/?report=${data.reportId}#verify`, {
    margin: 1,
    width: 120,
  }).catch(() => null);

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin, pageHeight - 25, 20, 20);
    } catch {}
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`StatsMate Research Verification ID: ${data.reportId}`, margin + 24, pageHeight - 20);
  doc.text('This calculation report was deterministically produced in accordance with biostatistical reporting guidelines (ICMJE/CONSORT).', margin + 24, pageHeight - 16);
  doc.text('Software: StatsMate Research v2.4 | Engine: 2026.1-PROD-STABLE', margin + 24, pageHeight - 12);

  doc.save(`${data.reportId}_Statistical_Report.pdf`);
}
