import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Kegiatan, Pendaftaran, AbsensiMateri } from '../types';
import { getPendaftaranByKegiatan, getAbsensiMateri, insertAbsensiMateri } from '../supabaseDatabase';
import { QrCode, AlertCircle, CheckCircle, Search, Clock, ListChecks } from 'lucide-react';

interface Props {
  kegiatanList: Kegiatan[];
}

export default function AbsensiScan({ kegiatanList }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  
  const [pendaftarList, setPendaftarList] = useState<Pendaftaran[]>([]);
  const pendaftarListRef = useRef<Pendaftaran[]>([]);
  
  const [absensiList, setAbsensiList] = useState<AbsensiMateri[]>([]);
  const absensiListRef = useRef<AbsensiMateri[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [successPopup, setSuccessPopup] = useState<Pendaftaran | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  
  useEffect(() => {
    pendaftarListRef.current = pendaftarList;
  }, [pendaftarList]);

  useEffect(() => {
    absensiListRef.current = absensiList;
  }, [absensiList]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const availableKegiatans = kegiatanList.filter(k => k.status !== 'draft');

  useEffect(() => {
    if (availableKegiatans.length > 0 && !selectedKegiatanId) {
      setSelectedKegiatanId(availableKegiatans[0].id);
    }
  }, [availableKegiatans, selectedKegiatanId]);

  const activeKegiatan = kegiatanList.find(k => k.id === selectedKegiatanId);
  const activeMateri = activeKegiatan?.materi.find(m => m.aktif);

  useEffect(() => {
    if (!selectedKegiatanId || !activeMateri) {
      setAbsensiList([]);
      setPendaftarList([]);
      return;
    }

    setLoading(true);
    Promise.all([
      getPendaftaranByKegiatan(selectedKegiatanId),
      getAbsensiMateri(selectedKegiatanId, activeMateri.id)
    ])
    .then(([pendaftarData, absensiData]) => {
      setPendaftarList(pendaftarData as Pendaftaran[]);
      setAbsensiList(absensiData as AbsensiMateri[]);
    })
    .catch(err => {
      console.error('Gagal memuat data', err);
    })
    .finally(() => setLoading(false));
  }, [selectedKegiatanId, activeMateri]);

  useEffect(() => {
    // Setup Scanner
    if (!activeMateri) return; // Don't start scanner if no active materi

    let html5QrCode: Html5Qrcode | null = null;
    let isScanning = false;

    try {
      // Ensure the element actually exists before instantiating
      if (!document.getElementById('reader')) {
        console.warn('Element reader not found yet');
        return;
      }
      
      html5QrCode = new Html5Qrcode("reader");
    } catch (e) {
      console.error("Gagal inisialisasi scanner:", e);
      return;
    }

    const startScanner = async () => {
      try {
        if (!html5QrCode) return;
        isScanning = true;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => handleScanSuccess(decodedText),
          () => {} // ignore errors
        );
      } catch (err) {
        console.error("Gagal menggunakan kamera belakang, mencoba kamera depan...", err);
        try {
          if (!html5QrCode) return;
          // Fallback to user camera
          await html5QrCode.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => handleScanSuccess(decodedText),
            () => {} 
          );
        } catch (e) {
          console.error("Scanner failed to start completely.", e);
          isScanning = false;
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              html5QrCode?.clear();
            }).catch(err => console.error("Failed to stop scanner", err));
          } else {
            html5QrCode.clear();
          }
        } catch (e) {
          console.error("Error during cleanup", e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMateri]); // Removed pendaftarList from dependencies!

  const processAbsensi = async (pendaftar: Pendaftaran, metode: 'scan' | 'manual') => {
    if (!activeKegiatan || !activeMateri) return;
    
    // Check if already exist in list locally first to save DB call
    const currentAbsensiList = absensiListRef.current;
    if (currentAbsensiList.some(a => a.pendaftaranId === pendaftar.id)) {
      setScanMessage({ type: 'error', text: `${pendaftar.nama} sudah absen sebelumnya!` });
      return;
    }

    setIsProcessing(true);
    try {
      await insertAbsensiMateri({
        kegiatan_id: activeKegiatan.id,
        materi_id: activeMateri.id,
        pendaftaran_id: pendaftar.id,
        metode: metode
      });
      
      setScanMessage({ type: 'success', text: `Berhasil: ${pendaftar.nama} hadir!` });
      
      if (metode === 'scan') {
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        setSuccessPopup(pendaftar);
        setTimeout(() => setSuccessPopup(null), 3000);
      }
      
      // Refresh absensi list directly to avoid flashing the scanner
      const newAbsen = await getAbsensiMateri(activeKegiatan.id, activeMateri.id);
      setAbsensiList(newAbsen as AbsensiMateri[]);
      
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || 'Gagal absen.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanMessage(null), 3000); // Clear message after 3s
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    if (isProcessingRef.current) return; // Prevent double scan while processing
    
    // Find pendaftar by token using REF
    const currentPendaftarList = pendaftarListRef.current;
    const pendaftar = currentPendaftarList.find(p => p.tokenKehadiran === decodedText);
    
    if (!pendaftar) {
      setScanMessage({ type: 'error', text: 'QR Code tidak valid atau bukan peserta kegiatan ini.' });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    processAbsensi(pendaftar, 'scan');
  };

  const [manualSearch, setManualSearch] = useState('');
  const manualFiltered = manualSearch.length > 2 
    ? pendaftarList.filter(p => 
        (p.status === 'checkin' || p.status === 'fiks') && 
        p.nama.toLowerCase().includes(manualSearch.toLowerCase()) &&
        !absensiList.some(a => a.pendaftaranId === p.id) // Only show those who haven't absened
      )
    : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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

      {!activeMateri ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-2xl font-black text-amber-800">Tidak Ada Materi Aktif</h2>
          <p className="text-amber-700 mt-2 max-w-md">
            Silakan atur salah satu sesi materi menjadi "Aktif" melalui menu <b>Jadwal Materi & Narasumber</b> terlebih dahulu agar sistem absensi dapat menerima scan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Scanner Panel */}
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Materi Sedang Berlangsung</h2>
              <div className="text-2xl font-black text-slate-900 leading-tight">{activeMateri.title}</div>
              <div className="text-sm font-bold text-slate-500 mt-1">{activeMateri.instructor || 'Tanpa Instruktur'}</div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeMateri.jamMulai} - {activeMateri.jamSelesai}</span>
                <span>•</span>
                <span>{activeMateri.ruangan || '-'}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center">
              <h3 className="w-full text-left font-black text-slate-800 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#006633]" /> Scan QR Peserta
              </h3>
              
              <div className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-slate-100 mb-6 bg-slate-50">
                <div id="reader" className="w-full"></div>
              </div>

              {/* Status Message Display */}
              <div className={`w-full py-4 px-6 rounded-xl font-bold flex items-center gap-3 transition-all ${
                scanMessage?.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                scanMessage?.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-slate-50 text-slate-400 border border-transparent'
              }`}>
                {scanMessage?.type === 'success' ? <CheckCircle className="w-6 h-6" /> :
                 scanMessage?.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
                 <QrCode className="w-6 h-6 opacity-50" />}
                <span className="flex-1">{scanMessage?.text || 'Arahkan QR Code pada ID Card ke layar kamera'}</span>
              </div>
            </div>

            {/* Manual Input Fallback */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" /> Absen Manual (Darurat)
              </h3>
              <input 
                type="text" 
                placeholder="Ketik minimal 3 huruf nama peserta..." 
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#006633]"
              />
              
              {manualFiltered.length > 0 && (
                <div className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50 max-h-40 overflow-y-auto">
                  {manualFiltered.map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center bg-white">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{p.nama}</div>
                        <div className="text-xs text-slate-500">{p.asalPac}</div>
                      </div>
                      <button 
                        onClick={() => { processAbsensi(p, 'manual'); setManualSearch(''); }}
                        className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                      >
                        Hadir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* List Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">Daftar Hadir</h3>
                  <p className="text-xs text-slate-500">{absensiList.length} orang telah terabsen</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium">Memuat data kehadiran...</div>
              ) : absensiList.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ListChecks className="w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-600">Belum Ada Yang Hadir</h3>
                  <p className="text-slate-400 text-xs mt-1">Daftar kehadiran akan muncul saat QR discan.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {absensiList.map((a, i) => (
                    <div key={a.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="text-slate-400 font-bold text-sm pt-1">{i + 1}.</div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {a.pendaftar?.nama || 'Peserta Tidak Dikenal'}
                          {a.metode === 'manual' && <span className="text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Manual</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{a.pendaftar?.asalPac}</div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(a.waktuAbsen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Success Popup Overlay */}
      {successPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-transform duration-300 scale-100">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Berhasil Hadir!</h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
              <p className="text-xl font-black text-[#006633]">{successPopup.nama}</p>
              <p className="text-sm font-bold text-slate-500 mt-1">{successPopup.asalPac}</p>
            </div>
            <button 
              onClick={() => setSuccessPopup(null)}
              className="w-full bg-[#006633] hover:bg-green-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg shadow-green-900/20"
            >
              Tutup & Lanjut Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
