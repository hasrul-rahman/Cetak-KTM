import { KtmTemplateConfig, Student, AcademicConfig, AcademicProgramItem } from '../types';

// Default authentic IAIN Pontianak Emblem / Logo
export const DEFAULT_IAIN_LOGO = 'https://upload.wikimedia.org/wikipedia/id/c/cd/Logo_STAIN_Pontianak.jpg';

// Official Stamp & Signature URL
export const DEFAULT_SIGNATURE_URL = 'https://iili.io/nJYGNCF.png';

export const DEFAULT_STAMP_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" opacity="0.88">
  <circle cx="80" cy="80" r="74" fill="none" stroke="#1D4ED8" stroke-width="3.5"/>
  <circle cx="80" cy="80" r="66" fill="none" stroke="#1D4ED8" stroke-width="1.5" stroke-dasharray="3,2"/>
  <circle cx="80" cy="80" r="48" fill="none" stroke="#1D4ED8" stroke-width="1.5"/>
  <path id="stampText1" d="M 24 80 A 56 56 0 0 1 136 80" fill="none"/>
  <text font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="#1D4ED8" letter-spacing="1.5">
    <textPath href="#stampText1" startOffset="50%" text-anchor="middle">
      IAIN PONTIANAK
    </textPath>
  </text>
  <path id="stampText2" d="M 136 80 A 56 56 0 0 1 24 80" fill="none"/>
  <text font-family="Arial, sans-serif" font-size="6.5" font-weight="bold" fill="#1D4ED8" letter-spacing="1">
    <textPath href="#stampText2" startOffset="50%" text-anchor="middle">
      * REKTORAT *
    </textPath>
  </text>
  <polygon points="80,68 83,75 90,75 84,79 86,86 80,82 74,86 76,79 70,75 77,75" fill="#1D4ED8"/>
  <text x="80" y="98" font-family="Arial, sans-serif" font-size="7.5" font-weight="900" fill="#1D4ED8" text-anchor="middle">SAH</text>
</svg>
`)}`;

export const DEFAULT_SIGNATURE_SVG = DEFAULT_SIGNATURE_URL;

// Default avatar placeholder
export const createStudentAvatar = (name: string, gender: string = 'L'): string => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
  const isFemale = gender === 'P' || gender === 'Perempuan';
  const headwear = isFemale
    ? '<path d="M 60 110 C 58 70, 75 55, 100 55 C 125 55, 142 70, 140 110 C 138 145, 125 160, 100 162 C 75 160, 62 145, 60 110 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/><circle cx="100" cy="110" r="30" fill="#FBBF24"/>'
    : '<path d="M 62 95 C 60 70, 75 62, 100 62 C 125 62, 140 70, 138 95 Z" fill="#1E293B"/>';
  const bgColor = isFemale ? '#B91C1C' : '#1D4ED8';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <rect width="200" height="240" fill="${bgColor}"/>
  <radialGradient id="photoGlow" cx="50%" cy="30%" r="60%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.3"/>
  </radialGradient>
  <rect width="200" height="240" fill="url(#photoGlow)"/>
  <path d="M 30 240 L 50 170 L 80 150 L 100 170 L 120 150 L 150 170 L 170 240 Z" fill="#065F46"/>
  <polygon points="100,165 85,150 115,150" fill="#FFFFFF"/>
  <polygon points="100,165 96,210 100,225 104,210" fill="#1E293B"/>
  <circle cx="100" cy="105" r="42" fill="#FBBF24"/>
  ${headwear}
  <rect x="25" y="195" width="150" height="34" rx="6" fill="#000000" opacity="0.65"/>
  <text x="100" y="218" font-family="Arial, sans-serif" font-size="17" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5">${initials}</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_TEMPLATE_CONFIG: KtmTemplateConfig = {
  institutionName: 'IAIN Pontianak',
  ministryName: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
  cardTitle: 'KARTU TANDA MAHASISWA',
  address: 'Jl. Letjend Soeprapto No. 19, Pontianak 78122, Kalimantan Barat',
  website: 'www.iainptk.ac.id',
  phone: '(0561) 734170',
  logoUrl: DEFAULT_IAIN_LOGO,
  themePreset: 'emerald',
  primaryColor: '#064E3B', // Deep Emerald Green
  accentColor: '#D97706',  // Amber / Gold
  textColor: '#1E293B',
  showChip: true,
  showHologram: true,
  codeType: 'both',
  rektorName: 'Prof. Dr. H. Wajidi Sayadi, M.Ag.',
  rektorNip: '196803122000031003',
  rektorTitle: 'Rektor IAIN Pontianak',
  signatureUrl: DEFAULT_SIGNATURE_URL,
  stampUrl: DEFAULT_STAMP_SVG,
  terms: [
    'Kartu ini adalah Kartu Tanda Mahasiswa resmi IAIN Pontianak dan bukti sah status sivitas akademika.',
    'Wajib dibawa saat mengikuti perkuliahan, ujian semester, serta transaksi perpustakaan dan laboratorium.',
    'Dilarang meminjamkan atau menyalahgunakan kartu ini kepada pihak yang tidak berkepentingan.',
    'Apabila kartu ini hilang atau rusak, segera laporkan ke Bagian Akademik & Kemahasiswaan (BAK) IAIN Pontianak.',
    'Barangsiapa menemukan kartu ini dimohon menyerahkannya ke Kampus IAIN Pontianak, Jl. Letjend Soeprapto No. 19 Pontianak.'
  ]
};

