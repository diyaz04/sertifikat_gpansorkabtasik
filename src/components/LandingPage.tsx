import React from 'react';
import { ArrowRight, ShieldCheck, Users, Award } from 'lucide-react';
import { AnsorLogoSvg } from './CertificatePreview';
import ansorCadre from '../assets/ansor_cadre.jpg';

interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-white font-sans overflow-hidden flex flex-col relative selection:bg-[#006633] selection:text-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-50 rounded-full blur-3xl opacity-50 transform translate-x-1/3 -translate-y-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-3xl opacity-60 transform -translate-x-1/4 translate-y-1/4 pointer-events-none" />
      
      {/* Navigation Bar */}
      <nav className="relative z-10 px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <AnsorLogoSvg className="w-12 h-12 text-[#006633]" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 tracking-tight text-lg uppercase">SIMak</h1>
            <p className="text-[10px] text-[#006633] font-bold tracking-widest uppercase">Ansor Tasikmalaya</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center max-w-7xl mx-auto w-full px-6 py-12 md:py-0">
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center w-full">
          
          {/* Left: Text Content */}
          <div className="flex flex-col items-start space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-[#006633] text-xs font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-[#006633] animate-pulse" />
              Sistem Kaderisasi Resmi
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Sistem Informasi <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006633] to-emerald-500">
                Manajemen Kaderisasi
              </span>
              <br /> Ansor Tasikmalaya
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-lg font-medium">
              Platform modern terintegrasi untuk mengelola data pendaftaran, absensi, dan sertifikasi kader Nahdlatul Ulama secara *real-time* dan transparan.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
              <button 
                onClick={onEnter}
                className="group relative px-8 py-4 bg-[#006633] text-white rounded-2xl font-bold text-lg overflow-hidden shadow-xl shadow-[#006633]/25 hover:shadow-2xl hover:shadow-[#006633]/40 transition-all hover:-translate-y-1 active:translate-y-0"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center justify-center gap-2">
                  Masuk ke Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-100 w-full mt-4">
              <div className="flex flex-col gap-1.5">
                <Users className="w-6 h-6 text-[#006633]" />
                <span className="font-black text-slate-800 text-xl">10k+</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kader Terdata</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <ShieldCheck className="w-6 h-6 text-[#006633]" />
                <span className="font-black text-slate-800 text-xl">100%</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Aman</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Award className="w-6 h-6 text-[#006633]" />
                <span className="font-black text-slate-800 text-xl">Resmi</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="relative hidden md:block animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            {/* Main Image Container */}
            <div className="relative z-20 w-full aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 animate-[float_6s_ease-in-out_infinite]">
              <img 
                src={ansorCadre} 
                alt="Ilustrasi Kader Ansor" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider mb-2 border border-white/30">
                  Satu Barisan
                </div>
                <h3 className="text-2xl font-black leading-tight">Berkhidmat Tanpa Batas</h3>
              </div>
            </div>
            
            {/* Decorative dots */}
            <div className="absolute top-1/2 -right-8 w-24 h-48 bg-[radial-gradient(#006633_2px,transparent_2px)] [background-size:16px_16px] opacity-20 -z-10" />
            <div className="absolute -bottom-8 -left-8 w-48 h-24 bg-[radial-gradient(#006633_2px,transparent_2px)] [background-size:16px_16px] opacity-20 -z-10" />
          </div>
          
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
      `}} />
    </div>
  );
}
