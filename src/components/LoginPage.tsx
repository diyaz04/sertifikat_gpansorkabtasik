import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { signInWithPassword } from '../supabaseDatabase';
import { AnsorLogoSvg } from './CertificatePreview';

interface LoginPageProps {
  onSuccess: () => void;
  onBack?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithPassword(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau kata sandi salah.'
        : (err.message || 'Gagal masuk. Silakan coba kembali.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-slate-50/80 px-4 py-8 sm:py-12 flex flex-col items-center justify-center overflow-hidden selection:bg-[#006633] selection:text-white">
      {/* Subtle modern background grid & glow without external assets */}
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#006633_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#ebfef4] rounded-full blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#ebfef4] rounded-full blur-3xl opacity-70 pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md mx-auto animate-in fade-in-50 zoom-in-95 duration-300">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-200/50">
          
          {/* Header Section */}
          <div className="bg-white px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-7 text-center border-b border-slate-100 relative">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#006633] via-[#007a3d] to-amber-500" />
            
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#006633] text-white shadow-lg shadow-[#006633]/25 mb-4 transform hover:scale-105 transition-transform duration-300">
              <AnsorLogoSvg className="h-10 w-10 text-white" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebfef4] border border-[#006633]/20 text-[#006633] text-[10px] sm:text-[11px] font-bold tracking-wide uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006633]" />
              Akses Resmi Administrator
            </div>

            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase leading-snug">
              PORTAL SERTIFIKAT KADERISASI
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-extrabold text-[#006633] uppercase tracking-wider">
              GP ANSOR KAB. TASIKMALAYA
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={submit} className="space-y-5 p-6 sm:p-8 bg-white/50">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-1">
                <span className="shrink-0 w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Alamat Email <span className="text-rose-500">*</span>
                </span>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@ansorkabtasik.or.id"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-xs sm:text-sm outline-none transition-all focus:border-[#006633] focus:ring-4 focus:ring-[#006633]/15 font-semibold text-slate-900 bg-slate-50/50 hover:bg-white focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </span>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi administrator"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-xs sm:text-sm outline-none transition-all focus:border-[#006633] focus:ring-4 focus:ring-[#006633]/15 font-semibold text-slate-900 bg-slate-50/50 hover:bg-white focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#006633] rounded-lg transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                disabled={loading}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006633] px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-[#006633]/25 transition-all hover:bg-[#005229] hover:shadow-xl active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4 text-amber-300" />}
                {loading ? 'Memverifikasi Akses...' : 'Masuk Ke Portal'}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Sistem Manajemen Dokumen & Verifikasi Digital Resmi
                <br />
                <span className="font-bold text-slate-600">Pimpinan Cabang GP Ansor Kabupaten Tasikmalaya</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
