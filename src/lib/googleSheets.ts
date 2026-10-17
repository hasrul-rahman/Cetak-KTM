import { Student, KtmTemplateConfig, AcademicConfig } from '../types';
import { DEFAULT_TEMPLATE_CONFIG, INITIAL_STUDENTS, DEFAULT_ACADEMIC_CONFIG } from '../data/defaultData';

export const STORAGE_SHEET_ID_KEY = 'ktm_google_sheets_id';
export const STORAGE_SHEET_TITLE_KEY = 'ktm_google_sheets_title';
export const STORAGE_SHEET_LAST_SYNC_KEY = 'ktm_google_sheets_last_sync';

export interface GoogleSpreadsheetInfo {
  id: string;
  title: string;
  webViewLink: string;
  lastSyncedAt?: number;
}

const DEFAULT_DB_TITLE = 'Database KTM IAIN Pontianak';
const STUDENT_SHEET_NAME = 'Mahasiswa';
const TEMPLATE_SHEET_NAME = 'Template KTM';
const ACADEMIC_SHEET_NAME = 'Akademik';

const STUDENT_HEADERS = [
  'ID',
  'NIM',
  'Nama Lengkap',
  'Program Studi',
  'Fakultas',
  'Angkatan',
  'Jenis Kelamin',
  'Tempat Tanggal Lahir',
  'Alamat',
  'Masa Berlaku',
  'Foto URL / Data',
  'Dibuat Pada',
  'Diperbarui Pada'
];

/**
 * Perform authenticated request to Google APIs
 */
async function fetchGoogleApi(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`Google API [${response.status}]: ${errorDetail || response.statusText}`);
  }
  return response.json();
}

/**
 * Get stored spreadsheet ID from local storage
 */
export function getSavedSpreadsheetId(): string | null {
  return localStorage.getItem(STORAGE_SHEET_ID_KEY);
}

/**
 * Set stored spreadsheet ID in local storage
 */
export function setSavedSpreadsheetId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_SHEET_ID_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_SHEET_ID_KEY);
  }
}

/**
 * Get stored spreadsheet title
 */
export function getSavedSpreadsheetTitle(): string {
  return localStorage.getItem(STORAGE_SHEET_TITLE_KEY) || DEFAULT_DB_TITLE;
}

/**
 * Set stored spreadsheet title
 */
export function setSavedSpreadsheetTitle(title: string) {
  localStorage.setItem(STORAGE_SHEET_TITLE_KEY, title);
}

/**
 * Format student object to Google Sheet row array
 */
function studentToRow(std: Student): (string | number)[] {
  return [
    std.id,
    std.nim,
    std.nama,
    std.prodi,
    std.fakultas,
    std.angkatan,
    std.jenisKelamin || 'L',
    std.tempatTanggalLahir || '',
    std.alamat || '',
    std.berlakuHingga || 'Selama Menjadi Mahasiswa',
    std.foto || '',
    std.createdAt ? new Date(std.createdAt).toISOString() : new Date().toISOString(),
    std.updatedAt ? new Date(std.updatedAt).toISOString() : new Date().toISOString()
  ];
}

/**
 * Convert sheet row array back to student object
 */