// Initial student dataset representing the 6 official faculties and their default programs
export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    nim: '12201045',
    nama: 'Ahmad Fauzi Ridwan',
    prodi: 'Pendidikan Agama Islam',
    fakultas: 'Fakultas Tarbiyah dan Ilmu Keguruan',
    angkatan: '2022',
    jenisKelamin: 'L',
    tempatTanggalLahir: 'Pontianak, 12 April 2004',
    alamat: 'Jl. Danau Sentarum No. 45, Pontianak Kota',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('Ahmad Fauzi Ridwan', 'L'),
    createdAt: Date.now() - 86400000 * 6
  },
  {
    id: 'std-2',
    nim: '12202018',
    nama: 'Siti Nurhaliza Zahra',
    prodi: 'Akuntansi Syariah',
    fakultas: 'Fakultas Ekonomi dan Bisnis Islam',
    angkatan: '2022',
    jenisKelamin: 'P',
    tempatTanggalLahir: 'Mempawah, 28 Juli 2004',
    alamat: 'Jl. Gusti M. Taufik No. 12, Mempawah',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('Siti Nurhaliza Zahra', 'P'),
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: 'std-3',
    nim: '12303055',
    nama: 'Muhammad Rayhan Pratama',
    prodi: 'Bimbingan Konseling Islam',
    fakultas: 'Dakwah dan Komunikasi Islam',
    angkatan: '2023',
    jenisKelamin: 'L',
    tempatTanggalLahir: 'Sambas, 05 Januari 2005',
    alamat: 'Jl. Tabrani Ahmad Gg. Melati No. 8, Pontianak',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('Muhammad Rayhan Pratama', 'L'),
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: 'std-4',
    nim: '12304022',
    nama: 'Fathur Rahman Syakir',
    prodi: 'Hukum Keluarga Islam',
    fakultas: 'Fakultas Syariah',
    angkatan: '2023',
    jenisKelamin: 'L',
    tempatTanggalLahir: 'Singkawang, 19 September 2005',
    alamat: 'Jl. Alianyang Komp. Sakura No. 14, Pontianak Barat',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('Fathur Rahman Syakir', 'L'),
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'std-5',
    nim: '12405009',
    nama: 'Dewi Anatasya Putri',
    prodi: 'Psikologi Islam',
    fakultas: 'Fakultas Ushuluddin dan Adab',
    angkatan: '2024',
    jenisKelamin: 'P',
    tempatTanggalLahir: 'Kubu Raya, 14 Februari 2006',
    alamat: 'Jl. Trans Kalimantan Km. 8, Sungai Ambawang',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('Dewi Anatasya Putri', 'P'),
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'std-6',
    nim: '22406001',
    nama: 'H. Syarif Maulana, S.Pd.I.',
    prodi: 'Magister Pendidikan Agama Islam',
    fakultas: 'Pasca Sarjana',
    angkatan: '2024',
    jenisKelamin: 'L',
    tempatTanggalLahir: 'Ketapang, 21 Agustus 1996',
    alamat: 'Jl. Sultan Syahrir No. 25, Pontianak Selatan',
    berlakuHingga: 'Selama Menjadi Mahasiswa',
    foto: createStudentAvatar('H. Syarif Maulana', 'L'),
    createdAt: Date.now() - 86400000 * 1
  }
];

