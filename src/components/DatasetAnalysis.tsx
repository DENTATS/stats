import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  computeVariableSummary,
  checkNormality,
  checkHomogeneity,
} from '../stats/descriptive';
import {
  runIndependentTTest,
  runWelchTTest,
  runPairedTTest,
  runOneWayANOVA,
  runMannWhitneyU,
  runWilcoxonSignedRank,
  runKruskalWallis,
  runCorrelation,
  runChiSquare,
  runLinearRegression,
} from '../stats/hypothesisTests';
import {
  VariableSummary,
  StatisticalTestResult,
  StatisticalTestType,
} from '../types/analysis';
import { generateComprehensiveReportPDF } from '../pdf/reportGenerator';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import {
  HistogramChart,
  BoxPlotChart,
  ScatterPlotChart,
} from './common/ChartCanvas';
import {
  Upload,
  FileSpreadsheet,
  Download,
  BarChart2,
  Table,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

// Sample datasets for instant biomedical & dental research analysis
const SAMPLE_DATASETS = {
  shearBondStrength: {
    name: 'In-Vitro Dental Shear Bond Strength (MPa)',
    headers: ['SpecimenID', 'AdhesiveSystem', 'BondStrength_MPa', 'FailureMode'],
    rows: [
      [1, 'Universal Adhesive (Self-Etch)', 24.5, 'Adhesive'],
      [2, 'Universal Adhesive (Self-Etch)', 26.2, 'Mixed'],
      [3, 'Universal Adhesive (Self-Etch)', 25.1, 'Adhesive'],
      [4, 'Universal Adhesive (Self-Etch)', 28.0, 'Cohesive'],
      [5, 'Universal Adhesive (Self-Etch)', 23.9, 'Adhesive'],
      [6, 'Universal Adhesive (Self-Etch)', 27.4, 'Mixed'],
      [7, 'Universal Adhesive (Self-Etch)', 24.8, 'Adhesive'],
      [8, 'Universal Adhesive (Self-Etch)', 26.5, 'Mixed'],
      [9, 'Total-Etch Control', 31.2, 'Mixed'],
      [10, 'Total-Etch Control', 29.8, 'Cohesive'],
      [11, 'Total-Etch Control', 32.5, 'Mixed'],
      [12, 'Total-Etch Control', 30.1, 'Mixed'],
      [13, 'Total-Etch Control', 33.4, 'Cohesive'],
      [14, 'Total-Etch Control', 29.5, 'Mixed'],
      [15, 'Total-Etch Control', 31.8, 'Cohesive'],
      [16, 'Total-Etch Control', 30.9, 'Mixed'],
      [17, 'Bioactive Giomer', 21.3, 'Adhesive'],
      [18, 'Bioactive Giomer', 22.8, 'Adhesive'],
      [19, 'Bioactive Giomer', 20.9, 'Adhesive'],
      [20, 'Bioactive Giomer', 23.5, 'Mixed'],
      [21, 'Bioactive Giomer', 22.1, 'Adhesive'],
      [22, 'Bioactive Giomer', 24.0, 'Mixed'],
      [23, 'Bioactive Giomer', 21.8, 'Adhesive'],
      [24, 'Bioactive Giomer', 22.5, 'Adhesive'],
    ],
  },
  perioClinicalTrial: {
    name: 'Periodontal Pocket Depth Pre/Post SRP (mm)',
    headers: ['PatientID', 'PPD_Baseline_mm', 'PPD_3Months_mm', 'BleedingOnProbing', 'SmokingStatus'],
    rows: [
      ['P01', 6.2, 3.8, 'Yes', 'Non-smoker'],
      ['P02', 5.8, 3.5, 'Yes', 'Non-smoker'],
      ['P03', 7.1, 4.2, 'Yes', 'Smoker'],
      ['P04', 6.5, 3.9, 'Yes', 'Non-smoker'],
      ['P05', 5.5, 3.2, 'No', 'Non-smoker'],
      ['P06', 7.4, 4.8, 'Yes', 'Smoker'],
      ['P07', 6.0, 3.6, 'No', 'Non-smoker'],
      ['P08', 6.8, 4.1, 'Yes', 'Smoker'],
      ['P09', 5.9, 3.4, 'No', 'Non-smoker'],
      ['P10', 6.7, 4.0, 'Yes', 'Non-smoker'],
      ['P11', 7.0, 4.3, 'Yes', 'Smoker'],
      ['P12', 6.3, 3.7, 'No', 'Non-smoker'],
    ],
  },
};

export const DatasetAnalysis: React.FC = () => {
  const [datasetTitle, setDatasetTitle] = useState('In-Vitro Dental Shear Bond Strength (MPa)');
  const [headers, setHeaders] = useState<string[]>(SAMPLE_DATASETS.shearBondStrength.headers);
  const [rows, setRows] = useState<any[][]>(SAMPLE_DATASETS.shearBondStrength.rows);

  const [selectedVar1, setSelectedVar1] = useState<string>('BondStrength_MPa');
  const [selectedVar2, setSelectedVar2] = useState<string>('AdhesiveSystem');
  const [selectedTestType, setSelectedTestType] = useState<StatisticalTestType>('one_way_anova');

  const [testResult, setTestResult] = useState<StatisticalTestResult | null>(null);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [sheetsModalMode, setSheetsModalMode] = useState<'import' | 'export'>('import');

  // Compute variable summaries for all columns
  const summaries: VariableSummary[] = useMemo(() => {
    return headers.map((header, colIdx) => {
      const colValues = rows.map((r) => r[colIdx]);
      return computeVariableSummary(header, colValues);
    });
  }, [headers, rows]);

  // Handle local CSV/Excel upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (data && data.length > 1) {
            const parsedHeaders = data[0].map((h, i) => (h ? String(h).trim() : `Col_${i + 1}`));
            const parsedRows = data.slice(1).filter((r) => r.length > 0);
            setDatasetTitle(fileName.replace(/\.[^/.]+$/, ''));
            setHeaders(parsedHeaders);
            setRows(parsedRows);
            setSelectedVar1(parsedHeaders[0]);
            setSelectedVar2(parsedHeaders[1] || parsedHeaders[0]);
            setTestResult(null);
          }
        } catch (err) {
          console.error('Error parsing Excel:', err);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // CSV
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 1) {
            const rawRows = results.data as any[][];
            const parsedHeaders = rawRows[0].map((h, i) => (h ? String(h).trim() : `Col_${i + 1}`));
            const parsedRows = rawRows.slice(1).filter((r) => r.length > 0 && r.some((v) => v !== ''));
            setDatasetTitle(fileName.replace(/\.[^/.]+$/, ''));
            setHeaders(parsedHeaders);
            setRows(parsedRows);
            setSelectedVar1(parsedHeaders[0]);
            setSelectedVar2(parsedHeaders[1] || parsedHeaders[0]);
            setTestResult(null);
          }
        },
      });
    }
  };

  const loadSampleDataset = (key: keyof typeof SAMPLE_DATASETS) => {
    const ds = SAMPLE_DATASETS[key];
    setDatasetTitle(ds.name);
    setHeaders(ds.headers);
    setRows(ds.rows);
    setSelectedVar1(ds.headers[key === 'shearBondStrength' ? 2 : 1]);
    setSelectedVar2(ds.headers[key === 'shearBondStrength' ? 1 : 2]);
    setSelectedTestType(key === 'shearBondStrength' ? 'one_way_anova' : 'paired_t_test');
    setTestResult(null);
  };

  // Run statistical analysis
  const handleRunAnalysis = () => {
    const col1Idx = headers.indexOf(selectedVar1);
    const col2Idx = headers.indexOf(selectedVar2);

    if (col1Idx === -1) return;

    const raw1 = rows.map((r) => r[col1Idx]);
    const num1 = raw1.map((v) => Number(v)).filter((n) => !isNaN(n) && isFinite(n));

    switch (selectedTestType) {
      case 'independent_t_test':
      case 'welch_t_test': {
        // Group by categorical variable in col2
        if (col2Idx === -1) return;
        const groupsMap = new Map<string, number[]>();
        rows.forEach((r) => {
          const gName = String(r[col2Idx] ?? 'Unknown').trim();
          const val = Number(r[col1Idx]);
          if (!isNaN(val) && isFinite(val)) {
            if (!groupsMap.has(gName)) groupsMap.set(gName, []);
            groupsMap.get(gName)!.push(val);
          }
        });
        const gKeys = Array.from(groupsMap.keys());
        if (gKeys.length >= 2) {
          const g1 = groupsMap.get(gKeys[0])!;
          const g2 = groupsMap.get(gKeys[1])!;
          const res =
            selectedTestType === 'welch_t_test'
              ? runWelchTTest(g1, g2, gKeys[0], gKeys[1])
              : runIndependentTTest(g1, g2, gKeys[0], gKeys[1]);
          setTestResult(res);
        }
        break;
      }

      case 'paired_t_test': {
        if (col2Idx === -1) return;
        const raw2 = rows.map((r) => r[col2Idx]);
        const num2 = raw2.map((v) => Number(v)).filter((n) => !isNaN(n) && isFinite(n));
        const res = runPairedTTest(num1, num2, selectedVar1, selectedVar2);
        setTestResult(res);
        break;
      }

      case 'one_way_anova': {
        if (col2Idx === -1) return;
        const groupsMap = new Map<string, number[]>();
        rows.forEach((r) => {
          const gName = String(r[col2Idx] ?? 'Unknown').trim();
          const val = Number(r[col1Idx]);
          if (!isNaN(val) && isFinite(val)) {
            if (!groupsMap.has(gName)) groupsMap.set(gName, []);
            groupsMap.get(gName)!.push(val);
          }
        });
        const groups = Array.from(groupsMap.entries()).map(([name, values]) => ({ name, values }));
        if (groups.length >= 2) {
          const res = runOneWayANOVA(groups);
          setTestResult(res);
        }
        break;
      }

      case 'mann_whitney_u': {
        if (col2Idx === -1) return;
        const groupsMap = new Map<string, number[]>();
        rows.forEach((r) => {
          const gName = String(r[col2Idx] ?? 'Unknown').trim();
          const val = Number(r[col1Idx]);
          if (!isNaN(val) && isFinite(val)) {
            if (!groupsMap.has(gName)) groupsMap.set(gName, []);
            groupsMap.get(gName)!.push(val);
          }
        });
        const gKeys = Array.from(groupsMap.keys());
        if (gKeys.length >= 2) {
          const res = runMannWhitneyU(groupsMap.get(gKeys[0])!, groupsMap.get(gKeys[1])!, gKeys[0], gKeys[1]);
          setTestResult(res);
        }
        break;
      }

      case 'wilcoxon_signed_rank': {
        if (col2Idx === -1) return;
        const raw2 = rows.map((r) => r[col2Idx]);
        const num2 = raw2.map((v) => Number(v)).filter((n) => !isNaN(n) && isFinite(n));
        const res = runWilcoxonSignedRank(num1, num2);
        setTestResult(res);
        break;
      }

      case 'kruskal_wallis': {
        if (col2Idx === -1) return;
        const groupsMap = new Map<string, number[]>();
        rows.forEach((r) => {
          const gName = String(r[col2Idx] ?? 'Unknown').trim();
          const val = Number(r[col1Idx]);
          if (!isNaN(val) && isFinite(val)) {
            if (!groupsMap.has(gName)) groupsMap.set(gName, []);
            groupsMap.get(gName)!.push(val);
          }
        });
        const groups = Array.from(groupsMap.entries()).map(([name, values]) => ({ name, values }));
        if (groups.length >= 2) {
          const res = runKruskalWallis(groups);
          setTestResult(res);
        }
        break;
      }

      case 'pearson_correlation':
      case 'spearman_correlation': {
        if (col2Idx === -1) return;
        const raw2 = rows.map((r) => r[col2Idx]);
        const num2 = raw2.map((v) => Number(v)).filter((n) => !isNaN(n) && isFinite(n));
        const res = runCorrelation(num1, num2, selectedTestType === 'pearson_correlation' ? 'pearson' : 'spearman', selectedVar1, selectedVar2);
        setTestResult(res);
        break;
      }

      case 'linear_regression': {
        if (col2Idx === -1) return;
        const raw2 = rows.map((r) => r[col2Idx]);
        const num2 = raw2.map((v) => Number(v)).filter((n) => !isNaN(n) && isFinite(n));
        const res = runLinearRegression(num2, num1, selectedVar2, selectedVar1); // X = Var2, Y = Var1
        setTestResult(res);
        break;
      }

      case 'chi_square': {
        // Cross-tabulation of Col1 and Col2
        if (col2Idx === -1) return;
        const rowLabels = Array.from(new Set(rows.map((r) => String(r[col1Idx]).trim())));
        const colLabels = Array.from(new Set(rows.map((r) => String(r[col2Idx]).trim())));

        const table = rowLabels.map(() => new Array(colLabels.length).fill(0));
        rows.forEach((r) => {
          const rVal = String(r[col1Idx]).trim();
          const cVal = String(r[col2Idx]).trim();
          const rIdx = rowLabels.indexOf(rVal);
          const cIdx = colLabels.indexOf(cVal);
          if (rIdx >= 0 && cIdx >= 0) {
            table[rIdx][cIdx]++;
          }
        });

        const res = runChiSquare(table, rowLabels, colLabels);
        setTestResult(res);
        break;
      }
    }
  };

  // Export descriptive statistics table as CSV
  const handleExportCSV = () => {
    const csvRows: string[][] = [
      ['Variable', 'Type', 'Total N', 'Valid N', 'Missing N', 'Mean', 'SD', 'Median', 'IQR', 'Min', 'Max', 'Skewness'],
      ...summaries.map((s) => [
        s.name,
        s.type,
        String(s.totalCount),
        String(s.validCount),
        String(s.missingCount),
        s.mean !== undefined ? s.mean.toFixed(2) : '-',
        s.sd !== undefined ? s.sd.toFixed(2) : '-',
        s.median !== undefined ? s.median.toFixed(2) : '-',
        s.iqr !== undefined ? s.iqr.toFixed(2) : '-',
        s.min !== undefined ? s.min.toFixed(2) : '-',
        s.max !== undefined ? s.max.toFixed(2) : '-',
        s.skewness !== undefined ? s.skewness.toFixed(3) : '-',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${datasetTitle.replace(/\s+/g, '_')}_Descriptive_Stats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `SMR-REP-2026-${randomSuffix}`;
    await generateComprehensiveReportPDF({
      reportId,
      studyTitle: datasetTitle,
      primaryOutcome: selectedVar1,
      createdAt: new Date().toISOString(),
      datasetName: datasetTitle,
      variableSummaries: summaries,
      analysisResults: testResult ? [testResult] : [],
    });
  };

  // Pre-calculate data vectors for selected variable
  const selectedVar1Values = useMemo(() => {
    const idx = headers.indexOf(selectedVar1);
    if (idx === -1) return [];
    return rows.map((r) => Number(r[idx])).filter((n) => !isNaN(n) && isFinite(n));
  }, [headers, rows, selectedVar1]);

  const selectedVar2Values = useMemo(() => {
    const idx = headers.indexOf(selectedVar2);
    if (idx === -1) return [];
    return rows.map((r) => Number(r[idx])).filter((n) => !isNaN(n) && isFinite(n));
  }, [headers, rows, selectedVar2]);

  // Grouped box plot data
  const boxPlotGroups = useMemo(() => {
    const col1Idx = headers.indexOf(selectedVar1);
    const col2Idx = headers.indexOf(selectedVar2);
    if (col1Idx === -1 || col2Idx === -1) return [];

    const map = new Map<string, number[]>();
    rows.forEach((r) => {
      const g = String(r[col2Idx] ?? 'Group').trim();
      const val = Number(r[col1Idx]);
      if (!isNaN(val) && isFinite(val)) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(val);
      }
    });

    return Array.from(map.entries()).map(([name, vals]) => {
      const s = computeVariableSummary(name, vals);
      return {
        name,
        min: s.min ?? 0,
        q1: s.q1 ?? 0,
        median: s.median ?? 0,
        q3: s.q3 ?? 0,
        max: s.max ?? 0,
      };
    });
  }, [headers, rows, selectedVar1, selectedVar2]);

  // Normality result for var1
  const normality1 = useMemo(() => {
    return checkNormality(selectedVar1, selectedVar1Values);
  }, [selectedVar1, selectedVar1Values]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-200/60">
                Module B
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Dataset Statistical Analysis & Hypothesis Testing
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active Dataset: <strong className="text-slate-800">{datasetTitle}</strong> ({rows.length} rows, {headers.length} variables)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              Upload CSV / Excel
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => {
                setSheetsModalMode('import');
                setShowGoogleSheetsModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import Google Sheets
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Table CSV
            </button>

            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Sample dataset quick selectors */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-2xs text-slate-500">
          <span className="font-semibold text-slate-700">Load Benchmark Dataset:</span>
          <button
            onClick={() => loadSampleDataset('shearBondStrength')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium transition cursor-pointer"
          >
            Dental Shear Bond Strength (3 groups)
          </button>
          <button
            onClick={() => loadSampleDataset('perioClinicalTrial')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium transition cursor-pointer"
          >
            Periodontal Pocket Depth (Pre/Post)
          </button>
        </div>
      </div>

      {/* Descriptive Statistics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Variable Summaries & Descriptive Statistics
            </h3>
          </div>
          <span className="text-2xs text-slate-500 font-mono">Bessel Correction (n - 1) Applied</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-2xs text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Variable Name</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Valid N</th>
                <th className="px-3 py-2.5">Missing</th>
                <th className="px-3 py-2.5">Mean</th>
                <th className="px-3 py-2.5">SD</th>
                <th className="px-3 py-2.5">Median</th>
                <th className="px-3 py-2.5">IQR</th>
                <th className="px-3 py-2.5">Min - Max</th>
                <th className="px-3 py-2.5">Skewness</th>
                <th className="px-3 py-2.5">Kurtosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-2xs">
              {summaries.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2 font-sans font-semibold text-slate-900">{s.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-3xs font-semibold ${
                        s.type === 'continuous'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : s.type === 'discrete'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : s.type === 'binary'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {s.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.validCount}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {s.missingCount} ({s.missingPercentage.toFixed(0)}%)
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900">{s.mean !== undefined ? s.mean.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2">{s.sd !== undefined ? s.sd.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2">{s.median !== undefined ? s.median.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2">{s.iqr !== undefined ? s.iqr.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2">
                    {s.min !== undefined && s.max !== undefined ? `${s.min.toFixed(1)} - ${s.max.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-3 py-2">{s.skewness !== undefined ? s.skewness.toFixed(3) : '—'}</td>
                  <td className="px-3 py-2">{s.kurtosis !== undefined ? s.kurtosis.toFixed(3) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hypothesis Testing Workbench */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Statistical Hypothesis Testing Suite
            </h3>
          </div>
          <span className="text-2xs text-slate-500">
            Selected Test is Grounded in Study Design &amp; Distributional Assumptions
          </span>
        </div>

        {/* Variable & Test Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
              Primary Variable (Y / Outcome):
            </label>
            <select
              value={selectedVar1}
              onChange={(e) => setSelectedVar1(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
              Grouping / Predictor / Pair (X):
            </label>
            <select
              value={selectedVar2}
              onChange={(e) => setSelectedVar2(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
              Select Statistical Test:
            </label>
            <select
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value as StatisticalTestType)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <optgroup label="Parametric Group Comparisons">
                <option value="independent_t_test">Independent t-Test (Student's)</option>
                <option value="welch_t_test">Welch's t-Test (Unequal Variances)</option>
                <option value="paired_t_test">Paired Samples t-Test</option>
                <option value="one_way_anova">One-Way ANOVA (Tukey HSD Post-Hoc)</option>
              </optgroup>
              <optgroup label="Nonparametric Group Comparisons">
                <option value="mann_whitney_u">Mann–Whitney U Test</option>
                <option value="wilcoxon_signed_rank">Wilcoxon Signed-Rank Test</option>
                <option value="kruskal_wallis">Kruskal–Wallis Test</option>
              </optgroup>
              <optgroup label="Categorical & Associations">
                <option value="chi_square">Chi-Square Test of Independence</option>
              </optgroup>
              <optgroup label="Correlation & Regression">
                <option value="pearson_correlation">Pearson Correlation (r)</option>
                <option value="spearman_correlation">Spearman Rank Correlation (rho)</option>
                <option value="linear_regression">Linear Regression (OLS)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunAnalysis}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Compute Exact Results
            </button>
          </div>
        </div>

        {/* Normality Diagnostic Callout */}
        {selectedVar1Values.length >= 8 && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              normality1.isNormal
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            {normality1.isNormal ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  Normality Diagnostic ({normality1.statisticName}):
                </span>
                <span className="font-mono text-2xs font-semibold">
                  K² = {normality1.statisticValue.toFixed(3)}, p = {normality1.pValue.toFixed(4)}
                </span>
              </div>
              <p className="mt-0.5 text-2xs text-slate-600">{normality1.interpretation}</p>
            </div>
          </div>
        )}

        {/* Test Result Display Card */}
        {testResult && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-in fade-in">
            {/* Header Banner */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-3xs uppercase tracking-widest text-indigo-300 font-bold">
                  Inferential Test Result
                </span>
                <h4 className="text-sm font-bold text-white">{testResult.testName}</h4>
              </div>
              <div className="flex items-baseline gap-3">
                <div className="text-right">
                  <span className="text-3xs text-slate-400 uppercase">Test Statistic</span>
                  <div className="font-mono font-bold text-sm text-indigo-300">
                    {testResult.statisticName} = {testResult.statisticValue.toFixed(3)}
                  </div>
                </div>
                <div className="text-right pl-3 border-l border-slate-700">
                  <span className="text-3xs text-slate-400 uppercase">Exact p-value</span>
                  <div
                    className={`font-mono font-extrabold text-sm ${
                      testResult.isSignificant ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {testResult.pValue < 0.001 ? 'p < 0.001' : `p = ${testResult.pValue.toFixed(4)}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Scientific Interpretation & Effect Size */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="text-3xs uppercase font-bold text-indigo-900">
                  Scientific &amp; Clinical Interpretation:
                </span>
                <p className="text-xs text-indigo-950 font-medium leading-relaxed mt-1">
                  {testResult.scientificInterpretation}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-3xs uppercase text-slate-500 font-semibold">Effect Size</span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                    {testResult.effectSizeName}: {testResult.effectSizeValue.toFixed(3)}
                  </div>
                  <span className="text-3xs text-slate-500">{testResult.effectSizeInterpretation}</span>
                </div>

                {testResult.confidenceInterval && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-3xs uppercase text-slate-500 font-semibold">95% Confidence Interval</span>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                      [{testResult.confidenceInterval.lower.toFixed(2)}, {testResult.confidenceInterval.upper.toFixed(2)}]
                    </div>
                    <span className="text-3xs text-slate-500">{testResult.confidenceInterval.parameterName}</span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-3xs uppercase text-slate-500 font-semibold">Significance Conclusion</span>
                  <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    {testResult.isSignificant ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Reject H₀ (p &lt; {testResult.alpha})</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600">Fail to Reject H₀ (p ≥ {testResult.alpha})</span>
                      </>
                    )}
                  </div>
                  <span className="text-3xs text-slate-500">Significance level α = {testResult.alpha}</span>
                </div>
              </div>

              {/* Group Statistics Table */}
              {testResult.groupStatistics && testResult.groupStatistics.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Group</th>
                        <th className="px-3 py-2">N</th>
                        <th className="px-3 py-2">Mean</th>
                        <th className="px-3 py-2">SD</th>
                        <th className="px-3 py-2">SE</th>
                        <th className="px-3 py-2">Median</th>
                        <th className="px-3 py-2">95% CI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {testResult.groupStatistics.map((g, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-sans font-semibold text-slate-900">{g.groupName}</td>
                          <td className="px-3 py-1.5">{g.n}</td>
                          <td className="px-3 py-1.5 font-bold">{g.mean.toFixed(2)}</td>
                          <td className="px-3 py-1.5">{g.sd.toFixed(2)}</td>
                          <td className="px-3 py-1.5">{g.se.toFixed(2)}</td>
                          <td className="px-3 py-1.5">{g.median.toFixed(2)}</td>
                          <td className="px-3 py-1.5">[{g.ci95Lower.toFixed(2)}, {g.ci95Upper.toFixed(2)}]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Post-Hoc Comparisons if ANOVA */}
              {testResult.postHoc && testResult.postHoc.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-2xs font-bold text-slate-800 uppercase tracking-wider">
                    Post-Hoc Pairwise Comparisons (Tukey HSD / Multiplicity Adjusted):
                  </h5>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-2xs font-mono">
                      <thead className="bg-slate-100 font-sans text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Contrast Comparison</th>
                          <th className="px-3 py-2">Difference</th>
                          <th className="px-3 py-2">q / Statistic</th>
                          <th className="px-3 py-2">Adjusted p</th>
                          <th className="px-3 py-2">95% CI</th>
                          <th className="px-3 py-2">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {testResult.postHoc.map((ph, idx) => (
                          <tr key={idx} className={ph.isSignificant ? 'bg-emerald-50/40' : ''}>
                            <td className="px-3 py-1.5 font-sans font-semibold text-slate-900">{ph.comparison}</td>
                            <td className="px-3 py-1.5">{ph.difference.toFixed(2)}</td>
                            <td className="px-3 py-1.5">{ph.statistic.toFixed(2)}</td>
                            <td className="px-3 py-1.5 font-bold">
                              {ph.adjustedPValue < 0.001 ? '< 0.001' : ph.adjustedPValue.toFixed(4)}
                            </td>
                            <td className="px-3 py-1.5">[{ph.ci95Lower.toFixed(2)}, {ph.ci95Upper.toFixed(2)}]</td>
                            <td className="px-3 py-1.5 font-sans font-semibold">
                              {ph.isSignificant ? (
                                <span className="text-emerald-700">Significant</span>
                              ) : (
                                <span className="text-slate-400">Not sig</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HistogramChart
          data={selectedVar1Values}
          title={`Distribution: ${selectedVar1}`}
          xLabel={selectedVar1}
        />

        {boxPlotGroups.length >= 2 ? (
          <BoxPlotChart
            groups={boxPlotGroups}
            title={`${selectedVar1} by ${selectedVar2}`}
            yLabel={selectedVar1}
          />
        ) : selectedVar1Values.length > 0 && selectedVar2Values.length > 0 ? (
          <ScatterPlotChart
            x={selectedVar2Values}
            y={selectedVar1Values}
            xLabel={selectedVar2}
            yLabel={selectedVar1}
            title={`${selectedVar1} vs ${selectedVar2}`}
          />
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
            Select a categorical group in Variable 2 to render multi-group box plots.
          </div>
        )}
      </div>

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={showGoogleSheetsModal}
        mode={sheetsModalMode}
        onImportSuccess={(imported) => {
          setDatasetTitle(imported.title);
          setHeaders(imported.headers);
          setRows(imported.rows);
          if (imported.headers.length > 0) {
            setSelectedVar1(imported.headers[0]);
            setSelectedVar2(imported.headers[1] || imported.headers[0]);
          }
          setTestResult(null);
        }}
        onClose={() => setShowGoogleSheetsModal(false)}
      />
    </div>
  );
};
