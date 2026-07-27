import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from 'react';
import { Participant, CertificateConfig, Signee, MateriItem, Kegiatan, IssuedCertificate } from './types';
import { formatIndonesianDate, formatIndonesianDateRange } from './utils';
import CertificatePreview, { AnsorLogoSvg } from './components/CertificatePreview';
import GoogleSheetsImporter from './components/GoogleSheetsImporter';
import SignatureCanvas from './components/SignatureCanvas';
import VerificationPortal from './components/VerificationPortal';
import LoginPage from './components/LoginPage';
import { getAuthSession, isSupabaseConfigured, issueCertificates, loadSupabaseDatabase, saveSupabaseDatabase, signOut, SupabaseDbPayload } from './supabaseDatabase';
import { 
  Users, 
  BookOpen, 
  PenTool, 
  Settings, 
  Database,
  RefreshCw,
  Search, 
  Plus, 
  Trash2, 
  Download, 
  FileDown, 
  Award, 
  Edit, 
  ChevronRight, 
  Save, 
  Share2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Calendar,
  MapPin,
  UserCheck,
  LogOut
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Default initial materials list for GP Ansor Kaderisasi (Aswaja, NU, Ansor, Kebangsaan, etc.)
const defaultMateri: MateriItem[] = [
  { id: 'mat_1', title: "Ahlussunnah wal Jama'ah (Aswaja)", hours: 4, instructor: 'KH. Abun Bunyamin' },
  { id: 'mat_2', title: 'Ke-Nahdlatul Ulama-an (Ke-NU-an)', hours: 4, instructor: 'Dr. KH. Asep Saepul Millah' },
  { id: 'mat_3', title: 'Ke-Ansor-an & Ke-Banser-an', hours: 4, instructor: 'Sahabat H. Safei, M.Pd.' },
  { id: 'mat_4', title: 'Amaliah dan Tradisi Keagamaan NU', hours: 2, instructor: 'KH. Asep Abdussalam' },
  { id: 'mat_5', title: 'Keindonesiaan dan Kebangsaan', hours: 2, instructor: 'Perwakilan Kodim 0612/Tasikmalaya' },
  { id: 'mat_6', title: 'Kepemimpinan dan Keorganisasian', hours: 3, instructor: 'Pimpinan Wilayah GP Ansor Jawa Barat' },
  { id: 'mat_7', title: 'Pengantar Rencana Kerja Organisasi', hours: 3, instructor: 'Tim Instruktur Cabang' }
];

// Default initial events (Kegiatan)
const defaultKegiatan: Kegiatan[] = [
  {
    id: 'keg_default',
    jenisKegiatan: 'PKD',
    judulKegiatan: 'PKD I PAC GP Ansor Karangjaya',
    tempatPelaksanaan: 'Pondok Pesantren Miftahul Ulum, Karangjaya',
    tanggalMulai: '2026-07-09',
    tanggalBerakhir: '2026-07-11',
    ketuaPelaksana: 'Sahabat Ahmad Bukhari, S.Sy.',
    materi: defaultMateri
  }
];

// Default initial participants (mock data to make the app ready-to-run beautifully)
const defaultParticipants: Participant[] = [
  { 
    id: 'part_1', 
    kegiatanId: 'keg_default',
    name: 'Sahabat Muhammad Rafiq', 
    number: '001/PC-GP.ANSOR/TASIK/VII/2026', 
    role: 'Peserta', 
    predicate: 'Istimewa', 
    institution: 'Karangjaya',
    tempatLahir: 'Tasikmalaya',
    tanggalLahir: '1998-05-12',
    date: '11 Juli 2026'
  },
  { 
    id: 'part_2', 
    kegiatanId: 'keg_default',
    name: 'Sahabat Dian Herdiansyah', 
    number: '002/PC-GP.ANSOR/TASIK/VII/2026', 
    role: 'Peserta', 
    predicate: 'Sangat Memuaskan', 
    institution: 'Ciawi',
    tempatLahir: 'Tasikmalaya',
    tanggalLahir: '1999-10-22',
    date: '11 Juli 2026'
  },
  { 
    id: 'part_3', 
    kegiatanId: 'keg_default',
    name: 'Sahabat Abdul Hakim', 
    number: '003/PC-GP.ANSOR/TASIK/VII/2026', 
    role: 'Peserta', 
    predicate: 'Memuaskan', 
    institution: 'Manonjaya',
    tempatLahir: 'Tasikmalaya',
    tanggalLahir: '1997-02-15',
    date: '11 Juli 2026'
  }
];

const defaultConfig: CertificateConfig = {
  title: 'SERTIFIKAT KADERISASI',
  eventName: 'Pelatihan Kepemimpinan Dasar (PKD)',
  subEventName: 'Angkatan XV PAC GP Ansor Singaparna',
  location: 'Pondok Pesantren Cipasung, Tasikmalaya',
  dateText: '09 - 11 Juli 2026',
  materi: defaultMateri,
  signees: [
    { id: 'sign_1', name: 'Sahabat H. Safei, M.Pd.', title: 'Ketua Pimpinan Cabang', type: 'text' },
    { id: 'sign_2', name: 'Sahabat Ahmad Bukhari, S.Sy.', title: 'Sekretaris Cabang', type: 'text' }
  ],
};

const romanMonthFromDate = (dateStr?: string) => {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const indonesianMonths = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
  ];
  let month = new Date().getMonth() + 1;
  if (dateStr) {
    const isoMatch = dateStr.match(/^\d{4}-(\d{2})-\d{2}/);
    if (isoMatch) {
      month = Number(isoMatch[1]);
    } else {
      const normalized = dateStr.toLowerCase();
      const textMonthIndex = indonesianMonths.findIndex(name => normalized.includes(name));
      if (textMonthIndex >= 0) month = textMonthIndex + 1;
    }
  }
  return romans[Math.max(0, Math.min(11, month - 1))];
};

const yearFromDate = (dateStr?: string) => {
  const yearMatch = dateStr?.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1];
  return new Date().getFullYear().toString();
};

const buildCertificateNumber = (sequence: number, dateStr?: string) => (
  `${sequence}/PC-XVII/01/${romanMonthFromDate(dateStr)}/${yearFromDate(dateStr)}`
);

const extractCertificateSequence = (number?: string) => {
  const sequence = Number((number || '').trim().match(/^\d+/)?.[0] || 0);
  return Number.isFinite(sequence) ? sequence : 0;
};

interface HiddenRenderEngineProps {
  participants: Participant[];
  kegiatanList: Kegiatan[];
  activeKegiatan: Kegiatan;
  config: CertificateConfig;
}

const HiddenCertificateRenderEngine = memo(function HiddenCertificateRenderEngine({
  participants,
  kegiatanList,
  activeKegiatan,
  config,
}: HiddenRenderEngineProps) {
  return (
    <div className="fixed left-[-12000px] top-0 pointer-events-none select-none">
      {participants.map((p) => {
        const pKegiatan = kegiatanList.find(k => k.id === p.kegiatanId) || activeKegiatan;
        const pConfig: CertificateConfig = {
          title: config.title || 'SERTIFIKAT KADERISASI',
          eventName: pKegiatan ? pKegiatan.judulKegiatan : config.eventName,
          subEventName: pKegiatan ? `Kecamatan ${pKegiatan.tempatPelaksanaan}` : config.subEventName,
          location: pKegiatan ? pKegiatan.tempatPelaksanaan : config.location,
          dateText: pKegiatan 
            ? formatIndonesianDateRange(pKegiatan.tanggalMulai, pKegiatan.tanggalBerakhir) 
            : config.dateText,
          materi: pKegiatan ? pKegiatan.materi : [],
          signees: config.signees || [],
          customBackgroundUrl: config.customBackgroundUrl,
          issuedDateText: pKegiatan ? formatIndonesianDate(pKegiatan.tanggalBerakhir) : config.dateText,
          ketuaPelaksana: pKegiatan ? pKegiatan.ketuaPelaksana : undefined,
          jenisKegiatan: pKegiatan ? (pKegiatan.jenisKegiatan || 'PKD') : config.jenisKegiatan
        };
        return (
          <div key={p.id}>
            <CertificatePreview participant={p} config={pConfig} showBackPage={false} exportMode />
            <CertificatePreview participant={p} config={pConfig} showBackPage={true} exportMode />
          </div>
        );
      })}
    </div>
  );
});

