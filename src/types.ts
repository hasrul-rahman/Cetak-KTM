export interface Student {
  id: string;
  nim: string;
  nama: string;
  prodi: string;
  fakultas: string;
  angkatan: string;
  jenisKelamin?: 'L' | 'P' | 'Laki-laki' | 'Perempuan';
  tempatTanggalLahir?: string;
  alamat?: string;
  foto?: string; // base64 or URL
  berlakuHingga?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface KtmTemplateConfig {
  institutionName: string;
  ministryName: string;
  cardTitle: string;
  address: string;
  website: string;
  phone: string;
  logoUrl: string;
  themePreset: 'emerald' | 'modern' | 'gold' | 'custom';
  frontBgUrl?: string;
  backBgUrl?: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  showChip: boolean;
  showHologram: boolean;
  codeType: 'qr' | 'barcode' | 'both' | 'none';
  rektorName: string;
  rektorNip?: string;
  rektorTitle: string;
  signatureUrl?: string;
  stampUrl?: string;
  terms: string[];
}

export interface PrintSettings {
  format: 'single-front' | 'single-back' | 'single-duplex' | 'grid-a4-4' | 'grid-a4-8';
  includeCropMarks: boolean;
  dpi: 150 | 300;
  quality: 'high' | 'standard';
}

export interface AdminUser {
  email: string;
  name: string;
  isAuthenticated: boolean;
  role: 'admin';
}

export interface AcademicProgramItem {
  id: string;
  name: string;
  fakultas: string;
}

export interface AcademicConfig {
  faculties: string[];
  programs: AcademicProgramItem[];
  updatedAt?: number;
}

export const ALLOWED_ADMIN_EMAILS = [
  'hasrulrahman@gmail.com',
  'hasrul@iainptk.ac.id'
] as const;
