import React, { useState, useEffect } from 'react';
import { Kegiatan, Pendaftaran, AbsensiMateri, Participant } from '../types';
import { getPendaftaranByKegiatan, getAllAbsensiByKegiatan, updateStatusKelulusan, updateStatusKelulusanMassal } from '../supabaseDatabase';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Download, Save, Award } from 'lucide-react';

interface Props {
  kegiatanList: Kegiatan[];
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<any>>;
}

export default function RekapKelulusan({ kegiatanList, participants, setParticipants, setActiveTab }: Props) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>('');
  const [pendaftarList, setPendaftarList] = useState<Pendaftaran[]>([]);
  const [absensiList, setAbsensiList] = useState<AbsensiMateri[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const availableKegiatans = kegiatanList.filter(k => k.status !== 'draft');

  useEffect(() => {
    if (availableKegiatans.length > 0 && !selectedKegiatanId) {
      setSelectedKegiatanId(availableKegiatans[0].id);
    }
  }, [availableKegiatans, selectedKegiatanId]);

  const activeKegiatan = kegiatanList.find(k => k.id === selectedKegiatanId);
  const materiList = activeKegiatan?.materi || [];
  const totalMateri = materiList.length;
  const syaratKelulusan = activeKegiatan?.syaratKelulusan || 80;

  useEffect(() => {
    if (!selectedKegiatanId) {
      setPendaftarList([]);
      setAbsensiList([]);
      return;
    }

    setLoading(true);
    Promise.all([
      getPendaftaranByKegiatan(selectedKegiatanId),
      getAllAbsensiByKegiatan(selectedKegiatanId)
    ])
    .then(([pData, aData]) => {
      // Only checkin or fiks
      const valid = pData.filter(p => p.status === 'checkin' || p.status === 'fiks');
      setPendaftarList(valid as Pendaftaran[]);
      setAbsensiList(aData as AbsensiMateri[]);
    })
    .catch(err => alert('Gagal mengambil data: ' + err.message))
    .finally(() => setLoading(false));
  }, [selectedKegiatanId]);

  const getAttendanceCount = (pendaftarId: string) => {
    return absensiList.filter(a => a.pendaftaranId === pendaftarId).length;
  };

  const getAttendancePercentage = (count: number) => {
    if (totalMateri === 0) return 0;
    return Math.round((count / totalMateri) * 100);
  };

  const isEligible = (percentage: number) => {
    return percentage >= syaratKelulusan;
  };

  const handleUpdateStatus = async (id: string, status: string, predikat?: string) => {
    setProcessing(true);
    try {
      await updateStatusKelulusan(id, status, predikat);
      setPendaftarList(prev => prev.map(p => p.id === id ? { ...p, statusKelulusan: status as any, predikat } : p));
    } catch (err: any) {
      alert('Gagal update status: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMassalLulus = async () => {
    if (!confirm(`Tandai semua peserta yang memenuhi syarat (>= ${syaratKelulusan}%) sebagai LULUS?`)) return;
    
    setProcessing(true);
    try {
      const eligibleIds = pendaftarList
        .filter(p => isEligible(getAttendancePercentage(getAttendanceCount(p.id))))
        .filter(p => p.statusKelulusan !== 'Lulus' && p.statusKelulusan !== 'Tidak Lulus') // Only update undefined
        .map(p => p.id);
        
      if (eligibleIds.length === 0) {
        alert('Tidak ada peserta baru yang memenuhi syarat untuk diluluskan.');
        return;
      }

      await updateStatusKelulusanMassal(eligibleIds, 'Lulus', 'Memuaskan');
      
      setPendaftarList(prev => prev.map(p => 
        eligibleIds.includes(p.id) ? { ...p, statusKelulusan: 'Lulus', predikat: 'Memuaskan' } : p
      ));
      alert(`${eligibleIds.length} peserta berhasil diluluskan!`);
    } catch (err: any) {
      alert('Gagal memproses kelulusan massal: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleExportToCertificate = () => {
    const lulusan = pendaftarList.filter(p => p.statusKelulusan === 'Lulus');
    if (lulusan.length === 0) {
      alert('Tidak ada peserta dengan status Lulus.');
      return;
    }

    if (!confirm(`Export ${lulusan.length} peserta ke pembuat sertifikat? (Peserta yang sudah diexport sebelumnya mungkin akan menjadi ganda jika diexport ulang)`)) return;

    const newParticipants: Participant[] = lulusan.map(p => ({
      id: `part_${new Date().getTime()}_${p.id.substring(0,5)}`,
      kegiatanId: p.kegiatanId,
      name: p.nama,
      number: '000/PC-XVII/01/...', // Template number
      role: 'Peserta',
      predicate: p.predikat || 'Memuaskan',
      institution: p.asalPac,
      tempatLahir: p.tempatLahir,
      tanggalLahir: p.tanggalLahir,
      date: activeKegiatan?.tanggalBerakhir || new Date().toISOString().split('T')[0]
    }));

    setParticipants(prev => [...prev, ...newParticipants]);
    alert(`${newParticipants.length} peserta berhasil ditambahkan ke tabel Sertifikat!`);
    setActiveTab('sertifikat');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Rekap Kehadiran & Kelulusan</h2>
          <p className="text-slate-500">Evaluasi kehadiran peserta dan tentukan kelulusan untuk sertifikat.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-medium shadow-sm"
            value={selectedKegiatanId}
            onChange={(e) => setSelectedKegiatanId(e.target.value)}
          >
            <option value="" disabled>Pilih Kaderisasi...</option>
            {availableKegiatans.map(k => (
              <option key={k.id} value={k.id}>{k.judulKegiatan}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedKegiatanId ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Pilih kaderisasi terlebih dahulu.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                <span className="text-xs text-slate-500 block">Total Materi</span>
                <span className="font-bold text-emerald-800">{totalMateri} Sesi</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                <span className="text-xs text-slate-500 block">Syarat Minimal</span>
                <span className="font-bold text-emerald-800">{syaratKelulusan}% Hadir</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                <span className="text-xs text-slate-500 block">Peserta (Check-in)</span>
                <span className="font-bold text-emerald-800">{pendaftarList.length} Orang</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleMassalLulus}
                disabled={processing || pendaftarList.length === 0}
                className="px-4 py-2 bg-white text-emerald-700 font-medium rounded-lg border border-emerald-300 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Luluskan yang Memenuhi Syarat
              </button>
              <button
                onClick={handleExportToCertificate}
                disabled={processing || pendaftarList.filter(p => p.statusKelulusan === 'Lulus').length === 0}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Award className="w-4 h-4 inline mr-2" />
                Export Lulusan ke Sertifikat
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama Peserta</th>
                    <th className="px-4 py-3">Asal PAC</th>
                    {materiList.map((m, i) => (
                      <th key={m.id} className="px-2 py-3 text-center border-l border-slate-200" title={m.title}>
                        M{i+1}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center border-l border-slate-200">% Hadir</th>
                    <th className="px-4 py-3 text-center">Sistem</th>
                    <th className="px-4 py-3 border-l border-slate-200">Keputusan Admin</th>
                    <th className="px-4 py-3">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendaftarList.map(p => {
                    const count = getAttendanceCount(p.id);
                    const pct = getAttendancePercentage(count);
                    const eligible = isEligible(pct);
                    const isLulus = p.statusKelulusan === 'Lulus';
                    const isTidakLulus = p.statusKelulusan === 'Tidak Lulus';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.nama}</td>
                        <td className="px-4 py-3 text-slate-600">{p.asalPac}</td>
                        
                        {/* Attendance Matrix */}
                        {materiList.map(m => {
                          const hadir = absensiList.some(a => a.pendaftaranId === p.id && a.materiId === m.id);
                          return (
                            <td key={m.id} className="px-2 py-3 text-center border-l border-slate-100">
                              {hadir ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 text-center border-l border-slate-100">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {pct}%
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">{count}/{totalMateri}</div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {eligible ? (
                            <span className="text-emerald-600 text-xs font-medium">Memenuhi</span>
                          ) : (
                            <span className="text-rose-500 text-xs font-medium">Tidak</span>
                          )}
                        </td>

                        <td className="px-4 py-3 border-l border-slate-100">
                          <select
                            value={p.statusKelulusan || ''}
                            onChange={(e) => handleUpdateStatus(p.id, e.target.value, p.predikat)}
                            disabled={processing}
                            className={`px-2 py-1 text-xs font-medium rounded border outline-none ${
                              isLulus ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                              isTidakLulus ? 'border-rose-300 bg-rose-50 text-rose-700' :
                              'border-slate-300 bg-white text-slate-600'
                            }`}
                          >
                            <option value="">Belum Ditentukan</option>
                            <option value="Lulus">Lulus</option>
                            <option value="Tidak Lulus">Tidak Lulus</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={p.predikat || ''}
                            onChange={(e) => handleUpdateStatus(p.id, p.statusKelulusan || 'Lulus', e.target.value)}
                            disabled={processing || !isLulus}
                            className="px-2 py-1 text-xs border border-slate-300 bg-white rounded outline-none disabled:opacity-50 disabled:bg-slate-50"
                          >
                            <option value="">(Pilih Predikat)</option>
                            <option value="Istimewa">Istimewa</option>
                            <option value="Sangat Memuaskan">Sangat Memuaskan</option>
                            <option value="Memuaskan">Memuaskan</option>
                            <option value="Lulus">Lulus</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {pendaftarList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        Belum ada peserta yang melakukan Check-in pada kegiatan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
