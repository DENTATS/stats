import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from './services/firebaseAuth';
import { getAllCertificates } from './services/certificateStore';
import { CalculationCertificate } from './types/certificate';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { SampleSizeCalculator } from './components/SampleSizeCalculator';
import { DatasetAnalysis } from './components/DatasetAnalysis';
import { StudyPlanner } from './components/StudyPlanner';
import { CertificateVerification } from './components/CertificateVerification';
import { CalculationHistory } from './components/CalculationHistory';
import { ValidationTestRunner } from './components/ValidationTestRunner';
import { StatisticalGlossary } from './components/StatisticalGlossary';
import { Shield, BookOpen, ExternalLink, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CalculationCertificate[]>([]);
  const [calculatorSeedInputs, setCalculatorSeedInputs] = useState<any>(null);
  const [verifyCertId, setVerifyCertId] = useState<string | undefined>(undefined);

  // Initialize auth & certificates list
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, tok) => {
        setUser(u);
        setToken(tok);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    setCertificates(getAllCertificates());

    // Check URL parameters for ?verify=...
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify');
      if (verifyParam) {
        setVerifyCertId(verifyParam);
        setActiveTab('verify');
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshCertificates = () => {
    setCertificates(getAllCertificates());
  };

  const handleRecalculateFromHistory = (cert: CalculationCertificate) => {
    setCalculatorSeedInputs({
      studyTitle: cert.studyTitle,
      primaryOutcome: cert.primaryOutcome,
      researcherName: cert.researcherName,
      institution: cert.institution,
      alpha: cert.parameters.alpha,
      power: cert.parameters.power,
      dropoutRate: cert.parameters.dropoutRate,
      allocationRatio: cert.parameters.allocationRatio,
    });
    setActiveTab('sample_size');
  };

  const handleVerifyFromHistory = (certId: string) => {
    setVerifyCertId(certId);
    setActiveTab('verify');
  };

  const handleTransferFromPlanner = (params: any) => {
    setCalculatorSeedInputs(params);
    setActiveTab('sample_size');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top App Header */}
      <Header
        user={user}
        onAuthChange={(u, tok) => {
          setUser(u);
          setToken(tok);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={certificates.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={(tab) => setActiveTab(tab)}
            certificates={certificates}
            hasGoogleConnected={!!user}
          />
        )}

        {activeTab === 'sample_size' && (
          <SampleSizeCalculator
            initialInputs={calculatorSeedInputs}
            onCertificateIssued={refreshCertificates}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'analysis' && <DatasetAnalysis />}

        {activeTab === 'planner' && (
          <StudyPlanner onTransferToCalculator={handleTransferFromPlanner} />
        )}

        {activeTab === 'verify' && (
          <CertificateVerification initialCertId={verifyCertId} />
        )}

        {activeTab === 'history' && (
          <CalculationHistory
            onRecalculate={handleRecalculateFromHistory}
            onVerify={handleVerifyFromHistory}
          />
        )}

        {activeTab === 'validation' && <ValidationTestRunner />}

        {activeTab === 'glossary' && <StatisticalGlossary />}
      </main>

      {/* Academic Scientific Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                SM
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  StatsMate Research v2.4
                </div>
                <div className="text-2xs text-slate-400">
                  Engine Build: 2026.1-PROD-STABLE | Biostatistical &amp; Epidemiological Computation Engine
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                ICMJE &amp; CONSORT Compatible
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                <Shield className="w-3 h-3 text-indigo-600" />
                Deterministic Verification
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                Google Workspace Sheets Integration
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-3xs text-slate-400 gap-2">
            <p>
              © 2026 StatsMate Research Systems. All calculations are executed with double-precision floating-point arithmetic.
            </p>
            <p>
              Not intended as institutional ethics accreditation. Retain verified certificates with your study protocol.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