function rowToStudent(row: any[]): Student | null {
  if (!row || row.length === 0 || !row[0] && !row[1]) return null;

  const id = String(row[0] || `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const nim = String(row[1] || '').trim();
  const nama = String(row[2] || '').trim();
  if (!nim && !nama) return null;

  let createdAt = Date.now();
  if (row[11]) {
    const parsed = Date.parse(row[11]);
    if (!isNaN(parsed)) createdAt = parsed;
  }

  let updatedAt = createdAt;
  if (row[12]) {
    const parsed = Date.parse(row[12]);
    if (!isNaN(parsed)) updatedAt = parsed;
  }

  return {
    id,
    nim,
    nama,
    prodi: String(row[3] || 'Pendidikan Agama Islam'),
    fakultas: String(row[4] || 'Fakultas Tarbiyah dan Ilmu Keguruan'),
    angkatan: String(row[5] || '2024'),
    jenisKelamin: (row[6] === 'P' || row[6] === 'Perempuan' ? 'P' : 'L'),
    tempatTanggalLahir: String(row[7] || ''),
    alamat: String(row[8] || ''),
    berlakuHingga: String(row[9] || 'Selama Menjadi Mahasiswa'),
    foto: row[10] ? String(row[10]) : undefined,
    createdAt,
    updatedAt
  };
}

/**
 * Verify if the given spreadsheet exists and has required sheets
 */
export async function verifySpreadsheet(accessToken: string, spreadsheetId: string): Promise<GoogleSpreadsheetInfo> {
  const meta = await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
    accessToken
  );

  const existingSheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);
  const requests: any[] = [];

  if (!existingSheetTitles.includes(STUDENT_SHEET_NAME)) {
    requests.push({ addSheet: { properties: { title: STUDENT_SHEET_NAME } } });
  }
  if (!existingSheetTitles.includes(TEMPLATE_SHEET_NAME)) {
    requests.push({ addSheet: { properties: { title: TEMPLATE_SHEET_NAME } } });
  }
  if (!existingSheetTitles.includes(ACADEMIC_SHEET_NAME)) {
    requests.push({ addSheet: { properties: { title: ACADEMIC_SHEET_NAME } } });
  }

  if (requests.length > 0) {
    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests })
      }
    );
  }

  const title = meta.properties?.title || DEFAULT_DB_TITLE;
  setSavedSpreadsheetId(spreadsheetId);
  setSavedSpreadsheetTitle(title);

  return {
    id: spreadsheetId,
    title,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    lastSyncedAt: Date.now()
  };
}

/**
 * Create a brand new Google Spreadsheet configured as the KTM Database
 */
export async function createDatabaseSpreadsheet(
  accessToken: string,
  customTitle: string = DEFAULT_DB_TITLE,
  initialStudents: Student[] = INITIAL_STUDENTS,
  initialConfig: KtmTemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  initialAcademic: AcademicConfig = DEFAULT_ACADEMIC_CONFIG
): Promise<GoogleSpreadsheetInfo> {
  const newSheet = await fetchGoogleApi(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: customTitle
        },
        sheets: [
          { properties: { title: STUDENT_SHEET_NAME, gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: TEMPLATE_SHEET_NAME, gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: ACADEMIC_SHEET_NAME, gridProperties: { frozenRowCount: 1 } } }
        ]
      })
    }
  );

  const spreadsheetId = newSheet.spreadsheetId;

  // Initialize Headers and initial content
  const studentRows = [
    STUDENT_HEADERS,
    ...initialStudents.map(studentToRow)
  ];

  const templateRows = [
    ['Parameter', 'Nilai', 'Keterangan'],
    ['institutionName', initialConfig.institutionName || 'IAIN Pontianak', 'Nama Lembaga'],
    ['ministryName', initialConfig.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', 'Kementerian'],
    ['cardTitle', initialConfig.cardTitle || 'KARTU TANDA MAHASISWA', 'Judul Kartu'],
    ['address', initialConfig.address || 'Jl. Letjend Soeprapto No.19, Pontianak, Kalimantan Barat', 'Alamat Kampus'],
    ['website', initialConfig.website || 'https://iainptk.ac.id', 'Website Kampus'],
    ['phone', initialConfig.phone || '(0561) 734260', 'Telepon'],
    ['logoUrl', initialConfig.logoUrl || '', 'URL / Logo Institusi'],
    ['themePreset', initialConfig.themePreset || 'emerald', 'Tema Visual (emerald/modern/gold/custom)'],
    ['primaryColor', initialConfig.primaryColor || '#064e3b', 'Warna Primer'],
    ['accentColor', initialConfig.accentColor || '#f59e0b', 'Warna Aksen'],
    ['textColor', initialConfig.textColor || '#ffffff', 'Warna Teks Header'],
    ['showChip', initialConfig.showChip ? 'TRUE' : 'FALSE', 'Tampilkan Chip'],
    ['showHologram', initialConfig.showHologram ? 'TRUE' : 'FALSE', 'Tampilkan Hologram'],
    ['codeType', initialConfig.codeType || 'both', 'Format Kode (qr/barcode/both/none)'],
    ['rektorName', initialConfig.rektorName || 'Prof. Dr. H. Syarif, S.Ag., MA.', 'Nama Pimpinan'],
    ['rektorNip', initialConfig.rektorNip || '197103151998031003', 'NIP Pimpinan'],
    ['rektorTitle', initialConfig.rektorTitle || 'Rektor IAIN Pontianak', 'Jabatan Pimpinan'],
    ['signatureUrl', initialConfig.signatureUrl || '', 'Tanda Tangan Elektronik'],
    ['stampUrl', initialConfig.stampUrl || '', 'Stempel Resmi'],
    ['terms', JSON.stringify(initialConfig.terms || []), 'Ketentuan Kartu (JSON Array)']
  ];

  const academicRows = [
    ['Tipe', 'ID', 'Nama', 'Fakultas']
  ];
  initialAcademic.faculties.forEach((f) => {
    academicRows.push(['FAKULTAS', f, f, '-']);
  });
  initialAcademic.programs.forEach((p) => {
    academicRows.push(['PRODI', p.id, p.name, p.fakultas]);
  });

  // Batch populate initial data
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${STUDENT_SHEET_NAME}!A1:M${studentRows.length}`, values: studentRows },
          { range: `${TEMPLATE_SHEET_NAME}!A1:C${templateRows.length}`, values: templateRows },
          { range: `${ACADEMIC_SHEET_NAME}!A1:D${academicRows.length}`, values: academicRows }
        ]
      })
    }
  );

  setSavedSpreadsheetId(spreadsheetId);
  setSavedSpreadsheetTitle(customTitle);

  return {
    id: spreadsheetId,
    title: customTitle,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    lastSyncedAt: Date.now()
  };
}

