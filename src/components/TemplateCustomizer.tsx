import React, { useRef, useState } from 'react';
import { KtmTemplateConfig, Student } from '../types';
import { DEFAULT_IAIN_LOGO, DEFAULT_SIGNATURE_URL, DEFAULT_STAMP_SVG } from '../data/defaultData';
import { KtmCard } from './KtmCard';
import { fileToBase64 } from '../utils/excelHelper';
import {
  Palette,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Eye,
  Building,
  Shield,
  QrCode,
  Stamp
} from 'lucide-react';

interface TemplateCustomizerProps {
  config: KtmTemplateConfig;
  sampleStudent: Student;
  onChangeConfig: (newConfig: KtmTemplateConfig) => void;
  onResetToDefault: () => void;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  config,
  sampleStudent,
  onChangeConfig,
  onResetToDefault
}) => {
  const [activeTab, setActiveTab] = useState<'logo_bg' | 'text_identity' | 'security_rektor'>('logo_bg');
  const [previewSide, setPreviewSide] = useState<'front' | 'back' | 'both'>('both');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const frontBgInputRef = useRef<HTMLInputElement>(null);
  const backBgInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      onChangeConfig({ ...config, logoUrl: base64 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFrontBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      onChangeConfig({ ...config, frontBgUrl: base64, themePreset: 'custom' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      onChangeConfig({ ...config, backBgUrl: base64, themePreset: 'custom' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      onChangeConfig({ ...config, signatureUrl: base64 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      onChangeConfig({ ...config, stampUrl: base64 });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-700" />
            Kustomisasi Desain KTM & Identitas Kampus
          </h2>
          <p className="text-xs text-slate-500">
            Ganti logo kampus resmi, kustomisasi background kartu depan & belakang, stempel, dan tanda tangan rektor.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetToDefault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          Reset ke Template Standar IAIN
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (Left) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 bg-slate-100/70 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('logo_bg')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'logo_bg'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
              Logo & Background
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text_identity')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'text_identity'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-700" />
              Teks & Kontak
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security_rektor')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'security_rektor'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stamp className="w-3.5 h-3.5 text-emerald-700" />
              Rektor & Keamanan
            </button>
          </div>

          {/* TAB 1: LOGO & BACKGROUND */}
          {activeTab === 'logo_bg' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
              {/* LOGO KAMPUS */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    Logo Kampus
                  </span>
                  {config.logoUrl !== DEFAULT_IAIN_LOGO && (
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ ...config, logoUrl: DEFAULT_IAIN_LOGO })}
                      className="text-[11px] text-emerald-700 hover:underline font-semibold"
                    >
                      Gunakan Logo Asli IAIN
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="w-14 h-14 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <img
                      src={config.logoUrl}
                      alt="Preview Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">
                      Ganti logo kampus dengan file gambar Anda
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Format didukung: PNG transparan, SVG, atau JPG (rasio persegi disarankan).
                    </p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <Upload className="w-3 h-3" />
                      Pilih File Logo Baru
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* TEMA PRESET BACKGROUND */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  Pilihan Tema & Background Bawaan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        themePreset: 'emerald',
                        frontBgUrl: undefined,
                        backBgUrl: undefined
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition ${
                      config.themePreset === 'emerald' && !config.frontBgUrl
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="w-full h-8 rounded-lg bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-600 mb-1.5 shadow-sm" />
                    <p className="text-xs font-bold text-slate-800 leading-none">IAIN Emerald</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Klasik Islami</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        themePreset: 'modern',
                        frontBgUrl: undefined,
                        backBgUrl: undefined
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition ${
                      config.themePreset === 'modern' && !config.frontBgUrl
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="w-full h-8 rounded-lg bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-800 mb-1.5 shadow-sm" />
                    <p className="text-xs font-bold text-slate-800 leading-none">Modern Tech</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Minimalis</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        themePreset: 'gold',
                        frontBgUrl: undefined,
                        backBgUrl: undefined
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition ${
                      config.themePreset === 'gold' && !config.frontBgUrl
                        ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="w-full h-8 rounded-lg bg-gradient-to-r from-amber-900 via-amber-700 to-amber-500 mb-1.5 shadow-sm" />
                    <p className="text-xs font-bold text-slate-800 leading-none">Royal Gold</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Emas Mewah</p>
                  </button>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* UPLOAD CUSTOM BACKGROUND */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">
                  Upload Background Kustom Sendiri (Gambar/Desain):
                </label>

                {/* Sisi Depan */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800">Background Sisi Depan</p>
                    <p className="text-[11px] text-slate-500">
                      {config.frontBgUrl ? 'Gambar kustom aktif' : 'Menggunakan tema standar'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={frontBgInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFrontBgUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => frontBgInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-xs font-semibold text-slate-700 rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3 text-emerald-700" />
                      Upload Depan
                    </button>
                    {config.frontBgUrl && (
                      <button
                        type="button"
                        onClick={() => onChangeConfig({ ...config, frontBgUrl: undefined })}
                        className="text-[11px] text-rose-600 hover:underline px-1"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {/* Sisi Belakang */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800">Background Sisi Belakang</p>
                    <p className="text-[11px] text-slate-500">
                      {config.backBgUrl ? 'Gambar kustom aktif' : 'Menggunakan tema standar'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={backBgInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBackBgUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backBgInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-xs font-semibold text-slate-700 rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3 text-emerald-700" />
                      Upload Belakang
                    </button>
                    {config.backBgUrl && (
                      <button
                        type="button"
                        onClick={() => onChangeConfig({ ...config, backBgUrl: undefined })}
                        className="text-[11px] text-rose-600 hover:underline px-1"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEKS & IDENTITAS */}
          {activeTab === 'text_identity' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nama Institusi (Header Kartu)
                  </label>
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ ...config, institutionName: 'IAIN Pontianak' })}
                    className="text-[10px] text-emerald-700 font-semibold hover:underline"
                  >
                    Gunakan "IAIN Pontianak"
                  </button>
                </div>
                <input
                  type="text"
                  value={config.institutionName}
                  placeholder="IAIN Pontianak"
                  onChange={e => onChangeConfig({ ...config, institutionName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kementerian Pembina
                </label>
                <input
                  type="text"
                  value={config.ministryName}
                  onChange={e => onChangeConfig({ ...config, ministryName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Judul Kartu
                </label>
                <input
                  type="text"
                  value={config.cardTitle}
                  onChange={e => onChangeConfig({ ...config, cardTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Website Resmi</label>
                  <input
                    type="text"
                    value={config.website}
                    onChange={e => onChangeConfig({ ...config, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={e => onChangeConfig({ ...config, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Kampus</label>
                <textarea
                  rows={2}
                  value={config.address}
                  onChange={e => onChangeConfig({ ...config, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: REKTOR & FITUR KEAMANAN */}
          {activeTab === 'security_rektor' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Rektor</label>
                  <input
                    type="text"
                    value={config.rektorName}
                    onChange={e => onChangeConfig({ ...config, rektorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">NIP Rektor</label>
                  <input
                    type="text"
                    value={config.rektorNip || ''}
                    onChange={e => onChangeConfig({ ...config, rektorNip: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jabatan / Gelar</label>
                <input
                  type="text"
                  value={config.rektorTitle}
                  onChange={e => onChangeConfig({ ...config, rektorTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Tanda Tangan & Stempel Upload */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-center">
                  <p className="text-xs font-bold text-slate-800">Tanda Tangan</p>
                  <div className="h-10 flex items-center justify-center bg-white rounded border border-slate-200 p-1">
                    {config.signatureUrl && (
                      <img
                        src={config.signatureUrl}
                        alt="Tanda tangan"
                        className="max-h-full object-contain"
                      />
                    )}
                  </div>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="text-[11px] text-emerald-800 font-semibold hover:underline"
                    >
                      Ganti Tanda Tangan
                    </button>
                    {config.signatureUrl !== DEFAULT_SIGNATURE_URL && (
                      <button
                        type="button"
                        onClick={() => onChangeConfig({ ...config, signatureUrl: DEFAULT_SIGNATURE_URL })}
                        className="text-[11px] text-slate-500 hover:text-rose-700 hover:underline"
                      >
                        Reset Default
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-center">
                  <p className="text-xs font-bold text-slate-800">Stempel Resmi</p>
                  <div className="h-10 flex items-center justify-center bg-white rounded border border-slate-200 p-1">
                    {config.stampUrl && (
                      <img src={config.stampUrl} alt="Stempel" className="max-h-full object-contain" />
                    )}
                  </div>
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStampUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="text-[11px] text-emerald-800 font-semibold hover:underline"
                  >
                    Ganti Stempel
                  </button>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Fitur Keamanan Toggles */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-800 block">Fitur Tampilan Kartu:</label>

                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    Tampilkan Hologram Reflektif
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showHologram}
                    onChange={e => onChangeConfig({ ...config, showHologram: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-700" />
                    Tampilkan Smart Card Chip
                  </span>
                  <input
                    type="checkbox"
                    checked={config.showChip}
                    onChange={e => onChangeConfig({ ...config, showChip: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    Tipe Kode Mahasiswa
                  </span>
                  <select
                    value={config.codeType}
                    onChange={e =>
                      onChangeConfig({
                        ...config,
                        codeType: e.target.value as 'qr' | 'barcode' | 'both' | 'none'
                      })
                    }
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 font-medium bg-white focus:outline-none"
                  >
                    <option value="both">QR Code & Barcode</option>
                    <option value="qr">Hanya QR Code</option>
                    <option value="barcode">Hanya Barcode</option>
                    <option value="none">Tidak Ada</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column (Right) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold tracking-wide uppercase">Pratinjau Langsung (Live Preview)</span>
            </div>

            {/* Side Switcher */}
            <div className="flex bg-white/10 rounded-lg p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPreviewSide('front')}
                className={`px-2.5 py-1 rounded-md transition ${
                  previewSide === 'front' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Depan
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('back')}
                className={`px-2.5 py-1 rounded-md transition ${
                  previewSide === 'back' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Belakang
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('both')}
                className={`px-2.5 py-1 rounded-md transition ${
                  previewSide === 'both' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                Keduanya
              </button>
            </div>
          </div>

          <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 overflow-x-auto flex items-center justify-center min-h-[380px]">
            <div className="origin-top transition-all duration-200">
              <KtmCard
                student={sampleStudent}
                config={config}
                side={previewSide}
                scale={0.96}
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-slate-500">
              Kartu ini memenuhi standar fisik kartu CR80 (85.6 mm × 53.98 mm) dengan rasio 1.586.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
