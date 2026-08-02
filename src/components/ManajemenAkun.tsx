import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Users, Loader2, Trash2, CheckCircle2, X } from 'lucide-react';
import { AppUser, Kegiatan } from '../types';
import { getAppUsers, createAccount, updateUserPermissions } from '../supabaseDatabase';

const AVAILABLE_MENUS = [
  { id: 'kaderisasi', label: '1. Daftar Kaderisasi' },
  { id: 'pendaftaran', label: '2. Pendaftaran & Peserta' },
  { id: 'checkin', label: '3. Check-in Peserta' },
  { id: 'idcard', label: '4. ID Card & QR' },
  { id: 'jadwal', label: '5. Jadwal Materi' },
  { id: 'absensi', label: '6. Absensi Materi' },
  { id: 'rekap', label: '7. Rekap Kelulusan' },
  { id: 'sertifikat', label: '8. Sertifikat' },
];

interface ManajemenAkunProps {
  kegiatanList?: Kegiatan[];
}

export default function ManajemenAkun({ kegiatanList = [] }: ManajemenAkunProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Verification state
  const [verifyingUser, setVerifyingUser] = useState<AppUser | null>(null);
  const [verifyingPermissions, setVerifyingPermissions] = useState<string[]>([]);
  const [verifyingProcessing, setVerifyingProcessing] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await getAppUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const togglePermission = (id: string) => {
    if (selectedPermissions.includes(id)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== id));
    } else {
      setSelectedPermissions([...selectedPermissions, id]);
    }
  };

  const toggleVerifyingPermission = (id: string) => {
    if (verifyingPermissions.includes(id)) {
      setVerifyingPermissions(verifyingPermissions.filter(p => p !== id));
    } else {
      setVerifyingPermissions([...verifyingPermissions, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Harap isi semua kolom wajib.');
      return;
    }
    if (selectedPermissions.length === 0) {
      setError('Harap pilih minimal satu akses menu.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await createAccount(email, password, name, selectedPermissions);
      setEmail('');
      setPassword('');
      setName('');
      setSelectedPermissions([]);
      await loadUsers();
      alert('Akun berhasil dibuat dan siap digunakan!');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat membuat akun.');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyingUser) return;
    if (verifyingPermissions.length === 0) {
      alert('Harap pilih minimal satu akses menu untuk verifikasi.');
      return;
    }

    setVerifyingProcessing(true);
    try {
      await updateUserPermissions(verifyingUser.id, verifyingPermissions);
      await loadUsers();
      setVerifyingUser(null);
      setVerifyingPermissions([]);
      alert('Izin akses berhasil disimpan!');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan izin akses.');
    } finally {
      setVerifyingProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-[#006633]" />
          Manajemen Akun & Hak Akses
        </h2>
        <p className="text-slate-500">Buat akun untuk instruktur atau panitia absensi dan atur izin menu mereka.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BUAT AKUN FORM */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 self-start">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Buat Akun Baru
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nama Instruktur / Panitia</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Misal: Ahmad Zaki"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#006633] outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Alamat Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="instruktur@gmail.com"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#006633] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
              <input 
                type="text" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#006633] outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-800 mb-2">Izin Akses Menu</label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 mb-4">
                {AVAILABLE_MENUS.map(menu => (
                  <label key={menu.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg border border-slate-100 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedPermissions.includes(menu.id)}
                      onChange={() => togglePermission(menu.id)}
                      className="w-4 h-4 text-[#006633] rounded focus:ring-[#006633]"
                    />
                    <span className="text-xs font-medium text-slate-700">{menu.label}</span>
                  </label>
                ))}
              </div>
              <label className="block text-xs font-black text-slate-800 mb-2">Akses Kegiatan Spesifik (Opsional)</label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {kegiatanList.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-2">Belum ada kegiatan</div>
                ) : (
                  kegiatanList.map(k => (
                    <label key={k.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg border border-slate-100 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedPermissions.includes(`kegiatan:${k.id}`)}
                        onChange={() => togglePermission(`kegiatan:${k.id}`)}
                        className="w-4 h-4 text-[#006633] rounded focus:ring-[#006633]"
                      />
                      <span className="text-xs font-medium text-slate-700">{k.judulKegiatan} ({k.status})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full mt-4 bg-[#006633] hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Daftarkan Akun
            </button>
          </form>
        </div>

        {/* DAFTAR AKUN */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Daftar Instruktur & Panitia
            </h3>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-12 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Belum ada akun lain yang dibuat.
              </div>
            ) : (
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama & Email</th>
                    <th className="px-4 py-3">Peran</th>
                    <th className="px-4 py-3">Akses Menu</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.length === 0 && u.role !== 'admin' ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] rounded font-bold uppercase animate-pulse border border-amber-200">Menunggu Akses</span>
                          ) : u.permissions.includes('all') ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded font-bold uppercase">Semua Akses</span>
                          ) : (
                            u.permissions.map(p => {
                              if (p.startsWith('kegiatan:')) {
                                const kId = p.replace('kegiatan:', '');
                                const k = kegiatanList.find(keg => keg.id === kId);
                                return (
                                  <span key={p} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] rounded font-medium truncate max-w-[150px]">
                                    Kegiatan: {k ? k.judulKegiatan : 'Unknown'}
                                  </span>
                                )
                              }
                              const menu = AVAILABLE_MENUS.find(m => m.id === p);
                              return (
                                <span key={p} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded font-medium">
                                  {menu ? menu.label.split('.')[1].trim() : p}
                                </span>
                              )
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setVerifyingUser(u);
                              setVerifyingPermissions(u.permissions || []);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {u.permissions.length === 0 ? 'Verifikasi' : 'Edit Akses'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* MODAL VERIFIKASI */}
      {verifyingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                {verifyingUser.permissions.length === 0 ? 'Verifikasi Akun' : 'Edit Akses Akun'}
              </h3>
              <button 
                onClick={() => setVerifyingUser(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Mengatur Akses Untuk:</div>
                <div className="font-bold text-slate-800">{verifyingUser.name}</div>
                <div className="text-sm text-slate-500">{verifyingUser.email}</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Pilih Izin Akses Menu</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 mb-4">
                  {AVAILABLE_MENUS.map(menu => (
                    <label key={menu.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg border border-slate-100 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={verifyingPermissions.includes(menu.id)}
                        onChange={() => toggleVerifyingPermission(menu.id)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{menu.label}</span>
                    </label>
                  ))}
                </div>
                
                <label className="block text-sm font-bold text-slate-800 mb-2">Akses Kegiatan Spesifik (Opsional)</label>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                  {kegiatanList.length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-2">Belum ada kegiatan</div>
                  ) : (
                    kegiatanList.map(k => (
                      <label key={k.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg border border-slate-100 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={verifyingPermissions.includes(`kegiatan:${k.id}`)}
                          onChange={() => toggleVerifyingPermission(`kegiatan:${k.id}`)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-600"
                        />
                        <span className="text-sm font-medium text-slate-700">{k.judulKegiatan} ({k.status})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setVerifyingUser(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleVerify}
                disabled={verifyingProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {verifyingProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Simpan Akses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
