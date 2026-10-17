import React, { useState } from 'react';
import { AcademicConfig, AcademicProgramItem, Student } from '../types';
import { DEFAULT_ACADEMIC_CONFIG } from '../data/defaultData';
import { 
  GraduationCap, 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle, 
  Users, 
  Layers, 
  Sparkles,
  Cloud,
  CheckCircle2
} from 'lucide-react';

interface AcademicManagementProps {
  academicConfig: AcademicConfig;
  students: Student[];
  onSaveConfig: (newConfig: AcademicConfig) => Promise<void>;
  onClose?: () => void;
}

export const AcademicManagement: React.FC<AcademicManagementProps> = ({
  academicConfig,
  students,
  onSaveConfig,
  onClose
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'programs' | 'faculties'>('programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('ALL');

  // Modal states for Prodi
  const [isProdiModalOpen, setIsProdiModalOpen] = useState(false);
  const [editingProdi, setEditingProdi] = useState<AcademicProgramItem | null>(null);
  const [prodiNameInput, setProdiNameInput] = useState('');
  const [prodiFakultasInput, setProdiFakultasInput] = useState('');

  // Modal states for Fakultas
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<string | null>(null);
  const [facultyNameInput, setFacultyNameInput] = useState('');

  // Status indicators
  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Helper counters
  const getStudentCountByProdi = (prodiName: string) => {
    return students.filter(s => (s.prodi || '').trim().toLowerCase() === prodiName.trim().toLowerCase()).length;
  };

  const getStudentCountByFaculty = (facultyName: string) => {
    return students.filter(s => (s.fakultas || '').trim().toLowerCase() === facultyName.trim().toLowerCase()).length;
  };

  const getProdiCountByFaculty = (facultyName: string) => {
    return academicConfig.programs.filter(p => p.fakultas.trim().toLowerCase() === facultyName.trim().toLowerCase()).length;
  };

  // Filtered programs
  const filteredPrograms = academicConfig.programs.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.fakultas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFaculty = selectedFacultyFilter === 'ALL' || p.fakultas === selectedFacultyFilter;
    return matchSearch && matchFaculty;
  });

  // Filtered faculties
  const filteredFaculties = academicConfig.faculties.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers for Prodi
  const handleOpenAddProdi = () => {
    setEditingProdi(null);
    setProdiNameInput('');
    setProdiFakultasInput(academicConfig.faculties[0] || 'Fakultas Tarbiyah dan Ilmu Keguruan');
    setErrorMessage(null);
    setIsProdiModalOpen(true);
  };

  const handleOpenEditProdi = (prodi: AcademicProgramItem) => {
    setEditingProdi(prodi);
    setProdiNameInput(prodi.name);
    setProdiFakultasInput(prodi.fakultas);
    setErrorMessage(null);
    setIsProdiModalOpen(true);
  };

  const handleSaveProdi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = prodiNameInput.trim();
    if (!cleanName) {
      setErrorMessage('Nama Program Studi tidak boleh kosong.');
      return;
    }

    if (!prodiFakultasInput) {
      setErrorMessage('Pilih Fakultas untuk Program Studi ini.');
      return;
    }

    // Check duplicate
    const exists = academicConfig.programs.some(
      p => p.name.toLowerCase() === cleanName.toLowerCase() && (!editingProdi || p.id !== editingProdi.id)
    );
    if (exists) {
      setErrorMessage(`Program Studi "${cleanName}" sudah terdaftar.`);
      return;
    }

    setIsSaving(true);
    try {
      let updatedPrograms: AcademicProgramItem[];
      if (editingProdi) {
        updatedPrograms = academicConfig.programs.map(p => 
          p.id === editingProdi.id ? { ...p, name: cleanName, fakultas: prodiFakultasInput } : p
        );
      } else {
        const newItem: AcademicProgramItem = {
          id: `prodi-${Date.now()}`,
          name: cleanName,
          fakultas: prodiFakultasInput
        };
        updatedPrograms = [...academicConfig.programs, newItem];
      }

      await onSaveConfig({
        ...academicConfig,
        programs: updatedPrograms,
        updatedAt: Date.now()
      });

      setIsProdiModalOpen(false);
      showNotification(editingProdi ? `Program Studi "${cleanName}" berhasil diperbarui.` : `Program Studi "${cleanName}" berhasil ditambahkan.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan Program Studi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProdi = async (prodi: AcademicProgramItem) => {
    const studentCount = getStudentCountByProdi(prodi.name);
    const confirmMsg = studentCount > 0 
      ? `Terdapat ${studentCount} mahasiswa pada Program Studi "${prodi.name}". Apakah Anda yakin ingin menghapus prodi ini dari daftar pilihan?`
      : `Hapus Program Studi "${prodi.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updatedPrograms = academicConfig.programs.filter(p => p.id !== prodi.id);
      await onSaveConfig({
        ...academicConfig,
        programs: updatedPrograms,
        updatedAt: Date.now()
      });
      showNotification(`Program Studi "${prodi.name}" telah dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus program studi: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers for Faculty
  const handleOpenAddFaculty = () => {
    setEditingFaculty(null);
    setFacultyNameInput('');
    setErrorMessage(null);
    setIsFacultyModalOpen(true);
  };

  const handleOpenEditFaculty = (facultyName: string) => {
    setEditingFaculty(facultyName);
    setFacultyNameInput(facultyName);
    setErrorMessage(null);
    setIsFacultyModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = facultyNameInput.trim();
    if (!cleanName) {
      setErrorMessage('Nama Fakultas tidak boleh kosong.');
      return;
    }

    const exists = academicConfig.faculties.some(
      f => f.toLowerCase() === cleanName.toLowerCase() && f.toLowerCase() !== (editingFaculty || '').toLowerCase()
    );
    if (exists) {
      setErrorMessage(`Fakultas "${cleanName}" sudah terdaftar.`);
      return;
    }

    setIsSaving(true);
    try {
      let updatedFaculties: string[];
      let updatedPrograms = [...academicConfig.programs];

      if (editingFaculty) {
        // Update faculty list
        updatedFaculties = academicConfig.faculties.map(f => f === editingFaculty ? cleanName : f);
        // Cascade update in prodi list that belong to this faculty
        updatedPrograms = updatedPrograms.map(p => 
          p.fakultas === editingFaculty ? { ...p, fakultas: cleanName } : p
        );
      } else {
        updatedFaculties = [...academicConfig.faculties, cleanName];
      }

      await onSaveConfig({
        ...academicConfig,
        faculties: updatedFaculties,
        programs: updatedPrograms,
        updatedAt: Date.now()
      });

      setIsFacultyModalOpen(false);
      showNotification(editingFaculty ? `Nama Fakultas "${cleanName}" berhasil diperbarui.` : `Fakultas "${cleanName}" berhasil ditambahkan.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan Fakultas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaculty = async (facultyName: string) => {
    const prodiCount = getProdiCountByFaculty(facultyName);
    const studentCount = getStudentCountByFaculty(facultyName);

    if (academicConfig.faculties.length <= 1) {
      alert('Minimal harus ada 1 Fakultas dalam sistem.');
      return;
    }

    const confirmMsg = prodiCount > 0 
      ? `Fakultas "${facultyName}" menaungi ${prodiCount} program studi dan ${studentCount} mahasiswa. Menghapus fakultas ini akan menyebabkan prodi terkait tidak memiliki induk fakultas. Lanjutkan?`
      : `Hapus Fakultas "${facultyName}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updatedFaculties = academicConfig.faculties.filter(f => f !== facultyName);
      await onSaveConfig({
        ...academicConfig,
        faculties: updatedFaculties,
        updatedAt: Date.now()
      });
      showNotification(`Fakultas "${facultyName}" telah dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus fakultas: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetDefault = async () => {
    if (window.confirm('Kembalikan daftar Fakultas & Program Studi ke standar resmi IAIN Pontianak?')) {
      setIsSaving(true);
      try {
        await onSaveConfig(DEFAULT_ACADEMIC_CONFIG);
        showNotification('Daftar Prodi & Fakultas telah dikembalikan ke standar IAIN Pontianak.');
      } catch (err: any) {
        alert('Gagal mereset: ' + (err.message || 'Error'));
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Manajemen Program Studi & Fakultas
              </h2>
              <span className="text-[11px] bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Cloud className="w-3 h-3 text-emerald-300" />
                Firebase Live
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              Kelola nama Program Studi dan Fakultas resmi IAIN Pontianak. Daftar ini secara otomatis menjadi pilihan dropdown saat admin mengedit atau menambah data mahasiswa serta melakukan import massal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              title="Reset ke daftar prodi & fakultas default IAIN Pontianak"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Standar IAIN
            </button>

            {activeSubTab === 'programs' ? (
              <button
                type="button"
                onClick={handleOpenAddProdi}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                Tambah Program Studi
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddFaculty}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                Tambah Fakultas
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {actionSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fakultas</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{academicConfig.faculties.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Program Studi</p>
            <p className="text-2xl font-black text-emerald-800 mt-0.5">{academicConfig.programs.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mahasiswa Terdata</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{students.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Terakhir Disinkron</p>
            <p className="text-xs font-bold text-slate-700 mt-2">
              {academicConfig.updatedAt ? new Date(academicConfig.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Otomatis'}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation and Search/Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('programs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'programs'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            Program Studi ({academicConfig.programs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('faculties')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'faculties'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-700" />
            Fakultas ({academicConfig.faculties.length})
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={activeSubTab === 'programs' ? 'Cari nama prodi atau fakultas...' : 'Cari nama fakultas...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {activeSubTab === 'programs' && (
            <select
              value={selectedFacultyFilter}
              onChange={e => setSelectedFacultyFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium max-w-[220px]"
            >
              <option value="ALL">Semua Fakultas</option>
              {academicConfig.faculties.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* VIEW 1: PROGRAM STUDI */}
      {activeSubTab === 'programs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">No</th>
                  <th className="px-5 py-3.5">Nama Program Studi</th>
                  <th className="px-5 py-3.5">Fakultas</th>
                  <th className="px-5 py-3.5 text-center">Mahasiswa Aktif</th>
                  <th className="px-5 py-3.5 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrograms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">Tidak ada Program Studi ditemukan</p>
                      <p className="text-[11px] mt-0.5">Coba sesuaikan kata kunci pencarian atau filter fakultas.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPrograms.map((prodi, idx) => {
                    const studentCount = getStudentCountByProdi(prodi.name);
                    return (
                      <tr key={prodi.id} className="hover:bg-slate-50/80 transition group">
                        <td className="px-5 py-3.5 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">{prodi.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {prodi.id}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-semibold border border-emerald-200/60">
                            <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            {prodi.fakultas}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            studentCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Users className="w-3 h-3" />
                            {studentCount} Mahasiswa
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProdi(prodi)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Program Studi"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProdi(prodi)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Program Studi"
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
      )}

      {/* VIEW 2: FAKULTAS */}
      {activeSubTab === 'faculties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaculties.map((facultyName) => {
            const prodisInFaculty = academicConfig.programs.filter(
              p => p.fakultas.trim().toLowerCase() === facultyName.trim().toLowerCase()
            );
            const studentCount = getStudentCountByFaculty(facultyName);

            return (
              <div 
                key={facultyName}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditFaculty(facultyName)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="Edit Nama Fakultas"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaculty(facultyName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Fakultas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-900 transition">
                    {facultyName}
                  </h3>

                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {prodisInFaculty.length} Program Studi
                    </span>
                    <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      {studentCount} Mahasiswa
                    </span>
                  </div>

                  {/* List of sub-prodis preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Daftar Program Studi:
                    </p>
                    {prodisInFaculty.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Belum ada prodi terdaftar</p>
                    ) : (
                      <ul className="space-y-1">
                        {prodisInFaculty.slice(0, 4).map(p => (
                          <li key={p.id} className="text-xs text-slate-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span className="truncate">{p.name}</span>
                          </li>
                        ))}
                        {prodisInFaculty.length > 4 && (
                          <li className="text-[11px] text-slate-400 font-medium pl-3">
                            +{prodisInFaculty.length - 4} prodi lainnya...
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFacultyFilter(facultyName);
                      setActiveSubTab('programs');
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Lihat Semua Prodi ({prodisInFaculty.length}) →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PROGRAM STUDI */}
      {isProdiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingProdi ? 'Edit Program Studi' : 'Tambah Program Studi Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProdiModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProdi} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Program Studi <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodiNameInput}
                  onChange={e => setProdiNameInput(e.target.value)}
                  placeholder="Contoh: Hukum Tatanegara / Pendidikan Agama Islam"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Fakultas Pengampu <span className="text-rose-600">*</span>
                </label>
                <select
                  value={prodiFakultasInput}
                  onChange={e => setProdiFakultasInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {academicConfig.faculties.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilihan fakultas diambil dari daftar fakultas yang tersedia di sistem.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProdiModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Program Studi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT FAKULTAS */}
      {isFacultyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingFaculty ? 'Edit Nama Fakultas' : 'Tambah Fakultas Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFacultyModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Fakultas <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={facultyNameInput}
                  onChange={e => setFacultyNameInput(e.target.value)}
                  placeholder="Contoh: Fakultas Syariah / Fakultas Sains dan Teknologi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {editingFaculty && (
                  <p className="text-[11px] text-amber-700 mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Catatan: Mengubah nama fakultas ini akan otomatis memperbarui seluruh Program Studi yang terhubung ke fakultas ini.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFacultyModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Fakultas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
