import React, { useEffect, useState } from 'react';
import { IssuedCertificate } from '../types';
import { getCertificateByToken, isSupabaseConfigured } from '../supabaseDatabase';
import { ShieldCheck, Calendar, MapPin, Award, BookOpen, User, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { AnsorLogoSvg } from './CertificatePreview';

interface VerificationPortalProps {
  token: string;
  onBackToApp: () => void;
}

export default function VerificationPortal({ token, onBackToApp }: VerificationPortalProps) {
  const [certificate, setCertificate] = useState<IssuedCertificate | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        if (!isSupabaseConfigured) throw new Error('Portal verifikasi belum terhubung ke Supabase.');
        const result = await getCertificateByToken(token);
        if (!active) return;
        if (!result) {
          setDecodeError('Sertifikat tidak ditemukan dalam database resmi. Periksa kembali QR code yang dipindai.');
          return;
        }
        setCertificate(result);
        setDecodeError(null);
      } catch (err: any) {
        console.error('Verification error:', err);
        if (active) setDecodeError(err.message || 'Gagal menghubungi database verifikasi sertifikat.');
      }
    };
    verify();
    return () => { active = false; };
  }, [token]);

  if (decodeError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-100 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-rose-950">Gagal Memverifikasi</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {decodeError}
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={onBackToApp}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Kembali ke Aplikasi Generator
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#006633] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#006633]">Menghubungkan ke Portal Verifikasi...</p>
        </div>
      </div>
    );
  }

  const { p: participant, c: config } = certificate.payload;
  const isRevoked = certificate.status === 'revoked';
  const totalJP = config.materi ? config.materi.reduce((sum, item) => sum + Number(item.h), 0) : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 py-10 px-4 flex flex-col items-center">
      
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#006633]/5 blur-3xl pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="max-w-3xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative print:shadow-none print:border-none">
        
        {/* Banner Status Verifikasi */}
        <div className="bg-white text-slate-900 px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className={`p-3 rounded-2xl border ${isRevoked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-[#ebfef4] text-[#006633] border-[#007a3d]/20'}`}>
              {isRevoked ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            <div>
              <div className="hidden">
                ● STATUS: TERVERIFIKASI ASLI
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${isRevoked ? 'bg-rose-600 text-white' : 'bg-[#006633] text-white'} rounded-full text-[10px] font-extrabold tracking-widest uppercase shadow-2xs`}>
                STATUS: {isRevoked ? 'DICABUT / TIDAK BERLAKU' : 'VALID DAN TERVERIFIKASI'}
              </div>
              <h1 className="text-lg font-black tracking-wide mt-2 text-slate-900">PORTAL VERIFIKASI SERTIFIKAT</h1>
              <p className="text-xs text-[#006633] font-bold uppercase tracking-wider">Pimpinan Cabang GP Ansor Kabupaten Tasikmalaya</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#006633] hover:bg-[#005229] text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer print:hidden"
          >
            <Printer className="w-4 h-4" />
            Cetak Validasi
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Logo & Intro */}
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
            <AnsorLogoSvg className="w-20 h-20" />
            <div>
              <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Konfirmasi Keabsahan Dokumen</h2>
              <h3 className="text-lg font-black text-[#006633] uppercase">{config.title || 'SERTIFIKAT KADERISASI'}</h3>
              <p className="text-xs text-[#006633] font-bold font-mono">No. {participant.number}</p>
            </div>
          </div>

          {/* Participant Info Block */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-l-4 border-[#006633] pl-2">
              Informasi Pemilik Sertifikat
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</span>
                <span className="text-base font-extrabold text-[#006633] uppercase flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#006633]" />
                  {participant.name}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asal PAC / Utusan</span>
                <span className="text-sm font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#006633]" />
                  {participant.institution ? `Kecamatan ${participant.institution}` : 'PC GP Ansor Tasikmalaya'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peran / Kualifikasi</span>
                <span className="text-sm font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#006633]" />
                  {participant.role}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Predikat Kelulusan</span>
                <span className="text-sm font-bold text-amber-600 uppercase flex items-center gap-1.5 italic">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  {participant.predicate || 'LULUS (STANDAR)'}
                </span>
              </div>
            </div>
          </div>

          {/* Event / Training Info */}
          <div className="bg-[#ebfef4]/30 border border-[#006633]/20 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-[#006633] tracking-wider uppercase flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#006633]" />
              Detail Kegiatan Pelatihan
            </h4>
            <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
              <p>
                <strong className="text-slate-900">Nama Kegiatan:</strong> {config.eventName} 
                {config.subEventName ? ` (${config.subEventName})` : ''}
              </p>
              <p>
                <strong className="text-slate-900">Penyelenggara:</strong> Pimpinan Cabang GP Ansor Kabupaten Tasikmalaya
              </p>
              <p>
                <strong className="text-slate-900">Waktu & Tempat:</strong> {config.dateText} | {config.location}
              </p>
            </div>
          </div>

          {config.signees && config.signees.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-l-4 border-[#006633] pl-2">
                Tanda Tangan Digital
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {config.signees.map((signee, index) => (
                  <div key={`${signee.n}-${index}`} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{signee.t}</span>
                    <span className="text-sm font-extrabold text-[#006633] uppercase">{signee.n}</span>
                    <span className="text-[10px] font-semibold text-[#006633] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Tervalidasi sistem
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum / Syllabus (Page 2 Materi) */}
          {config.materi && config.materi.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-l-4 border-[#006633] pl-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#006633]" />
                Kurikulum / Daftar Materi yang Ditempuh
              </h4>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-sans uppercase text-[10px] text-slate-500 tracking-wider">
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Materi Pokok / Sub-Materi</th>
                      <th className="p-3 w-32 text-center">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {config.materi.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.t}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{item.h} JP</td>
                      </tr>
                    ))}
                    <tr className="bg-[#ebfef4]/50 font-black text-[#006633]">
                      <td colSpan={2} className="p-3 text-right uppercase tracking-wider">Total Jam Pelajaran</td>
                      <td className="p-3 text-center font-mono text-[13px]">{totalJP} JP</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Endorsement & Verification Footer */}
          <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 ${isRevoked ? 'bg-rose-600' : 'bg-[#006633]'} rounded-full animate-ping`} />
              <span>{isRevoked ? `Dicabut${certificate.revokedAt ? ` pada ${new Date(certificate.revokedAt).toLocaleString('id-ID')}` : ''}` : `Diterbitkan ${new Date(certificate.issuedAt).toLocaleString('id-ID')}`}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-400 select-all">
              Token: {certificate.token}
            </div>
          </div>

        </div>

        {/* Back option for non-QR scanner lookups (administrators) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-center print:hidden">
          <button
            onClick={onBackToApp}
            className="text-xs font-semibold text-[#006633] hover:text-[#005229] cursor-pointer"
          >
            ← Masuk ke Aplikasi Generator Sertifikat
          </button>
        </div>

      </div>
    </div>
  );
}
