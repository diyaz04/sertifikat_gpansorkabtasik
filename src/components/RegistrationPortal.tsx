import React, { useEffect, useState } from 'react';
import { getPublicKegiatan, submitPendaftaran } from '../supabaseDatabase';
import { Kegiatan, FormField } from '../types';
import { AnsorLogoSvg } from './CertificatePreview';

export default function RegistrationPortal() {
  const [kegiatan, setKegiatan] = useState<Kegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    asalPac: '',
    noHp: '',
    alamat: ''
  });
  
  const [customData, setCustomData] = useState<Record<string, any>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('daftar');
    if (!id) {
      setError('ID Kegiatan tidak ditemukan dalam URL.');
      setLoading(false);
      return;
    }

    getPublicKegiatan(id)
      .then(data => {
        if (!data) throw new Error('Kegiatan tidak ditemukan atau sudah dihapus.');
        if (data.status !== 'dibuka') throw new Error('Pendaftaran untuk kaderisasi ini sedang ditutup atau belum dibuka.');
        setKegiatan(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kegiatan) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        kegiatan_id: kegiatan.id,
        nama: formData.nama,
        tempat_lahir: formData.tempatLahir,
        tanggal_lahir: formData.tanggalLahir,
        asal_pac: formData.asalPac,
        no_hp: formData.noHp,
        alamat: formData.alamat,
        jawaban_custom: customData,
        status: 'daftar'
      };

      await submitPendaftaran(payload);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pendaftaran. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = customData[field.id] || '';
    const handleChange = (val: any) => setCustomData({ ...customData, [field.id]: val });

    switch (field.type) {
      case 'textarea':
        return <textarea required={field.required} value={value} onChange={e => handleChange(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] min-h-[100px]" />;
      case 'select':
        return (
          <select required={field.required} value={value} onChange={e => handleChange(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633]">
            <option value="">Pilih salah satu...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" required={field.required} name={field.id} value={opt} checked={value === opt} onChange={e => handleChange(e.target.value)} className="w-4 h-4 text-[#006633] focus:ring-[#006633]" />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" required={field.required} checked={value === true} onChange={e => handleChange(e.target.checked)} className="w-4 h-4 text-[#006633] rounded focus:ring-[#006633]" />
            <span>Ya / Setuju</span>
          </label>
        );
      case 'file':
        return (
          <input type="file" required={field.required} onChange={e => {
            // Placeholder for actual file upload, we'd normally upload to Supabase storage here.
            // For now, we'll just store the filename to signify something was selected if not fully implemented.
            const file = e.target.files?.[0];
            handleChange(file ? file.name : '');
          }} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#006633] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
        );
      case 'date':
        return <input type="date" required={field.required} value={value} onChange={e => handleChange(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633]" />;
      default:
        return <input type={field.type} required={field.required} value={value} onChange={e => handleChange(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633]" />;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Memuat data pendaftaran...</div>;
  }

  if (error || !kegiatan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 text-2xl font-black">!</div>
          <h2 className="text-xl font-bold text-slate-800">Tidak Tersedia</h2>
          <p className="text-slate-600">{error || 'Halaman pendaftaran tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Pendaftaran Berhasil!</h2>
          <p className="text-slate-600">Data pendaftaran Anda untuk kegiatan <b>{kegiatan.judulKegiatan}</b> telah kami terima dan akan segera diproses oleh panitia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-[#006633] p-4 rounded-full shadow-lg">
            <AnsorLogoSvg />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{kegiatan.judulKegiatan}</h1>
            <p className="text-slate-500 font-medium mt-2">{kegiatan.tempatPelaksanaan} • {kegiatan.tanggalMulai} {kegiatan.tanggalBerakhir ? `- ${kegiatan.tanggalBerakhir}` : ''}</p>
          </div>
          {kegiatan.deskripsi && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-600 text-sm inline-block text-left max-w-xl mx-auto">
              {kegiatan.deskripsi}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-xl border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-800 pb-2 border-b border-slate-100">Biodata Diri (Wajib)</h3>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap (Sesuai KTP) *</label>
              <input type="text" required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tempat Lahir *</label>
                <input type="text" required value={formData.tempatLahir} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Lahir *</label>
                <input type="date" required value={formData.tanggalLahir} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Asal PAC / Ranting *</label>
              <input type="text" required value={formData.asalPac} onChange={e => setFormData({...formData, asalPac: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors" placeholder="Contoh: PAC Singaparna" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nomor HP / WhatsApp *</label>
              <input type="tel" required value={formData.noHp} onChange={e => setFormData({...formData, noHp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors" placeholder="08..." />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Lengkap *</label>
              <textarea required value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#006633] focus:ring-1 focus:ring-[#006633] transition-colors min-h-[80px]" />
            </div>
          </div>

          {kegiatan.formSchema && kegiatan.formSchema.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-lg font-black text-slate-800 pb-2 border-b border-slate-100">Informasi Tambahan</h3>
              {kegiatan.formSchema.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    {field.label} {field.required && '*'}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#006633] hover:bg-[#00552b] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Mengirim Data...' : 'Kirim Pendaftaran'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-4">
              Data Anda akan disimpan dengan aman.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
