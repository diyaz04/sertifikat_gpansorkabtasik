import React, { useState } from 'react';
import { Kegiatan, KegiatanStatus, FormField } from '../types';
import { Plus, Edit2, Trash2, Settings, GripVertical, Check, ExternalLink, Link as LinkIcon, QrCode, Monitor } from 'lucide-react';
import { AnsorLogoSvg } from './CertificatePreview'; // We can use it or just lucide icons

interface Props {
  kegiatanList: Kegiatan[];
  setKegiatanList: React.Dispatch<React.SetStateAction<Kegiatan[]>>;
}

export default function DaftarKaderisasi({ kegiatanList, setKegiatanList }: Props) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingKegiatan, setEditingKegiatan] = useState<Partial<Kegiatan> | null>(null);

  const handleAdd = () => {
    setEditingKegiatan({
      id: 'keg_' + Date.now().toString(),
      judulKegiatan: '',
      jenisKegiatan: 'PKD',
      tempatPelaksanaan: '',
      tanggalMulai: '',
      tanggalBerakhir: '',
      ketuaPelaksana: '',
      materi: [],
      status: 'draft',
      kuotaPeserta: undefined,
      deskripsi: '',
      formSchema: []
    });
    setView('form');
  };

  const handleEdit = (keg: Kegiatan) => {
    setEditingKegiatan({ ...keg });
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus kaderisasi ini? (Sertifikat dan pendaftaran terkait mungkin akan hilang)')) {
      setKegiatanList(prev => prev.filter(k => k.id !== id));
    }
  };

  const saveKegiatan = () => {
    if (!editingKegiatan?.judulKegiatan) return alert('Judul Kegiatan wajib diisi');
    
    setKegiatanList(prev => {
      const exists = prev.find(p => p.id === editingKegiatan.id);
      if (exists) {
        return prev.map(p => p.id === editingKegiatan.id ? (editingKegiatan as Kegiatan) : p);
      }
      return [...prev, editingKegiatan as Kegiatan];
    });
    setView('list');
  };

  const renderStatusBadge = (status?: KegiatanStatus) => {
    switch (status) {
      case 'dibuka': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">Dibuka</span>;
      case 'ditutup': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">Ditutup</span>;
      case 'selesai': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">Selesai</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">Draft</span>;
    }
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?daftar=${id}`;
    navigator.clipboard.writeText(url);
    alert('Link Pendaftaran berhasil disalin: ' + url);
  };

  const copyMonitorLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?monitor=${id}`;
    navigator.clipboard.writeText(url);
    alert('Link Monitor (Read Only) berhasil disalin: ' + url);
  };

  if (view === 'form' && editingKegiatan) {
    return (
      <FormKaderisasi 
        kegiatan={editingKegiatan} 
        setKegiatan={setEditingKegiatan} 
        onSave={saveKegiatan} 
        onCancel={() => setView('list')} 
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Daftar Kaderisasi</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola data kegiatan kaderisasi dan form pendaftaran publik.</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-[#006633] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-[#00552b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kaderisasi
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {kegiatanList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">Belum ada kaderisasi terdaftar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Kaderisasi</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Jadwal & Tempat</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">Status</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kegiatanList.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{k.judulKegiatan}</div>
                    <div className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1.5">
                      <span className="font-semibold text-[#006633]">{k.jenisKegiatan}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{k.tanggalMulai} {k.tanggalBerakhir && `- ${k.tanggalBerakhir}`}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{k.tempatPelaksanaan}</div>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(k.status)}
                    {k.status === 'dibuka' && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => copyToClipboard(k.id)} className="text-[#006633] hover:text-[#00552b] text-[10px] flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-100 font-medium cursor-pointer">
                          <LinkIcon className="w-3 h-3" /> Salin Link Daftar
                        </button>
                        <button onClick={() => copyMonitorLink(k.id)} className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100 font-medium cursor-pointer" title="Link untuk memantau pendaftar secara publik">
                          <Monitor className="w-3 h-3" /> Link Monitor
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(k)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(k.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Komponen Form & Builder ---
function FormKaderisasi({ kegiatan, setKegiatan, onSave, onCancel }: { kegiatan: Partial<Kegiatan>, setKegiatan: any, onSave: () => void, onCancel: () => void }) {
  
  const addField = () => {
    const newField: FormField = {
      id: 'field_' + Date.now(),
      label: 'Pertanyaan Baru',
      type: 'text',
      required: false
    };
    setKegiatan({ ...kegiatan, formSchema: [...(kegiatan.formSchema || []), newField] });
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setKegiatan({
      ...kegiatan,
      formSchema: (kegiatan.formSchema || []).map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id: string) => {
    setKegiatan({
      ...kegiatan,
      formSchema: (kegiatan.formSchema || []).filter(f => f.id !== id)
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const schema = [...(kegiatan.formSchema || [])];
    if (direction === 'up' && index > 0) {
      [schema[index - 1], schema[index]] = [schema[index], schema[index - 1]];
    } else if (direction === 'down' && index < schema.length - 1) {
      [schema[index + 1], schema[index]] = [schema[index], schema[index + 1]];
    }
    setKegiatan({ ...kegiatan, formSchema: schema });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-4 z-10">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          Pengaturan Kaderisasi & Form
        </h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Batal</button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-bold text-white bg-[#006633] hover:bg-[#00552b] rounded-xl shadow-sm cursor-pointer">Simpan Perubahan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KOLOM KIRI: INFO DASAR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Informasi Dasar</h4>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Judul Kegiatan *</label>
            <input type="text" value={kegiatan.judulKegiatan || ''} onChange={e => setKegiatan({...kegiatan, judulKegiatan: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" placeholder="Contoh: PKD 1 PAC Karangjaya" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis</label>
              <select value={kegiatan.jenisKegiatan || 'PKD'} onChange={e => setKegiatan({...kegiatan, jenisKegiatan: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]">
                <option value="PKD">PKD</option>
                <option value="PKL">PKL</option>
                <option value="Dirosah Ula">Dirosah Ula</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Pendaftaran</label>
              <select value={kegiatan.status || 'draft'} onChange={e => setKegiatan({...kegiatan, status: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]">
                <option value="draft">Draft (Belum Rilis)</option>
                <option value="dibuka">Dibuka (Publik)</option>
                <option value="ditutup">Ditutup</option>
                <option value="selesai">Selesai (Arsip)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Tempat Pelaksanaan</label>
            <input type="text" value={kegiatan.tempatPelaksanaan || ''} onChange={e => setKegiatan({...kegiatan, tempatPelaksanaan: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Mulai</label>
              <input type="date" value={kegiatan.tanggalMulai || ''} onChange={e => setKegiatan({...kegiatan, tanggalMulai: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Berakhir</label>
              <input type="date" value={kegiatan.tanggalBerakhir || ''} onChange={e => setKegiatan({...kegiatan, tanggalBerakhir: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Ketua Pelaksana</label>
              <input type="text" value={kegiatan.ketuaPelaksana || ''} onChange={e => setKegiatan({...kegiatan, ketuaPelaksana: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Kuota Peserta</label>
              <input type="number" value={kegiatan.kuotaPeserta || ''} onChange={e => setKegiatan({...kegiatan, kuotaPeserta: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633]" placeholder="Kosongkan jika tak terbatas" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Deskripsi Singkat (Publik)</label>
            <textarea value={kegiatan.deskripsi || ''} onChange={e => setKegiatan({...kegiatan, deskripsi: e.target.value})} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#006633] min-h-[80px] resize-none" placeholder="Deskripsi akan muncul di halaman pendaftaran..." />
          </div>

        </div>

        {/* KOLOM KANAN: FORM BUILDER */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Builder Form Pendaftaran</h4>
            <button onClick={addField} type="button" className="text-[10px] font-bold text-[#006633] hover:bg-green-50 px-2 py-1 rounded flex items-center gap-1 cursor-pointer">
              <Plus className="w-3 h-3" /> Tambah Pertanyaan
            </button>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-800 font-medium">Field standar otomatis wajib diisi peserta: <b>Nama, Tempat/Tgl Lahir, Asal PAC, No HP, Alamat.</b> Tidak perlu ditambahkan secara manual di sini.</p>
          </div>

          <div className="space-y-4">
            {(kegiatan.formSchema || []).map((field, idx) => (
              <div key={field.id} className="group relative border border-slate-200 rounded-xl bg-slate-50 p-4 transition-all hover:border-[#006633]/30 hover:shadow-sm">
                
                <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveField(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"><GripVertical className="w-3 h-3" /></button>
                  <button onClick={() => moveField(idx, 'down')} disabled={idx === (kegiatan.formSchema?.length || 0) - 1} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"><GripVertical className="w-3 h-3 rotate-180" /></button>
                  <button onClick={() => removeField(field.id)} className="p-1 text-slate-400 hover:text-red-600 ml-1 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pertanyaan / Label</label>
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })} 
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#006633]" 
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Jawaban</label>
                      <select 
                        value={field.type} 
                        onChange={e => updateField(field.id, { type: e.target.value as any })}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="text">Teks Singkat</option>
                        <option value="textarea">Paragraf</option>
                        <option value="number">Angka</option>
                        <option value="date">Tanggal</option>
                        <option value="select">Pilihan Ganda (Dropdown)</option>
                        <option value="radio">Satu Pilihan (Radio)</option>
                        <option value="file">Upload File / Bukti</option>
                      </select>
                    </div>
                    <div className="pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          checked={field.required} 
                          onChange={e => updateField(field.id, { required: e.target.checked })} 
                          className="w-4 h-4 text-[#006633] rounded focus:ring-[#006633]"
                        />
                        Wajib Diisi
                      </label>
                    </div>
                  </div>

                  {(field.type === 'select' || field.type === 'radio') && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Opsi Pilihan (Pisahkan dengan Koma)</label>
                      <input 
                        type="text" 
                        value={field.options?.join(', ') || ''} 
                        onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Contoh: Laki-laki, Perempuan"
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#006633]" 
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!kegiatan.formSchema || kegiatan.formSchema.length === 0) && (
              <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                Belum ada field pertanyaan kustom tambahan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
