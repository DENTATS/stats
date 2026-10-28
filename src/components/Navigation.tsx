import React from 'react';
import {
  Calculator,
  BarChart2,
  FileCheck2,
  Compass,
  History,
  ShieldCheck,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  historyCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'sample_size', label: 'Sample Size Calculator', icon: Calculator, badge: '10 Designs' },
    { id: 'analysis', label: 'Dataset Analysis', icon: BarChart2, badge: 'Full Suite' },
    { id: 'planner', label: 'Study Planner', icon: Compass, badge: 'CRIS/CONSORT' },
    { id: 'verify', label: 'Certificate Verification', icon: FileCheck2 },
    { id: 'history', label: 'Audit & History', icon: History, count: historyCount },
    { id: 'validation', label: 'Scientific Validation', icon: ShieldCheck, badge: 'R Benchmarks' },
    { id: 'glossary', label: 'Glossary & Methods', icon: BookOpen },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-3xs px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="text-3xs px-1.5 py-0.5 rounded-full font-mono font-bold bg-amber-500 text-slate-950">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
