import React, { useState, useEffect, useRef } from 'react';
import { Student, KtmTemplateConfig, AdminUser, ALLOWED_ADMIN_EMAILS, AcademicConfig } from './types';
import { DEFAULT_TEMPLATE_CONFIG, INITIAL_STUDENTS, DEFAULT_ACADEMIC_CONFIG } from './data/defaultData';
import { StudentManagement } from './components/StudentManagement';
import { TemplateCustomizer } from './components/TemplateCustomizer';
import { AcademicManagement } from './components/AcademicManagement';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PrintModal } from './components/PrintModal';
import { AdminAuthModal, AdminNavBarBadge } from './components/AdminAuth';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { KtmCard } from './components/KtmCard';
import { 
  auth, 
  db,
  subscribeStudents, 
  subscribeTemplateConfig, 
  subscribeAcademicConfig,
  syncStudentToFirestore,
  deleteStudentFromFirestore, 
  batchSyncStudentsToFirestore, 
  saveTemplateConfigToFirestore, 
  saveAcademicConfigToFirestore,
  seedFirestoreIfEmpty,
  logOut,
  getGoogleAccessToken,
  setGoogleAccessToken,
  signInWithGoogle
} from './lib/firebase';
import {
  findOrCreateDatabaseSpreadsheet,
  verifySpreadsheet,
  createDatabaseSpreadsheet,
  fetchStudentsFromSheet,
  saveAllStudentsToSheet,
  saveSingleStudentToSheet,
  deleteSingleStudentFromSheet,
  fetchTemplateConfigFromSheet,
  saveTemplateConfigToSheet,
  fetchAcademicConfigFromSheet,
  saveAcademicConfigToSheet,
  getSavedSpreadsheetId,
  getSavedSpreadsheetTitle,
  GoogleSpreadsheetInfo
} from './lib/googleSheets';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  Users,
  Printer,
  Palette,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  CreditCard,
  Layers,
  ArrowRight,
  Cloud,
  RefreshCw,
  GraduationCap,
  ExternalLink
} from 'lucide-react';

const STORAGE_STUDENTS_KEY = 'ktm_iain_students_data_v6';
const STORAGE_CONFIG_KEY = 'ktm_iain_template_config_v6';
const STORAGE_ACADEMIC_KEY = 'ktm_iain_academic_meta_v6';
const STORAGE_ADMIN_KEY = 'ktm_iain_admin_session';

