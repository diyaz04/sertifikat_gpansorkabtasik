import { ArrowRight, LockKeyhole } from 'lucide-react';
import desktopBackground from '../assets/landing-desktop.png';
import mobileBackground from '../assets/landing-mobile.png';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-emerald-950">
      <picture className="absolute inset-0">
        <source media="(max-width: 767px)" srcSet={mobileBackground} />
        <img
          src={desktopBackground}
          alt="Sistem Informasi dan Pembuatan Sertifikat GP Ansor Kabupaten Tasikmalaya"
          className="h-full w-full object-cover object-center"
        />
      </picture>

      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-emerald-950/85 via-emerald-950/25 to-transparent md:h-[28%]" />
      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6 md:bottom-10">
        <button
          type="button"
          onClick={onEnter}
          className="group flex min-w-[220px] items-center justify-center gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-7 py-4 text-sm font-black uppercase tracking-[0.13em] text-emerald-950 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:shadow-amber-400/25 active:translate-y-0 md:min-w-[270px] md:text-base"
        >
          <LockKeyhole className="h-5 w-5" />
          Masuk Sekarang
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </main>
  );
}
