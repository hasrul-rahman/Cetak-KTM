import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Student } from '../types';
import { createStudentAvatar, IAIN_FAKULTAS_MAP } from '../data/defaultData';

export interface ParsedRow {
  nim: string;
  nama: string;
  prodi: string;
  fakultas?: string;
  angkatan?: string;
  jenisKelamin?: 'L' | 'P' | 'Laki-laki' | 'Perempuan';
  tempatTanggalLahir?: string;
  alamat?: string;
  fotoFilename?: string;
  fotoUrl?: string;
  berlakuHingga?: string;
}

export function generateExcelTemplate(): void {
  const sampleData = [
    {
      'NIM': '12401001',
      'Nama': 'Ahmad Fauzi Ridwan',
      'Prodi': 'Pendidikan Agama Islam',
      'Fakultas': 'Fakultas Tarbiyah dan Ilmu Keguruan',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Tanggal Lahir': 'Pontianak, 10 Maret 2006',
      'Alamat': 'Jl. Imam Bonjol No. 24, Pontianak',
      'Nama File Foto (Opsional)': '12401001.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    },
    {
      'NIM': '12402015',
      'Nama': 'Siti Nurhaliza Zahra',
      'Prodi': 'Akuntansi Syariah',
      'Fakultas': 'Fakultas Ekonomi dan Bisnis Islam',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Tanggal Lahir': 'Mempawah, 28 Juli 2006',
      'Alamat': 'Jl. Gusti M. Taufik No. 12, Mempawah',
      'Nama File Foto (Opsional)': '12402015.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    },
    {
      'NIM': '12403028',
      'Nama': 'Muhammad Rayhan Pratama',
      'Prodi': 'Bimbingan Konseling Islam',
      'Fakultas': 'Dakwah dan Komunikasi Islam',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Tanggal Lahir': 'Sambas, 22 November 2005',
      'Alamat': 'Jl. Veteran No. 88, Pontianak',
      'Nama File Foto (Opsional)': '12403028.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    },
    {
      'NIM': '12404005',
      'Nama': 'Fathur Rahman Syakir',
      'Prodi': 'Hukum Keluarga Islam',
      'Fakultas': 'Fakultas Syariah',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Tanggal Lahir': 'Singkawang, 19 September 2006',
      'Alamat': 'Jl. Alianyang Komp. Sakura No. 14, Pontianak Barat',
      'Nama File Foto (Opsional)': '12404005.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    },
    {
      'NIM': '12405012',
      'Nama': 'Dewi Anatasya Putri',
      'Prodi': 'Psikologi Islam',
      'Fakultas': 'Fakultas Ushuluddin dan Adab',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Tanggal Lahir': 'Kubu Raya, 14 Februari 2006',
      'Alamat': 'Jl. Trans Kalimantan Km. 8, Sungai Ambawang',
      'Nama File Foto (Opsional)': '12405012.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    },
    {
      'NIM': '22406001',
      'Nama': 'H. Syarif Maulana, S.Pd.I.',
      'Prodi': 'Magister Pendidikan Agama Islam',
      'Fakultas': 'Pasca Sarjana',
      'Angkatan': '2024',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Tanggal Lahir': 'Ketapang, 21 Agustus 1996',
      'Alamat': 'Jl. Sultan Syahrir No. 25, Pontianak Selatan',
      'Nama File Foto (Opsional)': '22406001.jpg',
      'Berlaku Hingga': 'Selama Menjadi Mahasiswa'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Auto column widths
  worksheet['!cols'] = [
    { wch: 14 }, // NIM
    { wch: 28 }, // Nama
    { wch: 34 }, // Prodi
    { wch: 38 }, // Fakultas
    { wch: 10 }, // Angkatan
    { wch: 18 }, // Gender
    { wch: 28 }, // TTL
    { wch: 38 }, // Alamat
    { wch: 26 }, // Foto Filename
    { wch: 26 }  // Berlaku
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Mahasiswa IAIN');
  XLSX.writeFile(workbook, 'Template_Mahasiswa_IAIN_Pontianak.xlsx');
}

export function exportStudentsToExcel(students: Student[], filename = 'Data_Mahasiswa_KTM_IAIN_Pontianak.xlsx'): void {
  const exportData = students.map((s, idx) => ({
    'No': idx + 1,
    'NIM': s.nim,
    'Nama Lengkap': s.nama,
    'Program Studi': s.prodi,
    'Fakultas': s.fakultas,
    'Angkatan': s.angkatan,
    'Jenis Kelamin': s.jenisKelamin || '-',
    'Tempat Tanggal Lahir': s.tempatTanggalLahir || '-',
    'Alamat': s.alamat || '-',
    'Masa Berlaku': s.berlakuHingga || 'Selama Menjadi Mahasiswa'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 34 },
    { wch: 38 },
    { wch: 10 },
    { wch: 14 },
    { wch: 28 },
    { wch: 38 },
    { wch: 26 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mahasiswa Terdaftar');
  XLSX.writeFile(workbook, filename);
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map(row => {
    // Flexible header detection
    const keys = Object.keys(row);
    const findValue = (possibleNames: string[]): string => {
      const match = keys.find(k => 
        possibleNames.some(p => k.trim().toLowerCase().includes(p.toLowerCase()))
      );
      return match ? String(row[match]).trim() : '';
    };

    const nim = findValue(['nim', 'no mahasiswa', 'nomor induk', 'npm', 'no_mhs', 'id']);
    const nama = findValue(['nama', 'name', 'nama mahasiswa', 'nama_lengkap', 'fullname']);
    const prodi = findValue(['prodi', 'program studi', 'jurusan', 'study program']);
    let fakultas = findValue(['fakultas', 'faculty']);
    
    // Auto-fill fakultas if empty based on prodi
    if (!fakultas && prodi) {
      fakultas = IAIN_FAKULTAS_MAP[prodi] || 'IAIN Pontianak';
    }

    const angkatan = findValue(['angkatan', 'tahun masuk', 'cohort', 'year']) || (nim.length >= 2 ? `20${nim.slice(0, 2)}` : '2024');
    const jkRaw = findValue(['jenis kelamin', 'gender', 'jk', 'sex']).toUpperCase();
    let jenisKelamin: 'L' | 'P' | undefined = undefined;
    if (jkRaw.startsWith('L') || jkRaw.includes('PRIA')) jenisKelamin = 'L';
    else if (jkRaw.startsWith('P') || jkRaw.includes('WANITA')) jenisKelamin = 'P';

    const ttl = findValue(['tempat tanggal lahir', 'ttl', 'tempat_lahir', 'tanggal lahir', 'birth']);
    const alamat = findValue(['alamat', 'address', 'domisili']);
    const fotoFilename = findValue(['foto', 'photo', 'nama file foto', 'file foto', 'gambar']);
    const berlakuHingga = findValue(['berlaku', 'berlaku hingga', 'masa berlaku', 'validity']) || 'Selama Menjadi Mahasiswa';

    return {
      nim,
      nama,
      prodi,
      fakultas,
      angkatan,
      jenisKelamin,
      tempatTanggalLahir: ttl,
      alamat,
      fotoFilename,
      fotoUrl: fotoFilename && (fotoFilename.startsWith('http') || fotoFilename.startsWith('data:')) ? fotoFilename : undefined,
      berlakuHingga
    };
  }).filter(r => r.nim && r.nama); // must have at least NIM and Nama
}

// Unpack ZIP file of photos and create a map: cleaned NIM / filename without ext -> Base64 Data URL
export async function parsePhotosZip(file: File): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
    if (zipEntry.dir) continue;
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
      const blob = await zipEntry.async('blob');
      const base64 = await fileToBase64(blob);
      const filename = relativePath.split('/').pop() || relativePath;
      const cleanName = filename.replace(/\.[^/.]+$/, '').trim().toLowerCase();
      
      // Store by clean name (e.g. "12201045")
      photoMap.set(cleanName, base64);
      // Store by exact filename (e.g. "12201045.jpg")
      photoMap.set(filename.toLowerCase(), base64);
    }
  }

  return photoMap;
}

// Convert File / Blob to Base64
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Convert parsed rows to Students with matched photos
export function convertRowsToStudents(
  rows: ParsedRow[],
  photosMap: Map<string, string>
): Student[] {
  return rows.map((r, index) => {
    const cleanNim = r.nim.trim().toLowerCase();
    let photoData = r.fotoUrl;

    if (!photoData && r.fotoFilename) {
      const cleanFile = r.fotoFilename.trim().toLowerCase();
      const cleanFileNoExt = cleanFile.replace(/\.[^/.]+$/, '');
      photoData = photosMap.get(cleanFile) || photosMap.get(cleanFileNoExt);
    }

    if (!photoData) {
      photoData = photosMap.get(cleanNim);
    }

    // If still no photo, generate standard formal avatar
    if (!photoData) {
      photoData = createStudentAvatar(r.nama, r.jenisKelamin);
    }

    return {
      id: `std-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      nim: r.nim,
      nama: r.nama,
      prodi: r.prodi || 'IAIN Pontianak',
      fakultas: r.fakultas || IAIN_FAKULTAS_MAP[r.prodi] || 'Fakultas Tarbiyah dan Ilmu Keguruan',
      angkatan: r.angkatan || (r.nim.length >= 2 ? `20${r.nim.substring(0, 2)}` : '2024'),
      jenisKelamin: r.jenisKelamin,
      tempatTanggalLahir: r.tempatTanggalLahir || '-',
      alamat: r.alamat || '',
      berlakuHingga: r.berlakuHingga || 'Selama Menjadi Mahasiswa',
      foto: photoData,
      createdAt: Date.now()
    };
  });
}
