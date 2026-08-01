import React, { useEffect, useState } from 'react';
import { Kegiatan, Pendaftaran } from '../types';
import { getPendaftaranByKegiatan, checkInPendaftaran, cancelCheckIn } from '../supabaseDatabase';
import { Search, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  kegiatanList: Kegiatan[];
}

export default function CheckInPeserta({ kegiatanList }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  const [pendaftarList, setPendaftarList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter kegiatan: show only active ones (not draft)
  const availableKegiatans = kegiatanList.filter(k => k.status !== 'draft');

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
        // Only show those who are NOT rejected.
        const validParticipants = data.filter(p => p.status !== 'ditolak');
        setPendaftarList(validParticipants as Pendaftaran[]);
      })
      .catch(err => {
        alert('Gagal mengambil data pendaftar: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedKegiatanId]);

  const handleToggleCheckIn = async (pendaftar: Pendaftaran) => {
    if (processingId) return;
    setProcessingId(pendaftar.id);

    try {
      const isCurrentlyCheckedIn = pendaftar.status === 'checkin';
      
      if (isCurrentlyCheckedIn) {
        // Cancel check-in
        await cancelCheckIn(pendaftar.id);
        setPendaftarList(prev => prev.map(p => 
          p.id === pendaftar.id ? { ...p, status: 'fiks', tokenKehadiran: undefined } : p
        ));
      } else {
        // Do check-in
        const newToken = crypto.randomUUID();
        await checkInPendaftaran(pendaftar.id, newToken);
        setPendaftarList(prev => prev.map(p => 
          p.id === pendaftar.id ? { ...p, status: 'checkin', tokenKehadiran: newToken } : p
        ));
      }
    } catch (err: any) {
      alert('Gagal memproses check-in: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredList = pendaftarList.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.nama.toLowerCase().includes(q) || p.asalPac.toLowerCase().includes(q) || p.noHp.includes(q);
  });

  const checkedInCount = pendaftarList.filter(p => p.status === 'checkin').length;
  const totalCount = pendaftarList.length;
  const percentage = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        
        <div className="space-y-1 w-full md:w-1/3">
          <label className="text-xs font-bold text-slate-500 uppercase">Pilih Kaderisasi Hari Ini</label>
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

        <div className="flex-1 flex flex-col md:flex-row gap-6 w-full justify-end items-center">
          
          <div className="flex items-center gap-4 bg-green-50 px-5 py-3 rounded-xl border border-green-100 w-full md:w-auto">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-wider">Status Kehadiran</p>
              <p className="text-xl font-black text-green-800 leading-none mt-1">
                {checkedInCount} <span className="text-sm font-bold text-green-600">dari {totalCount}</span>
              </p>
            </div>
            <div className="ml-4 pl-4 border-l border-green-200/60 hidden sm:block">
              <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Pencapaian</p>
              <div className="w-24 h-2 bg-green-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama peserta..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#006633]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center text-slate-500 animate-pulse font-medium">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-3" />
            Memuat daftar kehadiran...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Belum Ada Pendaftar Tersedia</h3>
            <p className="text-slate-500 text-sm mt-1">Hanya pendaftar valid (tidak ditolak) yang akan muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {filteredList.map(p => {
              const isCheckedIn = p.status === 'checkin';
              const isProcessing = processingId === p.id;
              
              return (
                <div 
                  key={p.id} 
                  onClick={() => handleToggleCheckIn(p)}
                  className={`p-4 border-b border-r border-slate-100 flex items-center gap-4 cursor-pointer transition-all ${
                    isCheckedIn ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-slate-50'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="shrink-0 relative">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isCheckedIn ? 'bg-[#006633] border-[#006633] text-white' : 'bg-white border-slate-300 text-transparent'
                    }`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold truncate ${isCheckedIn ? 'text-[#006633]' : 'text-slate-800'}`}>{p.nama}</h4>
                    <p className="text-xs text-slate-500 truncate">{p.asalPac} • {p.noHp}</p>
                  </div>
                  {isCheckedIn && p.tokenKehadiran && (
                    <div className="shrink-0 text-[10px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                      ID VALID
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
