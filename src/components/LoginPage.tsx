import { FormEvent, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { signInWithPassword } from '../supabaseDatabase';
import { AnsorLogoSvg } from './CertificatePreview';

interface LoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function LoginPage({ onBack, onSuccess }: LoginPageProps) {
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
    <main className="relative min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-5 py-10">
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_center,#fbbf24_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
          <div className="bg-emerald-950 px-7 py-7 text-center text-white">
            <AnsorLogoSvg className="mx-auto h-20 w-20" />
            <h1 className="mt-3 text-lg font-black tracking-wide">LOGIN ADMINISTRATOR</h1>
            <p className="mt-1 text-xs font-semibold text-amber-300">Sistem Sertifikat GP Ansor Kabupaten Tasikmalaya</p>
          </div>

          <form onSubmit={submit} className="space-y-5 p-7">
            {error && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">Email</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@ansor.or.id" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">Kata Sandi</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan kata sandi" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-700" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-emerald-800 disabled:bg-slate-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
            <button type="button" onClick={onBack} className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700">
              <ArrowLeft className="h-4 w-4" /> Kembali ke halaman awal
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
