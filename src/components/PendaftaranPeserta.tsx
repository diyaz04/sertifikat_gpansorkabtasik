import React, { useEffect, useState } from 'react';
import { Kegiatan, Pendaftaran, PendaftaranStatus } from '../types';
import { getPendaftaranByKegiatan, updatePendaftaranStatus } from '../supabaseDatabase';
import { Download, CheckCircle, XCircle, Eye, Search, AlertCircle, X } from 'lucide-react';

interface Props {
  kegiatanList: Kegiatan[];
}

export default function PendaftaranPeserta({ kegiatanList }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  const [pendaftarList, setPendaftarList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPendaftar, setSelectedPendaftar] = useState<Pendaftaran | null>(null);

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
        setPendaftarList(data as Pendaftaran[]);
      })
      .catch(err => {
        alert('Gagal mengambil data pendaftar: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedKegiatanId]);

  const handleUpdateStatus = async (id: string, newStatus: PendaftaranStatus) => {
    try {
      await updatePendaftaranStatus(id, newStatus);
      setPendaftarList(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const exportToCSV = () => {
    if (pendaftarList.length === 0) return alert('Tidak ada data untuk diekspor.');
    
    // Get unique keys from jawaban_custom across all pendaftar
    const customKeys = new Set<string>();
    pendaftarList.forEach(p => {
      Object.keys(p.jawabanCustom || {}).forEach(k => customKeys.add(k));
    });
    
    const customHeaders = Array.from(customKeys);
    
    const header = ['ID', 'Tanggal Daftar', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Asal PAC', 'No HP/WA', 'Alamat', 'Status', ...customHeaders];
    
    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = pendaftarList.map(p => {
      const baseData = [
        p.id,
        new Date(p.createdAt).toLocaleString('id-ID'),
        p.nama,
        p.tempatLahir,
        p.tanggalLahir,
        p.asalPac,
        p.noHp,
        p.alamat,
        p.status
      ];
      
      const customData = customHeaders.map(k => p.jawabanCustom?.[k] || '');
      return [...baseData, ...customData].map(escapeCSV).join(',');
    });

    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const selectedK = availableKegiatans.find(k => k.id === selectedKegiatanId);
    link.download = `pendaftar_${selectedK?.judulKegiatan?.replace(/[^a-z0-9]/gi, '_') || 'kegiatan'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredList = pendaftarList.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.nama.toLowerCase().includes(q) || p.asalPac.toLowerCase().includes(q) || p.noHp.includes(q);
  });

  const renderStatus = (status: string) => {
    switch (status) {
      case 'daftar': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">Menunggu</span>;
      case 'checkin': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">Check-In</span>;
      case 'fiks': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">Diterima (Fiks)</span>;
      case 'ditolak': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">Ditolak</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1 w-full md:w-1/3">
          <label className="text-xs font-bold text-slate-500 uppercase">Pilih Kaderisasi</label>
          <select 
            value={selectedKegiatanId} 
            onChange={e => setSelectedKegiatanId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#006633]"
          >
            {availableKegiatans.map(k => (
              <option key={k.id} value={k.id}>{k.judulKegiatan} ({k.status})</option>
            ))}
            {availableKegiatans.length === 0 && <option value="">Belum ada kaderisasi aktif</option>}
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama, PAC, no HP..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#006633]"
            />
          </div>
          <button 
            onClick={exportToCSV}
            disabled={pendaftarList.length === 0}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse font-medium">
            Memuat data pendaftar...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Tidak Ada Pendaftar</h3>
            <p className="text-slate-500 text-sm mt-1">Belum ada peserta yang mendaftar atau cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Peserta</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Asal / Kontak</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Tanggal Daftar</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200">Status</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.nama}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.tempatLahir}, {p.tanggalLahir}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{p.asalPac}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.noHp}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(p.status)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setSelectedPendaftar(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      {p.status === 'daftar' && (
                        <>
                          <button onClick={() => handleUpdateStatus(p.id, 'fiks')} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Terima (Fiks)">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(p.id, 'ditolak')} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Tolak">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedPendaftar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-lg">Detail Pendaftar</h3>
              <button onClick={() => setSelectedPendaftar(null)} className="text-slate-400 hover:text-slate-700 bg-white p-1.5 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006633] to-green-600 text-white flex items-center justify-center text-2xl font-black shadow-sm">
                  {selectedPendaftar.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedPendaftar.nama}</h2>
                  <p className="text-slate-500 font-medium">{selectedPendaftar.asalPac} • {selectedPendaftar.noHp}</p>
                </div>
                <div className="ml-auto">
                  {renderStatus(selectedPendaftar.status)}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Biodata Dasar</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold mb-0.5">Tempat, Tgl Lahir</span>
                    <span className="font-medium text-slate-900">{selectedPendaftar.tempatLahir}, {selectedPendaftar.tanggalLahir}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold mb-0.5">No Handphone (WA)</span>
                    <span className="font-medium text-slate-900">{selectedPendaftar.noHp}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 text-xs font-semibold mb-0.5">Alamat Lengkap</span>
                    <span className="font-medium text-slate-900">{selectedPendaftar.alamat}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold mb-0.5">Waktu Mendaftar</span>
                    <span className="font-medium text-slate-900">{new Date(selectedPendaftar.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {selectedPendaftar.jawabanCustom && Object.keys(selectedPendaftar.jawabanCustom).length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 pt-6 border-t border-slate-100">Jawaban Form Kustom</h4>
                  <div className="space-y-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {Object.entries(selectedPendaftar.jawabanCustom).map(([key, value]) => {
                      // Attempt to resolve key to label if possible, though we don't have formSchema directly here
                      // We'll just display the key as is for now. In a real app we'd map this using formSchema.
                      return (
                        <div key={key}>
                          <span className="block text-slate-600 text-xs font-bold mb-1">{key}</span>
                          <span className="font-medium text-slate-900 whitespace-pre-wrap">
                            {typeof value === 'boolean' ? (value ? 'Ya / Centang' : 'Tidak') : (value as React.ReactNode) || '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setSelectedPendaftar(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">Tutup</button>
              {selectedPendaftar.status === 'daftar' && (
                <>
                  <button onClick={() => { handleUpdateStatus(selectedPendaftar.id, 'ditolak'); setSelectedPendaftar(null); }} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm">Tolak</button>
                  <button onClick={() => { handleUpdateStatus(selectedPendaftar.id, 'fiks'); setSelectedPendaftar(null); }} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm">Terima (Fiks)</button>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
