import React, { useState, useRef } from 'react';
import { Student } from '../types';
import {
  generateExcelTemplate,
  parseExcelFile,
  parsePhotosZip,
  fileToBase64,
  convertRowsToStudents,
  ParsedRow
} from '../utils/excelHelper';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Image as ImageIcon,
  Users,
  X,
  FileCheck,
  ArrowRight,
  Info
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (students: Student[], mode: 'append' | 'replace') => void;
  existingCount: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingCount
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [photosMap, setPhotosMap] = useState<Map<string, string>>(new Map());
  const [photosCount, setPhotosCount] = useState<number>(0);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const photoFilesInputRef = useRef<HTMLInputElement>(null);
  const photoZipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        setErrorMsg('Tidak ada baris data mahasiswa yang valid ditemukan di file Excel ini. Pastikan terdapat kolom NIM dan Nama.');
        setIsLoading(false);
        return;
      }
      setExcelFile(file);
      setParsedRows(rows);
      updateMatches(rows, photosMap);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(`Gagal membaca file Excel: ${err?.message || 'Format file tidak didukung'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiplePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const newMap = new Map<string, string>(photosMap);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      const filename = file.name.toLowerCase();
      const cleanName = filename.replace(/\.[^/.]+$/, '').trim();

      newMap.set(cleanName, base64);
      newMap.set(filename, base64);
    }

    setPhotosMap(newMap);
    setPhotosCount(newMap.size / 2); // approximate unique
    updateMatches(parsedRows, newMap);
    setIsLoading(false);
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const zipMap = await parsePhotosZip(file);
      const combined = new Map<string, string>();
      photosMap.forEach((v, k) => combined.set(k, v));
      zipMap.forEach((v, k) => combined.set(k, v));
      setPhotosMap(combined);
      setPhotosCount(zipMap.size / 2);
      updateMatches(parsedRows, combined);
    } catch (err: any) {
      setErrorMsg(`Gagal mengekstrak file ZIP: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMatches = (rows: ParsedRow[], pMap: Map<string, string>) => {
    let matched = 0;
    rows.forEach(r => {
      const cleanNim = r.nim.trim().toLowerCase();
      if (pMap.has(cleanNim) || (r.fotoFilename && pMap.has(r.fotoFilename.toLowerCase()))) {
        matched++;
      }
    });
    setMatchedCount(matched);
  };

  const handleFinishImport = () => {
    const newStudents = convertRowsToStudents(parsedRows, photosMap);
    onImportComplete(newStudents, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Import Data Mahasiswa & Foto Massal</h3>
              <p className="text-xs text-emerald-200">
                Otomatisasi input NIM, Nama, Prodi, Fakultas, serta pencocokan foto dari file Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2.5 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-emerald-800 font-bold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            Upload File Excel (.xlsx / .csv)
          </div>
          <div className="mx-3 text-slate-300 self-center">/</div>
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-emerald-800 font-bold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            Cocokkan Foto Massal & Konfirmasi
          </div>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* STEP 1: EXCEL UPLOAD */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Template Download Prompt */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-amber-950">Belum punya format file Excel?</p>
                  <p className="text-[11px] text-amber-800">
                    Unduh format template resmi IAIN Pontianak dengan kolom NIM, Nama, Prodi, Fakultas, dan contoh data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template (.xlsx)
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => excelInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/70 transition p-8 rounded-2xl text-center cursor-pointer space-y-3"
              >
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Klik atau Seret File Excel ke Sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung format .xlsx, .xls, atau .csv dengan kolom NIM, Nama, dan Prodi
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PHOTO MATCHING & PREVIEW */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Summary of Parsed Excel Rows */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <span>
                    Berhasil membaca <strong className="font-bold text-emerald-950">{parsedRows.length} mahasiswa</strong> dari file <span className="font-mono text-emerald-800">{excelFile?.name}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  Ganti File Excel
                </button>
              </div>

              {/* Mass Photo Upload Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      Upload Foto Mahasiswa Massal (Opsional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cukup beri nama file foto sesuai NIM (contoh: <span className="font-mono font-semibold">12201045.jpg</span>), sistem akan otomatis mencocokkannya.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {matchedCount} / {parsedRows.length} Foto Terhubung
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Upload Multi Images */}
                  <input
                    ref={photoFilesInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultiplePhotosUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoFilesInputRef.current?.click()}
                    className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        Pilih Banyak Foto Sekaligus
                      </p>
                      <p className="text-[10px] text-slate-500">Blok semua file foto JPG/PNG</p>
                    </div>
                  </button>

                  {/* Upload ZIP Archive */}
                  <input
                    ref={photoZipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoZipInputRef.current?.click()}
                    className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition flex items-center gap-2.5 group"
                  >
                    <div className="p-2 bg-amber-50 text-amber-800 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        Upload Arsip File ZIP (.zip)
                      </p>
                      <p className="text-[10px] text-slate-500">Ekstrak folder foto sekaligus</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Mahasiswa yang belum memiliki foto akan otomatis dibuatkan pasfoto siluet almamater IAIN Pontianak dan tetap dapat diedit kapan saja.
                  </span>
                </div>
              </div>

              {/* Data Preview Table (First 4 rows) */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-700">Contoh Data yang Terbaca:</p>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-40 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2 border-b">NIM</th>
                        <th className="p-2 border-b">Nama Mahasiswa</th>
                        <th className="p-2 border-b">Program Studi</th>
                        <th className="p-2 border-b">Foto Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 5).map((row, idx) => {
                        const cleanNim = row.nim.trim().toLowerCase();
                        const hasPhoto = photosMap.has(cleanNim) || (row.fotoFilename && photosMap.has(row.fotoFilename.toLowerCase()));
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-emerald-900">{row.nim}</td>
                            <td className="p-2 font-medium text-slate-800">{row.nama}</td>
                            <td className="p-2 text-slate-600">{row.prodi}</td>
                            <td className="p-2">
                              {hasPhoto ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Foto Cocok
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Avatar Standar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-[11px] text-slate-500 italic">
                    ...dan {parsedRows.length - 5} mahasiswa lainnya akan diimpor.
                  </p>
                )}
              </div>

              {/* Import Options (Append vs Replace) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Metode Penambahan Data:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-700 focus:ring-emerald-500"
                    />
                    <span>Tambahkan ke {existingCount} data saat ini</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-700 focus:ring-rose-500"
                    />
                    <span>Gantikan semua data</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleFinishImport}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Selesai & Masukkan {parsedRows.length} Mahasiswa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
