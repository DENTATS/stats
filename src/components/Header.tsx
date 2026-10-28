import React from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { Shield, Sparkles, Database, CheckCircle2, LogOut } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onAuthChange,
  activeTab,
  setActiveTab,
}) => {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
      }
    } catch (e: any) {
      console.error('Google sign in error:', e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onAuthChange(null, null);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  StatsMate<span className="text-indigo-600">.Research</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  v2.4
                </span>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Deterministic Engine
                </span>
              </div>
              <p className="text-2xs text-slate-500 hidden sm:block">
                Sample Size, Biostatistics & Statistical Certificate System
              </p>
            </div>
          </div>

          {/* User & Workspace Authentication */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      user.email?.[0].toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-medium text-slate-800 truncate max-w-[140px]">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-2xs text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Google Sheets Connected
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Connect Google Sheets'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
