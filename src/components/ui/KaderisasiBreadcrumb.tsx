import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Kegiatan, Participant } from '../../types';

interface Props {
  activeKegiatan?: Kegiatan;
  participants: Participant[];
}

export default function KaderisasiBreadcrumb({ activeKegiatan, participants }: Props) {
  if (!activeKegiatan) return null;

  // Determine actual lifecycle step (1 to 5)
  const isDraft = activeKegiatan.status === 'draft';
  const isBuka = activeKegiatan.status === 'dibuka';
  const isTutup = activeKegiatan.status === 'ditutup' || activeKegiatan.status === 'selesai';
  
  const hasParticipants = participants.some(p => p.kegiatanId === activeKegiatan.id);
  const isSelesai = activeKegiatan.status === 'selesai' || hasParticipants;

  let currentStep = 1;
  if (isSelesai) currentStep = 5;
  else if (isTutup) currentStep = 4; // Checkin, Absensi, Rekap
  else if (isBuka) currentStep = 2; // Pendaftaran

  const steps = [
    { id: 1, name: 'Perencanaan', desc: 'Draf' },
    { id: 2, name: 'Pendaftaran', desc: 'Dibuka' },
    { id: 3, name: 'Pelaksanaan', desc: 'Check-in & Absensi' },
    { id: 4, name: 'Rekap', desc: 'Kelulusan' },
    { id: 5, name: 'Sertifikat', desc: 'Terbit' }
  ];

  return (
    <div className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Siklus Hidup: {activeKegiatan.judulKegiatan}</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((step, index) => {
            // For step 3 & 4 we share currentStep=4 if isTutup but we distinguish visually
            let isCompleted = step.id < currentStep;
            let isCurrent = step.id === currentStep;
            
            // special case for step 3 vs 4
            if (currentStep === 4) {
              if (step.id === 3 || step.id === 4) {
                 isCurrent = true;
                 isCompleted = false;
              }
            }

            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors
                  ${isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                    isCurrent ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500/20' : 
                    'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className={`w-4 h-4 ${isCurrent ? 'fill-blue-100' : ''}`} />}
                  <span>{step.name}</span>
                  <span className={`text-xs ml-1 ${isCurrent ? 'text-blue-500/80' : 'text-slate-400/80'}`}>({step.desc})</span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className={`w-4 h-4 shrink-0 ${isCompleted ? 'text-emerald-300' : 'text-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
