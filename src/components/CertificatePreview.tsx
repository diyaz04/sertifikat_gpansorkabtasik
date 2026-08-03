import React, { useEffect, useState, memo } from 'react';
import QRCode from 'qrcode';
import { Participant, CertificateConfig } from '../types';
import { formatIndonesianDate } from '../utils';
import { Award } from 'lucide-react';
import templatePkdUrl from '../assets/template-pkd.png';
import templatePklUrl from '../assets/template-pkl.png';
import templateDirosahUlaUrl from '../assets/template-dirosah-ula.png';
import ansorLogoUrl from '../assets/logo-ansor.png';

interface CertificatePreviewProps {
  participant: Participant;
  config: CertificateConfig;
  showBackPage?: boolean;
  exportMode?: boolean;
}

// Global cache for generated verification QR codes to prevent recalculation on every keystroke/render
const qrCache = new Map<string, { mainQr: string; sigQr: string }>();

export function AnsorLogoSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <img
      src={ansorLogoUrl}
      alt="Logo Gerakan Pemuda Ansor"
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}

function CertificatePreviewComponent({ participant, config, showBackPage = false, exportMode = false }: CertificatePreviewProps) {
  const [certificateQrUrl, setCertificateQrUrl] = useState('');
  const [signeeQrUrls, setSigneeQrUrls] = useState<string[]>([]);
  const totalJP = config.materi.reduce((sum, item) => sum + Number(item.hours), 0);
  const finishedDate = config.issuedDateText || config.dateText;
  const defaultActivityName = config.jenisKegiatan === 'PKL'
    ? 'Pelatihan Kepemimpinan Lanjutan (PKL)'
    : config.jenisKegiatan === 'Dirosah Ula'
    ? 'Dirosah Ula / Pendidikan Kader Majelis Dzikir dan Sholawat Rijalul Ansor'
    : 'Pelatihan Kepemimpinan Dasar (PKD)';

  const activityName = config.eventName?.toLowerCase().includes('pkd')
    ? 'Pelatihan Kepemimpinan Dasar (PKD)'
    : config.eventName?.toLowerCase().includes('pkl')
    ? 'Pelatihan Kepemimpinan Lanjutan (PKL)'
    : config.eventName?.toLowerCase().includes('dirosah') || config.eventName?.toLowerCase().includes('ula')
    ? 'Dirosah Ula / Pendidikan Kader Majelis Dzikir dan Sholawat Rijalul Ansor'
    : (config.eventName || defaultActivityName);

  const isDirosahUla = config.jenisKegiatan === 'Dirosah Ula' || config.eventName?.toLowerCase().includes('dirosah') || config.eventName?.toLowerCase().includes('ula') || config.eventName?.toLowerCase().includes('rijalul');
  const isPkl = config.jenisKegiatan === 'PKL' || config.eventName?.toLowerCase().includes('pkl');

  const getTemplateUrl = () => {
    if (config.customBackgroundUrl) return config.customBackgroundUrl;
    if (isPkl) return templatePklUrl;
    if (isDirosahUla) return templateDirosahUlaUrl;
    return templatePkdUrl;
  };
  const participantNameSize = participant.name.length > 34 ? 24 : participant.name.length > 24 ? 27 : 30;
  const romanMonths: Record<string, string> = {
    Januari: 'I',
    Februari: 'II',
    Maret: 'III',
    April: 'IV',
    Mei: 'V',
    Juni: 'VI',
    Juli: 'VII',
    Agustus: 'VIII',
    September: 'IX',
    Oktober: 'X',
    November: 'XI',
    Desember: 'XII',
  };
  const numberSequence = String(parseInt((participant.number || '1').match(/\d+/)?.[0] || '1', 10));
  const issuedMonthName = Object.keys(romanMonths).find((month) => finishedDate.includes(month)) || 'Juli';
  const issuedYear = finishedDate.match(/\d{4}/)?.[0] || new Date().getFullYear().toString();
  const displayCertificateNumber = `${numberSequence}/PC-XVII/01/${romanMonths[issuedMonthName]}/${issuedYear}`;

  useEffect(() => {
    let isMounted = true;
    const generateVerificationQr = async () => {
      try {
        const signeeCount = Math.max(3, config.signees.length + 1);
        if (!participant.verificationToken) {
          if (isMounted) {
            setCertificateQrUrl('');
            setSigneeQrUrls([]);
          }
          return;
        }
        const token = participant.verificationToken;
        let cached = qrCache.get(token);
        if (!cached) {
          const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(token)}`;
          const makeQr = (url: string, width = 120) => QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width,
            color: {
              dark: '#022c22',
              light: '#ffffff'
            }
          });

          const mainQr = await makeQr(verificationUrl, 140);
          const sigQr = await makeQr(verificationUrl, 128);
          cached = { mainQr, sigQr };
          qrCache.set(token, cached);
        }
        if (isMounted) {
          setCertificateQrUrl(cached.mainQr);
          setSigneeQrUrls(Array(signeeCount).fill(cached.sigQr));
        }
      } catch (err) {
        console.error('Gagal membuat QR verifikasi sertifikat', err);
      }
    };

    generateVerificationQr();
    return () => { isMounted = false; };
  }, [participant.verificationToken, config.signees.length]);

  const renderSignatureQr = (index: number, className: string) => (
    signeeQrUrls[index] ? (
      <div className={`${className} bg-white p-[4px] border border-[#006633] shadow-sm`}>
        <img src={signeeQrUrls[index]} alt={`QR verifikasi tanda tangan ${index + 1}`} className="h-full w-full block" draggable={false} />
      </div>
    ) : null
  );

  // Render Page 1 (Front Side of Certificate)
  const renderFrontPage = () => {
    return (
      <div 
        id={`certificate-front-${participant.id}`}
        className="relative bg-white text-slate-950 w-[1123px] h-[794px] overflow-hidden select-none shadow-2xl"
        style={{ 
          fontFamily: "Arial, Helvetica, sans-serif",
          boxSizing: 'border-box'
        }}
      >
        <img
          src={getTemplateUrl()}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />

        <div
          className="absolute left-[60px] top-[271px] flex h-[32px] w-[310px] items-center justify-center text-center text-[13px] font-black text-white whitespace-nowrap"
          style={{ letterSpacing: '0px' }}
        >
          NO : {displayCertificateNumber}
        </div>

        <div
          className="absolute left-[66px] top-[403px] w-[690px] font-black uppercase whitespace-nowrap text-black"
          style={{ fontSize: participantNameSize, lineHeight: 1.05, letterSpacing: '0px' }}
        >
          {participant.name || 'NAMA PESERTA'}
        </div>

        <div className="absolute left-[66px] top-[493px] w-[710px] text-[14px] font-normal leading-[1.36] text-black">
          <p>
            Telah mengikuti Kegiatan {activityName} yang diselenggarakan oleh Pimpinan Cabang Gerakan Pemuda Ansor Kabupaten Tasikmalaya pada tanggal {config.dateText} bertempat di {config.location || 'Tasikmalaya'}.
          </p>
          <p>
            Nama tersebut diatas dinyatakan <span className="font-extrabold">Lulus</span>
          </p>
        </div>

        {/* Date Section */}
        <div className="absolute left-[66px] top-[550px] w-[950px] flex justify-end text-[14px] font-normal text-black">
          <span>Tasikmalaya, {finishedDate}</span>
        </div>

        {/* Signatures Box */}
        <div className="absolute left-[66px] top-[575px] w-[950px] text-center text-black flex flex-col items-center">
           <div className="font-extrabold text-[15px] uppercase mb-1 leading-tight">
              PIMPINAN CABANG GERAKAN PEMUDA ANSOR<br/>KABUPATEN TASIKMALAYA
           </div>
           
           <div className="flex justify-between w-[800px] mt-2">
              {/* Kiri */}
              <div className="flex flex-col items-center w-[300px]">
                 <span className="font-bold text-[14px]">{config.penandatanganSatuJabatan || (config.signees && config.signees[0]?.title) || 'Ketua'}</span>
                 <div className="h-[75px] w-full flex items-center justify-center relative my-1">
                    {config.signees && config.signees[0]?.signatureDataUrl && (
                      <img src={config.signees[0].signatureDataUrl} className="absolute max-h-[70px] max-w-[200px] object-contain z-0" draggable={false} />
                    )}
                 </div>
                 <span className="font-bold text-[14px] underline underline-offset-4 decoration-1">{config.penandatanganSatuNama || (config.signees && config.signees[0]?.name) || 'NAMA KETUA'}</span>
              </div>

              {/* Kanan */}
              <div className="flex flex-col items-center w-[300px]">
                 <span className="font-bold text-[14px]">{config.penandatanganDuaJabatan || (config.signees && config.signees[1]?.title) || 'Sekretaris'}</span>
                 <div className="h-[75px] w-full flex items-center justify-center relative my-1">
                    {config.signees && config.signees[1]?.signatureDataUrl && (
                      <img src={config.signees[1].signatureDataUrl} className="absolute max-h-[70px] max-w-[200px] object-contain z-0" draggable={false} />
                    )}
                 </div>
                 <span className="font-bold text-[14px] underline underline-offset-4 decoration-1">{config.penandatanganDuaNama || (config.signees && config.signees[1]?.name) || 'NAMA SEKRETARIS'}</span>
              </div>
           </div>
        </div>

        {certificateQrUrl && (
          <div className="absolute left-[66px] top-[746px] flex items-center gap-2 text-black">
            <div className="h-[36px] w-[36px] bg-white p-[2px] border border-[#006633]">
              <img src={certificateQrUrl} alt="QR verifikasi sertifikat" className="h-full w-full block" draggable={false} />
            </div>
            <div className="w-[380px] text-[8px] leading-[1.3]">
              Sertifikat ini di keluarkan dari Sistem Informasi dan Manajemen Kaderisasi ansor Kabupaten Tasikmalaya. Scan untuk mengecek keaslian sertifikat.
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Page 2 (Back Side of Certificate: Syllabus/Materi)
  const renderBackPage = () => {
    const materialCount = config.materi.length;
    const denseLayout = materialCount > 6;
    const ultraDenseLayout = materialCount > 10;
    const rowStyle = {
      padding: ultraDenseLayout ? '1px 7px 6px 7px' : denseLayout ? '2px 8px 8px 8px' : '2px 8px 12px 8px',
      fontSize: ultraDenseLayout ? '9.5px' : denseLayout ? '10.5px' : '12px',
      lineHeight: ultraDenseLayout ? '1.12' : '1.2',
      verticalAlign: 'middle' as const,
    };
    const headerCellStyle = {
      padding: ultraDenseLayout ? '4px 7px' : denseLayout ? '5px 8px' : '8px 10px',
      lineHeight: '1.2',
      verticalAlign: 'middle' as const,
    };
    return (
      <div 
        id={`certificate-back-${participant.id}`}
        className="relative bg-white text-slate-800 w-[1123px] h-[794px] overflow-hidden select-none flex flex-col p-[38px] shadow-2xl border-[16px] border-[#005229]"
        style={{ 
          fontFamily: "'Inter', sans-serif",
          boxSizing: 'border-box'
        }}
      >
        {/* Corners */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-[#006633] m-2 rounded-tl-lg pointer-events-none opacity-55" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t-8 border-r-8 border-[#006633] m-2 rounded-tr-lg pointer-events-none opacity-55" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-8 border-l-8 border-[#006633] m-2 rounded-bl-lg pointer-events-none opacity-55" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-[#006633] m-2 rounded-br-lg pointer-events-none opacity-55" />
        
        <div className="absolute inset-4 border pointer-events-none rounded-md" style={{ borderColor: 'rgba(0, 102, 51, 0.2)' }} />

        {/* HEADER */}
        <div className={`flex flex-col items-center text-center ${denseLayout ? 'mt-0' : 'mt-1'}`}>
          <h2 className={`${denseLayout ? 'text-[15px]' : 'text-[18px]'} font-bold text-[#006633] tracking-wide font-sans uppercase`}>
            DAFTAR MATERI PELATIHAN / KURIKULUM
          </h2>
          <h3 className={`${denseLayout ? 'text-[10px] mt-0.5' : 'text-[13px] mt-1'} font-semibold text-slate-600 tracking-wide uppercase`}>
            {config.eventName || 'Pelatihan Kepemimpinan Dasar (PKD)'} {config.subEventName ? `(${config.subEventName})` : ''}
          </h3>
          <div className={`w-[50%] h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent ${denseLayout ? 'my-0.5' : 'my-1'}`} />
        </div>

        {/* TABLE OF MATERI */}
        <div className={`flex-1 flex flex-col justify-start px-8 overflow-hidden ${denseLayout ? 'my-1' : 'my-2'}`}>
          {/* BIODATA PESERTA */}
          <div className={`flex items-start gap-6 text-slate-800 ${ultraDenseLayout ? 'mb-1.5' : denseLayout ? 'mb-2' : 'mb-4'} pl-4`}>
            {/* Foto 3x4 */}
            <div className={`border-2 border-slate-800 flex items-center justify-center bg-slate-50 shrink-0 ${ultraDenseLayout ? 'w-[75px] h-[100px]' : denseLayout ? 'w-[90px] h-[120px]' : 'w-[113px] h-[151px]'}`}>
               <span className={`text-slate-300 text-center px-2 ${ultraDenseLayout ? 'text-[8px]' : 'text-[10px]'}`}>FOTO<br/>3x4</span>
            </div>
            
            <div className={`flex flex-col justify-center mt-1 ${ultraDenseLayout ? 'space-y-1 text-[10px]' : denseLayout ? 'space-y-1.5 text-[11px]' : 'space-y-3 text-[14px]'}`}>
              <div className="flex">
                <span className="w-20 shrink-0 font-medium">Nama</span>
                <span className="font-bold">: {participant.name || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-20 shrink-0 font-medium">TTL</span>
                <span className="font-medium">
                  : {participant.tempatLahir ? `${participant.tempatLahir}, ` : ''}
                  {participant.tanggalLahir ? formatIndonesianDate(participant.tanggalLahir) : '-'}
                </span>
              </div>
              <div className="flex">
                <span className="w-20 shrink-0 font-medium">Utusan</span>
                <span className="font-medium">: {participant.institution || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-20 shrink-0 font-medium">Jabatan</span>
                <span className="font-medium">: {participant.role || '-'}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-400 overflow-hidden table-fixed">
            <thead>
              <tr className="bg-white text-slate-900 font-bold uppercase tracking-wider text-[12px] border-b-2 border-slate-400">
                <th style={headerCellStyle} className="border-r border-slate-400 align-middle text-center w-12">NO</th>
                <th style={headerCellStyle} className="border-r border-slate-400 align-middle text-center">MATERI</th>
                <th style={headerCellStyle} className="align-middle text-center w-[300px]">NARASUMBER</th>
              </tr>
            </thead>
            <tbody>
              {config.materi.length > 0 ? (
                config.materi.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td style={rowStyle} className="border-r border-slate-400 text-center font-medium">
                      {index + 1}
                    </td>
                    <td style={rowStyle} className="border-r border-slate-400 pl-4 text-left font-medium text-slate-800">
                      {item.title}
                    </td>
                    <td style={rowStyle} className="px-2 text-center font-medium text-slate-800">
                      {item.instructor || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="border-b border-slate-300 p-8 text-center text-slate-400 italic">
                    Belum ada materi pelatihan yang diinputkan. Silakan input pada menu pengaturan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM SECTION FOR PAGE 2 */}
        <div className={`flex justify-between items-end px-8 shrink-0 ${denseLayout ? 'mt-1' : 'mt-2'}`}>
          {/* Validation confirmation statement */}
          <div className="text-left max-w-[430px]">
            <p className={`${denseLayout ? 'text-[8px]' : 'text-[10px]'} text-slate-500 font-medium italic leading-relaxed`}>
              * Kurikulum ini disusun dan disahkan sesuai Standar Organisasi dan Administrasi Kaderisasi GP Ansor (PO GP Ansor).
            </p>
            <div className={`flex items-center gap-1.5 ${denseLayout ? 'mt-1 text-[9px]' : 'mt-2 text-[11px]'} font-semibold text-[#006633]`}>
              <Award className="w-4 h-4 text-amber-500" />
              Sertifikat Terakreditasi Cabang Kabupaten Tasikmalaya
            </div>
            {certificateQrUrl && (
              <div className={`${denseLayout ? 'mt-1.5' : 'mt-3'} flex items-center gap-2 text-slate-700`}>
                <div className={`${denseLayout ? 'h-[34px] w-[34px]' : 'h-[42px] w-[42px]'} bg-white p-[2px] border border-[#006633]`}>
                  <img src={certificateQrUrl} alt="QR verifikasi sertifikat" className="h-full w-full block" draggable={false} />
                </div>
                <p className="max-w-[330px] text-[8.5px] leading-snug">
                  Sertifikat ini di keluarkan dari Sistem Informasi dan Manajemen Kaderisasi ansor Kabupaten Tasikmalaya. Scan untuk mengecek keaslian sertifikat.
                </p>
              </div>
            )}
          </div>

          {/* Signatures Area */}
          <div className="flex gap-8 items-end">
            {/* Instruktur Signature (Selalu ada untuk PKD & Dirosah, diganti nama lain untuk PKL) */}
            <div className="flex flex-col items-center text-center w-[240px]">
              <p className="text-[12px] text-black font-semibold tracking-wider mb-0.5">
                {isPkl 
                  ? (config.penandatanganPklJabatan || 'TIM INSTRUKTUR WILAYAH')
                  : (config.penandatanganInstrukturJabatan || (config.signees && config.signees[2]?.title) || 'Instruktur Kaderisasi,')
                }
              </p>
              <div className={`w-full ${ultraDenseLayout ? 'h-[40px]' : denseLayout ? 'h-[60px]' : 'h-[80px]'} flex items-center justify-center`}>
                 {/* Wet signature space */}
              </div>
              <p className="text-[13px] font-bold text-black border-b border-black pb-0.5 w-full uppercase">
                {isPkl 
                  ? (config.penandatanganPklNama || 'NAMA INSTRUKTUR WILAYAH')
                  : (config.penandatanganInstrukturNama || (config.signees && config.signees[2]?.name) || 'Iman Nurjaman, M.Pd')
                }
              </p>
            </div>

            {/* Ketua MDS Rijalul Ansor (Khusus Dirosah Ula) */}
            {isDirosahUla && (
              <div className="flex flex-col items-center text-center w-[240px]">
                <p className="text-[12px] text-black font-semibold tracking-wider mb-0.5">
                  {config.penandatanganDirosahJabatan || 'Ketua MDS Rijalul Ansor,'}
                </p>
                <div className={`w-full ${ultraDenseLayout ? 'h-[40px]' : denseLayout ? 'h-[60px]' : 'h-[80px]'} flex items-center justify-center`}>
                   {/* Wet signature space */}
                </div>
                <p className="text-[13px] font-bold text-black border-b border-black pb-0.5 w-full uppercase">
                  {config.penandatanganDirosahNama || 'NAMA KETUA MDS'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    exportMode ? (
      !showBackPage ? renderFrontPage() : renderBackPage()
    ) : (
    <div className="flex flex-col items-center gap-8 overflow-auto py-4">
      {/* Container to scale down the massive 1123px width certificate to fit elegantly in the screen view */}
      <div className="origin-top scale-[0.45] md:scale-[0.6] lg:scale-[0.72] xl:scale-[0.85] h-[360px] md:h-[480px] lg:h-[580px] xl:h-[680px] transition-transform duration-300">
        {!showBackPage ? renderFrontPage() : renderBackPage()}
      </div>
    </div>
    )
  );
}

function arePropsEqual(prev: CertificatePreviewProps, next: CertificatePreviewProps) {
  return (
    prev.showBackPage === next.showBackPage &&
    prev.exportMode === next.exportMode &&
    prev.participant === next.participant &&
    prev.config.title === next.config.title &&
    prev.config.eventName === next.config.eventName &&
    prev.config.subEventName === next.config.subEventName &&
    prev.config.location === next.config.location &&
    prev.config.dateText === next.config.dateText &&
    prev.config.issuedDateText === next.config.issuedDateText &&
    prev.config.ketuaPelaksana === next.config.ketuaPelaksana &&
    prev.config.customBackgroundUrl === next.config.customBackgroundUrl &&
    prev.config.jenisKegiatan === next.config.jenisKegiatan &&
    prev.config.penandatanganPklNama === next.config.penandatanganPklNama &&
    prev.config.penandatanganPklJabatan === next.config.penandatanganPklJabatan &&
    prev.config.materi === next.config.materi &&
    prev.config.signees === next.config.signees
  );
}

export default memo(CertificatePreviewComponent, arePropsEqual);
