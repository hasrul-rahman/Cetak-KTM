import React, { useState } from 'react';
import { ALLOWED_ADMIN_EMAILS, AdminUser } from '../types';
import { 
  signInWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logOut 
} from '../lib/firebase';
import { 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  LogOut as LogOutIcon, 
  Cloud, 
  Mail, 
  KeyRound, 
  UserPlus, 
  LogIn, 
  Sparkles,
  User as UserIcon,
  FileSpreadsheet
} from 'lucide-react';

interface AdminAuthProps {
  currentUser: AdminUser | null;
  onLoginSuccess: (user: AdminUser) => void;
  onLogout: () => void;
}

const STORAGE_KEY = 'ktm_iain_admin_session';

export const AdminAuthModal: React.FC<AdminAuthProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [inputEmail, setInputEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAuthorizeEmailOnly = (emailToAuth: string) => {
    const clean = emailToAuth.trim().toLowerCase();
    const isAllowed = ALLOWED_ADMIN_EMAILS.some(e => e.toLowerCase() === clean);

    if (!isAllowed) {
      setErrorMsg(
        `Akses dibatasi. Email "${clean}" belum terdaftar dalam daftar Administrator SIAKAD IAIN Pontianak.`
      );
      setIsSuccess(false);
      return;
    }

    setErrorMsg(null);
    setIsSuccess(true);

    const adminData: AdminUser = {
      email: clean,
      name: clean === 'hasrulrahman@gmail.com' ? 'Hasrul Rahman' : 'Hasrul (IAIN PTK)',
      isAuthenticated: true,
      role: 'admin'
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
    setTimeout(() => {
      onLoginSuccess(adminData);
      setIsSuccess(false);
    }, 400);
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      const email = res.user.email || 'petugas@iainptk.ac.id';
      const adminData: AdminUser = {
        email,
        name: res.user.displayName || 'Hasrul Rahman',
        isAuthenticated: true,
        role: 'admin'
      };
      setIsSuccess(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
      setTimeout(() => {
        onLoginSuccess(adminData);
      }, 400);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Gagal login via Google. Silakan gunakan login email/password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const cleanEmail = inputEmail.trim().toLowerCase();
      if (authMode === 'login') {
        const res = await loginWithEmail(cleanEmail, password);
        const adminData: AdminUser = {
          email: res.user.email || cleanEmail,
          name: res.user.displayName || (cleanEmail.includes('hasrul') ? 'Hasrul Rahman' : cleanEmail.split('@')[0]),
          isAuthenticated: true,
          role: 'admin'
        };
        setIsSuccess(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
        setTimeout(() => {
          onLoginSuccess(adminData);
        }, 400);
      } else {
        if (!fullName.trim()) {
          throw new Error('Silakan isi nama lengkap.');
        }
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter.');
        }
        const res = await registerWithEmail(cleanEmail, password, fullName.trim());
        const adminData: AdminUser = {
          email: res.user.email || cleanEmail,
          name: fullName.trim(),
          isAuthenticated: true,
          role: 'admin'
        };
        setIsSuccess(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminData));
        setTimeout(() => {
          onLoginSuccess(adminData);
        }, 400);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err.message || 'Gagal autentikasi.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Email atau password belum terdaftar. Silakan klik tab "Daftar Akun" di atas atau pilih akun cepat.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email ini sudah terdaftar. Silakan gunakan tab "Masuk".';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with IAIN Emblem Accent */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-teal-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex p-3 bg-white/10 rounded-2xl ring-1 ring-white/20 mb-2 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">Portal Admin Cetak KTM</h2>
          <p className="text-xs text-emerald-200 mt-0.5 font-medium">
            IAIN Pontianak
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-emerald-800/60 rounded-full border border-emerald-700/60 text-[11px] text-emerald-100 font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            Database Google Sheets & Cloud Auth
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              authMode === 'login'
                ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-700" />
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              authMode === 'register'
                ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
            Daftar Akun Baru
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-tight">{errorMsg}</p>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <p className="font-semibold">Otentikasi Berhasil! Membuka sistem...</p>
            </div>
          )}

          {/* 1-Click Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-3 transition hover:border-slate-400 active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Masuk dengan Akun Google
          </button>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider absolute">
              atau Firebase Auth
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Hasrul Rahman"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="hasrulrahman@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk Sistem
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Daftarkan Akun
                </>
              )}
            </button>
          </form>

          {/* Quick Access for Verified IAIN Admin */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-600 mb-2">
              Akses Cepat Akun Administrator Resmi:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAuthorizeEmailOnly('hasrulrahman@gmail.com')}
                className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px]">
                  HR
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-emerald-950 truncate">Hasrul Rahman</p>
                  <p className="text-[10px] text-emerald-700 font-mono truncate">hasrulrahman</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAuthorizeEmailOnly('hasrul@iainptk.ac.id')}
                className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-left transition flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px]">
                  IP
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-amber-950 truncate">Hasrul IAIN</p>
                  <p className="text-[10px] text-amber-700 font-mono truncate">@iainptk.ac.id</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminNavBarBadge: React.FC<{
  user: AdminUser;
  isCloudConnected?: boolean;
  isGoogleSheetsConnected?: boolean;
  spreadsheetTitle?: string;
  onOpenGoogleSheets?: () => void;
  onLogout: () => void;
}> = ({
  user,
  isCloudConnected = true,
  isGoogleSheetsConnected = false,
  spreadsheetTitle,
  onOpenGoogleSheets,
  onLogout
}) => {
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error(e);
    }
    onLogout();
  };

  return (
    <div className="flex items-center gap-2.5">
      {/* Google Sheets Status Pill */}
      {onOpenGoogleSheets && (
        <button
          type="button"
          onClick={onOpenGoogleSheets}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition border ${
            isGoogleSheetsConnected
              ? 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border-emerald-500/50 shadow-xs'
              : 'bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border-amber-500/50'
          }`}
          title="Kelola Database Google Sheets"
        >
          <FileSpreadsheet className={`w-3.5 h-3.5 ${isGoogleSheetsConnected ? 'text-emerald-300' : 'text-amber-300'}`} />
          <span className="hidden sm:inline">
            {isGoogleSheetsConnected ? (spreadsheetTitle || 'Google Sheets Aktif') : 'Hubungkan Google Sheet'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isGoogleSheetsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>
      )}

      {/* User Badge */}
      <div className="flex items-center gap-2.5 bg-emerald-950/70 border border-emerald-600/40 py-1 px-3 rounded-full text-xs text-white">
        <div className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-black text-[11px] flex items-center justify-center shrink-0">
          {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div className="leading-tight text-left">
          <p className="font-bold text-amber-300 flex items-center gap-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[130px]">{user.name}</span>
          </p>
          <p className="text-[10px] text-emerald-200 font-mono truncate max-w-[130px]">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Keluar dari sesi admin"
          className="ml-1 p-1 hover:bg-white/10 rounded-full text-emerald-200 hover:text-white transition"
        >
          <LogOutIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
