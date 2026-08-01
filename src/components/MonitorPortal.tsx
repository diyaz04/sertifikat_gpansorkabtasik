import React, { useEffect, useState } from 'react';
import { getPublicKegiatan, getPublicPendaftaran } from '../supabaseDatabase';
import { Kegiatan, Participant } from '../types';
import { AnsorLogoSvg } from './CertificatePreview';
import { Users, UserCheck, Award, RefreshCw, XCircle, Search } from 'lucide-react';
import { formatIndonesianDateRange } from '../utils';

export default function MonitorPortal() {
  const [kegiatan, setKegiatan] = useState<Kegiatan | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('monitor');
      if (!id) {
        throw new Error('ID Kegiatan tidak ditemukan dalam URL.');
      }

      const keg = await getPublicKegiatan(id);
      if (!keg) throw new Error('Kegiatan tidak ditemukan atau sudah dihapus.');
      
      const pendaftar = await getPublicPendaftaran(id);
      
      setKegiatan(keg);
      setParticipants(pendaftar);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.institution.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: participants.length,
    fiks: participants.filter(p => p.status === 'fiks').length,
    lulus: participants.filter(p => p.status_kelulusan === 'Lulus').length,
    tidakLulus: participants.filter(p => p.status_kelulusan === 'Tidak Lulus').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-[#006633] rounded-2xl flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-[#006633]/20">
            <AnsorLogoSvg className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Memuat Data...</h2>
          <p className="text-sm text-slate-500 mt-2">Menyiapkan portal monitor.</p>
        </div>
      </div>
    );
  }

  if (error || !kegiatan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border-t-4 border-rose-500">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <XCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Akses Gagal</h2>
          <p className="text-sm text-slate-600 mb-6 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#006633] text-white pt-10 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <AnsorLogoSvg className="w-96 h-96" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <AnsorLogoSvg className="w-10 h-10 text-[#006633]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 backdrop-blur-sm border border-white/20">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Portal Monitor Publik
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{kegiatan.judulKegiatan}</h1>
              <p className="text-green-100 mt-1 font-medium flex items-center gap-2 text-sm">
                {kegiatan.tempatPelaksanaan} • {formatIndonesianDateRange(kegiatan.tanggalMulai, kegiatan.tanggalBerakhir)}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md border border-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Segarkan Data
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Pendaftar</p>
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Check-in / Fiks</p>
              <p className="text-2xl font-black text-slate-800">{stats.fiks}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lulus</p>
              <p className="text-2xl font-black text-slate-800">{stats.lulus}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tidak Lulus</p>
              <p className="text-2xl font-black text-slate-800">{stats.tidakLulus}</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-800">Daftar Peserta</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pantau status peserta secara real-time</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Cari nama atau PAC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="px-5 py-4 font-black uppercase text-[10px] tracking-wider w-12 text-center">No</th>
                  <th className="px-5 py-4 font-black uppercase text-[10px] tracking-wider">Nama Lengkap</th>
                  <th className="px-5 py-4 font-black uppercase text-[10px] tracking-wider">Asal PAC</th>
                  <th className="px-5 py-4 font-black uppercase text-[10px] tracking-wider text-center">Status Pendaftaran</th>
                  <th className="px-5 py-4 font-black uppercase text-[10px] tracking-wider text-center">Status Kelulusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <div className="inline-flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-bold">Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p, index) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4 font-bold text-slate-800">{p.name}</td>
                      <td className="px-5 py-4 text-slate-600">{p.institution}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'fiks' ? 'bg-green-100 text-green-700' :
                          p.status === 'ditolak' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status === 'fiks' ? 'Fiks / Hadir' : p.status === 'ditolak' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          p.status_kelulusan === 'Lulus' ? 'bg-emerald-100 text-emerald-700' :
                          p.status_kelulusan === 'Tidak Lulus' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status_kelulusan || 'Belum Ditentukan'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
