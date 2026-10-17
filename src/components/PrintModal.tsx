import React, { useState, useRef } from 'react';
import { Student, KtmTemplateConfig } from '../types';
import { KtmCard } from './KtmCard';
import { generateBatchPdf, generateBatchJpgZip } from '../utils/pdfGenerator';
import {
  Printer,
  Download,
  X,
  FileCheck,
  CreditCard,
  Grid,
  Loader2,
  Scissors,
  FileText,
  Image as ImageIcon,
  Archive,
  AlertCircle
} from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsToPrint: Student[];
  config: KtmTemplateConfig;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  studentsToPrint,
  config
}) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [printMode, setPrintMode] = useState<'cr80-duplex' | 'cr80-front-only' | 'a4-grid'>('cr80-duplex');
  const [jpgMode, setJpgMode] = useState<'both' | 'front-only'>('both');
  const [includeCropMarks, setIncludeCropMarks] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Hidden container holding all card elements for batch canvas rendering
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleStartPrint = async () => {
    if (!hiddenContainerRef.current) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProgress({ current: 0, total: studentsToPrint.length });

    try {
      // Gather element pairs for all students
      const pairs: Array<{ front: HTMLElement; back: HTMLElement; student: Student }> = [];

      for (const student of studentsToPrint) {
        const frontWrapper = hiddenContainerRef.current.querySelector(
          `#print-front-${student.nim}`
        );
        const backWrapper = hiddenContainerRef.current.querySelector(
          `#print-back-${student.nim}`
        );

        const frontEl = (frontWrapper?.querySelector(`#ktm-front-${student.nim}`) || frontWrapper) as HTMLElement | null;
        const backEl = (backWrapper?.querySelector(`#ktm-back-${student.nim}`) || backWrapper) as HTMLElement | null;

        if (frontEl && backEl) {
          pairs.push({ front: frontEl, back: backEl, student });
        }
      }

      if (pairs.length === 0) {
        throw new Error('Elemen kartu belum selesai dimuat. Silakan tunggu 1 detik dan coba lagi.');
      }

      if (exportFormat === 'pdf') {
        await generateBatchPdf(
          pairs,
          {
            mode: printMode,
            includeCropMarks: includeCropMarks && printMode === 'a4-grid'
          },
          (current, total) => {
            setProgress({ current, total });
          }
        );
      } else {
        await generateBatchJpgZip(
          pairs,
          {
            includeBack: jpgMode === 'both'
          },
          (current, total) => {
            setProgress({ current, total });
          }
        );
      }
    } catch (err: any) {
      console.error('Print generation failed:', err);
      setErrorMessage(err.message || 'Gagal memproses dokumen. Pastikan koneksi internet stabil dan coba lagi.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Printer className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Cetak & Unduh KTM (PDF / JPG)</h3>
              <p className="text-xs text-emerald-200">
                Pencetakan {studentsToPrint.length} Kartu Tanda Mahasiswa terpilih
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 hover:bg-white/10 rounded-xl text-emerald-200 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format Type Tabs: PDF vs JPG */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-2">
              Pilih Format Berkas:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  exportFormat === 'pdf'
                    ? 'border-emerald-700 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${exportFormat === 'pdf' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">Dokumen PDF</p>
                  <p className="text-[11px] text-slate-500">Siap cetak PVC / Kertas A4</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('jpg')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  exportFormat === 'jpg'
                    ? 'border-emerald-700 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${exportFormat === 'jpg' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">Gambar JPG (ZIP)</p>
                  <p className="text-[11px] text-slate-500">High-Res 300+ DPI per kartu</p>
                </div>
              </button>
            </div>
          </div>

          {/* Sub-options for PDF */}
          {exportFormat === 'pdf' && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                Pilih Tata Letak Halaman PDF:
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: CR80 Duplex */}
                <label
                  onClick={() => setPrintMode('cr80-duplex')}
                  className={`p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    printMode === 'cr80-duplex'
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Standar Kartu PVC CR80 Duplex (Depan & Belakang)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Ukuran asli 85.6 × 53.98 mm (2 halaman per mahasiswa). Cocok untuk printer kartu PVC khusus.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="printFormat"
                    checked={printMode === 'cr80-duplex'}
                    onChange={() => setPrintMode('cr80-duplex')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                {/* Option 2: A4 Grid */}
                <label
                  onClick={() => setPrintMode('a4-grid')}
                  className={`p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    printMode === 'a4-grid'
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Grid className="w-5 h-5 text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Lembar Kertas A4 Grid (8 Kartu / Lembar A4)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Susunan 2 kolom × 4 baris pada kertas A4 dengan garis potong (cutting marks). Ideal untuk cetak kertas foto lalu laminasi.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="printFormat"
                    checked={printMode === 'a4-grid'}
                    onChange={() => setPrintMode('a4-grid')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                {/* Option 3: CR80 Front Only */}
                <label
                  onClick={() => setPrintMode('cr80-front-only')}
                  className={`p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    printMode === 'cr80-front-only'
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Hanya Sisi Depan (CR80 Single-Sided)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Cetak khusus halaman depan KTM saja untuk kartu tanda pengenal satu sisi.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="printFormat"
                    checked={printMode === 'cr80-front-only'}
                    onChange={() => setPrintMode('cr80-front-only')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>

              {/* Crop marks checkbox for A4 */}
              {printMode === 'a4-grid' && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-2">
                  <span className="font-medium text-slate-700 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-700" />
                    Sertakan Garis Tanda Potong (Crop Marks) di Sekitar Kartu
                  </span>
                  <input
                    type="checkbox"
                    checked={includeCropMarks}
                    onChange={e => setIncludeCropMarks(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Sub-options for JPG */}
          {exportFormat === 'jpg' && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                Pilih Sisi Gambar JPG:
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                <label
                  onClick={() => setJpgMode('both')}
                  className={`p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    jpgMode === 'both'
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Archive className="w-5 h-5 text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Sisi Depan & Belakang (Paket ZIP Lengkap)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Setiap mahasiswa mendapatkan 2 file JPG beresolusi tinggi (Depan & Belakang) yang dikompresi dalam arsip ZIP rapi.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="jpgMode"
                    checked={jpgMode === 'both'}
                    onChange={() => setJpgMode('both')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label
                  onClick={() => setJpgMode('front-only')}
                  className={`p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                    jpgMode === 'front-only'
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ImageIcon className="w-5 h-5 text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Hanya Sisi Depan (Paket ZIP Depan)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Mengunduh arsip ZIP berisi file gambar JPG sisi depan saja untuk seluruh mahasiswa terpilih.
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="jpgMode"
                    checked={jpgMode === 'front-only'}
                    onChange={() => setJpgMode('front-only')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Terjadi Kesalahan</p>
                <p className="text-[11px] text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Processing Progress Bar */}
          {isProcessing && progress && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  {exportFormat === 'pdf' ? 'Merender Dokumen PDF...' : 'Merender Berkas Gambar JPG & ZIP...'}
                </span>
                <span>
                  {progress.current} / {progress.total} (
                  {Math.round((progress.current / Math.max(1, progress.total)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-emerald-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-700 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Browser (Ctrl+P)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleStartPrint}
                disabled={isProcessing || studentsToPrint.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sedang Memproses...
                  </>
                ) : exportFormat === 'pdf' ? (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    Unduh Dokumen PDF ({studentsToPrint.length} KTM)
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    Unduh Paket ZIP JPG ({studentsToPrint.length} KTM)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offscreen container for full-resolution rendering */}
      <div
        ref={hiddenContainerRef}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1,
          visibility: 'visible'
        }}
        aria-hidden="true"
      >
        {studentsToPrint.map(student => (
          <div key={student.id} className="flex gap-4 mb-4">
            <div id={`print-front-${student.nim}`}>
              <KtmCard student={student} config={config} side="front" scale={1} />
            </div>
            <div id={`print-back-${student.nim}`}>
              <KtmCard student={student} config={config} side="back" scale={1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

