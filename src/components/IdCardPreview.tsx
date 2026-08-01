import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Pendaftaran, IdCardConfig, Kegiatan } from '../types';
import defaultIdCardTemplate from '../assets/template-idcard.png';

interface IdCardPreviewProps {
  pendaftaran: Pendaftaran;
  config: IdCardConfig;
  kegiatan?: Kegiatan; // Added to get jenisKegiatan
}

export default function IdCardPreview({ pendaftaran, config, kegiatan }: IdCardPreviewProps) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      try {
        if (!pendaftaran.tokenKehadiran) {
          if (isMounted) setQrUrl('');
          return;
        }
        
        const url = await QRCode.toDataURL(pendaftaran.tokenKehadiran, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 300,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        if (isMounted) setQrUrl(url);
      } catch (err) {
        console.error('Failed to generate QR for ID card', err);
      }
    };
    generateQr();
    return () => { isMounted = false; };
  }, [pendaftaran.tokenKehadiran]);

  // Hardcoded coordinates matching the template (ignoring old config if any to ensure correct position)
  const nameCoords = { x: 270, y: 392, fontSize: 26, align: 'center' };
  const pacCoords = { x: 270, y: 494, fontSize: 22, align: 'center' };
  const qrCoords = { x: 136, y: 692, size: 175 }; // size is now the outer white box
  
  // Custom coords for the new event type texts
  const eventTypeCoords = { x: 270, y: 265, fontSize: 72, align: 'center' };
  const eventDescCoords = { x: 270, y: 310, fontSize: 18, align: 'center' };

  const jenisKegiatan = kegiatan?.jenisKegiatan || 'PKD';
  const descKegiatan = jenisKegiatan === 'PKD' ? 'PELATIHAN KEPEMIMPINAN DASAR' :
                       jenisKegiatan === 'PKL' ? 'PELATIHAN KEPEMIMPINAN LANJUTAN' : 
                       'DIROSAH ULA';

  // Helper untuk menyingkat nama jika terlalu panjang (> 20 karakter)
  const formatNameForIdCard = (name: string) => {
    if (name.length <= 20) return name.toUpperCase();
    const words = name.trim().split(/\s+/);
    if (words.length > 2) {
      const firstTwo = words.slice(0, 2).join(' ');
      const rest = words.slice(2).map(w => w.charAt(0) + '.').join(' ');
      return `${firstTwo} ${rest}`.toUpperCase();
    }
    return name.toUpperCase();
  };

  return (
    <div 
      className="relative bg-white overflow-hidden shadow-2xl id-card-container"
      style={{ 
        width: '540px', 
        height: '860px', 
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box'
      }}
    >
      {/* Background Template */}
      <img
        src={config.templateUrl || defaultIdCardTemplate}
        alt="ID Card Template"
        className="absolute inset-0 w-full h-full object-cover z-0"
        draggable={false}
        onError={(e) => {
          // If the asset doesn't exist yet, show the placeholder box
          (e.target as HTMLElement).style.display = 'none';
          const next = (e.target as HTMLElement).nextElementSibling;
          if (next) (next as HTMLElement).style.display = 'flex';
        }}
      />
      <div 
        className="absolute inset-0 bg-[#004d36] flex-col items-center justify-center text-white/50 border-4 border-dashed border-white/30 z-0"
        style={{ display: 'none' }}
      >
        <span>Simpan file template-idcard.jpg di folder public/</span>
        <span className="text-xs mt-2">Atau unggah secara manual</span>
      </div>

      {/* Jenis Kegiatan Text (e.g., PKD) */}
      <div 
        className="absolute z-10 whitespace-nowrap"
        style={{
          left: `${eventTypeCoords.x}px`,
          top: `${eventTypeCoords.y}px`,
          transform: eventTypeCoords.align === 'center' ? 'translate(-50%, -50%)' : eventTypeCoords.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          fontSize: `${eventTypeCoords.fontSize}px`,
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '0.05em'
        }}
      >
        {jenisKegiatan}
      </div>

      {/* Kepanjangan Jenis Kegiatan Text */}
      <div 
        className="absolute z-10 whitespace-nowrap"
        style={{
          left: `${eventDescCoords.x}px`,
          top: `${eventDescCoords.y}px`,
          transform: eventDescCoords.align === 'center' ? 'translate(-50%, -50%)' : eventDescCoords.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          fontSize: `${eventDescCoords.fontSize}px`,
          fontWeight: 800,
          color: '#facc15', // yellow-400
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          letterSpacing: '0.02em'
        }}
      >
        {descKegiatan}
      </div>

      {/* Name Text */}
      <div 
        className="absolute z-10 whitespace-nowrap w-[380px] text-center overflow-hidden text-ellipsis"
        style={{
          left: `${nameCoords.x}px`,
          top: `${nameCoords.y}px`,
          transform: nameCoords.align === 'center' ? 'translate(-50%, -50%)' : nameCoords.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          fontSize: `${nameCoords.fontSize}px`,
          fontWeight: 900,
          color: '#0f172a', // text-slate-900
        }}
      >
        {formatNameForIdCard(pendaftaran.nama)}
      </div>

      {/* PAC / Origin Text */}
      <div 
        className="absolute z-10 whitespace-nowrap w-[380px] text-center overflow-hidden text-ellipsis"
        style={{
          left: `${pacCoords.x}px`,
          top: `${pacCoords.y}px`,
          transform: pacCoords.align === 'center' ? 'translate(-50%, -50%)' : pacCoords.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          fontSize: `${pacCoords.fontSize}px`,
          fontWeight: 800,
          color: '#0f172a',
        }}
      >
        {pendaftaran.asalPac.toUpperCase()}
      </div>

      {/* QR Code Layer */}
      {qrUrl && (
        <div 
          className="absolute z-10 flex items-center justify-center bg-white shadow-xl"
          style={{
            left: `${qrCoords.x}px`,
            top: `${qrCoords.y}px`,
            width: `${qrCoords.size}px`,
            height: `${qrCoords.size}px`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '28px',
            padding: '18px'
          }}
        >
          <img src={qrUrl} alt="QR Kehadiran" className="w-full h-full object-contain pointer-events-none" />
        </div>
      )}
      
    </div>
  );
}