export default function App() {
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [appScreen, setAppScreen] = useState<'login' | 'dashboard'>('login');
  const [hasSession, setHasSession] = useState(false);

  // Parse URL search parameters on boot to detect QR code scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');
    if (token) {
      setVerifyToken(token);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getAuthSession().then(session => setHasSession(Boolean(session))).catch(() => setHasSession(false));
  }, []);

  // Main application states
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>(() => {
    const saved = localStorage.getItem('ansor_kegiatan_list');
    return saved ? JSON.parse(saved) : defaultKegiatan;
  });

  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>(() => {
    const saved = localStorage.getItem('ansor_selected_kegiatan_id');
    return saved || 'keg_default';
  });

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('ansor_participants');
    return saved ? JSON.parse(saved) : defaultParticipants;
  });

  const [config, setConfig] = useState<CertificateConfig>(() => {
    const saved = localStorage.getItem('ansor_config');
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const [activeParticipantId, setActiveParticipantId] = useState<string>(() => {
    const saved = localStorage.getItem('ansor_active_id');
    if (saved) return saved;
    return defaultParticipants.length > 0 ? defaultParticipants[0].id : '';
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'kegiatan' | 'kader' | 'materi' | 'generate' | 'signatures' | 'config' | 'riwayat'>('kegiatan');
  // Signature Drawing overlay state
  const [drawingSigneeId, setDrawingSigneeId] = useState<string | null>(null);

  // Modal / Form state for manual adding/editing participants
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [formData, setFormData] = useState<Partial<Participant>>({
    name: '',
    number: '',
    role: 'Peserta',
    predicate: 'Istimewa',
    institution: '',
    tempatLahir: '',
    tanggalLahir: '',
  });

  // Modal / Form state for Kegiatan
  const [isKegiatanFormOpen, setIsKegiatanFormOpen] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [kegiatanFormData, setKegiatanFormData] = useState<Partial<Kegiatan>>({
    jenisKegiatan: 'PKD',
    judulKegiatan: '',
    tempatPelaksanaan: '',
    tanggalMulai: '',
    tanggalBerakhir: '',
    ketuaPelaksana: 'Sahabat Ahmad Bukhari, S.Sy.'
  });

  // Export process loading states
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [databaseSyncState, setDatabaseSyncState] = useState<{
    loading: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    loading: false,
    type: 'info',
    message: isSupabaseConfigured ? 'Menghubungkan ke Supabase...' : 'Supabase belum dikonfigurasi.',
  });
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('ansor_participants', JSON.stringify(participants));
    if (participants.length > 0 && !activeParticipantId) {
      setActiveParticipantId(participants[0].id);
    }
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('ansor_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (config.lastCertificateSequence !== undefined) return;
    const highestExisting = Math.max(0, ...participants.map(p => extractCertificateSequence(p.number)));
    setConfig(prev => ({ ...prev, lastCertificateSequence: highestExisting }));
  }, [participants, config.lastCertificateSequence]);

  useEffect(() => {
    localStorage.setItem('ansor_active_id', activeParticipantId);
  }, [activeParticipantId]);

  useEffect(() => {
    localStorage.setItem('ansor_kegiatan_list', JSON.stringify(kegiatanList));
  }, [kegiatanList]);

  useEffect(() => {
    localStorage.setItem('ansor_selected_kegiatan_id', selectedKegiatanId);
  }, [selectedKegiatanId]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSearchQuery('');
  }, [selectedKegiatanId]);

  // Derived/computed active objects
  const activeKegiatan = kegiatanList.find(k => k.id === selectedKegiatanId) || kegiatanList[0] || defaultKegiatan[0];
  const deferredParticipants = useDeferredValue(participants);
  const deferredKegiatanList = useDeferredValue(kegiatanList);
  const deferredActiveKegiatan = useDeferredValue(activeKegiatan);
  const deferredConfig = useDeferredValue(config);
  const getLastCertificateSequence = () => Math.max(
    Number(config.lastCertificateSequence || 0),
    ...participants.map(participant => extractCertificateSequence(participant.number)),
  );

  const buildOnlineDatabasePayload = (
    nextKegiatanList = kegiatanList,
    nextParticipants = participants,
    nextConfig = config,
    nextSelectedKegiatanId = selectedKegiatanId
  ): SupabaseDbPayload => ({
    kegiatanList: nextKegiatanList,
    participants: nextParticipants,
    config: nextConfig,
    selectedKegiatanId: nextSelectedKegiatanId,
    syncedAt: new Date().toISOString(),
  });

  const syncToOnlineDatabase = async (
    payload = buildOnlineDatabasePayload(),
    silent = false
  ) => {
    if (!isSupabaseConfigured) {
      if (!silent) {
        setDatabaseSyncState({
          loading: false,
          type: 'error',
          message: 'Isi konfigurasi Supabase di environment variables dulu.',
        });
        triggerNotification('error', 'Supabase belum dikonfigurasi.');
      }
      return false;
    }

    setDatabaseSyncState({
      loading: true,
      type: 'info',
      message: 'Menyimpan data ke Supabase...',
    });

    try {
      const result = await saveSupabaseDatabase(payload);
      setDatabaseSyncState({
        loading: false,
        type: 'success',
        message: `${result.message || 'Database online berhasil disinkronkan.'} (${new Date().toLocaleString('id-ID')})`,
      });
      if (!silent) {
        triggerNotification('success', 'Database Supabase berhasil diperbarui.');
      }
      setSupabaseReady(true);
      return true;
    } catch (err: any) {
      setDatabaseSyncState({
        loading: false,
        type: 'error',
        message: err.message || 'Gagal sinkron ke Supabase.',
      });
      if (!silent) {
        triggerNotification('error', err.message || 'Gagal sinkron ke Supabase.');
      }
      return false;
    }
  };

  const loadFromOnlineDatabase = async (askConfirmation = true) => {
    if (!isSupabaseConfigured) {
      setDatabaseSyncState({
        loading: false,
        type: 'error',
        message: 'Isi konfigurasi Supabase di environment variables dulu.',
      });
      triggerNotification('error', 'Supabase belum dikonfigurasi.');
      return;
    }

    if (askConfirmation && !confirm('Data lokal akan diganti dengan data dari Supabase. Lanjutkan?')) {
      return;
    }

    setDatabaseSyncState({
      loading: true,
      type: 'info',
      message: 'Menarik database dari Supabase...',
    });

    try {
      const payload = await loadSupabaseDatabase();
      if (!payload.kegiatanList || !payload.participants || !payload.config) {
        throw new Error('Format database online tidak lengkap.');
      }

      setKegiatanList(payload.kegiatanList.length > 0 ? payload.kegiatanList : defaultKegiatan);
      setParticipants(payload.participants);
      setConfig({
        ...defaultConfig,
        ...payload.config,
        materi: payload.config.materi || defaultMateri,
        signees: payload.config.signees?.length ? payload.config.signees : defaultConfig.signees,
      });
      setSelectedKegiatanId(payload.selectedKegiatanId || payload.kegiatanList[0]?.id || 'keg_default');
      setActiveParticipantId(payload.participants[0]?.id || '');
      setSupabaseReady(true);
      setDatabaseSyncState({
        loading: false,
        type: 'success',
        message: `Database online berhasil dimuat. Sync terakhir: ${payload.syncedAt ? new Date(payload.syncedAt).toLocaleString('id-ID') : '-'}`,
      });
      triggerNotification('success', 'Data dari Supabase berhasil dimuat.');
    } catch (err: any) {
      setDatabaseSyncState({
        loading: false,
        type: 'error',
        message: err.message || 'Gagal menarik database Supabase.',
      });
      triggerNotification('error', err.message || 'Gagal menarik database online.');
    }
  };

  // Supabase menjadi sumber data utama: tarik saat aplikasi dibuka, lalu auto-save
  // perubahan dengan debounce agar pengetikan tidak menembakkan request beruntun.
  useEffect(() => {
    if (isSupabaseConfigured && hasSession && appScreen === 'dashboard') {
      loadFromOnlineDatabase(false);
    }
  }, [hasSession, appScreen]);

  useEffect(() => {
    if (!supabaseReady) return;
    const timeout = window.setTimeout(() => {
      syncToOnlineDatabase(buildOnlineDatabasePayload(), true);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [kegiatanList, participants, config, selectedKegiatanId, supabaseReady]);

  const markActiveKegiatanDraft = () => {
    setKegiatanList(prev => prev.map(k => (
      k.id === selectedKegiatanId ? { ...k, generatedAt: undefined } : k
    )));
  };

  // Select all helper
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredParticipants.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  // Participant Form Submit (Manual Create / Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingParticipant) {
      const editedSequence = extractCertificateSequence(formData.number || editingParticipant.number);
      // Edit mode
      setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? {
        ...p,
        name: formData.name!,
        number: formData.number || p.number,
        role: formData.role || 'Peserta',
        predicate: formData.predicate,
        institution: formData.institution,
        tempatLahir: formData.tempatLahir,
        tanggalLahir: formData.tanggalLahir,
      } : p));
      markActiveKegiatanDraft();
      if (editedSequence > Number(config.lastCertificateSequence || 0)) {
        setConfig(prev => ({ ...prev, lastCertificateSequence: editedSequence }));
      }
      triggerNotification('success', 'Data kader berhasil diperbarui');
    } else {
      // Create mode
      const nextSequence = getLastCertificateSequence() + 1;
      const fallbackNum = buildCertificateNumber(nextSequence, activeKegiatan?.tanggalBerakhir);
      const assignedNumber = formData.number || fallbackNum;
      const assignedSequence = Math.max(nextSequence, extractCertificateSequence(assignedNumber));
      
      const newParticipant: Participant = {
        id: `part_${Date.now()}`,
        kegiatanId: selectedKegiatanId,
        name: formData.name,
        number: assignedNumber,
        role: formData.role || 'Peserta',
        predicate: formData.predicate,
        institution: formData.institution,
        tempatLahir: formData.tempatLahir,
        tanggalLahir: formData.tanggalLahir,
        date: activeKegiatan ? formatIndonesianDateRange(activeKegiatan.tanggalMulai, activeKegiatan.tanggalBerakhir) : config.dateText,
      };
      setParticipants(prev => [...prev, newParticipant]);
      setConfig(prev => ({ ...prev, lastCertificateSequence: assignedSequence }));
      setActiveParticipantId(newParticipant.id);
      markActiveKegiatanDraft();
      triggerNotification('success', 'Kader baru berhasil ditambahkan');
    }

    setIsFormOpen(false);
    setEditingParticipant(null);
    setFormData({ name: '', number: '', role: 'Peserta', predicate: 'Istimewa', institution: '', tempatLahir: '', tanggalLahir: '' });
  };

  const startEditParticipant = (p: Participant) => {
    setEditingParticipant(p);
    setFormData({
      name: p.name,
      number: p.number,
      role: p.role,
      predicate: p.predicate,
      institution: p.institution,
      tempatLahir: p.tempatLahir || '',
      tanggalLahir: p.tanggalLahir || '',
    });
    setIsFormOpen(true);
  };

  const deleteParticipant = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data kader ini?')) {
      setParticipants(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (activeParticipantId === id) {
        const remaining = participants.filter(p => p.id !== id && p.kegiatanId === selectedKegiatanId);
        setActiveParticipantId(remaining.length > 0 ? remaining[0].id : '');
      }
      markActiveKegiatanDraft();
      triggerNotification('success', 'Data kader berhasil dihapus');
    }
  };

  // Google Sheets import handler
  const handleImportComplete = useCallback((imported: Participant[]) => {
    const firstSequence = getLastCertificateSequence() + 1;
    const importedWithKegId = imported.map((p, index) => ({
      ...p,
      kegiatanId: selectedKegiatanId,
      number: buildCertificateNumber(firstSequence + index, activeKegiatan?.tanggalBerakhir),
      date: activeKegiatan ? formatIndonesianDateRange(activeKegiatan.tanggalMulai, activeKegiatan.tanggalBerakhir) : config.dateText,
    }));
    setParticipants(prev => {
      // Merge: Append newly imported rows
      return [...prev, ...importedWithKegId];
    });
    if (importedWithKegId.length > 0) {
      setConfig(prev => ({
        ...prev,
        lastCertificateSequence: firstSequence + importedWithKegId.length - 1,
      }));
    }
    if (importedWithKegId.length > 0) {
      setActiveParticipantId(importedWithKegId[0].id);
    }
    markActiveKegiatanDraft();
    triggerNotification('success', `Berhasil mengimpor ${imported.length} kader ke kegiatan "${activeKegiatan.judulKegiatan}"`);
  }, [selectedKegiatanId, activeKegiatan, config.dateText, config.lastCertificateSequence, participants, kegiatanList]);

  // Kegiatan Form Submit (Manual Create / Edit)
  const handleKegiatanFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kegiatanFormData.judulKegiatan) return;

    if (editingKegiatan) {
      // Edit mode
      setKegiatanList(prev => prev.map(k => k.id === editingKegiatan.id ? {
        ...k,
        jenisKegiatan: kegiatanFormData.jenisKegiatan || k.jenisKegiatan || 'PKD',
        judulKegiatan: kegiatanFormData.judulKegiatan!,
        tempatPelaksanaan: kegiatanFormData.tempatPelaksanaan || k.tempatPelaksanaan,
        tanggalMulai: kegiatanFormData.tanggalMulai || k.tanggalMulai,
        tanggalBerakhir: kegiatanFormData.tanggalBerakhir || k.tanggalBerakhir,
        ketuaPelaksana: kegiatanFormData.ketuaPelaksana || k.ketuaPelaksana,
        generatedAt: undefined,
      } : k));
      triggerNotification('success', 'Data kegiatan berhasil diperbarui');
    } else {
      // Create mode
      const newKeg: Kegiatan = {
        id: `keg_${Date.now()}`,
        jenisKegiatan: kegiatanFormData.jenisKegiatan || 'PKD',
        judulKegiatan: kegiatanFormData.judulKegiatan,
        tempatPelaksanaan: kegiatanFormData.tempatPelaksanaan || 'Kabupaten Tasikmalaya',
        tanggalMulai: kegiatanFormData.tanggalMulai || new Date().toISOString().slice(0, 10),
        tanggalBerakhir: kegiatanFormData.tanggalBerakhir || new Date().toISOString().slice(0, 10),
        ketuaPelaksana: kegiatanFormData.ketuaPelaksana || (kegiatanFormData.jenisKegiatan === 'Dirosah Ula' ? 'Aj. Husni Aziz Mubarok, M.Pd.' : 'Sahabat Ahmad Bukhari, S.Sy.'),
        materi: [...defaultMateri] // Copy default syllabus to start
      };
      setKegiatanList(prev => [...prev, newKeg]);
      setSelectedKegiatanId(newKeg.id);
      setActiveTab('kader');
      triggerNotification('success', 'Kegiatan baru berhasil ditambahkan! Silakan lanjut impor data kader.');
    }

    setIsKegiatanFormOpen(false);
    setEditingKegiatan(null);
    setKegiatanFormData({ jenisKegiatan: 'PKD', judulKegiatan: '', tempatPelaksanaan: '', tanggalMulai: '', tanggalBerakhir: '', ketuaPelaksana: 'Sahabat Ahmad Bukhari, S.Sy.' });
  };

  const startEditKegiatan = (k: Kegiatan) => {
    setEditingKegiatan(k);
    setKegiatanFormData({
      jenisKegiatan: k.jenisKegiatan || 'PKD',
      judulKegiatan: k.judulKegiatan,
      tempatPelaksanaan: k.tempatPelaksanaan,
      tanggalMulai: k.tanggalMulai,
      tanggalBerakhir: k.tanggalBerakhir,
      ketuaPelaksana: k.ketuaPelaksana
    });
    setIsKegiatanFormOpen(true);
  };

  const deleteKegiatan = (id: string) => {
    if (kegiatanList.length <= 1) {
      triggerNotification('error', 'Minimal harus ada satu kegiatan tersisa.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus kegiatan ini? Semua data kader terkait kegiatan ini juga akan dihapus secara permanen.')) {
      setKegiatanList(prev => prev.filter(k => k.id !== id));
      setParticipants(prev => prev.filter(p => p.kegiatanId !== id));
      if (selectedKegiatanId === id) {
        const remainingKegs = kegiatanList.filter(k => k.id !== id);
        if (remainingKegs.length > 0) {
          setSelectedKegiatanId(remainingKegs[0].id);
        }
      }
      triggerNotification('success', 'Kegiatan beserta seluruh kadernya berhasil dihapus');
    }
  };

  // Helper notification
  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setShowNotification({ type, text });
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  const sanitizeUnsupportedCanvasColors = (clonedDoc: Document, rootId: string) => {
    const root = clonedDoc.getElementById(rootId);
    const win = clonedDoc.defaultView;
    if (!root || !win) return;

    const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))] as HTMLElement[];
    const hasUnsupportedColor = (value: string) => /oklab|oklch|color-mix/i.test(value);

    nodes.forEach((node) => {
      const styles = win.getComputedStyle(node);
      if (hasUnsupportedColor(styles.color)) node.style.color = '#0f172a';
      if (hasUnsupportedColor(styles.backgroundColor)) node.style.backgroundColor = 'transparent';

      ([
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
        'textDecorationColor',
      ] as const).forEach((property) => {
        if (hasUnsupportedColor(styles[property])) {
          node.style[property] = '#e2e8f0';
        }
      });
    });
  };

  const renderCertificateCanvas = (element: HTMLElement, scale: number) => {
    return html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => sanitizeUnsupportedCanvasColors(clonedDoc, element.id),
    });
  };

  // Download complete 2-page PDF for a single participant
  const handleDownloadPdf = async (p: Participant) => {
    const frontEl = document.getElementById(`certificate-front-${p.id}`);
    const backEl = document.getElementById(`certificate-back-${p.id}`);

    if (!frontEl || !backEl) {
      triggerNotification('error', 'Elemen sertifikat depan atau belakang tidak ditemukan');
      return;
    }

    setExportProgress(`Menyusun PDF Lengkap untuk ${p.name}...`);
    try {
      // Render front side crisp image
      const canvasFront = await renderCertificateCanvas(frontEl, 2.2);
      const imgFront = canvasFront.toDataURL('image/png');

      // Render back side crisp image
      const canvasBack = await renderCertificateCanvas(backEl, 2.2);
      const imgBack = canvasBack.toDataURL('image/png');

      // Setup landscape A4 PDF document: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add Page 1
      pdf.addImage(imgFront, 'PNG', 0, 0, 297, 210);
      
      // Add Page 2
      pdf.addPage();
      pdf.addImage(imgBack, 'PNG', 0, 0, 297, 210);

      pdf.save(`Sertifikat_Ansor_Lengkap_${p.name.replace(/\s+/g, '_')}.pdf`);
      triggerNotification('success', `PDF 2-Halaman untuk ${p.name} berhasil diunduh!`);
    } catch (err) {
      console.error(err);
      triggerNotification('error', 'Gagal merender dokumen PDF.');
    } finally {
      setExportProgress(null);
    }
  };

  // Bulk PDF generation for all selected participants
  const handleBulkExportPdf = async () => {
    if (selectedIds.size === 0) {
      triggerNotification('error', 'Pilih minimal satu kader untuk melakukan ekspor massal.');
      return;
    }

    const idsToExport = Array.from(selectedIds);
    setExportProgress(`Mempersiapkan ekspor massal ${idsToExport.length} sertifikat...`);

    try {
      for (let i = 0; i < idsToExport.length; i++) {
        const id = idsToExport[i];
        const p = participants.find(part => part.id === id);
        if (!p) continue;

        setExportProgress(`Merender PDF ${i + 1}/${idsToExport.length}: ${p.name}`);

        const frontEl = document.getElementById(`certificate-front-${p.id}`);
        const backEl = document.getElementById(`certificate-back-${p.id}`);

        if (!frontEl || !backEl) continue;

        const canvasFront = await renderCertificateCanvas(frontEl, 2.0);
        const imgFront = canvasFront.toDataURL('image/png');

        const canvasBack = await renderCertificateCanvas(backEl, 2.0);
        const imgBack = canvasBack.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        pdf.addImage(imgFront, 'PNG', 0, 0, 297, 210);
        pdf.addPage();
        pdf.addImage(imgBack, 'PNG', 0, 0, 297, 210);

        pdf.save(`Sertifikat_Ansor_Lengkap_${p.name.replace(/\s+/g, '_')}.pdf`);
        
        // Minor throttle to let the browser download queue catch up smoothly
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      triggerNotification('success', `Sukses mengunduh ${idsToExport.length} berkas PDF!`);
    } catch (err) {
      console.error(err);
      triggerNotification('error', 'Terjadi gangguan dalam proses ekspor massal.');
    } finally {
      setExportProgress(null);
    }
  };

  const waitForCertificateRender = async (participantIds: string[]) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const ready = participantIds.every((id) => {
        const front = document.getElementById(`certificate-front-${id}`);
        const back = document.getElementById(`certificate-back-${id}`);
        return front && back && front.querySelector('img[alt="QR verifikasi sertifikat"]');
      });
      if (ready) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('QR sertifikat belum selesai dirender. Silakan coba kembali.');
  };

  const handleExportKegiatanPdf = async (peserta: Participant[], judulKegiatan: string) => {
    if (!peserta.length) return;
    setExportProgress(`Menyiapkan PDF gabungan ${peserta.length} sertifikat...`);
    try {
      await waitForCertificateRender(peserta.map(p => p.id));
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let index = 0; index < peserta.length; index++) {
        const participant = peserta[index];
        setExportProgress(`Merender sertifikat ${index + 1}/${peserta.length}: ${participant.name}`);
        const frontEl = document.getElementById(`certificate-front-${participant.id}`);
        const backEl = document.getElementById(`certificate-back-${participant.id}`);
        if (!frontEl || !backEl) throw new Error(`Template ${participant.name} tidak ditemukan.`);

        const frontCanvas = await renderCertificateCanvas(frontEl, 2);
        if (index > 0) pdf.addPage();
        pdf.addImage(frontCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);

        const backCanvas = await renderCertificateCanvas(backEl, 2);
        pdf.addPage();
        pdf.addImage(backCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const safeName = judulKegiatan.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
      pdf.save(`Semua_Sertifikat_${safeName || 'Kegiatan'}.pdf`);
      triggerNotification('success', `PDF gabungan ${peserta.length} sertifikat berhasil diunduh.`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', err.message || 'Gagal membuat PDF gabungan kegiatan.');
    } finally {
      setExportProgress(null);
    }
  };

  const handleGenerateCertificates = async (kegiatanId = selectedKegiatanId) => {
    const kegiatan = kegiatanList.find(k => k.id === kegiatanId) || activeKegiatan;
    const pesertaKegiatan = participants.filter(p => p.kegiatanId === kegiatanId);
    setSelectedKegiatanId(kegiatanId);

    if (pesertaKegiatan.length === 0) {
      triggerNotification('error', 'Import atau tambah peserta dulu sebelum generate sertifikat.');
      setActiveTab('kader');
      return;
    }

    if (!kegiatan.materi || kegiatan.materi.length === 0) {
      triggerNotification('error', 'Isi minimal satu materi kegiatan sebelum generate sertifikat.');
      setActiveTab('materi');
      return;
    }

    const generatedAt = new Date().toISOString();
    const nextKegiatanList = kegiatanList.map(k => (
      k.id === kegiatanId ? { ...k, generatedAt } : k
    ));
    const nextParticipants = participants.map((participant) => (
      participant.kegiatanId === kegiatanId
        ? { ...participant, verificationToken: participant.verificationToken || crypto.randomUUID() }
        : participant
    ));
    const issuedParticipants = nextParticipants.filter(p => p.kegiatanId === kegiatanId);

    setKegiatanList(nextKegiatanList);
    setParticipants(nextParticipants);
    setSelectedIds(new Set(pesertaKegiatan.map(p => p.id)));
    setActiveParticipantId(pesertaKegiatan[0].id);
    setActiveTab('riwayat');
    let certificatesIssued = true;
    if (isSupabaseConfigured) {
      let onlineOk = await syncToOnlineDatabase(buildOnlineDatabasePayload(nextKegiatanList, nextParticipants), true);
      if (onlineOk) {
        try {
          const certificates: IssuedCertificate[] = issuedParticipants.map((participant) => ({
            token: participant.verificationToken!,
            participantId: participant.id,
            status: 'valid',
            issuedAt: generatedAt,
            payload: {
              p: {
                ...participant,
                number: buildCertificateNumber(Number((participant.number || '1').match(/\d+/)?.[0] || 1), kegiatan.tanggalBerakhir),
                date: participant.date || formatIndonesianDate(kegiatan.tanggalBerakhir),
              },
              c: {
                title: config.title,
                eventName: kegiatan.judulKegiatan,
                subEventName: `Kecamatan ${kegiatan.tempatPelaksanaan}`,
                location: kegiatan.tempatPelaksanaan,
                dateText: formatIndonesianDateRange(kegiatan.tanggalMulai, kegiatan.tanggalBerakhir),
                materi: kegiatan.materi.map(m => ({ t: m.title, h: m.hours })),
                signees: [
                  ...config.signees.map(s => ({ n: s.name, t: s.title })),
                  { n: kegiatan.ketuaPelaksana, t: kegiatan.jenisKegiatan === 'Dirosah Ula' ? 'Ketua MDS Rijalul Ansor Kab. Tasikmalaya' : 'Ketua Pelaksana' },
                ],
                jenisKegiatan: kegiatan.jenisKegiatan || 'PKD',
              },
            },
          }));
          await issueCertificates(certificates);
        } catch (err: any) {
          onlineOk = false;
          setDatabaseSyncState({ loading: false, type: 'error', message: err.message || 'Gagal menerbitkan token sertifikat.' });
        }
      }
      certificatesIssued = onlineOk;
      triggerNotification(
        onlineOk ? 'success' : 'error',
        onlineOk
          ? `Sertifikat ${pesertaKegiatan.length} peserta tersimpan lokal dan dikirim ke Supabase.`
          : `Sertifikat ${pesertaKegiatan.length} peserta tersimpan lokal, tapi gagal sinkron ke Supabase.`
      );
    } else {
      triggerNotification('success', `Sertifikat ${pesertaKegiatan.length} peserta tersimpan untuk ${kegiatan.judulKegiatan}.`);
    }

    if (certificatesIssued) {
      await handleExportKegiatanPdf(issuedParticipants, kegiatan.judulKegiatan);
    }
  };

  // Add / Edit materials (Materi)
  const addMateriRow = () => {
    if (activeKegiatan.materi.length >= 14) {
      triggerNotification('error', 'Maksimal 14 materi agar seluruh daftar tetap muat pada halaman 2 sertifikat.');
      return;
    }
    const newItem: MateriItem = {
      id: `mat_${Date.now()}`,
      title: 'Materi Pokok Baru',
      hours: 2,
      instructor: 'Narasumber'
    };
    setKegiatanList(prev => prev.map(k => {
      if (k.id === selectedKegiatanId) {
        return { ...k, materi: [...k.materi, newItem], generatedAt: undefined };
      }
      return k;
    }));
  };

  const updateMateriRow = (id: string, field: keyof MateriItem, value: any) => {
    setKegiatanList(prev => prev.map(k => {
      if (k.id === selectedKegiatanId) {
        return {
          ...k,
          generatedAt: undefined,
          materi: k.materi.map(item => item.id === id ? { ...item, [field]: value } : item)
        };
      }
      return k;
    }));
  };

  const deleteMateriRow = (id: string) => {
    setKegiatanList(prev => prev.map(k => {
      if (k.id === selectedKegiatanId) {
        return {
          ...k,
          generatedAt: undefined,
          materi: k.materi.filter(item => item.id !== id)
        };
      }
      return k;
    }));
  };

  // Signee Configuration Changes
  const updateSignee = (id: string, field: keyof Signee, value: any) => {
    setConfig(prev => ({
      ...prev,
      signees: prev.signees.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleSignatureUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        updateSignee(id, 'signatureDataUrl', e.target.result);
        triggerNotification('success', 'Berkas tanda tangan berhasil diunggah!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Backup configuration helper
  const handleBackupExport = () => {
    const backupObj = {
      kegiatanList,
      selectedKegiatanId,
      participants,
      config
    };
    const str = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Backup_Generator_Sertifikat_Ansor_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.click();
    triggerNotification('success', 'Berkas backup berhasil diekspor!');
  };

  const handleBackupImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (e.target?.result && typeof e.target.result === 'string') {
          const parsed = JSON.parse(e.target.result);
          if (parsed.participants && parsed.config) {
            setParticipants(parsed.participants);
            setConfig(parsed.config);
            if (parsed.kegiatanList) {
              setKegiatanList(parsed.kegiatanList);
            }
            if (parsed.selectedKegiatanId) {
              setSelectedKegiatanId(parsed.selectedKegiatanId);
            }
            if (parsed.participants.length > 0) {
              setActiveParticipantId(parsed.participants[0].id);
            }
            triggerNotification('success', 'Backup berhasil dipulihkan!');
          } else {
            throw new Error('Format file backup tidak valid.');
          }
        }
      } catch (err: any) {
        triggerNotification('error', err.message || 'Gagal memulihkan backup.');
      }
    };
    reader.readAsText(file);
  };

  // Filter participants based on search query and active event (Kegiatan)
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      if (p.kegiatanId !== selectedKegiatanId) return false;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.number.toLowerCase().includes(query) ||
        (p.institution && p.institution.toLowerCase().includes(query)) ||
        (p.role && p.role.toLowerCase().includes(query))
      );
    });
  }, [participants, selectedKegiatanId, searchQuery]);

  const activeKegiatanParticipants = useMemo(() => {
    return participants.filter(p => p.kegiatanId === selectedKegiatanId);
  }, [participants, selectedKegiatanId]);

  const generatedKegiatanList = useMemo(() => {
    return kegiatanList.filter(k => k.generatedAt);
  }, [kegiatanList]);

  // Render Verification Portal instead of builder if token is detected
  if (verifyToken) {
    return (
      <VerificationPortal 
        token={verifyToken} 
        onBackToApp={() => {
          // Clear query params and return to builder
          window.history.replaceState({}, document.title, window.location.pathname);
          setVerifyToken(null);
        }} 
      />
    );
  }

  if (appScreen === 'login') {
    return (
      <LoginPage
        onSuccess={() => {
          setHasSession(true);
          setAppScreen('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50/50 text-slate-900 overflow-hidden font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* SIDEBAR NAV (DESKTOP) */}
      <div className="hidden lg:flex w-64 bg-white text-slate-900 flex-col border-r border-slate-200/80 shadow-2xs shrink-0 z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006633] text-white shadow-sm shrink-0">
              <AnsorLogoSvg className="w-6 h-6 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-black tracking-wider text-slate-900 uppercase">GP ANSOR</h1>
              <p className="text-[10px] text-[#006633] font-extrabold uppercase tracking-widest">KAB. TASIKMALAYA</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">Alur Kerja Pembuatan</div>
          
          <button 
            type="button"
            onClick={() => setActiveTab('kegiatan')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'kegiatan' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'kegiatan' ? 'text-white' : 'text-[#006633]'}`} />
            1. Tambah Kegiatan ({kegiatanList.length})
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('kader')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'kader' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activeTab === 'kader' ? 'text-white' : 'text-[#006633]'}`} />
            2. Import Data ({activeKegiatanParticipants.length})
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('materi')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'materi' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'materi' ? 'text-white' : 'text-[#006633]'}`} />
            3. Isi Materi
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'generate' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileDown className={`w-4 h-4 shrink-0 ${activeTab === 'generate' ? 'text-white' : 'text-[#006633]'}`} />
            4. Generate
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'signatures' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PenTool className={`w-4 h-4 shrink-0 ${activeTab === 'signatures' ? 'text-white' : 'text-[#006633]'}`} />
            Tanda Tangan
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'config' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'config' ? 'text-white' : 'text-[#006633]'}`} />
            Kop & Desain
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'riwayat' 
                ? 'bg-[#006633] text-white shadow-sm font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className={`w-4 h-4 shrink-0 ${activeTab === 'riwayat' ? 'text-white' : 'text-[#006633]'}`} />
            5. Data Sertifikat ({generatedKegiatanList.length})
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-white rounded-xl p-3.5 text-[11px] leading-relaxed border border-slate-200/80 shadow-2xs">
            <span className="text-slate-500 font-bold uppercase block mb-1 text-[9px] tracking-wider">Status Sistem</span>
            <div className="flex items-center gap-2 font-bold text-[#006633]">
              <span className="w-2 h-2 bg-[#006633] rounded-full animate-pulse"></span> 
              {isSupabaseConfigured ? 'Supabase Aktif' : 'Auto-Save Lokal Aktif'}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Sertifikat GP Ansor</span>
            <div className="hidden md:block bg-[#ebfef4] text-[#006633] px-3 py-1.5 rounded-lg text-xs font-extrabold border border-[#007a3d]/20 uppercase tracking-tight">
              KABUPATEN TASIKMALAYA
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <div className="w-1.5 h-1.5 bg-[#006633] rounded-full animate-ping" />
              <span>{isSupabaseConfigured ? 'Supabase Online Aktif' : 'Auto-Save Lokal Aktif'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try { await signOut(); } catch (err) { console.error(err); }
                  setHasSession(false);
                  setAppScreen('login');
                }}
                title="Keluar dari aplikasi"
                className="p-2 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm flex items-center gap-1.5 text-xs font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Keluar</span>
              </button>
              {/* Backup actions */}
              <button
                onClick={handleBackupExport}
                title="Ekspor Backup JSON"
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm flex items-center gap-1.5 text-xs font-bold"
              >
                <Save className="w-4 h-4 text-[#006633]" />
                <span className="hidden md:inline">Ekspor Backup</span>
              </button>
              <label
                title="Pulihkan Backup JSON"
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleBackupImport(e.target.files[0])}
                  className="hidden"
                />
                <FileText className="w-4 h-4 text-[#006633]" />
                <span className="hidden md:inline">Pulihkan</span>
              </label>
            </div>
          </div>
        </header>

        {/* MOBILE TOP NAVIGATION BAR */}
        <div className="lg:hidden bg-white text-slate-900 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006633] text-white shadow-2xs">
              <AnsorLogoSvg className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-900">Sertifikat GP Ansor</h1>
              <p className="text-[9px] text-[#006633] font-extrabold uppercase tracking-wider">Kab. Tasikmalaya</p>
            </div>
          </div>
          
          {/* Mobile selection dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-slate-100 text-slate-900 text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-[#006633]"
            >
              <option value="kegiatan">1. Kegiatan ({kegiatanList.length})</option>
              <option value="kader">2. Import ({activeKegiatanParticipants.length})</option>
              <option value="materi">3. Materi</option>
              <option value="generate">4. Generate</option>
              <option value="riwayat">5. Data Sertifikat</option>
              <option value="signatures">Ttd</option>
              <option value="config">Desain</option>
            </select>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {showNotification && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all duration-300 max-w-sm animate-bounce ${
            showNotification.type === 'success' 
              ? 'bg-white border-slate-200 text-slate-900 shadow-xl border-l-4 border-l-[#006633]' 
              : 'bg-white border-slate-200 text-rose-950 shadow-xl border-l-4 border-l-rose-600'
          }`}>
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${showNotification.type === 'success' ? 'text-[#006633]' : 'text-rose-600'}`} />
            <p className="text-xs font-bold leading-snug">{showNotification.text}</p>
          </div>
        )}

        {/* EXPORTING LOADING PROGRESS SCREEN */}
        {exportProgress && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 border-4 border-[#006633] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-sm font-black text-slate-900 uppercase tracking-widest">MEMPROSES EKSPOR</div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {exportProgress}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#006633] h-full w-2/3 animate-pulse" />
              </div>
              <span className="text-[10px] text-slate-400 block">Mohon jangan menutup halaman ini selama proses berjalan.</span>
            </div>
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden h-full">
          
          {/* LEFT COLUMN: CONTROLLER & DATA EDITOR */}
          <div className="col-span-12 bg-white flex flex-col overflow-y-auto h-full">

          {/* TAB 0: KEGIATAN MANAGER */}
          {activeTab === 'kegiatan' && (
            <div className="p-5 space-y-6 animate-in fade-in duration-200">
              {/* Info Card banner */}
              <div className="bg-[#ebfef4]/40 border border-[#006633]/20 rounded-2xl p-4 flex gap-3.5 shadow-sm">
                <Calendar className="w-5 h-5 text-[#006633] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-[#006633] uppercase tracking-wide">Pilih atau Tambah Kegiatan</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sertifikat diorganisasikan per pelaksanaan kegiatan. Daftarkan kegiatan Anda terlebih dahulu, kemudian impor data kader untuk kegiatan tersebut.
                  </p>
                </div>
              </div>

              {/* Header section with add button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Daftar Kegiatan</h3>
                  <p className="text-[11px] text-slate-500">Pilih kegiatan aktif untuk mengelola data sertifikat</p>
                </div>
                <button
                  onClick={() => {
                    setEditingKegiatan(null);
                    setKegiatanFormData({ jenisKegiatan: 'PKD', judulKegiatan: '', tempatPelaksanaan: '', tanggalMulai: '', tanggalBerakhir: '', ketuaPelaksana: 'Sahabat Ahmad Bukhari, S.Sy.' });
                    setIsKegiatanFormOpen(true);
                  }}
                  type="button"
                  className="flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buat Kegiatan
                </button>
              </div>

              {/* Kegiatan Grid/List */}
              <div className="space-y-3">
                {kegiatanList.map((k) => {
                  const isSelected = selectedKegiatanId === k.id;
                  const count = participants.filter(p => p.kegiatanId === k.id).length;
                  return (
                    <div 
                      key={k.id}
                      className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer ${
                        isSelected 
                          ? 'border-[#006633] bg-[#ebfef4]/30 ring-2 ring-[#006633]/15' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedKegiatanId(k.id)}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#006633]" />
                      )}
                      
                      <div className="space-y-2 flex-1 pl-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            k.jenisKegiatan === 'PKL'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : k.jenisKegiatan === 'Dirosah Ula'
                              ? 'bg-blue-700 text-white shadow-sm'
                              : 'bg-[#006633] text-white shadow-sm'
                          }`}>
                            {k.jenisKegiatan || 'PKD'}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">{k.judulKegiatan}</h4>
                          {isSelected && (
                            <span className="bg-[#006633] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Aktif</span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{k.tempatPelaksanaan}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatIndonesianDateRange(k.tanggalMulai, k.tanggalBerakhir)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 mt-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-600">{k.jenisKegiatan === 'Dirosah Ula' ? 'Ketua MDS Rijalul Ansor:' : 'Ketua Pelaksana:'} <strong className="text-slate-800">{k.ketuaPelaksana}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg shrink-0 mr-1">
                          {count} Kader
                        </span>
                        <button
                          type="button"
                          onClick={() => handleGenerateCertificates(k.id)}
                          disabled={count === 0 || exportProgress !== null}
                          className="flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-black px-2.5 py-2 rounded-lg transition-all cursor-pointer"
                          title="Generate satu PDF berisi semua sertifikat kegiatan"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Generate PDF
                        </button>
                        <button
                          onClick={() => startEditKegiatan(k)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                          title="Edit Kegiatan"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteKegiatan(k.id)}
                          className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors"
                          title="Hapus Kegiatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action/Next Help text */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('kader')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#006633] font-extrabold uppercase hover:underline cursor-pointer"
                >
                  Lanjut Langkah 2: Impor Data Kader &rarr;
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: KADER & GENERATOR LIST */}
          {activeTab === 'kader' && (
            <div className="p-5 space-y-6 animate-in fade-in duration-200">
              
              {/* Google Sheets Importer Integration */}
              <GoogleSheetsImporter 
                onImportComplete={handleImportComplete} 
                currentParticipantsCount={participants.filter(p => p.kegiatanId === selectedKegiatanId).length}
              />

              {/* Kader List Manager */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Daftar Kader Pelatihan</h3>
                    <p className="text-xs text-slate-500">Kelola data peserta sebelum mengisi materi dan generate sertifikat</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingParticipant(null);
                      setFormData({ name: '', number: '', role: 'Peserta', predicate: 'Istimewa', institution: '', tempatLahir: '', tanggalLahir: '' });
                      setIsFormOpen(true);
                    }}
                    type="button"
                    className="flex items-center gap-1 bg-[#006633] hover:bg-[#005229] text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Kader
                  </button>
                </div>

                {/* Filter and Search */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Cari nama, utusan, nomor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                    />
                  </div>

                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkExportPdf}
                      type="button"
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Cetak PDF Terpilih ({selectedIds.size})
                    </button>
                  )}
                </div>

                {/* Data Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input 
                              type="checkbox"
                              checked={filteredParticipants.length > 0 && selectedIds.size === filteredParticipants.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-slate-300 text-[#006633] focus:ring-[#006633]"
                            />
                          </th>
                          <th className="p-3">Kader / No. Sertifikat</th>
                          <th className="p-3">PAC / Predikat</th>
                          <th className="p-3 w-20 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredParticipants.length > 0 ? (
                          filteredParticipants.map((p) => (
                            <tr 
                              key={p.id} 
                              onClick={() => setActiveParticipantId(p.id)}
                              className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${
                                activeParticipantId === p.id ? 'bg-[#ebfef4]/50 font-medium' : ''
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox"
                                  checked={selectedIds.has(p.id)}
                                  onChange={(e) => handleSelectRow(p.id, e.target.checked)}
                                  className="rounded border-slate-300 text-[#006633] focus:ring-[#006633]"
                                />
                              </td>
                              <td className="p-3 space-y-0.5">
                                <div className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                                  {p.name}
                                  {activeParticipantId === p.id && (
                                    <span className="w-1.5 h-1.5 bg-[#006633] rounded-full" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">No: {p.number}</div>
                              </td>
                              <td className="p-3 space-y-0.5">
                                <span className="bg-[#ebfef4] text-[#006633] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  {p.institution || 'PAC CABANG'}
                                </span>
                                {p.predicate && (
                                  <div className="text-[10px] text-amber-600 font-bold italic mt-0.5">"{p.predicate}"</div>
                                )}
                              </td>
                              <td className="p-3 flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => startEditParticipant(p)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                  title="Edit Kader"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteParticipant(p.id)}
                                  className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                  title="Hapus Kader"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 italic font-medium">
                              Belum ada kader terdaftar untuk kegiatan aktif ini. Silakan tambahkan kader secara manual atau impor dari Google Sheets / CSV.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('materi')}
                    disabled={activeKegiatanParticipants.length === 0}
                    className="inline-flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold uppercase px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Lanjut Isi Materi
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RIWAYAT & CETAK PER PELAKSANAAN */}
          {activeTab === 'riwayat' && (
            <div className="p-5 space-y-6 animate-in fade-in duration-200">
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3.5 shadow-sm">
                <Award className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Data Sertifikat Per Pelaksanaan</h4>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    Menu ini memunculkan data detail kader yang sudah dibuat untuk seluruh pelaksanaan kegiatan. Anda dapat melihat rincian biodata lengkap, melakukan pencarian lintas kegiatan, serta mencetak sertifikat satu per satu secara langsung.
                  </p>
                </div>
              </div>

              {/* Select Kegiatan Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pilih Pelaksanaan Kegiatan</label>
                <select
                  value={selectedKegiatanId}
                  onChange={(e) => setSelectedKegiatanId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                >
                  {kegiatanList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.judulKegiatan} ({participants.filter(p => p.kegiatanId === k.id).length} Peserta) {k.generatedAt ? '- Tersimpan' : '- Belum Generate'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detail List & Printing */}
              {!activeKegiatan.generatedAt ? (
                <div className="p-8 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-3">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-sm font-black text-slate-700 uppercase">Sertifikat Belum Digenerate</p>
                    <p className="text-xs text-slate-500 mt-1">Lengkapi data peserta dan materi, lalu generate dulu agar masuk ke arsip data sertifikat.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('generate')}
                    className="inline-flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] text-white text-xs font-extrabold uppercase px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Buka Generate
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Rincian Kader Terdaftar</h3>
                    <p className="text-[10px] text-slate-500">
                      Tersimpan {new Date(activeKegiatan.generatedAt).toLocaleString('id-ID')} | Mencakup detail nomor sertifikat & cetak lembar fisik
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                  {filteredParticipants.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">Belum ada kader terdaftar di kegiatan ini.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('kader')}
                        className="text-[10px] text-[#006633] font-extrabold uppercase tracking-wider hover:underline cursor-pointer"
                      >
                        Impor Sekarang &rarr;
                      </button>
                    </div>
                  ) : (
                    filteredParticipants.map((p) => (
                      <div 
                        key={p.id}
                        className={`p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 ${
                          activeParticipantId === p.id ? 'bg-[#ebfef4]/30 font-semibold' : ''
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-extrabold text-xs text-slate-800 uppercase truncate">
                            {p.name}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                            <span className="font-mono text-slate-400">No: {p.number}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-[#006633]">{p.institution || 'PAC CABANG'}</span>
                            {p.tempatLahir && p.tanggalLahir && (
                              <>
                                <span>&bull;</span>
                                <span className="italic">{p.tempatLahir}, {p.tanggalLahir}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(p)}
                            className="flex items-center gap-1 bg-[#006633] hover:bg-[#005229] text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Cetak
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {/* TAB 2: MATERI EDITING (HALAMAN 2) */}
          {activeTab === 'materi' && (
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Daftar Materi Halaman Belakang</h3>
                <p className="text-xs text-slate-500">Materi ini tersimpan khusus untuk {activeKegiatan.judulKegiatan}</p>
              </div>

              <div className="space-y-3.5">
                {activeKegiatan.materi.map((item, idx) => (
                  <div key={item.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 relative group">
                    <button
                      onClick={() => deleteMateriRow(item.id)}
                      type="button"
                      className="absolute right-3 top-3 p-1.5 bg-white border border-slate-200 text-rose-600 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus Baris Materi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-1 flex items-center justify-center font-mono text-xs text-slate-400 font-bold">
                        {idx + 1}
                      </div>
                      
                      <div className="col-span-11 space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Materi Pokok / Judul Bahasan</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateMateriRow(item.id, 'title', e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-[#006633]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Durasi (JP)</label>
                            <input
                              type="number"
                              min="1"
                              value={item.hours}
                              onChange={(e) => updateMateriRow(item.id, 'hours', Number(e.target.value))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-[#006633]"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Instruktur / Narasumber</label>
                            <input
                              type="text"
                              value={item.instructor || ''}
                              onChange={(e) => updateMateriRow(item.id, 'instructor', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#006633]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addMateriRow}
                  type="button"
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 py-3 rounded-xl hover:bg-slate-50 hover:border-[#006633] text-xs font-bold text-slate-600 hover:text-[#006633] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Baris Materi Kurikulum
                </button>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('generate')}
                    className="inline-flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] text-white text-xs font-extrabold uppercase px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Lanjut Generate
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATE & SIMPAN SERTIFIKAT */}
          {activeTab === 'generate' && (
            <div className="p-5 space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#ebfef4]/40 border border-[#006633]/20 rounded-2xl p-4 flex gap-3.5 shadow-sm">
                <FileDown className="w-5 h-5 text-[#006633] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-[#006633] uppercase tracking-wide">Generate & Simpan Sertifikat</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setelah tombol ini ditekan, data sertifikat kegiatan akan masuk ke menu Data Sertifikat Per Pelaksanaan dan dapat dicetak satu per satu kapan saja.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{activeKegiatan.judulKegiatan}</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeKegiatan.tempatPelaksanaan} | {formatIndonesianDateRange(activeKegiatan.tanggalMulai, activeKegiatan.tanggalBerakhir)}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                  <div className="p-4">
                    <div className="text-2xl font-black text-[#006633]">{activeKegiatanParticipants.length}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peserta</div>
                  </div>
                  <div className="p-4">
                    <div className="text-2xl font-black text-[#006633]">{activeKegiatan.materi.length}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Materi</div>
                  </div>
                  <div className="p-4">
                    <div className="text-2xl font-black text-[#006633]">{activeKegiatan.materi.reduce((sum, item) => sum + Number(item.hours), 0)}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total JP</div>
                  </div>
                </div>
              </div>

              {activeKegiatan.generatedAt && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900 font-semibold">
                  Sertifikat kegiatan ini pernah digenerate. Klik generate lagi jika ada perubahan data peserta atau materi.
                </div>
              )}

              <button
                type="button"
                onClick={() => handleGenerateCertificates()}
                className="w-full flex items-center justify-center gap-2 bg-[#006633] hover:bg-[#005229] text-white text-sm font-black uppercase tracking-wide px-5 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Generate & Unduh Semua Sertifikat
              </button>
            </div>
          )}

          {/* TAB 3: SIGNATURES PANEL */}
          {activeTab === 'signatures' && (
            <div className="p-5 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Tanda Tangan Pengurus</h3>
                <p className="text-xs text-slate-500">Konfigurasi nama, jabatan, serta gambar tanda tangan digital</p>
              </div>

              {/* Draw Signature Pad overlay/modal */}
              {drawingSigneeId && (
                <div className="p-4 border border-[#006633]/20 bg-[#ebfef4]/40 rounded-2xl space-y-3 mb-4">
                  <p className="text-xs font-black text-[#006633]">Menggambar Tanda Tangan untuk:</p>
                  <p className="text-xs text-slate-600 italic">
                    {config.signees.find(s => s.id === drawingSigneeId)?.name} ({config.signees.find(s => s.id === drawingSigneeId)?.title})
                  </p>
                  <SignatureCanvas 
                    onSave={(dataUrl) => {
                      updateSignee(drawingSigneeId, 'signatureDataUrl', dataUrl);
                      setDrawingSigneeId(null);
                      triggerNotification('success', 'Tanda tangan digital berhasil direkam!');
                    }}
                    onCancel={() => setDrawingSigneeId(null)}
                  />
                </div>
              )}

              <div className="space-y-5">
                {config.signees.map((signee) => (
                  <div key={signee.id} className="p-4 border border-slate-200 rounded-xl space-y-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="bg-[#ebfef4] text-[#006633] text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                        {signee.title}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Pengurus Lengkap</label>
                        <input
                          type="text"
                          required
                          value={signee.name}
                          onChange={(e) => updateSignee(signee.id, 'name', e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-bold uppercase focus:outline-none focus:border-[#006633]"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Metode Tanda Tangan Digital</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setDrawingSigneeId(signee.id)}
                            type="button"
                            className="flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg py-2 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5 text-[#006633]" />
                            Gores Tangan
                          </button>
                          
                          <label className="flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg py-2 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleSignatureUpload(signee.id, e.target.files[0])}
                              className="hidden"
                            />
                            <Download className="w-3.5 h-3.5 text-[#006633] rotate-180" />
                            Unggah Gambar
                          </label>
                        </div>
                      </div>

                      {/* Preview existing Signature */}
                      {signee.signatureDataUrl ? (
                        <div className="p-3 border border-dashed border-slate-200 bg-slate-50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              src={signee.signatureDataUrl} 
                              alt="Signature preview" 
                              className="max-h-12 max-w-28 object-contain bg-white/70 p-1 rounded border border-slate-200" 
                            />
                            <span className="text-[10px] text-[#006633] font-bold">Tanda Tangan Tersimpan</span>
                          </div>
                          <button
                            onClick={() => updateSignee(signee.id, 'signatureDataUrl', undefined)}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-[10px] italic">
                          Belum ada tanda tangan terekam. Tanda tangan akan dikosongkan untuk tanda tangan manual basah.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GENERAL CONFIG */}
          {activeTab === 'config' && (
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Pengaturan Kop & Acara</h3>
                <p className="text-xs text-slate-500">Sesuaikan tulisan judul, jenis pelatihan, lokasi, dan tanggal pelaksanaan</p>
              </div>

              <div className="border border-[#006633]/20 bg-[#ebfef4]/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white border border-[#006633]/20 rounded-xl text-[#006633] shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-black text-[#006633] uppercase tracking-wide">Database Online Supabase</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Supabase menjadi database utama. Data dimuat saat aplikasi dibuka dan setiap perubahan tersimpan otomatis.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white border border-[#006633]/20 rounded-xl p-3">
                  Status konfigurasi: <strong>{isSupabaseConfigured ? 'URL dan anon key terpasang' : 'belum terpasang di environment variables'}</strong>
                </div>

                <div className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed ${
                  databaseSyncState.type === 'success'
                    ? 'bg-[#ebfef4] border-[#006633]/30 text-[#006633]'
                    : databaseSyncState.type === 'error'
                      ? 'bg-rose-50 border-rose-100 text-rose-900'
                      : 'bg-white border-slate-100 text-slate-600'
                }`}>
                  {databaseSyncState.message}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => syncToOnlineDatabase()}
                    disabled={databaseSyncState.loading}
                    className="flex items-center justify-center gap-1.5 bg-[#006633] hover:bg-[#005229] disabled:bg-slate-200 text-white text-xs font-black uppercase px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {databaseSyncState.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Migrasikan Data Lokal
                  </button>
                  <button
                    type="button"
                    onClick={() => loadFromOnlineDatabase(true)}
                    disabled={databaseSyncState.loading}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black uppercase px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Muat Ulang dari Supabase
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Sertifikat</label>
                  <input
                    type="text"
                    required
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value.toUpperCase() })}
                    placeholder="SERTIFIKAT KADERISASI"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-extrabold focus:outline-none focus:border-[#006633]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Utama Kegiatan</label>
                  <input
                    type="text"
                    required
                    value={config.eventName}
                    onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                    placeholder="Pelatihan Kepemimpinan Dasar (PKD)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-none focus:border-[#006633]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Sub-Keterangan Kegiatan (Opsional)</label>
                  <input
                    type="text"
                    value={config.subEventName || ''}
                    onChange={(e) => setConfig({ ...config, subEventName: e.target.value })}
                    placeholder="Angkatan XV PAC GP Ansor Singaparna"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#006633]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lokasi Pelaksanaan</label>
                    <input
                      type="text"
                      required
                      value={config.location}
                      onChange={(e) => setConfig({ ...config, location: e.target.value })}
                      placeholder="Tasikmalaya"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#006633]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tanggal Pelaksanaan</label>
                    <input
                      type="text"
                      required
                      value={config.dateText}
                      onChange={(e) => setConfig({ ...config, dateText: e.target.value })}
                      placeholder="09 - 11 Juli 2026"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#006633]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATIC INFO BOX ON BOTTOM OF LEFT PANEL */}
          <div className="mt-auto p-4 bg-slate-100/70 border-t border-slate-200 flex items-center gap-3 text-[10px] text-slate-500 leading-normal">
            <Award className="w-5 h-5 text-[#006633] shrink-0" />
            <div>
              <span className="font-bold text-slate-700 block">Sertifikasi Mandiri GP Ansor Cabang Tasikmalaya</span>
              QR code unik pada setiap sertifikat mengemas seluruh informasi secara aman dan bebas manipulasi.
            </div>
          </div>

        </div>

        {/* Hidden certificate render engine for PDF export */}
        <HiddenCertificateRenderEngine
          participants={deferredParticipants}
          kegiatanList={deferredKegiatanList}
          activeKegiatan={deferredActiveKegiatan}
          config={deferredConfig}
        />
        </div>

      {/* MODAL / SIDEBAR: MANUAL ADD/EDIT KADER FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-white text-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {editingParticipant ? 'Edit Data Kader' : 'Tambah Kader Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                type="button"
                className="text-slate-400 hover:text-slate-900 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Lengkap Kader <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sahabat Muhammad"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor Sertifikat</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="1/PC-XVII/01/VII/2026"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Biarkan kosong untuk generate nomor urut otomatis.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">PAC Kecamatan / Utusan</label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="Singaparna"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Peran / Status</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Peserta"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Tasikmalaya"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Predikat Kelulusan</label>
                <select
                  value={formData.predicate}
                  onChange={(e) => setFormData({ ...formData, predicate: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                >
                  <option value="Istimewa">Istimewa</option>
                  <option value="Sangat Memuaskan">Sangat Memuaskan</option>
                  <option value="Memuaskan">Memuaskan</option>
                  <option value="Lulus">Lulus</option>
                  <option value="">Tanpa Predikat</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#006633] hover:bg-[#005229] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingParticipant ? 'Simpan Perubahan' : 'Tambahkan Kader'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL / SIDEBAR: MANUAL ADD/EDIT KEGIATAN FORM */}
      {isKegiatanFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-white text-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {editingKegiatan ? 'Edit Data Kegiatan' : 'Buat Kegiatan Baru'}
              </h3>
              <button
                onClick={() => setIsKegiatanFormOpen(false)}
                type="button"
                className="text-slate-400 hover:text-slate-900 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleKegiatanFormSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">Jenis Kegiatan / Kaderisasi <span className="text-rose-500">*</span></label>
                <select
                  value={kegiatanFormData.jenisKegiatan || 'PKD'}
                  onChange={(e) => {
                    const nextJenis = e.target.value as any;
                    const nextKetua = nextJenis === 'Dirosah Ula'
                      ? (kegiatanFormData.ketuaPelaksana === 'Sahabat Ahmad Bukhari, S.Sy.' || !kegiatanFormData.ketuaPelaksana ? 'Aj. Husni Aziz Mubarok, M.Pd.' : kegiatanFormData.ketuaPelaksana)
                      : (kegiatanFormData.ketuaPelaksana === 'Aj. Husni Aziz Mubarok, M.Pd.' || !kegiatanFormData.ketuaPelaksana ? 'Sahabat Ahmad Bukhari, S.Sy.' : kegiatanFormData.ketuaPelaksana);
                    setKegiatanFormData({
                      ...kegiatanFormData,
                      jenisKegiatan: nextJenis,
                      ketuaPelaksana: nextKetua
                    });
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-bold text-[#006633] uppercase"
                >
                  <option value="PKD">PKD (Pelatihan Kepemimpinan Dasar)</option>
                  <option value="PKL">PKL (Pelatihan Kepemimpinan Lanjutan)</option>
                  <option value="Dirosah Ula">Dirosah Ula (Rijalul Ansor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">Nama / Judul Kegiatan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={kegiatanFormData.judulKegiatan || ''}
                  onChange={(e) => setKegiatanFormData({ ...kegiatanFormData, judulKegiatan: e.target.value })}
                  placeholder="Contoh: PKD I PAC GP Ansor Karangjaya"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">Tempat Pelaksanaan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={kegiatanFormData.tempatPelaksanaan || ''}
                  onChange={(e) => setKegiatanFormData({ ...kegiatanFormData, tempatPelaksanaan: e.target.value })}
                  placeholder="Contoh: Pondok Pesantren Miftahul Ulum, Karangjaya"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">Tanggal Mulai <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={kegiatanFormData.tanggalMulai || ''}
                    onChange={(e) => setKegiatanFormData({ ...kegiatanFormData, tanggalMulai: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">Tanggal Berakhir <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={kegiatanFormData.tanggalBerakhir || ''}
                    onChange={(e) => setKegiatanFormData({ ...kegiatanFormData, tanggalBerakhir: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                  {kegiatanFormData.jenisKegiatan === 'Dirosah Ula' ? 'Ketua MDS Rijalul Ansor Kab. Tasikmalaya' : 'Ketua Pelaksana'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kegiatanFormData.ketuaPelaksana || ''}
                  onChange={(e) => setKegiatanFormData({ ...kegiatanFormData, ketuaPelaksana: e.target.value })}
                  placeholder={kegiatanFormData.jenisKegiatan === 'Dirosah Ula' ? 'Contoh: Aj. Husni Aziz Mubarok, M.Pd.' : 'Contoh: Sahabat Ahmad Bukhari, S.Sy.'}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633] font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKegiatanFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#006633] hover:bg-[#005229] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingKegiatan ? 'Simpan Perubahan' : 'Buat Kegiatan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
