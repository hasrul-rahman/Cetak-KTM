import React, { useState } from 'react';
import { GoogleSpreadsheetInfo } from '../lib/googleSheets';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Link2,
  PlusCircle,
  X,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetInfo: GoogleSpreadsheetInfo | null;
  isConnected: boolean;
  isSyncing: boolean;
  onConnectGoogle: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onCreateNewSheet: () => Promise<void>;
  onLinkExistingSheet: (sheetIdOrUrl: string) => Promise<void>;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  spreadsheetInfo,
  isConnected,
  isSyncing,
  onConnectGoogle,
  onPullFromSheet,
  onPushToSheet,
  onCreateNewSheet,
  onLinkExistingSheet
}) => {
  const [customInput, setCustomInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await onLinkExistingSheet(customInput.trim());
      setStatusMsg({ type: 'success', text: 'Berhasil menghubungkan Spreadsheet!' });
      setCustomInput('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal memverifikasi Spreadsheet.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await onPullFromSheet();
      setStatusMsg({ type: 'success', text: 'Data berhasil dimuat ulang dari Google Sheets!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal memuat data dari Sheet.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePush = async () => {
    if (!window.confirm('Kirim seluruh data lokal (Mahasiswa, Template, dan Akademik) untuk memperbarui isi Google Sheet?')) {
      return;
    }
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await onPushToSheet();
      setStatusMsg({ type: 'success', text: 'Data berhasil disimpan dan disinkronkan ke Google Sheet!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal mengirim data ke Sheet.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNew = async () => {
    if (!window.confirm('Buat Spreadsheet Google baru di akun Google Drive Anda untuk database KTM?')) {
      return;
    }
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await onCreateNewSheet();
      setStatusMsg({ type: 'success', text: 'Database Spreadsheet baru berhasil dibuat di Google Drive Anda!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal membuat Spreadsheet baru.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl ring-1 ring-white/20">
              <FileSpreadsheet className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Integrasi Database Google Sheets</h2>
              <p className="text-xs text-emerald-200">
                Penyimpanan data Mahasiswa & Template KTM langsung di Google Sheets
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{statusMsg.text}</p>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-bold text-slate-800">
                  {isConnected ? 'Google Sheets Aktif & Terhubung' : 'Belum Terhubung dengan Akun Google'}
                </span>
              </div>

              {!isConnected && (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5 transition"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  Login Google
                </button>
              )}
            </div>

            {spreadsheetInfo ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Judul Spreadsheet:</span>
                  <span className="font-bold text-slate-800">{spreadsheetInfo.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">ID Spreadsheet:</span>
                  <span className="font-mono text-[11px] text-slate-600 truncate max-w-[220px]">
                    {spreadsheetInfo.id}
                  </span>
                </div>
                {spreadsheetInfo.lastSyncedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Sinkronisasi Terakhir:</span>
                    <span className="text-slate-600">
                      {new Date(spreadsheetInfo.lastSyncedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <a
                    href={spreadsheetInfo.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Google Sheet di Tab Baru
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Belum ada spreadsheet aktif yang dipilih. Klik tombol di bawah untuk membuat atau menghubungkan Spreadsheet.
              </p>
            )}
          </div>

          {/* Quick Synchronization Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePull}
              disabled={isProcessing || isSyncing || !isConnected}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <DownloadCloud className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">Tarik dari Sheet</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Muat data terbaru yang diedit langsung di Google Sheet ke aplikasi.
              </p>
            </button>

            <button
              type="button"
              onClick={handlePush}
              disabled={isProcessing || isSyncing || !isConnected}
              className="p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-left transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <UploadCloud className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-teal-950">Kirim ke Sheet</span>
              </div>
              <p className="text-[11px] text-teal-800">
                Simpan seluruh data aplikasi saat ini ke dalam Google Sheet.
              </p>
            </button>
          </div>

          {/* Create New Sheet */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Buat Database Baru</p>
              <p className="text-[11px] text-slate-500">
                Otomatis membuat spreadsheet baru dengan tab Mahasiswa, Template KTM, dan Akademik.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isProcessing || isSyncing || !isConnected}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
              Buat Sheet Baru
            </button>
          </div>

          {/* Link Existing Sheet by ID or URL */}
          <form onSubmit={handleLink} className="pt-3 border-t border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Tautkan Spreadsheet Lain (ID atau URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... atau ID"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !customInput.trim() || !isConnected}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Link2 className="w-3.5 h-3.5" />
                Tautkan
              </button>
            </div>
          </form>

          {/* Tips Info */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Google Sheet berfungsi sebagai database utama. Anda dapat melihat, mengedit, ataupun menambahkan data mahasiswa langsung di spreadsheet melalui browser atau aplikasi Google Sheets ponsel Anda!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