/**
 * Search Google Drive for an existing database spreadsheet, or create one if none found
 */
export async function findOrCreateDatabaseSpreadsheet(
  accessToken: string,
  initialStudents: Student[] = INITIAL_STUDENTS,
  initialConfig: KtmTemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  initialAcademic: AcademicConfig = DEFAULT_ACADEMIC_CONFIG
): Promise<GoogleSpreadsheetInfo> {
  const savedId = getSavedSpreadsheetId();
  if (savedId) {
    try {
      const verified = await verifySpreadsheet(accessToken, savedId);
      return verified;
    } catch (e) {
      console.warn('Saved spreadsheet not accessible, searching Drive...', e);
    }
  }

  // Search Drive for file with default title
  try {
    const q = `name='${DEFAULT_DB_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const searchRes = await fetchGoogleApi(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=1`,
      accessToken
    );

    if (searchRes.files && searchRes.files.length > 0) {
      const file = searchRes.files[0];
      const verified = await verifySpreadsheet(accessToken, file.id);
      return verified;
    }
  } catch (err) {
    console.warn('Drive search error, proceeding to create new sheet:', err);
  }

  // Create brand new sheet
  return await createDatabaseSpreadsheet(
    accessToken,
    DEFAULT_DB_TITLE,
    initialStudents,
    initialConfig,
    initialAcademic
  );
}

/**
 * Fetch all students from Google Sheet
 */
export async function fetchStudentsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Student[]> {
  try {
    const res = await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A2:M10000`,
      accessToken
    );

    const rows: any[][] = res.values || [];
    const students: Student[] = [];

    for (const row of rows) {
      const std = rowToStudent(row);
      if (std) students.push(std);
    }

    // Sort descending by creation date
    students.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return students;
  } catch (err: any) {
    console.error('Error fetching students from Google Sheet:', err);
    throw err;
  }
}

/**
 * Save / Replace all students in Google Sheet
 */
export async function saveAllStudentsToSheet(
  accessToken: string,
  spreadsheetId: string,
  students: Student[]
): Promise<void> {
  // Clear existing student rows starting from row 2
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A2:M10000:clear`,
    accessToken,
    { method: 'POST' }
  );

  // Ensure header exists
  const headerRes = await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A1:M1`,
    accessToken
  );
  if (!headerRes.values || headerRes.values.length === 0) {
    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A1:M1?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [STUDENT_HEADERS] })
      }
    );
  }

  if (students.length === 0) return;

  const rows = students.map(studentToRow);
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A2:M${rows.length + 1}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows })
    }
  );
}

/**
 * Upsert a single student to Google Sheet
 */
export async function saveSingleStudentToSheet(
  accessToken: string,
  spreadsheetId: string,
  student: Student
): Promise<void> {
  // 1. Fetch column A (IDs) to check if student already exists
  const idRes = await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A2:A10000`,
    accessToken
  );

  const existingIds: string[] = (idRes.values || []).map((r: any[]) => String(r[0] || ''));
  const rowIndex = existingIds.findIndex((id) => id === student.id);
  const rowData = studentToRow(student);

  if (rowIndex >= 0) {
    // Row numbers are 1-based, and data starts at row 2
    const targetRow = rowIndex + 2;
    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A${targetRow}:M${targetRow}?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [rowData] })
      }
    );
  } else {
    // Append row
    await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(STUDENT_SHEET_NAME)}!A:M:append?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ values: [rowData] })
      }
    );
  }
}

/**
 * Delete a single student from Google Sheet
 */
export async function deleteSingleStudentFromSheet(
  accessToken: string,
  spreadsheetId: string,
  studentId: string
): Promise<void> {
  // Read all students, filter out the student, then write back cleanly
  const allStudents = await fetchStudentsFromSheet(accessToken, spreadsheetId);
  const filtered = allStudents.filter((s) => s.id !== studentId);
  await saveAllStudentsToSheet(accessToken, spreadsheetId, filtered);
}

/**
 * Fetch template configuration from Google Sheet
 */
