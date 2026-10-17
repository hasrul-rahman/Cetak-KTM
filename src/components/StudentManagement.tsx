import React, { useState, useMemo, useRef } from 'react';
import { Student, KtmTemplateConfig, AcademicConfig } from '../types';
import { IAIN_PRODI_LIST, IAIN_FAKULTAS_MAP, DEFAULT_FACULTIES, createStudentAvatar } from '../data/defaultData';
import { exportStudentsToExcel, fileToBase64 } from '../utils/excelHelper';
import { generateSingleCardPdf, generateSingleCardJpg, generateSingleCardZip } from '../utils/pdfGenerator';
import { GoogleSpreadsheetInfo } from '../lib/googleSheets';
import { KtmCard } from './KtmCard';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckSquare,
  Square,
  Users,
  UserPlus,
  X,
  Upload,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Cloud,
  Layers,
  AlertCircle,
  GraduationCap,
  Building2,
  FileText,
  Image as ImageIcon,
  Archive,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  config: KtmTemplateConfig;
  academicConfig?: AcademicConfig;
  spreadsheetInfo?: GoogleSpreadsheetInfo | null;
  isGoogleSheetsConnected?: boolean;
  isSyncing?: boolean;
  onOpenGoogleSheetsModal?: () => void;
  onReloadFromSheet?: () => Promise<void>;
  onUpdateStudents: (students: Student[]) => void;
  onSaveSingleStudent?: (student: Student, isNew: boolean) => Promise<void>;
  onDeleteSingleStudent?: (studentId: string, studentName: string) => Promise<void>;
  onBulkUpdateStudents?: (students: Student[]) => Promise<void>;
  onOpenExcelImport: () => void;
  onOpenBatchPrint: (selected: Student[]) => void;
  onOpenAcademicManagement?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  config,
  academicConfig,
  spreadsheetInfo,
  isGoogleSheetsConnected = false,
  isSyncing = false,
  onOpenGoogleSheetsModal,
  onReloadFromSheet,
  onUpdateStudents,
  onSaveSingleStudent,
  onDeleteSingleStudent,
  onBulkUpdateStudents,
  onOpenExcelImport,
  onOpenBatchPrint,
  onOpenAcademicManagement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dynamic academic lists
  const availableProdis = useMemo(() => {
    return academicConfig?.programs.map(p => p.name) || IAIN_PRODI_LIST;
  }, [academicConfig]);

  const availableFaculties = useMemo(() => {
    return academicConfig?.faculties || DEFAULT_FACULTIES;
  }, [academicConfig]);

  const facultyMap = useMemo(() => {
    if (!academicConfig) return IAIN_FAKULTAS_MAP;
    const map: Record<string, string> = {};
    academicConfig.programs.forEach(p => {
      map[p.name] = p.fakultas;
    });
    return map;
  }, [academicConfig]);

  // Edit / Add Modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Bulk edit modal state
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Single card preview modal state
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewSide, setPreviewSide] = useState<'both' | 'front' | 'back'>('both');

  const singleFrontRef = useRef<HTMLDivElement>(null);
  const singleBackRef = useRef<HTMLDivElement>(null);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.prodi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.fakultas && s.fakultas.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.alamat && s.alamat.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchProdi = selectedProdi === 'ALL' || s.prodi === selectedProdi;
      const matchFaculty = selectedFaculty === 'ALL' || s.fakultas === selectedFaculty;
      return matchSearch && matchProdi && matchFaculty;
    });
  }, [students, searchQuery, selectedProdi, selectedFaculty]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Hapus ${selectedIds.size} data mahasiswa terpilih dari database?`)) {
      onUpdateStudents(students.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSingle = async (id: string, name: string) => {
    if (window.confirm(`Hapus data mahasiswa ${name}? Data akan dihapus permanen dari database.`)) {
      if (onDeleteSingleStudent) {
        await onDeleteSingleStudent(id, name);
      } else {
        onUpdateStudents(students.filter(s => s.id !== id));
      }
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    }
  };

  const handleSaveStudent = async (studentData: Student) => {
    if (onSaveSingleStudent) {
      await onSaveSingleStudent(studentData, isAddingNew);
    } else {
      if (isAddingNew) {
        onUpdateStudents([studentData, ...students]);
      } else {
        onUpdateStudents(students.map(s => (s.id === studentData.id ? studentData : s)));
      }
    }
    setEditingStudent(null);
    setIsAddingNew(false);
  };

  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const offscreenFrontRef = useRef<HTMLDivElement>(null);
  const offscreenBackRef = useRef<HTMLDivElement>(null);

  const handleOpenDownloadModal = (student: Student) => {
    setPreviewStudent(student);
    setPreviewSide('both');
    setDownloadError(null);
  };

  const handleDownloadPdf = async (student: Student, includeBack: boolean = true) => {
    try {
      setDownloadingType(includeBack ? 'pdf-duplex' : 'pdf-front');
      setDownloadError(null);
      
      const frontEl = (offscreenFrontRef.current?.querySelector(`#ktm-front-${student.nim}`) ||
        offscreenFrontRef.current?.firstElementChild ||
        singleFrontRef.current) as HTMLElement | null;

      const backEl = (offscreenBackRef.current?.querySelector(`#ktm-back-${student.nim}`) ||
        offscreenBackRef.current?.firstElementChild ||
        singleBackRef.current) as HTMLElement | null;

      if (!frontEl) throw new Error('Elemen kartu depan belum siap. Silakan coba sebentar lagi.');
      await generateSingleCardPdf(frontEl, includeBack ? backEl : null, student, includeBack);
    } catch (err: any) {
      console.error('Download PDF failed:', err);
      setDownloadError(err.message || 'Gagal mengunduh berkas PDF');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadJpg = async (student: Student, side: 'front' | 'back') => {
    try {
      setDownloadingType(side === 'front' ? 'jpg-front' : 'jpg-back');
      setDownloadError(null);

      const targetWrapper = side === 'front' ? offscreenFrontRef.current : offscreenBackRef.current;
      const fallbackRef = side === 'front' ? singleFrontRef.current : singleBackRef.current;
      const cardEl = (targetWrapper?.querySelector(
        side === 'front' ? `#ktm-front-${student.nim}` : `#ktm-back-${student.nim}`
      ) || targetWrapper?.firstElementChild || fallbackRef) as HTMLElement | null;

      if (!cardEl) throw new Error(`Elemen kartu ${side === 'front' ? 'depan' : 'belakang'} belum siap.`);
      await generateSingleCardJpg(cardEl, student, side);
    } catch (err: any) {
      console.error('Download JPG failed:', err);
      setDownloadError(err.message || 'Gagal mengunduh gambar JPG');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadZip = async (student: Student) => {
    try {
      setDownloadingType('jpg-zip');
      setDownloadError(null);

      const frontEl = (offscreenFrontRef.current?.querySelector(`#ktm-front-${student.nim}`) ||
        offscreenFrontRef.current?.firstElementChild ||
        singleFrontRef.current) as HTMLElement | null;

      const backEl = (offscreenBackRef.current?.querySelector(`#ktm-back-${student.nim}`) ||
        offscreenBackRef.current?.firstElementChild ||
        singleBackRef.current) as HTMLElement | null;

      if (!frontEl) throw new Error('Elemen kartu belum siap.');
      await generateSingleCardZip(frontEl, backEl, student);
    } catch (err: any) {
      console.error('Download ZIP failed:', err);
      setDownloadError(err.message || 'Gagal mengunduh file ZIP JPG');
    } finally {
      setDownloadingType(null);
    }
  };

  const selectedStudentsList = useMemo(() => {
    return students.filter(s => selectedIds.has(s.id));
  }, [students, selectedIds]);

  return (
    <div className="space-y-5">
      {/* Top Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            Manajemen Data Mahasiswa
            <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full">
              Total {students.length} Mahasiswa
            </span>
            {spreadsheetInfo && isGoogleSheetsConnected && (
              <button
                type="button"
                onClick={onOpenGoogleSheetsModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full transition"
                title="Buka status database Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Sheet: {spreadsheetInfo.title}
              </button>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Database utama: Google Sheets. Kelola NIM, Nama, Prodi, Foto, serta cetak otomatis Kartu Tanda Mahasiswa IAIN Pontianak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onReloadFromSheet && (
            <button
              type="button"
              onClick={onReloadFromSheet}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition disabled:opacity-50"
              title="Muat data terbaru langsung dari Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
              Muat Ulang Sheet
            </button>
          )}

          {onOpenGoogleSheetsModal && (
            <button
              type="button"
              onClick={onOpenGoogleSheetsModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
              title="Buka Pengaturan Database Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
              Kelola Database Sheet
            </button>
          )}

          <button
            type="button"
            onClick={onOpenExcelImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            Import Excel & Foto Massal
          </button>

          <button
            type="button"
            onClick={() => setIsBulkEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-900 rounded-xl text-xs font-bold transition"
            title="Ubah data secara serentak untuk seluruh atau sebagian mahasiswa"
          >
            <Layers className="w-4 h-4 text-teal-700" />
            {selectedIds.size > 0
              ? `Ubah Massal (${selectedIds.size} Terpilih)`
              : 'Ubah Data Massal'}
          </button>

          <button
            type="button"
            onClick={() => exportStudentsToExcel(students)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Export ke Excel
          </button>

          {onOpenAcademicManagement && (
            <button
              type="button"
              onClick={onOpenAcademicManagement}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 rounded-xl text-xs font-bold transition shadow-2xs"
              title="Kelola Daftar Nama Prodi & Fakultas"
            >
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              Kelola Prodi & Fakultas
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              const defProdi = availableProdis[0] || 'Pendidikan Agama Islam';
              const defFak = facultyMap[defProdi] || availableFaculties[0] || 'Fakultas Tarbiyah dan Ilmu Keguruan';
              setEditingStudent({
                id: `std-${Date.now()}`,
                nim: '',
                nama: '',
                prodi: defProdi,
                fakultas: defFak,
                angkatan: '2024',
                jenisKelamin: 'L',
                tempatTanggalLahir: '',
                alamat: '',
                berlakuHingga: 'Selama Menjadi Mahasiswa',
                createdAt: Date.now()
              });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            Tambah Mahasiswa
          </button>
        </div>
      </div>

      {/* Filter & Batch Actions Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Search, Prodi, and Fakultas filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIM, Nama, Prodi, atau Fakultas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedProdi}
              onChange={e => setSelectedProdi(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium max-w-[220px]"
            >
              <option value="ALL">Semua Program Studi</option>
              {availableProdis.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedFaculty}
              onChange={e => setSelectedFaculty(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium max-w-[220px]"
            >
              <option value="ALL">Semua Fakultas</option>
              {availableFaculties.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Print Button if items selected */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setIsBulkEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                Ubah Massal ({selectedIds.size})
              </button>

              <button
                type="button"
                onClick={() => onOpenBatchPrint(selectedStudentsList)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                Cetak {selectedIds.size} KTM Terpilih (PDF)
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="p-2 text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                title="Hapus yang terpilih"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenBatchPrint(filteredStudents)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Cetak Semua ({filteredStudents.length} Mahasiswa)
            </button>
          )}
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 select-none text-xs">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-600 hover:text-emerald-800"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-800" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 w-16">Foto</th>
                <th className="p-3.5">NIM</th>
                <th className="p-3.5">Nama Lengkap</th>
                <th className="p-3.5">Program Studi & Fakultas</th>
                <th className="p-3.5">Angkatan</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">Tidak ada data mahasiswa ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti kata kunci pencarian atau import data mahasiswa dari file Excel.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="w-11 h-13 bg-slate-200 rounded border border-slate-300 overflow-hidden shadow-xs">
                          <img
                            src={student.foto || createStudentAvatar(student.nama, student.jenisKelamin)}
                            alt={student.nama}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-sm text-emerald-950">
                        {student.nim}
                      </td>

                      <td className="p-3.5 font-bold text-slate-800">
                        <div className="text-sm font-bold text-slate-900">{student.nama}</div>
                        <div className="text-xs font-normal text-slate-500 font-sans">
                          {student.tempatTanggalLahir || '-'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs">{student.prodi}</div>
                        <div className="text-xs text-emerald-800 font-medium">{student.fakultas}</div>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        <span className="bg-slate-100 px-2.5 py-1 rounded font-mono font-bold text-xs text-slate-800">
                          {student.angkatan}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewStudent(student)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="Pratinjau KTM"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDownloadModal(student)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="Pratinjau & Unduh KTM (PDF / JPG)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNew(false);
                              setEditingStudent({ ...student });
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Data Mahasiswa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(student.id, student.nama)}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT STUDENT */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isNew={isAddingNew}
          availableProdis={availableProdis}
          availableFaculties={availableFaculties}
          facultyMap={facultyMap}
          onClose={() => {
            setEditingStudent(null);
            setIsAddingNew(false);
          }}
          onSave={handleSaveStudent}
        />
      )}

      {/* MODAL: BULK / MASS EDIT STUDENTS */}
      {isBulkEditOpen && (
        <BulkEditStudentsModal
          students={students}
          selectedIds={selectedIds}
          availableProdis={availableProdis}
          availableFaculties={availableFaculties}
          facultyMap={facultyMap}
          onClose={() => setIsBulkEditOpen(false)}
          onBulkSave={async (updatedList) => {
            if (onBulkUpdateStudents) {
              await onBulkUpdateStudents(updatedList);
            } else {
              onUpdateStudents(updatedList);
            }
            setIsBulkEditOpen(false);
          }}
        />
      )}

      {/* MODAL: SINGLE STUDENT KTM PREVIEW */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 my-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Pratinjau KTM: {previewStudent.nama} ({previewStudent.nim})
                </h3>
                <p className="text-sm text-slate-600 font-medium">{previewStudent.prodi} - {previewStudent.fakultas}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewSide('both')}
                    className={`px-3 py-1.5 rounded-md transition font-bold ${
                      previewSide === 'both' ? 'bg-white shadow text-emerald-900' : 'text-slate-600'
                    }`}
                  >
                    Depan & Belakang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('front')}
                    className={`px-3 py-1.5 rounded-md transition font-bold ${
                      previewSide === 'front' ? 'bg-white shadow text-emerald-900' : 'text-slate-600'
                    }`}
                  >
                    Depan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('back')}
                    className={`px-3 py-1.5 rounded-md transition font-bold ${
                      previewSide === 'back' ? 'bg-white shadow text-emerald-900' : 'text-slate-600'
                    }`}
                  >
                    Belakang
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rendered Preview Card */}
            <div className="bg-slate-100 p-6 rounded-2xl flex items-center justify-center overflow-x-auto min-h-[360px]">
              <KtmCard
                student={previewStudent}
                config={config}
                side={previewSide}
                scale={1.0}
                frontRef={singleFrontRef}
                backRef={singleBackRef}
              />
            </div>

            {/* Error Message */}
            {downloadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Gagal Mengunduh</p>
                  <p className="text-[11px] text-rose-700">{downloadError}</p>
                </div>
              </div>
            )}

            {/* Download Options Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  Opsi Unduh & Cetak KTM (Pilih Format):
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  CR80: 85.6 × 53.98 mm • High-Res
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PDF Group */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    Dokumen PDF (Siap Cetak):
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!downloadingType}
                      onClick={() => handleDownloadPdf(previewStudent, true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingType === 'pdf-duplex' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          PDF (Depan + Belakang)
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!!downloadingType}
                      onClick={() => handleDownloadPdf(previewStudent, false)}
                      className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                      title="Unduh PDF Halaman Depan Saja"
                    >
                      {downloadingType === 'pdf-front' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      ) : (
                        'Depan Saja'
                      )}
                    </button>
                  </div>
                </div>

                {/* JPG Group */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                    Berkas Gambar JPG (300+ DPI):
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!downloadingType}
                      onClick={() => handleDownloadJpg(previewStudent, 'front')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white border border-emerald-700/40 hover:bg-emerald-50 text-emerald-900 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingType === 'jpg-front' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          JPG Depan
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={!!downloadingType}
                      onClick={() => handleDownloadJpg(previewStudent, 'back')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white border border-emerald-700/40 hover:bg-emerald-50 text-emerald-900 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingType === 'jpg-back' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          JPG Belakang
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={!!downloadingType}
                      onClick={() => handleDownloadZip(previewStudent)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                      title="Unduh Kedua Sisi dalam Arsip ZIP"
                    >
                      {downloadingType === 'jpg-zip' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          ZIP
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Kartu Tanda Mahasiswa Digital • Institut Agama Islam Negeri (IAIN) Pontianak
              </span>

              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Dedicated guaranteed offscreen elements for html2canvas */}
            <div
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
              <div ref={offscreenFrontRef}>
                <KtmCard student={previewStudent} config={config} side="front" scale={1} />
              </div>
              <div ref={offscreenBackRef}>
                <KtmCard student={previewStudent} config={config} side="back" scale={1} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Add / Edit Single Student Modal (Lengkap & Terhubung Firestore)
const EditStudentModal: React.FC<{
  student: Student;
  isNew: boolean;
  availableProdis: string[];
  availableFaculties: string[];
  facultyMap: Record<string, string>;
  onClose: () => void;
  onSave: (student: Student) => Promise<void> | void;
}> = ({ student: initialStudent, isNew, availableProdis, availableFaculties, facultyMap, onClose, onSave }) => {
  const [formData, setFormData] = useState<Student>({ ...initialStudent });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setFormData(prev => ({ ...prev, foto: base64 }));
    } catch (err) {
      alert('Gagal memproses file foto. Pastikan format file adalah gambar valid.');
    }
  };

  const handleProdiChange = (prodi: string) => {
    const fakultas = facultyMap[prodi] || formData.fakultas;
    setFormData(prev => ({ ...prev, prodi, fakultas }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nim.trim() || !formData.nama.trim()) {
      setErrorMsg('NIM dan Nama Lengkap Mahasiswa wajib diisi.');
      return;
    }

    // Ensure fallback avatar if no photo
    const finalData = { ...formData };
    if (!finalData.foto) {
      finalData.foto = createStudentAvatar(finalData.nama, finalData.jenisKelamin);
    }
    finalData.updatedAt = Date.now();

    setIsSaving(true);
    try {
      await onSave(finalData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header with IAIN green tone */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-5 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-800/80 rounded-full text-[10px] font-semibold text-emerald-200 border border-emerald-700/50 mb-1">
              <Cloud className="w-3 h-3 text-emerald-400" />
              Tersimpan Langsung ke Firebase Firestore
            </div>
            <h3 className="text-base font-bold">
              {isNew ? 'Tambah Data Mahasiswa Baru' : `Edit Seluruh Data: ${formData.nama || formData.nim}`}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Pasfoto Mahasiswa */}
          <div className="flex gap-4 items-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-16 h-20 bg-slate-200 rounded-lg border border-slate-300 overflow-hidden shrink-0 shadow-xs relative">
              <img
                src={formData.foto || createStudentAvatar(formData.nama || 'M', formData.jenisKelamin)}
                alt="Foto Mahasiswa"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-xs font-bold text-slate-800">Pasfoto Resmi Mahasiswa</p>
              <p className="text-[11px] text-slate-500 leading-tight">
                Disarankan pasfoto formal proporsi 3:4 dengan latar belakang merah atau biru.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-800 transition"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  Unggah Foto Baru
                </button>
                {formData.foto && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, foto: undefined }))}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-medium px-2 py-1"
                  >
                    Gunakan Avatar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Identitas Pokok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                NIM (Nomor Induk Mahasiswa) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nim}
                onChange={e => setFormData({ ...formData, nim: e.target.value })}
                placeholder="Contoh: 12401050"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tahun Angkatan</label>
              <input
                type="text"
                value={formData.angkatan}
                onChange={e => setFormData({ ...formData, angkatan: e.target.value })}
                placeholder="2024"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Lengkap Mahasiswa <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={e => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Nama lengkap sesuai SIAKAD / KTP"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Section 3: Akademik (Prodi & Fakultas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Program Studi <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.prodi}
                onChange={e => handleProdiChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {availableProdis.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {formData.prodi && !availableProdis.includes(formData.prodi) && (
                  <option value={formData.prodi}>{formData.prodi}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Fakultas <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.fakultas}
                onChange={e => setFormData({ ...formData, fakultas: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {availableFaculties.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                {formData.fakultas && !availableFaculties.includes(formData.fakultas) && (
                  <option value={formData.fakultas}>{formData.fakultas}</option>
                )}
              </select>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Pilih dari daftar fakultas resmi atau disesuaikan otomatis saat memilih prodi.
              </p>
            </div>
          </div>

          {/* Section 4: Data Pribadi & Kontak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Kelamin</label>
              <select
                value={formData.jenisKelamin || 'L'}
                onChange={e =>
                  setFormData({ ...formData, jenisKelamin: e.target.value as 'L' | 'P' })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Masa Berlaku Kartu</label>
              <input
                type="text"
                value={formData.berlakuHingga || 'Selama Menjadi Mahasiswa'}
                onChange={e => setFormData({ ...formData, berlakuHingga: e.target.value })}
                placeholder="Selama Menjadi Mahasiswa / 31 Agustus 2028"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tempat & Tanggal Lahir
            </label>
            <input
              type="text"
              value={formData.tempatTanggalLahir || ''}
              onChange={e => setFormData({ ...formData, tempatTanggalLahir: e.target.value })}
              placeholder="Contoh: Pontianak, 12 Mei 2004"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Alamat Domisili Lengkap
            </label>
            <textarea
              rows={2}
              value={formData.alamat || ''}
              onChange={e => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Contoh: Jl. Letjend Soeprapto No. 19, Pontianak Selatan, Kota Pontianak"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              ID: <span className="font-mono text-emerald-700 font-semibold">{formData.id}</span>
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-amber-300" />
                    Simpan ke Database Firebase
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: Bulk / Mass Edit Students Modal
const BulkEditStudentsModal: React.FC<{
  students: Student[];
  selectedIds: Set<string>;
  availableProdis: string[];
  availableFaculties: string[];
  facultyMap: Record<string, string>;
  onClose: () => void;
  onBulkSave: (updatedStudents: Student[]) => Promise<void>;
}> = ({ students, selectedIds, availableProdis, availableFaculties, facultyMap, onClose, onBulkSave }) => {
  const [targetScope, setTargetScope] = useState<'selected' | 'all'>(
    selectedIds.size > 0 ? 'selected' : 'all'
  );

  // Field toggles
  const [changeBerlaku, setChangeBerlaku] = useState(true);
  const [valBerlaku, setValBerlaku] = useState('31 Agustus 2028');

  const [changeAngkatan, setChangeAngkatan] = useState(false);
  const [valAngkatan, setValAngkatan] = useState('2024');

  const [changeProdi, setChangeProdi] = useState(false);
  const [valProdi, setValProdi] = useState(availableProdis[0] || 'Pendidikan Agama Islam');

  const [changeAlamat, setChangeAlamat] = useState(false);
  const [valAlamat, setValAlamat] = useState('Pontianak, Kalimantan Barat');

  const [isSaving, setIsSaving] = useState(false);

  const targetCount = targetScope === 'selected' ? selectedIds.size : students.length;

  const handleApplyBulk = async () => {
    if (targetCount === 0) {
      alert('Tidak ada mahasiswa yang ditargetkan.');
      return;
    }

    if (!changeBerlaku && !changeAngkatan && !changeProdi && !changeAlamat) {
      alert('Pilih setidaknya satu bidang data yang ingin diubah secara massal.');
      return;
    }

    const confirmMsg = `Perbarui data untuk ${targetCount} mahasiswa secara massal dan simpan langsung ke database Cloud Firestore?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updatedList = students.map(student => {
        const isTarget =
          targetScope === 'all' ? true : selectedIds.has(student.id);

        if (!isTarget) return student;

        const modified = { ...student, updatedAt: Date.now() };
        if (changeBerlaku && valBerlaku.trim()) {
          modified.berlakuHingga = valBerlaku.trim();
        }
        if (changeAngkatan && valAngkatan.trim()) {
          modified.angkatan = valAngkatan.trim();
        }
        if (changeProdi && valProdi) {
          modified.prodi = valProdi;
          modified.fakultas = facultyMap[valProdi] || modified.fakultas;
        }
        if (changeAlamat && valAlamat.trim()) {
          modified.alamat = valAlamat.trim();
        }
        return modified;
      });

      await onBulkSave(updatedList);
    } catch (err: any) {
      alert('Gagal memperbarui massal ke database: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6">
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-teal-800/80 rounded-full text-[10px] font-semibold text-teal-200 border border-teal-700/50 mb-1">
              <Layers className="w-3 h-3 text-amber-300" />
              Batch Update Firestore
            </div>
            <h3 className="text-base font-bold">Ubah Data Mahasiswa Massal</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-teal-200 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Scope Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Pilih Target Mahasiswa yang Akan Diubah:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  targetScope === 'all'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Seluruh Mahasiswa</span>
                  <Users className="w-4 h-4 text-emerald-700" />
                </div>
                <span className="text-[11px] text-slate-500">
                  Total {students.length} data di database
                </span>
              </button>

              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => setTargetScope('selected')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  targetScope === 'selected'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                    : selectedIds.size === 0
                    ? 'border-slate-200 bg-slate-100/50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">Mahasiswa Terpilih</span>
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedIds.size > 0 ? `${selectedIds.size} mahasiswa terpilih` : 'Centang baris tabel dahulu'}
                </span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs font-bold text-slate-800">Pilih Data yang Akan Diganti Serentak:</p>

            {/* 1. Masa Berlaku Kartu */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changeBerlaku}
                  onChange={e => setChangeBerlaku(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Ubah Masa Berlaku Kartu (Berlaku Hingga)
                </span>
              </label>
              {changeBerlaku && (
                <div className="pt-1 pl-6 space-y-2">
                  <input
                    type="text"
                    value={valBerlaku}
                    onChange={e => setValBerlaku(e.target.value)}
                    placeholder="Contoh: 31 Agustus 2028"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {['Selama Menjadi Mahasiswa', '31 Agustus 2028', '31 Agustus 2029', '31 Agustus 2027'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setValBerlaku(p)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:border-emerald-600 hover:text-emerald-800"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Tahun Angkatan */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changeAngkatan}
                  onChange={e => setChangeAngkatan(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">Ubah Tahun Angkatan</span>
              </label>
              {changeAngkatan && (
                <div className="pt-1 pl-6">
                  <input
                    type="text"
                    value={valAngkatan}
                    onChange={e => setValAngkatan(e.target.value)}
                    placeholder="Contoh: 2024"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 3. Program Studi & Fakultas */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changeProdi}
                  onChange={e => setChangeProdi(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Ubah Program Studi & Fakultas
                </span>
              </label>
              {changeProdi && (
                <div className="pt-1 pl-6 space-y-1">
                  <select
                    value={valProdi}
                    onChange={e => setValProdi(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableProdis.map(p => (
                      <option key={p} value={p}>
                        {p} ({facultyMap[p] || 'Fakultas'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Alamat / Domisili Kota */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changeAlamat}
                  onChange={e => setChangeAlamat(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">Ubah Alamat / Domisili</span>
              </label>
              {changeAlamat && (
                <div className="pt-1 pl-6">
                  <input
                    type="text"
                    value={valAlamat}
                    onChange={e => setValAlamat(e.target.value)}
                    placeholder="Contoh: Pontianak, Kalimantan Barat"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Target: <strong className="text-emerald-900">{targetCount} mahasiswa</strong>
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving || targetCount === 0}
                onClick={handleApplyBulk}
                className="inline-flex items-center gap-2 px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan ke Cloud...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-amber-300" />
                    Terapkan & Simpan ke Firebase
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
