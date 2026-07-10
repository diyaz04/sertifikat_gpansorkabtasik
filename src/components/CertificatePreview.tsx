import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Participant, CertificateConfig } from '../types';
import { formatIndonesianDate } from '../utils';
import { Award } from 'lucide-react';
import templatePkdUrl from '../assets/template-pkd.jpg';
import ansorLogoUrl from '../assets/logo-ansor.png';

interface CertificatePreviewProps {
  participant: Participant;
  config: CertificateConfig;
  showBackPage?: boolean;
  exportMode?: boolean;
}

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

export default function CertificatePreview({ participant, config, showBackPage = false, exportMode = false }: CertificatePreviewProps) {
  const [certificateQrUrl, setCertificateQrUrl] = useState('');
  const [signeeQrUrls, setSigneeQrUrls] = useState<string[]>([]);
  const totalJP = config.materi.reduce((sum, item) => sum + Number(item.hours), 0);
  const finishedDate = config.issuedDateText || config.dateText;
  const activityName = config.eventName?.toLowerCase().includes('pkd')
    ? 'Pelatihan Kepemimpinan Dasar (PKD)'
    : (config.eventName || 'Pelatihan Kepemimpinan Dasar (PKD)');
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
    const generateVerificationQr = async () => {
      try {
        const certificateSignees = [
          ...config.signees.map(s => ({ n: s.name, t: s.title })),
          { n: config.ketuaPelaksana || 'Ketua Pelaksana', t: 'Ketua Pelaksana' }
        ];
        if (!participant.verificationToken) {
          setCertificateQrUrl('');
          setSigneeQrUrls([]);
          return;
        }
        const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(participant.verificationToken)}`;
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
        const sigQrs = await Promise.all(certificateSignees.map(() => makeQr(verificationUrl, 128)));
        setCertificateQrUrl(mainQr);
        setSigneeQrUrls(sigQrs);
      } catch (err) {
        console.error('Gagal membuat QR verifikasi sertifikat', err);
      }
    };

    generateVerificationQr();
  }, [participant, config, displayCertificateNumber]);

  const renderSignatureQr = (index: number, className: string) => (
    signeeQrUrls[index] ? (
      <div className={`${className} bg-white p-[4px] border border-emerald-900 shadow-sm`}>
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
          src={templatePkdUrl}
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

        {config.signees[0]?.signatureDataUrl && (
          <img
            src={config.signees[0].signatureDataUrl}
            alt=""
            className="absolute left-[115px] top-[625px] max-h-[95px] max-w-[190px] object-contain"
            draggable={false}
          />
        )}

        {renderSignatureQr(0, 'absolute left-[196px] top-[649px] h-[64px] w-[64px]')}

        {config.signees[1]?.signatureDataUrl && (
          <img
            src={config.signees[1].signatureDataUrl}
            alt=""
            className="absolute left-[495px] top-[625px] max-h-[95px] max-w-[190px] object-contain"
            draggable={false}
          />
        )}

        {renderSignatureQr(1, 'absolute left-[531px] top-[649px] h-[64px] w-[64px]')}

        <div className="absolute left-[700px] top-[598px] w-[340px] text-center text-[14px] font-normal text-black leading-[26px]">
          Tasikmalaya, {finishedDate}
        </div>

        <div
          className="absolute left-[710px] top-[716px] w-[300px] text-center text-[13px] font-semibold leading-[1.05] text-black"
          style={{ textDecoration: 'underline', textDecorationThickness: '1px', textUnderlineOffset: '2px' }}
        >
          {config.ketuaPelaksana || 'Ketua Pelaksana'}
        </div>

        {renderSignatureQr(2, 'absolute left-[828px] top-[649px] h-[64px] w-[64px]')}

        {certificateQrUrl && (
          <div className="absolute left-[66px] top-[746px] flex items-center gap-2 text-black">
            <div className="h-[36px] w-[36px] bg-white p-[2px] border border-emerald-900">
              <img src={certificateQrUrl} alt="QR verifikasi sertifikat" className="h-full w-full block" draggable={false} />
            </div>
            <div className="w-[300px] text-[7.5px] leading-[1.2]">
              <span className="font-bold">Sertifikat ini telah ditandatangani secara digital</span>
              <br />
              dengan Sistem Manajemen Kaderisasi PC Ansor Kab. Tasikmalaya. Pindai QR untuk verifikasi keaslian sertifikat.
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Page 2 (Back Side of Certificate: Syllabus/Materi)
  const renderBackPage = () => {
    const materialCount = config.materi.length;
    const denseLayout = materialCount > 9;
    const ultraDenseLayout = materialCount > 12;
    const rowStyle = {
      padding: ultraDenseLayout ? '4px 7px' : denseLayout ? '5px 8px' : '8px',
      fontSize: ultraDenseLayout ? '9.5px' : denseLayout ? '10.5px' : '12px',
      lineHeight: ultraDenseLayout ? '1.12' : '1.2',
      verticalAlign: 'middle' as const,
    };
    const headerCellStyle = {
      padding: ultraDenseLayout ? '5px 7px' : denseLayout ? '6px 8px' : '10px',
      lineHeight: '1.2',
      verticalAlign: 'middle' as const,
    };
    return (
      <div 
        id={`certificate-back-${participant.id}`}
        className="relative bg-white text-slate-800 w-[1123px] h-[794px] overflow-hidden select-none flex flex-col p-[38px] shadow-2xl border-[16px] border-emerald-950"
        style={{ 
          fontFamily: "'Inter', sans-serif",
          boxSizing: 'border-box'
        }}
      >
        {/* Corners */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-emerald-800 m-2 rounded-tl-lg pointer-events-none opacity-55" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t-8 border-r-8 border-emerald-800 m-2 rounded-tr-lg pointer-events-none opacity-55" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-8 border-l-8 border-emerald-800 m-2 rounded-bl-lg pointer-events-none opacity-55" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-emerald-800 m-2 rounded-br-lg pointer-events-none opacity-55" />
        
        <div className="absolute inset-4 border pointer-events-none rounded-md" style={{ borderColor: 'rgba(6, 95, 70, 0.2)' }} />

        {/* HEADER */}
        <div className={`flex flex-col items-center text-center ${denseLayout ? 'mt-0' : 'mt-1'}`}>
          <h2 className={`${denseLayout ? 'text-[15px]' : 'text-[18px]'} font-bold text-emerald-900 tracking-wide font-sans uppercase`}>
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
          <div className={`border rounded-xl grid grid-cols-2 text-slate-800 ${denseLayout ? 'p-2 mb-1.5 gap-3 text-[9.5px]' : 'p-3 mb-3 gap-4 text-xs'}`} style={{ backgroundColor: 'rgba(236, 253, 245, 0.4)', borderColor: 'rgba(209, 250, 229, 0.6)' }}>
            <div className={denseLayout ? 'space-y-0.5' : 'space-y-1.5'}>
              <div className="flex">
                <span className="font-bold text-slate-500 w-28 shrink-0">Nama Lengkap</span>
                <span className="font-bold text-emerald-950">: {participant.name || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-500 w-28 shrink-0">Utusan Peserta</span>
                <span className="font-semibold text-slate-800">: {participant.institution || '-'}</span>
              </div>
            </div>
            <div className={denseLayout ? 'space-y-0.5' : 'space-y-1.5'}>
              <div className="flex">
                <span className="font-bold text-slate-500 w-36 shrink-0">Tempat, Tanggal Lahir</span>
                <span className="font-semibold text-slate-800">
                  : {participant.tempatLahir ? `${participant.tempatLahir}, ` : ''}
                  {participant.tanggalLahir ? formatIndonesianDate(participant.tanggalLahir) : '-'}
                </span>
              </div>
              <div className="flex">
                <span className="font-bold text-slate-500 w-36 shrink-0">Nomor Sertifikat</span>
                <span className="font-mono font-bold text-slate-800">: {displayCertificateNumber || '-'}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-300 rounded-lg overflow-hidden shadow-sm table-fixed">
            <thead>
              <tr className="bg-emerald-800 text-white font-sans uppercase tracking-wider text-[11px]">
                <th style={headerCellStyle} className="border border-slate-300 align-middle text-center w-10">No</th>
                <th style={headerCellStyle} className="border border-slate-300 align-middle text-left">Materi Pokok / Sub-Materi</th>
                <th style={headerCellStyle} className="border border-slate-300 align-middle w-[125px] text-center">Jam Pelajaran (JP)</th>
                <th style={headerCellStyle} className="border border-slate-300 align-middle w-[230px] text-left">Narasumber / Instruktur</th>
              </tr>
            </thead>
            <tbody>
              {config.materi.length > 0 ? (
                config.materi.map((item, index) => (
                  <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? 'rgba(248, 250, 252, 0.75)' : '#ffffff' }}>
                    <td style={rowStyle} className="border border-slate-300 align-middle text-center font-mono">{index + 1}</td>
                    <td style={rowStyle} className="border border-slate-300 align-middle text-left font-medium text-slate-800 break-words">{item.title}</td>
                    <td style={rowStyle} className="border border-slate-300 align-middle text-center font-mono whitespace-nowrap">{item.hours} JP</td>
                    <td style={rowStyle} className="border border-slate-300 align-middle text-left text-slate-600 font-medium break-words">{item.instructor || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="border border-slate-300 p-8 text-center text-slate-400 italic">
                    Belum ada materi pelatihan yang diinputkan. Silakan input pada menu pengaturan.
                  </td>
                </tr>
              )}
              {/* Total Jam Pelajaran Row */}
              <tr className="font-bold text-emerald-950" style={{ backgroundColor: 'rgba(236, 253, 245, 0.7)' }}>
                <td colSpan={2} style={headerCellStyle} className="border border-slate-300 align-middle text-right uppercase tracking-wider text-[10px]">
                  Total Alokasi Jam Pelajaran
                </td>
                <td style={headerCellStyle} className="border border-slate-300 align-middle text-center font-mono text-[11px]">
                  {totalJP} JP
                </td>
                <td style={headerCellStyle} className="border border-slate-300 align-middle bg-white"></td>
              </tr>
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
            <div className={`flex items-center gap-1.5 ${denseLayout ? 'mt-1 text-[9px]' : 'mt-2 text-[11px]'} font-semibold text-emerald-800`}>
              <Award className="w-4 h-4 text-amber-500" />
              Sertifikat Terakreditasi Cabang Kabupaten Tasikmalaya
            </div>
            {certificateQrUrl && (
              <div className={`${denseLayout ? 'mt-1.5' : 'mt-3'} flex items-center gap-2 text-slate-700`}>
                <div className={`${denseLayout ? 'h-[34px] w-[34px]' : 'h-[42px] w-[42px]'} bg-white p-[2px] border border-emerald-900`}>
                  <img src={certificateQrUrl} alt="QR verifikasi sertifikat" className="h-full w-full block" draggable={false} />
                </div>
                <p className="max-w-[330px] text-[8.5px] leading-snug">
                  Sertifikat ini telah ditandatangani secara digital dengan Sistem Manajemen Kaderisasi PC Ansor Kab. Tasikmalaya. Pindai QR untuk verifikasi keaslian.
                </p>
              </div>
            )}
          </div>

          {/* Instruktur/Tim Kaderisasi Signature */}
          <div className="flex flex-col items-center text-center w-[200px]">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
              Disahkan di Tasikmalaya,
            </p>
            <p className="text-[10px] text-emerald-900 uppercase font-black tracking-wider leading-tight">
              TIM INSTRUKTUR CABANG
            </p>
            <div className={`flex ${denseLayout ? 'h-[48px]' : 'h-[68px]'} items-center justify-center`}>
              {signeeQrUrls[1] && (
                <div className={`${denseLayout ? 'h-[44px] w-[44px]' : 'h-[58px] w-[58px]'} bg-white p-[4px] border border-emerald-900 shadow-sm`}>
                  <img src={signeeQrUrls[1]} alt="QR verifikasi tanda tangan tim instruktur" className="h-full w-full block" draggable={false} />
                </div>
              )}
            </div>
            <p className="text-[12px] font-extrabold text-slate-800 border-b border-slate-300 pb-0.5 w-full">
              Iman Nurjaman, M.Pd
            </p>
            <p className="text-[8px] font-mono text-slate-400 tracking-wider">
              Bidang Kaderisasi
            </p>
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