export async function fetchTemplateConfigFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Partial<KtmTemplateConfig> | null> {
  try {
    const res = await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(TEMPLATE_SHEET_NAME)}!A2:B35`,
      accessToken
    );

    const rows: string[][] = res.values || [];
    if (rows.length === 0) return null;

    const parsed: Partial<KtmTemplateConfig> = {};
    for (const [key, val] of rows) {
      if (!key) continue;
      if (key === 'showChip' || key === 'showHologram') {
        (parsed as any)[key] = val?.toUpperCase() === 'TRUE' || val === '1';
      } else if (key === 'terms') {
        try {
          (parsed as any)[key] = JSON.parse(val);
        } catch {
          (parsed as any)[key] = DEFAULT_TEMPLATE_CONFIG.terms;
        }
      } else {
        (parsed as any)[key] = val;
      }
    }
    return parsed;
  } catch (err) {
    console.warn('Notice fetching template from Google Sheet:', err);
    return null;
  }
}

/**
 * Save template configuration to Google Sheet
 */
export async function saveTemplateConfigToSheet(
  accessToken: string,
  spreadsheetId: string,
  config: KtmTemplateConfig
): Promise<void> {
  const templateRows = [
    ['Parameter', 'Nilai', 'Keterangan'],
    ['institutionName', config.institutionName || 'IAIN Pontianak', 'Nama Lembaga'],
    ['ministryName', config.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', 'Kementerian'],
    ['cardTitle', config.cardTitle || 'KARTU TANDA MAHASISWA', 'Judul Kartu'],
    ['address', config.address || '', 'Alamat Kampus'],
    ['website', config.website || '', 'Website Kampus'],
    ['phone', config.phone || '', 'Telepon'],
    ['logoUrl', config.logoUrl || '', 'URL / Logo Institusi'],
    ['themePreset', config.themePreset || 'emerald', 'Tema Visual (emerald/modern/gold/custom)'],
    ['primaryColor', config.primaryColor || '#064e3b', 'Warna Primer'],
    ['accentColor', config.accentColor || '#f59e0b', 'Warna Aksen'],
    ['textColor', config.textColor || '#ffffff', 'Warna Teks Header'],
    ['showChip', config.showChip ? 'TRUE' : 'FALSE', 'Tampilkan Chip'],
    ['showHologram', config.showHologram ? 'TRUE' : 'FALSE', 'Tampilkan Hologram'],
    ['codeType', config.codeType || 'both', 'Format Kode (qr/barcode/both/none)'],
    ['rektorName', config.rektorName || '', 'Nama Pimpinan'],
    ['rektorNip', config.rektorNip || '', 'NIP Pimpinan'],
    ['rektorTitle', config.rektorTitle || '', 'Jabatan Pimpinan'],
    ['signatureUrl', config.signatureUrl || '', 'Tanda Tangan Elektronik'],
    ['stampUrl', config.stampUrl || '', 'Stempel Resmi'],
    ['terms', JSON.stringify(config.terms || []), 'Ketentuan Kartu (JSON Array)']
  ];

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(TEMPLATE_SHEET_NAME)}!A1:C${templateRows.length}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: templateRows })
    }
  );
}

/**
 * Fetch academic metadata from Google Sheet
 */
export async function fetchAcademicConfigFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<AcademicConfig | null> {
  try {
    const res = await fetchGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ACADEMIC_SHEET_NAME)}!A2:D200`,
      accessToken
    );

    const rows: string[][] = res.values || [];
    if (rows.length === 0) return null;

    const faculties: string[] = [];
    const programs: { id: string; name: string; fakultas: string }[] = [];

    for (const [type, id, name, fakultas] of rows) {
      if (type === 'FAKULTAS' && name && !faculties.includes(name)) {
        faculties.push(name);
      } else if (type === 'PRODI' && name) {
        programs.push({
          id: id || `prodi-${programs.length + 1}`,
          name,
          fakultas: fakultas || 'Fakultas Tarbiyah dan Ilmu Keguruan'
        });
      }
    }

    if (faculties.length === 0 && programs.length === 0) return null;

    return {
      faculties: faculties.length > 0 ? faculties : DEFAULT_ACADEMIC_CONFIG.faculties,
      programs: programs.length > 0 ? programs : DEFAULT_ACADEMIC_CONFIG.programs,
      updatedAt: Date.now()
    };
  } catch (err) {
    console.warn('Notice fetching academic config from Google Sheet:', err);
    return null;
  }
}

/**
 * Save academic metadata to Google Sheet
 */
export async function saveAcademicConfigToSheet(
  accessToken: string,
  spreadsheetId: string,
  academic: AcademicConfig
): Promise<void> {
  const rows: string[][] = [
    ['Tipe', 'ID', 'Nama', 'Fakultas']
  ];
  academic.faculties.forEach((f) => {
    rows.push(['FAKULTAS', f, f, '-']);
  });
  academic.programs.forEach((p) => {
    rows.push(['PRODI', p.id, p.name, p.fakultas]);
  });

  // Clear existing
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ACADEMIC_SHEET_NAME)}!A2:D200:clear`,
    accessToken,
    { method: 'POST' }
  );

  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ACADEMIC_SHEET_NAME)}!A1:D${rows.length}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows })
    }
  );
}