export default function App() {
  // Admin authentication state
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADMIN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.isAuthenticated) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      email: 'hasrulrahman@gmail.com',
      name: 'Hasrul Rahman',
      isAuthenticated: true,
      role: 'admin'
    };
  });

  // Students data state
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STUDENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STUDENTS;
  });

  // Template configuration state
  const [config, setConfig] = useState<KtmTemplateConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.signatureUrl?.startsWith('data:image/svg+xml')) {
          parsed.signatureUrl = DEFAULT_TEMPLATE_CONFIG.signatureUrl;
        }
        return { ...DEFAULT_TEMPLATE_CONFIG, ...parsed };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TEMPLATE_CONFIG;
  });

  // Academic metadata state (Prodi & Fakultas)
  const [academicConfig, setAcademicConfig] = useState<AcademicConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACADEMIC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.programs && parsed.faculties) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ACADEMIC_CONFIG;
  });

  // Google Sheets database state
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<GoogleSpreadsheetInfo | null>(() => {
    const savedId = getSavedSpreadsheetId();
    if (savedId) {
      return {
        id: savedId,
        title: getSavedSpreadsheetTitle(),
        webViewLink: `https://docs.google.com/spreadsheets/d/${savedId}/edit`
      };
    }
    return null;
  });
  const [isGoogleSheetsConnected, setIsGoogleSheetsConnected] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);

  // Sync and connection status
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'students' | 'academic' | 'customizer' | 'batch_preview'>('students');

  // Modals state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Keep a reference of students to detect deletions for local state persistence
  const prevStudentsRef = useRef<Student[]>(students);
  useEffect(() => {
    prevStudentsRef.current = students;
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ACADEMIC_KEY, JSON.stringify(academicConfig));
  }, [academicConfig]);

  // Connect & initialize Google Sheets database sync
  const initGoogleSheetsSync = async (token: string, silent = false) => {
    try {
      setIsSyncing(true);
      const info = await findOrCreateDatabaseSpreadsheet(
        token,
        students,
        config,
        academicConfig
      );
      setSpreadsheetInfo(info);
      setIsGoogleSheetsConnected(true);

      // Fetch students from Google Sheet
      try {
        const sheetStudents = await fetchStudentsFromSheet(token, info.id);
        if (sheetStudents && sheetStudents.length > 0) {
          setStudents(sheetStudents);
        } else if (students.length > 0) {
          // Push existing students to initialize empty sheet
          await saveAllStudentsToSheet(token, info.id, students);
        }
      } catch (err) {
        console.warn('Google Sheet students initial load notice:', err);
      }

      // Fetch template config from Google Sheet
      try {
        const sheetConfig = await fetchTemplateConfigFromSheet(token, info.id);
        if (sheetConfig && sheetConfig.institutionName) {
          setConfig((prev) => ({ ...prev, ...sheetConfig }));
        }
      } catch (err) {
        console.warn('Google Sheet config initial load notice:', err);
      }

      // Fetch academic config from Google Sheet
      try {
        const sheetAcademic = await fetchAcademicConfigFromSheet(token, info.id);
        if (sheetAcademic && sheetAcademic.faculties && sheetAcademic.faculties.length > 0) {
          setAcademicConfig(sheetAcademic);
        }
      } catch (err) {
        console.warn('Google Sheet academic initial load notice:', err);
      }

      if (!silent) {
        showToast(`Database Google Sheet terhubung: "${info.title}"`);
      }
    } catch (err: any) {
      console.warn('Notice initializing Google Sheets sync:', err);
      if (!silent) {
        showToast(`Google Sheets: ${err.message || 'Perlu otentikasi Google'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect Google account & Google Sheets
  const handleConnectGoogle = async () => {
    try {
      setIsSyncing(true);
      const res = await signInWithGoogle();
      if (res.accessToken) {
        setGoogleAccessToken(res.accessToken);
        await initGoogleSheetsSync(res.accessToken);
      }
    } catch (err: any) {
      console.error('Failed to connect Google Sheets:', err);
      showToast(`Gagal menghubungkan Google: ${err.message || 'Error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull latest data directly from Google Sheet
  const handlePullFromSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }
    if (!spreadsheetInfo) {
      throw new Error('Belum ada Spreadsheet yang dipilih.');
    }

    setIsSyncing(true);
    try {
      const sheetStudents = await fetchStudentsFromSheet(token, spreadsheetInfo.id);
      if (sheetStudents) {
        setStudents(sheetStudents);
      }
      const sheetConfig = await fetchTemplateConfigFromSheet(token, spreadsheetInfo.id);
      if (sheetConfig) {
        setConfig((prev) => ({ ...prev, ...sheetConfig }));
      }
      const sheetAcademic = await fetchAcademicConfigFromSheet(token, spreadsheetInfo.id);
      if (sheetAcademic) {
        setAcademicConfig(sheetAcademic);
      }
      setSpreadsheetInfo((prev) => prev ? { ...prev, lastSyncedAt: Date.now() } : null);
      showToast('Data berhasil dimuat ulang langsung dari Google Sheet!');
    } catch (err: any) {
      console.error('Error pulling from Google Sheet:', err);
      showToast(`Gagal memuat dari Google Sheet: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Push all local data to Google Sheet
  const handlePushToSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }
    if (!spreadsheetInfo) {
      throw new Error('Belum ada Spreadsheet yang dipilih.');
    }

    setIsSyncing(true);
    try {
      await saveAllStudentsToSheet(token, spreadsheetInfo.id, students);
      await saveTemplateConfigToSheet(token, spreadsheetInfo.id, config);
      await saveAcademicConfigToSheet(token, spreadsheetInfo.id, academicConfig);
      setSpreadsheetInfo((prev) => prev ? { ...prev, lastSyncedAt: Date.now() } : null);
      showToast('Seluruh data berhasil disimpan dan disinkronkan ke Google Sheet!');
    } catch (err: any) {
      console.error('Error pushing to Google Sheet:', err);
      showToast(`Gagal mengirim ke Google Sheet: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Create a brand new Google Spreadsheet
  const handleCreateNewSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }

    setIsSyncing(true);
    try {
      const newInfo = await createDatabaseSpreadsheet(
        token,
        `Database KTM IAIN Pontianak (${new Date().toLocaleDateString('id-ID')})`,
        students,
        config,
        academicConfig
      );
      setSpreadsheetInfo(newInfo);
      setIsGoogleSheetsConnected(true);
      showToast(`Database baru "${newInfo.title}" berhasil dibuat di Google Drive!`);
    } catch (err: any) {
      console.error('Error creating new sheet:', err);
      showToast(`Gagal membuat Sheet baru: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Link existing spreadsheet by URL or ID
  const handleLinkExistingSheet = async (input: string) => {
    const token = getGoogleAccessToken();
    if (!token) {
      await handleConnectGoogle();
      return;
    }

    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const targetId = match ? match[1] : input.trim();
    if (!targetId) throw new Error('Format ID atau URL Spreadsheet tidak valid.');

    setIsSyncing(true);
    try {
      const info = await verifySpreadsheet(token, targetId);
      setSpreadsheetInfo(info);
      setIsGoogleSheetsConnected(true);

      // Pull data from newly linked sheet
      const sheetStudents = await fetchStudentsFromSheet(token, info.id);
      if (sheetStudents && sheetStudents.length > 0) {
        setStudents(sheetStudents);
      }
      showToast(`Berhasil menghubungkan Spreadsheet: "${info.title}"`);
    } catch (err: any) {
      console.error('Error linking sheet:', err);
      showToast(`Gagal menghubungkan Sheet: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || 'hasrulrahman@gmail.com';
        const isOfficialAdmin = ALLOWED_ADMIN_EMAILS.some(
          (e) => e.toLowerCase() === email.toLowerCase()
        );

        const adminObj: AdminUser = {
          email,
          name: firebaseUser.displayName || (email.includes('hasrul') ? 'Hasrul Rahman' : email.split('@')[0]),
          isAuthenticated: true,
          role: 'admin'
        };

        setCurrentUser(adminObj);
        localStorage.setItem(STORAGE_ADMIN_KEY, JSON.stringify(adminObj));

        // Save user profile to Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: adminObj.name,
            role: isOfficialAdmin ? 'admin' : 'operator',
            lastLogin: Date.now()
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore user profile sync:', err);
        }

        // If Google access token is present, initialize Sheets sync
        const token = getGoogleAccessToken();
        if (token) {
          initGoogleSheetsSync(token, true);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // Real-time synchronization with Firestore (backup)
  useEffect(() => {
    setIsSyncing(true);

    const unsubStudents = subscribeStudents(
      (cloudStudents) => {
        setIsSyncing(false);
        setIsCloudConnected(true);
        if (cloudStudents && cloudStudents.length > 0) {
          // If Google Sheets is not actively controlling or local is empty, populate
          if (!isGoogleSheetsConnected) {
            setStudents(cloudStudents);
          }
        } else {
          seedFirestoreIfEmpty(INITIAL_STUDENTS, DEFAULT_TEMPLATE_CONFIG).then((seeded) => {
            if (seeded && !isGoogleSheetsConnected) {
              setStudents(INITIAL_STUDENTS);
            }
          });
        }
      },
      (err) => {
        setIsSyncing(false);
        console.warn('Firebase students sync notice:', err);
      }
    );

    const unsubConfig = subscribeTemplateConfig(
      (cloudConfig) => {
        if (cloudConfig && cloudConfig.institutionName && !isGoogleSheetsConnected) {
          setConfig((prev) => ({ ...prev, ...cloudConfig }));
        }
      },
      (err) => {
        console.warn('Firebase config sync notice:', err);
      }
    );

    const unsubAcademic = subscribeAcademicConfig(
      (cloudAcademic) => {
        if (cloudAcademic && cloudAcademic.programs && cloudAcademic.programs.length > 0 && !isGoogleSheetsConnected) {
          setAcademicConfig(cloudAcademic);
        }
      },
      (err) => {
        console.warn('Firebase academic config sync notice:', err);
      }
    );

    return () => {
      unsubStudents();
      unsubConfig();
      unsubAcademic();
    };
  }, [isGoogleSheetsConnected]);

  const handleLoginSuccess = async (user: AdminUser) => {
    setCurrentUser(user);
    showToast(`Selamat datang kembali, ${user.name}`);
    const token = getGoogleAccessToken();
    if (token) {
      await initGoogleSheetsSync(token);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error(e);
    }
    setGoogleAccessToken(null);
    setIsGoogleSheetsConnected(false);
    localStorage.removeItem(STORAGE_ADMIN_KEY);
    setCurrentUser(null);
  };

  // Central student updater that syncs changes to Google Sheets & Firestore
  const handleUpdateStudents = async (updatedStudents: Student[]) => {
    const prevList = prevStudentsRef.current;
    setStudents(updatedStudents);

    const newIds = new Set(updatedStudents.map(s => s.id));
    const deletedIds = prevList.filter(s => !newIds.has(s.id)).map(s => s.id);

    try {
      setIsSyncing(true);
      // Sync to Google Sheet if connected
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        await saveAllStudentsToSheet(token, spreadsheetInfo.id, updatedStudents);
      }

      // Sync to Firestore
      for (const id of deletedIds) {
        await deleteStudentFromFirestore(id);
      }
      await batchSyncStudentsToFirestore(updatedStudents);
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Update sync warning:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct single student save to Google Sheet & Firestore
  const handleSaveSingleStudent = async (student: Student, isNew: boolean): Promise<void> => {
    try {
      setIsSyncing(true);
      setStudents((prev) => {
        if (isNew) {
          return [student, ...prev];
        }
        return prev.map((s) => (s.id === student.id ? student : s));
      });

      // Save to Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        try {
          await saveSingleStudentToSheet(token, spreadsheetInfo.id, student);
        } catch (sheetErr: any) {
          console.warn('Google Sheet student save warning:', sheetErr);
        }
      }

      // Save to Firestore
      await syncStudentToFirestore(student);
      setIsCloudConnected(true);
      showToast(`Data mahasiswa ${student.nama} (${student.nim}) berhasil disimpan ke Google Sheet!`);
    } catch (err: any) {
      console.error('Error saving student:', err);
      showToast(`Gagal menyimpan: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct single student deletion from Google Sheet & Firestore
  const handleDeleteSingleStudent = async (studentId: string, studentName: string): Promise<void> => {
    try {
      setIsSyncing(true);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));

      // Delete from Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        try {
          await deleteSingleStudentFromSheet(token, spreadsheetInfo.id, studentId);
        } catch (sheetErr: any) {
          console.warn('Google Sheet student delete warning:', sheetErr);
        }
      }

      // Delete from Firestore
      await deleteStudentFromFirestore(studentId);
      setIsCloudConnected(true);
      showToast(`Data mahasiswa ${studentName} berhasil dihapus.`);
    } catch (err: any) {
      console.error('Error deleting student:', err);
      showToast(`Gagal menghapus: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct bulk students update saved to Google Sheet & Firestore
  const handleBulkUpdateStudents = async (updatedStudents: Student[]): Promise<void> => {
    try {
      setIsSyncing(true);
      setStudents(updatedStudents);

      // Save to Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        await saveAllStudentsToSheet(token, spreadsheetInfo.id, updatedStudents);
      }

      // Save to Firestore
      await batchSyncStudentsToFirestore(updatedStudents);
      setIsCloudConnected(true);
      showToast(`Berhasil memperbarui ${updatedStudents.length} data mahasiswa di Google Sheet!`);
    } catch (err: any) {
      console.error('Error bulk updating students:', err);
      showToast(`Gagal memperbarui massal: ${err.message || 'Error'}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportComplete = async (newStudents: Student[], mode: 'append' | 'replace') => {
    let combined: Student[];
    if (mode === 'replace') {
      combined = newStudents;
      setStudents(newStudents);
      showToast(`Berhasil mengganti data dengan ${newStudents.length} mahasiswa dari Excel & sinkron ke Google Sheet`);
    } else {
      combined = [...newStudents, ...students];
      setStudents(combined);
      showToast(`Berhasil menambahkan ${newStudents.length} mahasiswa baru & sinkron ke Google Sheet`);
    }

    try {
      setIsSyncing(true);
      // Sync to Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        await saveAllStudentsToSheet(token, spreadsheetInfo.id, combined);
      }
      // Sync to Firestore
      await batchSyncStudentsToFirestore(combined);
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Batch sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateConfig = async (newConfig: KtmTemplateConfig) => {
    setConfig(newConfig);
    try {
      // Save to Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        await saveTemplateConfigToSheet(token, spreadsheetInfo.id, newConfig);
      }
      // Save to Firestore
      await saveTemplateConfigToFirestore(newConfig);
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Save config notice:', err);
    }
  };

  const handleSaveAcademicConfig = async (newAcademicConfig: AcademicConfig) => {
    setAcademicConfig(newAcademicConfig);
    try {
      setIsSyncing(true);
      // Save to Google Sheet
      const token = getGoogleAccessToken();
      if (token && spreadsheetInfo) {
        await saveAcademicConfigToSheet(token, spreadsheetInfo.id, newAcademicConfig);
      }
      // Save to Firestore
      await saveAcademicConfigToFirestore(newAcademicConfig);
      setIsCloudConnected(true);
      showToast('Data Program Studi & Fakultas berhasil disimpan & disinkronkan ke Google Sheet!');
    } catch (err: any) {
      console.error('Error saving academic config:', err);
      showToast(`Status: ${err.message || 'Error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenBatchPrint = (selected: Student[]) => {
    if (selected.length === 0) {
      alert('Pilih minimal satu data mahasiswa untuk dicetak!');
      return;
    }
    setStudentsToPrint(selected);
    setIsPrintModalOpen(true);
  };

  const handleResetData = async () => {
    if (window.confirm('Kembalikan ke data contoh awal IAIN Pontianak? Data kustom saat ini akan digantikan dan disinkronkan ke Google Sheet.')) {
      setStudents(INITIAL_STUDENTS);
      setConfig(DEFAULT_TEMPLATE_CONFIG);
      try {
        setIsSyncing(true);
        const token = getGoogleAccessToken();
        if (token && spreadsheetInfo) {
          await saveAllStudentsToSheet(token, spreadsheetInfo.id, INITIAL_STUDENTS);
          await saveTemplateConfigToSheet(token, spreadsheetInfo.id, DEFAULT_TEMPLATE_CONFIG);
        }
        await batchSyncStudentsToFirestore(INITIAL_STUDENTS);
        await saveTemplateConfigToFirestore(DEFAULT_TEMPLATE_CONFIG);
        showToast('Data dan template berhasil direset ke standar IAIN Pontianak & disinkronkan ke Google Sheet');
      } catch (err) {
        console.warn('Reset sync notice:', err);
        showToast('Data dan template berhasil direset secara lokal');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // If not logged in as authorized admin, block with authentication screen
  if (!currentUser || !currentUser.isAuthenticated) {
    return (
      <AdminAuthModal
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white border border-emerald-500/50 shadow-2xl px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP CAMPUS HEADER BAR */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white border-b border-emerald-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white p-1 rounded-xl shadow border border-amber-400/40 flex items-center justify-center shrink-0">
              <img
                src={config.logoUrl}
                alt="Logo Kampus"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                  Cetak KTM Otomatis
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-amber-400 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IAIN Pontianak
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Sistem Cetak Kartu Tanda Mahasiswa Massal • Database Google Sheets
              </p>
            </div>
          </div>

          {/* Admin User Badge & Actions */}
          <div className="flex items-center gap-3">
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Menyinkronkan...</span>
              </div>
            )}
            <AdminNavBarBadge 
              user={currentUser} 
              isCloudConnected={isCloudConnected}
              isGoogleSheetsConnected={isGoogleSheetsConnected}
              spreadsheetTitle={spreadsheetInfo?.title}
              onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
              onLogout={handleLogout} 
            />
          </div>
        </div>

        {/* GOOGLE SHEETS ACTIVE DATABASE BAR */}
        <div className="bg-emerald-900/90 border-t border-emerald-800/80 text-white px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-white">Database:</span>
                <span className="bg-emerald-700/80 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-100">
                  Google Sheets
                </span>
                {spreadsheetInfo ? (
                  <span className="text-emerald-200 font-medium text-[11px]">
                    — {spreadsheetInfo.title}
                  </span>
                ) : (
                  <span className="text-amber-300 font-medium text-[11px]">
                    (Belum tersambung)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {spreadsheetInfo && (
                <a
                  href={spreadsheetInfo.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white rounded-lg text-xs font-semibold transition"
                  title="Buka live Google Sheet di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Buka Sheet ↗</span>
                </a>
              )}

              {isGoogleSheetsConnected ? (
                <button
                  type="button"
                  onClick={handlePullFromSheet}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                  title="Muat ulang data terbaru dari Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Tarik Data Sheet
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Hubungkan Google Sheet
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950 hover:bg-black text-emerald-100 rounded-lg text-xs font-semibold transition border border-emerald-700/60"
              >
                Pengaturan Database
              </button>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS BAR */}
        <div className="bg-emerald-950/95 border-t border-emerald-800/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Data Mahasiswa ({students.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('academic')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'academic'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Manajemen Prodi & Fakultas
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customizer')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'customizer'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Palette className="w-4 h-4" />
                Kustomisasi Desain & Logo
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('batch_preview')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'batch_preview'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Katalog & Cetak Massal
              </button>
            </div>

            {/* Quick Action Button */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Import Excel Massal
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* TAB 1: DATA MAHASISWA */}
        {activeTab === 'students' && (
          <StudentManagement
            students={students}
            config={config}
            academicConfig={academicConfig}
            spreadsheetInfo={spreadsheetInfo}
            isGoogleSheetsConnected={isGoogleSheetsConnected}
            isSyncing={isSyncing}
            onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
            onReloadFromSheet={handlePullFromSheet}
            onUpdateStudents={handleUpdateStudents}
            onSaveSingleStudent={handleSaveSingleStudent}
            onDeleteSingleStudent={handleDeleteSingleStudent}
            onBulkUpdateStudents={handleBulkUpdateStudents}
            onOpenExcelImport={() => setIsExcelModalOpen(true)}
            onOpenBatchPrint={handleOpenBatchPrint}
            onOpenAcademicManagement={() => setActiveTab('academic')}
          />
        )}

        {/* TAB 2: MANAJEMEN PRODI & FAKULTAS */}
        {activeTab === 'academic' && (
          <AcademicManagement
            config={academicConfig}
            onSave={handleSaveAcademicConfig}
          />
        )}

        {/* TAB 3: KUSTOMISASI DESAIN & LOGO */}
        {activeTab === 'customizer' && (
          <TemplateCustomizer
            config={config}
            sampleStudent={students[0] || INITIAL_STUDENTS[0]}
            onChangeConfig={handleUpdateConfig}
            onResetToDefault={() => {
              handleUpdateConfig(DEFAULT_TEMPLATE_CONFIG);
              showToast('Template dikembalikan ke desain standar IAIN Pontianak');
            }}
          />
        )}

        {/* TAB 4: KATALOG & CETAK MASSAL */}
        {activeTab === 'batch_preview' && (
          <div className="space-y-6">
            {/* Action Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Batch Print Automation
                </span>
                <h2 className="text-xl font-black tracking-tight">
                  Katalog Cetak Massal KTM ({students.length} Mahasiswa)
                </h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  Pratinjau seluruh kartu mahasiswa yang siap diekspor ke dokumen PDF siap cetak.
                  Mendukung cetak Duplex kartu PVC (CR80) atau susunan 8 kartu per lembar kertas A4 dengan tanda potong.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenBatchPrint(students)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg hover:shadow-emerald-500/20"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  Cetak Semua ({students.length} KTM) ke PDF
                </button>
              </div>
            </div>

            {/* Grid of All Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {students.map(student => (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{student.nama}</p>
                      <p className="text-xs font-mono font-bold text-emerald-800">
                        NIM: {student.nim}
                      </p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                      Angkatan {student.angkatan}
                    </span>
                  </div>

                  <div className="flex justify-center overflow-x-auto py-2">
                    <KtmCard student={student} config={config} side="front" scale={0.78} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-xs text-slate-600 font-medium truncate max-w-[240px]">
                      {student.prodi}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenBatchPrint([student])}
                      className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 text-xs font-bold hover:underline"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak Kartu Ini
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              {config.institutionName}
            </p>
            <p className="text-[11px] text-slate-400">
              {config.address} • Website:{' '}
              <a
                href={`https://${config.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline"
              >
                {config.website}
              </a>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetData}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline"
            >
              Reset Data Awal
            </button>
            <span className="text-slate-700">|</span>
            <span className="text-[11px] font-mono text-emerald-400">
              Admin: {currentUser.email}
            </span>
          </div>
        </div>
      </footer>

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportComplete={handleImportComplete}
        existingCount={students.length}
      />

      {/* BATCH PRINT MODAL */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        studentsToPrint={studentsToPrint}
        config={config}
      />

      {/* GOOGLE SHEETS MANAGEMENT MODAL */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        spreadsheetInfo={spreadsheetInfo}
        isConnected={isGoogleSheetsConnected}
        isSyncing={isSyncing}
        onConnectGoogle={handleConnectGoogle}
        onPullFromSheet={handlePullFromSheet}
        onPushToSheet={handlePushToSheet}
        onCreateNewSheet={handleCreateNewSheet}
        onLinkExistingSheet={handleLinkExistingSheet}
      />
    </div>
  );
}
