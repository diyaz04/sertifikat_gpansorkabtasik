import React, { useState, useEffect } from 'react';
import { Kegiatan, MateriItem } from '../types';
import { Plus, Trash2, CheckCircle, Circle, Save } from 'lucide-react';

interface Props {
  kegiatanList: Kegiatan[];
  setKegiatanList: React.Dispatch<React.SetStateAction<Kegiatan[]>>;
}

export default function JadwalMateri({ kegiatanList, setKegiatanList }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  
  const availableKegiatans = kegiatanList.filter(k => k.status !== 'draft');

  useEffect(() => {
    if (availableKegiatans.length > 0 && !selectedKegiatanId) {
      setSelectedKegiatanId(availableKegiatans[0].id);
    }
  }, [availableKegiatans, selectedKegiatanId]);

  const activeKegiatan = kegiatanList.find(k => k.id === selectedKegiatanId);

  const handleUpdateMateri = (materiId: string, updates: Partial<MateriItem>) => {
    setKegiatanList(prev => prev.map(k => {
      if (k.id !== selectedKegiatanId) return k;
      
      const newMateri = k.materi.map(m => {
        if (m.id !== materiId) {
          // If we are setting one to active, set all others to inactive
          if (updates.aktif === true) {
            return { ...m, aktif: false };
          }
          return m;
        }
        return { ...m, ...updates };
      });
      
      return { ...k, materi: newMateri };
    }));
  };

  const handleAddMateri = () => {
    const newItem: MateriItem = {
      id: 'mat_' + Date.now().toString(),
      title: 'Materi Baru',
      hours: 2,
      instructor: '',
      tanggal: new Date().toISOString().split('T')[0],
      jamMulai: '08:00',
      jamSelesai: '10:00',
      ruangan: 'Ruang Utama',
      aktif: false
    };

    setKegiatanList(prev => prev.map(k => {
      if (k.id !== selectedKegiatanId) return k;
      return { ...k, materi: [...k.materi, newItem] };
    }));
  };

  const handleDeleteMateri = (materiId: string) => {
    if (!confirm('Hapus materi ini dari jadwal?')) return;
    setKegiatanList(prev => prev.map(k => {
      if (k.id !== selectedKegiatanId) return k;
      return { ...k, materi: k.materi.filter(m => m.id !== materiId) };
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
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

        <div className="flex gap-3">
          <button 
            onClick={handleAddMateri}
            disabled={!activeKegiatan}
            className="bg-[#006633] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Sesi / Materi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {(!activeKegiatan || activeKegiatan.materi.length === 0) ? (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-slate-700">Jadwal Kosong</h3>
            <p className="text-slate-500 text-sm mt-1">Belum ada sesi materi yang didaftarkan pada kaderisasi ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeKegiatan.materi.map((m, index) => (
              <div key={m.id} className={`p-6 flex flex-col md:flex-row gap-6 transition-colors ${m.aktif ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Judul Materi / Sesi</label>
                      <input 
                        type="text" 
                        value={m.title}
                        onChange={e => handleUpdateMateri(m.id, { title: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-[#006633] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instruktur / Narasumber</label>
                      <input 
                        type="text" 
                        value={m.instructor || ''}
                        onChange={e => handleUpdateMateri(m.id, { instructor: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#006633] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal</label>
                      <input 
                        type="date" 
                        value={m.tanggal || ''}
                        onChange={e => handleUpdateMateri(m.id, { tanggal: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#006633] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jam Mulai</label>
                      <input 
                        type="time" 
                        value={m.jamMulai || ''}
                        onChange={e => handleUpdateMateri(m.id, { jamMulai: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#006633] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jam Selesai</label>
                      <input 
                        type="time" 
                        value={m.jamSelesai || ''}
                        onChange={e => handleUpdateMateri(m.id, { jamSelesai: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#006633] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total JP</label>
                      <input 
                        type="number" 
                        value={m.hours}
                        onChange={e => handleUpdateMateri(m.id, { hours: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#006633] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-48 shrink-0 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <div className="w-full">
                    <button 
                      onClick={() => handleUpdateMateri(m.id, { aktif: !m.aktif })}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-colors ${
                        m.aktif 
                          ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-inner' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.aktif ? <CheckCircle className="w-5 h-5 text-amber-600" /> : <Circle className="w-5 h-5 text-slate-400" />}
                      {m.aktif ? 'Sedang Aktif' : 'Jadikan Aktif'}
                    </button>
                    {m.aktif && (
                      <p className="text-[10px] text-center text-amber-600 mt-2 leading-tight">
                        Absensi scan QR saat ini akan masuk ke materi ini.
                      </p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteMateri(m.id)}
                    className="text-slate-400 hover:text-red-500 p-2 mt-4 md:mt-0 transition-colors"
                    title="Hapus Materi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Save className="w-5 h-5 shrink-0" />
        <div>
          <strong>Catatan Sinkronisasi:</strong> Perubahan jadwal dan aktivasi sesi akan otomatis tersimpan di lokal. Jangan lupa tekan tombol "Sinkronisasikan" di bilah atas jika Anda ingin operator di perangkat lain melihat sesi mana yang sedang aktif untuk discan!
        </div>
      </div>
    </div>
  );
}
