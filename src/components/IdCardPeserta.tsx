import React, { useEffect, useState, useRef } from 'react';
import { Kegiatan, Pendaftaran, IdCardConfig } from '../types';
import { getPendaftaranByKegiatan, markIdCardGenerated } from '../supabaseDatabase';
import { Printer, Upload, Settings, RefreshCw, AlertCircle, X } from 'lucide-react';
import IdCardPreview from './IdCardPreview';

interface Props {
  kegiatanList: Kegiatan[];
  idCardConfig: IdCardConfig;
  setIdCardConfig: React.Dispatch<React.SetStateAction<IdCardConfig>>;
}

export default function IdCardPeserta({ kegiatanList, idCardConfig, setIdCardConfig }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  const [pendaftarList, setPendaftarList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Printing state
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printTargets, setPrintTargets] = useState<Pendaftaran[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableKegiatans = kegiatanList.filter(k => k.status !== 'draft');
  const activeKegiatan = availableKegiatans.find(k => k.id === selectedKegiatanId);

  useEffect(() => {
    if (availableKegiatans.length > 0 && !selectedKegiatanId) {
      setSelectedKegiatanId(availableKegiatans[0].id);
    }
  }, [availableKegiatans, selectedKegiatanId]);

  useEffect(() => {
    if (!selectedKegiatanId) {
      setPendaftarList([]);
      return;
    }

    setLoading(true);
    getPendaftaranByKegiatan(selectedKegiatanId)
      .then(data => {
        // ID cards are only for those who have checked in or fiks
        const eligible = data.filter(p => p.status === 'checkin' || p.status === 'fiks');
        setPendaftarList(eligible as Pendaftaran[]);
      })
      .catch(err => {
        alert('Gagal mengambil data peserta: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedKegiatanId]);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIdCardConfig(prev => ({ ...prev, templateUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = async (targets: Pendaftaran[]) => {
    setPrintTargets(targets);
    setIsPrintMode(true);
    
    // Give DOM time to render the print view
    setTimeout(async () => {
      window.print();
      
      // Update DB to mark them as generated
      try {
        for (const target of targets) {
          if (!target.idCardGeneratedAt) {
            await markIdCardGenerated(target.id);
          }
        }
        // Update local state without refetching immediately
        setPendaftarList(prev => prev.map(p => 
          targets.some(t => t.id === p.id) ? { ...p, idCardGeneratedAt: new Date().toISOString() } : p
        ));
      } catch (err) {
        console.error('Gagal menandai idCardGeneratedAt', err);
      }
      
      setIsPrintMode(false);
      setPrintTargets([]);
    }, 1000);
  };

  // If we are in print mode, ONLY render the print layout
  if (isPrintMode) {
    return (
      <div className="bg-white min-h-screen p-0 m-0 print-only-container">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .print-only-container, .print-only-container * { visibility: visible; }
              .print-only-container { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 200mm; /* Fit for F4 (210mm) minus margins */
                display: flex; 
                flex-wrap: wrap; 
                gap: 2mm; 
                justify-content: flex-start;
                align-content: flex-start;
                padding-top: 5mm;
                padding-left: 2mm;
              }
              @page { 
                size: 215mm 330mm; /* F4 paper size */ 
                margin: 0mm; 
              }
            }
          `}
        </style>
        {printTargets.map(p => (
          <div key={p.id} className="id-card-print-wrapper" style={{ 
            width: '65mm', 
            height: '105mm', 
            position: 'relative', 
            overflow: 'hidden', 
            pageBreakInside: 'avoid',
            border: '1px dashed #ccc', // Panduan potong
            boxSizing: 'border-box'
          }}>
            {/* Scale down 540x860 px to fit 65x105 mm. 
                65mm ~ 245px. 245 / 540 = 0.453 
            */}
            <div style={{ transform: 'scale(0.455)', transformOrigin: 'top left', width: '540px', height: '860px' }}>
              <IdCardPreview 
                pendaftaran={p} 
                config={idCardConfig} 
                kegiatan={availableKegiatans.find(k => k.id === p.kegiatanId)} 
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const printedCount = pendaftarList.filter(p => p.idCardGeneratedAt).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Settings / Config Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start">
        
        <div className="space-y-4 flex-1">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" /> Pengaturan ID Card
          </h2>
          <p className="text-sm text-slate-500">Unggah template (potret 54x86 mm) dan cetak kartu untuk peserta yang telah tervalidasi atau check-in.</p>
          
          <div className="flex gap-4 items-center mt-4">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleTemplateUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-100 flex items-center gap-2 border border-blue-200 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Template Gambar
            </button>
            {idCardConfig.templateUrl && (
              <button 
                onClick={() => setIdCardConfig(prev => ({ ...prev, templateUrl: undefined }))}
                className="text-red-500 hover:bg-red-50 p-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" /> Hapus
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1 w-full md:w-1/3">
          <label className="text-xs font-bold text-slate-500 uppercase">Pilih Kaderisasi</label>
          <select 
            value={selectedKegiatanId} 
            onChange={e => setSelectedKegiatanId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#006633]"
          >
            {availableKegiatans.map(k => (
              <option key={k.id} value={k.id}>{k.judulKegiatan}</option>
            ))}
            {availableKegiatans.length === 0 && <option value="">Belum ada kaderisasi aktif</option>}
          </select>
        </div>

      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Preview Panel */}
        <div className="w-full lg:w-[580px] shrink-0 bg-slate-100 p-6 rounded-2xl flex items-center justify-center min-h-[600px] border border-slate-200 shadow-inner">
          <div className="shadow-2xl rounded-xl overflow-hidden" style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
            <IdCardPreview 
              pendaftaran={pendaftarList.length > 0 ? pendaftarList[0] : {
                id: 'dummy',
                kegiatanId: 'dummy',
                nama: 'NAMA PESERTA CONTOH',
                tempatLahir: 'Tasikmalaya',
                tanggalLahir: '1999-01-01',
                asalPac: 'PAC CONTOH KECAMATAN',
                noHp: '08123456789',
                alamat: '',
                jawabanCustom: {},
                status: 'checkin',
                tokenKehadiran: 'dummy-uuid-qr-code',
                createdAt: new Date().toISOString()
              }} 
              config={idCardConfig} 
              kegiatan={activeKegiatan}
            />
          </div>
        </div>

        {/* List Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-black text-slate-800">Daftar Cetak Peserta</h3>
              <p className="text-xs text-slate-500">{printedCount} dari {pendaftarList.length} kartu tercetak</p>
            </div>
            <button 
              onClick={() => handlePrint(pendaftarList)}
              disabled={pendaftarList.length === 0}
              className="bg-[#006633] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak Massal ({pendaftarList.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[700px]">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm font-medium">Memuat data peserta...</span>
              </div>
            ) : pendaftarList.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-600">Tidak Ada Peserta Valid</h3>
                <p className="text-slate-400 text-xs mt-1">Hanya peserta berstatus Check-in atau Fiks yang dapat dicetak kartunya.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendaftarList.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{p.nama}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{p.asalPac}</span>
                        {p.idCardGeneratedAt ? (
                          <span className="text-[9px] font-black uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Tercetak</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Belum Cetak</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePrint([p])}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      title="Cetak Kartu Ini Saja"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
