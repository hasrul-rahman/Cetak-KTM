import React, { useEffect, useState } from 'react';
import { Student, KtmTemplateConfig } from '../types';
import { generateQrCodeDataUrl, generateBarcodeDataUrl } from '../utils/qrHelper';
import { Building2, Globe, Phone, MapPin, ShieldCheck, Award } from 'lucide-react';

interface KtmCardProps {
  student: Student;
  config: KtmTemplateConfig;
  side?: 'front' | 'back' | 'both';
  scale?: number;
  className?: string;
  frontRef?: React.RefObject<HTMLDivElement | null>;
  backRef?: React.RefObject<HTMLDivElement | null>;
}

export const KtmCard: React.FC<KtmCardProps> = ({
  student,
  config,
  side = 'both',
  scale = 1,
  className = '',
  frontRef,
  backRef
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const qrData = `KTM-IAIN-PONTIANAK|NIM:${student.nim}|NAMA:${student.nama}|PRODI:${student.prodi}|STATUS:AKTIF`;
    generateQrCodeDataUrl(qrData).then(url => {
      if (isMounted) setQrUrl(url);
    });
    setBarcodeUrl(generateBarcodeDataUrl(student.nim));
    return () => {
      isMounted = false;
    };
  }, [student.nim, student.nama, student.prodi]);

  // Dimensions: 504px x 318px (matches CR80 aspect ratio 1.586)
  const cardStyle: React.CSSProperties = {
    width: '504px',
    height: '318px',
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: 'top left',
    borderRadius: '14px',
    boxShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08)'
  };

  const getPresetBackground = (isFront: boolean): React.CSSProperties => {
    if (isFront && config.frontBgUrl) {
      return {
        backgroundImage: `url(${config.frontBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    if (!isFront && config.backBgUrl) {
      return {
        backgroundImage: `url(${config.backBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }

    if (config.themePreset === 'gold') {
      return {
        background: isFront
          ? 'linear-gradient(135deg, #78350F 0%, #B45309 45%, #F59E0B 75%, #FEF3C7 100%)'
          : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 30%, #F59E0B 100%)'
      };
    }

    if (config.themePreset === 'modern') {
      return {
        background: isFront
          ? 'linear-gradient(135deg, #0F172A 0%, #064E3B 50%, #0F766E 100%)'
          : 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)'
      };
    }

    // Default: emerald classic (Official IAIN Green & Gold)
    return {
      background: isFront
        ? 'linear-gradient(135deg, #022c22 0%, #064e3b 45%, #047857 85%, #059669 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)'
    };
  };

  return (
    <div className={`flex flex-wrap gap-6 items-start justify-center ${className}`}>
      {/* SISI DEPAN (FRONT) */}
      {(side === 'front' || side === 'both') && (
        <div className="relative" style={{ width: `${504 * scale}px`, height: `${318 * scale}px` }}>
          <div
            ref={frontRef}
            id={`ktm-front-${student.nim}`}
            style={{ ...cardStyle, ...getPresetBackground(true) }}
            className="relative overflow-hidden font-sans select-none text-white p-3 flex flex-col justify-between border border-emerald-800/30"
          >
            {/* Islamic geometric background watermark decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 504 318">
                <defs>
                  <pattern id="islamicGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#FDE68A" strokeWidth="1" />
                    <circle cx="20" cy="20" r="8" fill="none" stroke="#FDE68A" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#islamicGrid)" />
                <circle cx="430" cy="180" r="140" fill="none" stroke="#FDE68A" strokeWidth="45" opacity="0.3" />
              </svg>
            </div>

            {/* Subtle Gold Ribbon / Waves */}
            <div className="absolute top-0 right-0 w-52 h-52 bg-gradient-to-bl from-amber-400/20 via-amber-300/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-emerald-400/20 via-teal-300/10 to-transparent rounded-tr-full pointer-events-none" />

            {/* HEADER */}
            <div className="relative z-10 flex items-center gap-3 border-b border-amber-400/40 pb-2 bg-black/20 -mx-3 -mt-3 px-3 pt-2.5 rounded-t-[14px]">
              <img
                src={config.logoUrl}
                alt="Logo IAIN Pontianak"
                className="w-13 h-13 object-contain drop-shadow-md shrink-0"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 text-center pr-1">
                <p className="text-[9.5px] font-extrabold tracking-widest text-amber-300 uppercase leading-none mb-1">
                  {config.ministryName}
                </p>
                <h1 className="text-[12.5px] font-black tracking-tight text-white uppercase leading-tight drop-shadow-sm">
                  {config.institutionName}
                </h1>
                <div className="inline-block mt-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-emerald-950 font-black text-[10px] tracking-wider px-4 py-0.5 rounded-full shadow uppercase">
                  {config.cardTitle}
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="relative z-10 flex gap-3.5 items-start mt-2 mb-1 flex-1">
              {/* Left Column: Photo & Security Features */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {/* Photo Frame with Gold Rim */}
                <div className="relative w-[102px] h-[128px] p-1 bg-gradient-to-b from-amber-400 via-amber-200 to-amber-500 rounded-lg shadow-md">
                  <img
                    src={student.foto}
                    alt={student.nama}
                    className="w-full h-full object-cover rounded bg-slate-900 border border-emerald-950"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                  {/* Hologram Badge */}
                  {config.showHologram && (
                    <div
                      title="Security Hologram"
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-300 via-pink-400 to-amber-300 border border-white/80 shadow flex items-center justify-center text-[8px] text-slate-900 font-black opacity-90"
                    >
                      ★
                    </div>
                  )}
                </div>

                {/* Decorative Smart Card Chip */}
                {config.showChip && (
                  <div className="w-11 h-7 bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 rounded border border-amber-600 shadow-inner flex items-center justify-center relative overflow-hidden">
                    <div className="w-full h-[1px] bg-amber-700/50 absolute top-2.5" />
                    <div className="w-full h-[1px] bg-amber-700/50 absolute bottom-2" />
                    <div className="h-full w-[1px] bg-amber-700/50 absolute left-3" />
                    <div className="h-full w-[1px] bg-amber-700/50 absolute right-3" />
                    <div className="w-4 h-2.5 rounded border border-amber-800/40 bg-amber-100/40" />
                  </div>
                )}
              </div>

              {/* Right Column: Student Biodata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full pt-0.5">
                <div className="space-y-1.5">
                  {/* NIM */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-amber-300 font-bold w-16 shrink-0">
                      NIM
                    </span>
                    <span className="text-[15.5px] font-black font-mono tracking-wider text-amber-200 drop-shadow leading-none">
                      {student.nim}
                    </span>
                  </div>

                  {/* NAMA */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-emerald-200 font-bold w-16 shrink-0">
                      Nama
                    </span>
                    <span className="text-[13px] font-black text-white uppercase tracking-tight line-clamp-2 leading-tight drop-shadow-xs">
                      {student.nama}
                    </span>
                  </div>

                  {/* PRODI */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-emerald-200 font-bold w-16 shrink-0">
                      Prodi
                    </span>
                    <span className="text-[11px] font-bold text-emerald-100 leading-snug">
                      {student.prodi}
                    </span>
                  </div>

                  {/* FAKULTAS */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-emerald-200 font-bold w-16 shrink-0">
                      Fakultas
                    </span>
                    <span className="text-[10px] font-semibold text-white/95 leading-snug">
                      {student.fakultas}
                    </span>
                  </div>

                  {/* ANGKATAN / BERLAKU */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-emerald-200 font-bold w-16 shrink-0">
                      Berlaku
                    </span>
                    <span className="text-[9.5px] text-amber-300 font-bold">
                      {student.berlakuHingga || 'Selama Menjadi Mahasiswa'}
                    </span>
                  </div>
                </div>

                {/* Bottom Signature & Stamp Area */}
                <div className="mt-1 flex items-end justify-between border-t border-emerald-500/30 pt-1">
                  {/* QR / Barcode */}
                  <div className="flex items-center gap-1.5">
                    {qrUrl && (config.codeType === 'qr' || config.codeType === 'both') && (
                      <div className="bg-white p-0.5 rounded shadow-sm">
                        <img src={qrUrl} alt="QR NIM" className="w-10 h-10" />
                      </div>
                    )}
                    {barcodeUrl && (config.codeType === 'barcode' || config.codeType === 'both') && (
                      <div className="bg-white px-1 py-0.5 rounded shadow-sm max-w-[105px]">
                        <img src={barcodeUrl} alt="Barcode NIM" className="h-7 w-auto object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Rektor Signature & Stamp */}
                  <div className="relative text-center pr-1">
                    <p className="text-[8px] text-amber-200 font-bold leading-tight">
                      Pontianak, {new Date().getFullYear()}
                    </p>
                    <p className="text-[8.5px] text-white font-bold leading-tight">
                      {config.rektorTitle}
                    </p>

                    {/* Signature / TTE QR & Stamp Overlay */}
                    <div className="relative h-8 w-28 my-0.5 flex items-center justify-center">
                      {config.stampUrl && (
                        <img
                          src={config.stampUrl}
                          alt="Stempel IAIN"
                          className="absolute left-1 w-9 h-9 opacity-85 pointer-events-none"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {config.signatureUrl && (
                        <div className="relative z-10 bg-white p-0.5 rounded shadow-xs border border-white/60 flex items-center justify-center max-w-[85px]">
                          <img
                            src={config.signatureUrl}
                            alt="Tanda Tangan Rektor"
                            className="h-7 w-auto max-w-[80px] object-contain"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-[9.5px] font-black text-amber-300 underline leading-tight">
                      {config.rektorName}
                    </p>
                    {config.rektorNip && (
                      <p className="text-[7.5px] text-emerald-100 font-semibold leading-tight mt-0.5">
                        NIP. {config.rektorNip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Strip */}
            <div className="relative z-10 -mx-3 -mb-3 bg-emerald-950/90 px-3.5 py-1.5 flex items-center justify-start border-t border-amber-400/40 text-[9px] text-emerald-200 rounded-b-[14px]">
              <span className="font-mono text-amber-300 font-bold tracking-wider">
                {config.website || 'www.iainptk.ac.id'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SISI BELAKANG (BACK) */}
      {(side === 'back' || side === 'both') && (
        <div className="relative" style={{ width: `${504 * scale}px`, height: `${318 * scale}px` }}>
          <div
            ref={backRef}
            id={`ktm-back-${student.nim}`}
            style={{ ...cardStyle, ...getPresetBackground(false) }}
            className="relative overflow-hidden font-sans select-none text-slate-800 p-3 flex flex-col justify-between border border-emerald-800/20"
          >
            {/* Watermark Logo in Center */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <img src={config.logoUrl} alt="Watermark" className="w-56 h-56 object-contain" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            </div>

            {/* Back Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-emerald-900/20 pb-1.5">
              <div className="flex items-center gap-2">
                <img src={config.logoUrl} alt="Logo" className="w-7 h-7 object-contain" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="text-[11.5px] font-black text-emerald-950 leading-tight">
                    KETENTUAN PENGGUNAAN KARTU MAHASISWA
                  </h3>
                  <p className="text-[9.5px] text-emerald-800 font-bold uppercase tracking-wide">
                    {config.institutionName || 'IAIN Pontianak'}
                  </p>
                </div>
              </div>
              <span className="text-[8.5px] font-mono font-black bg-emerald-800 text-white px-2.5 py-0.5 rounded">
                CR-80 ID
              </span>
            </div>

            {/* Terms and Rules */}
            <div className="relative z-10 my-2 text-[9.5px] leading-relaxed text-slate-800 space-y-1.5 bg-white/75 backdrop-blur-[1px] p-3 rounded-lg border border-emerald-100 shadow-sm">
              {config.terms.map((term, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="font-black text-emerald-900 shrink-0">{index + 1}.</span>
                  <span className="font-medium">{term}</span>
                </div>
              ))}
            </div>

            {/* Back Bottom Bar: Address, Phone, Website, and Verification Code */}
            <div className="relative z-10 bg-emerald-950 text-white -mx-3 -mb-3 p-2.5 rounded-b-[14px] flex items-center justify-between gap-2 border-t border-emerald-800">
              <div className="space-y-0.5 text-[8.5px] text-emerald-100">
                <p className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                  {config.address}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-amber-300 shrink-0" />
                    {config.phone}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-amber-300 font-bold">
                    <Globe className="w-3 h-3 text-amber-300 shrink-0" />
                    {config.website}
                  </span>
                </div>
              </div>

              {/* Mini QR Verification */}
              {qrUrl && (
                <div className="bg-white p-0.5 rounded shrink-0 shadow">
                  <img src={qrUrl} alt="Verify QR" className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