export const IAIN_PRODI_LIST = [
  // 6 Default Programs representing the 6 Faculties
  'Pendidikan Agama Islam',
  'Akuntansi Syariah',
  'Bimbingan Konseling Islam',
  'Hukum Keluarga Islam',
  'Psikologi Islam',
  'Magister Pendidikan Agama Islam',
  // FTIK
  'Pendidikan Bahasa Arab',
  'Pendidikan Guru Madrasah Ibtidaiyah',
  'Pendidikan Islam Anak Usia Dini',
  'Tadris Bahasa Inggris',
  'Tadris Matematika',
  // FASYA
  'Hukum Ekonomi Syariah',
  'Hukum Keluarga Islam',
  'Hukum Tatanegara',
  // DAKWAH & KOMUNIKASI
  'Bimbingan dan Komunikasi Islam',
  'Komunikasi dan Penyiaran Islam',
  'Manajemen Dakwah',
  // FUAD
  'Ilmu Al-Qur\'an dan Tafsir',
  'Psikologi Islam',
  'Studi Agama-Agama',
  // FEBI
  'Perbankan Syariah',
  'Ekonomi Syariah',
  'Manajemen Bisnis Syariah',
  // Pascasarjana
  'Magister Ekonomi Syariah'
];

export const IAIN_FAKULTAS_MAP: Record<string, string> = {
  // 6 Default requested pairings
  'Pendidikan Agama Islam': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Akuntansi Syariah': 'Fakultas Ekonomi dan Bisnis Islam',
  'Bimbingan Konseling Islam': 'Dakwah dan Komunikasi Islam',
  'Hukum Keluarga Islam': 'Fakultas Syariah',
  'Psikologi Islam': 'Fakultas Ushuluddin dan Adab',
  'Magister Pendidikan Agama Islam': 'Pasca Sarjana',

  // Additional programs
  'Pendidikan Bahasa Arab': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Pendidikan Guru Madrasah Ibtidaiyah': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Pendidikan Islam Anak Usia Dini': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Tadris Bahasa Inggris': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Tadris Matematika': 'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Hukum Ekonomi Syariah': 'Fakultas Syariah',
  'Hukum Tatanegara': 'Fakultas Syariah',
  'Hukum Tata Negara': 'Fakultas Syariah',
  'Komunikasi dan Penyiaran Islam': 'Dakwah dan Komunikasi Islam',
  'Manajemen Dakwah': 'Dakwah dan Komunikasi Islam',
  'Ilmu Al-Qur\'an dan Tafsir': 'Fakultas Ushuluddin dan Adab',
  'Perbankan Syariah': 'Fakultas Ekonomi dan Bisnis Islam',
  'Ekonomi Syariah': 'Fakultas Ekonomi dan Bisnis Islam',
  'Manajemen Bisnis Syariah': 'Fakultas Ekonomi dan Bisnis Islam',
  'Magister Ekonomi Syariah': 'Pasca Sarjana'
};

export const DEFAULT_FACULTIES: string[] = [
  'Fakultas Tarbiyah dan Ilmu Keguruan',
  'Fakultas Syariah',
  'Fakultas Ekonomi dan Bisnis Islam',
  'Dakwah dan Komunikasi Islam',
  'Fakultas Ushuluddin dan Adab',
  'Pasca Sarjana'
];

export const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  faculties: [...DEFAULT_FACULTIES],
  programs: IAIN_PRODI_LIST.map((prodi, idx) => ({
    id: `prodi-${idx + 1}`,
    name: prodi,
    fakultas: IAIN_FAKULTAS_MAP[prodi] || 'Fakultas Tarbiyah dan Ilmu Keguruan'
  })),
  updatedAt: Date.now()
};

