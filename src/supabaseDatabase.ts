import { createClient } from '@supabase/supabase-js';
import { 
  CertificateConfig, 
  IssuedCertificate, 
  Kegiatan, 
  Participant,
  Pendaftaran,
  AbsensiMateri,
  IdCardConfig,
  VerificationPayload,
  AppUser
} from './types';

export interface SupabaseDbPayload {
  kegiatanList: Kegiatan[];
  participants: Participant[];
  config: CertificateConfig;
  idCardConfig?: IdCardConfig;
  selectedKegiatanId?: string;
  syncedAt?: string;
}

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const requireClient = () => {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export const getAuthSession = async () => {
  const { data, error } = await requireClient().auth.getSession();
  if (error) throw error;
  return data.session;
};

export const getMyProfile = async (): Promise<AppUser | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase.from('app_users').select('*').eq('id', user.id).single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Failed to get user profile', error);
  }
  
  // Jika belum ada di app_users, jadikan dia super admin default
  if (!data) {
    return {
      id: user.id,
      email: user.email || '',
      name: 'Super Admin',
      role: 'admin',
      permissions: ['all']
    };
  }
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    permissions: data.permissions || []
  };
};

export const getAppUsers = async (): Promise<AppUser[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  
  return data.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: row.permissions || [],
    createdAt: row.created_at
  }));
};

export const createAccount = async (email: string, password: string, name: string, permissions: string[]) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  
  // Buat instance supabase khusus tanpa persist session agar admin tidak terlogout
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email,
    password
  });
  
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error('Gagal membuat user auth.');
  
  // Insert ke tabel app_users menggunakan instance utama (sebagai admin)
  const { error: dbError } = await supabase.from('app_users').insert([{
    id: userId,
    email,
    name,
    role: 'instruktur',
    permissions
  }]);
  
  if (dbError) throw dbError;
};

export const updateUserPermissions = async (userId: string, permissions: string[]) => {
  const client = requireClient();
  const { data, error } = await client
    .from('app_users')
    .update({ permissions })
    .eq('id', userId)
    .select();
  
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Gagal menyimpan izin akses. Baris tidak ditemukan (0 baris di-update). UserID: ${userId}`);
  }
};


export const registerSelf = async (email: string, password: string, name: string) => {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  
  const userId = data.user?.id;
  if (!userId) throw new Error('Gagal mendaftar akun.');

  // Insert ke tabel app_users menggunakan role instruktur dan permissions kosong (menunggu admin)
  const { error: dbError } = await client.from('app_users').insert([{
    id: userId,
    email,
    name,
    role: 'instruktur',
    permissions: []
  }]);
  
  if (dbError) throw dbError;
  return data.user;
};

export const signInWithPassword = async (email: string, password: string) => {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
  try {
    const { data: isAdmin } = await client.rpc('is_admin');
    return { session: data.session, isAdmin };
  } catch (err) {
    return { session: data.session, isAdmin: false };
  }
};

export const signOut = async () => {
  const { error } = await requireClient().auth.signOut();
  if (error) throw error;
};

export const saveSupabaseDatabase = async (payload: SupabaseDbPayload) => {
  const client = requireClient();
  const syncedAt = new Date().toISOString();

  const kegiatanRows = payload.kegiatanList.map((item) => ({
    id: item.id,
    judul_kegiatan: item.judulKegiatan,
    tempat_pelaksanaan: item.tempatPelaksanaan,
    tanggal_mulai: item.tanggalMulai || null,
    tanggal_berakhir: item.tanggalBerakhir || null,
    ketua_pelaksana: item.ketuaPelaksana,
    materi: item.materi || [],
    generated_at: item.generatedAt || null,
    status: item.status || 'draft',
    kuota_peserta: item.kuotaPeserta || null,
    deskripsi: item.deskripsi || null,
    form_schema: item.formSchema || [],
    updated_at: syncedAt,
  }));
  const participantRows = payload.participants.map((item) => ({
    id: item.id,
    kegiatan_id: item.kegiatanId || null,
    name: item.name,
    number: item.number,
    role: item.role,
    predicate: item.predicate || null,
    institution: item.institution || null,
    tempat_lahir: item.tempatLahir || null,
    tanggal_lahir: item.tanggalLahir || null,
    certificate_date: item.date || null,
    verification_token: item.verificationToken || null,
    updated_at: syncedAt,
  }));

  // Kegiatan harus tersimpan lebih dulu karena participants memiliki foreign key.
  if (kegiatanRows.length) {
    const { error } = await client.from('kegiatan').upsert(kegiatanRows);
    if (error) throw error;
  }
  if (participantRows.length) {
    const { error } = await client.from('participants').upsert(participantRows);
    if (error) throw error;
  }
  const { error: stateError } = await client.from('app_state').upsert({
    id: 'main',
    config: { ...payload.config, idCardConfig: payload.idCardConfig },
    selected_kegiatan_id: payload.selectedKegiatanId || null,
    synced_at: syncedAt,
  });
  if (stateError) throw stateError;

  // Hapus record server yang sudah dihapus secara lokal.
  const kegiatanIds = payload.kegiatanList.map((item) => item.id);
  const participantIds = payload.participants.map((item) => item.id);
  const deleteResults = await Promise.all([
    kegiatanIds.length
      ? client.from('kegiatan').delete().not('id', 'in', `(${kegiatanIds.join(',')})`)
      : client.from('kegiatan').delete().neq('id', ''),
    participantIds.length
      ? client.from('participants').delete().not('id', 'in', `(${participantIds.join(',')})`)
      : client.from('participants').delete().neq('id', ''),
  ]);
  const deleteFailure = deleteResults.find((result) => result.error);
  if (deleteFailure?.error) throw deleteFailure.error;

  return { ok: true, message: 'Database Supabase berhasil diperbarui.', syncedAt };
};

export const loadSupabaseDatabase = async (): Promise<SupabaseDbPayload> => {
  const client = requireClient();
  const [kegiatanResult, participantsResult, stateResult] = await Promise.all([
    client.from('kegiatan').select('*').order('created_at'),
    client.from('participants').select('*').order('created_at'),
    client.from('app_state').select('*').eq('id', 'main').maybeSingle(),
  ]);

  const failure = [kegiatanResult, participantsResult, stateResult].find((result) => result.error);
  if (failure?.error) throw failure.error;
  if (!stateResult.data) throw new Error('Database Supabase masih kosong. Klik “Migrasikan Data Lokal”.');

  return {
    kegiatanList: (kegiatanResult.data || []).map((row) => ({
      id: row.id,
      judulKegiatan: row.judul_kegiatan,
      tempatPelaksanaan: row.tempat_pelaksanaan,
      tanggalMulai: row.tanggal_mulai || '',
      tanggalBerakhir: row.tanggal_berakhir || '',
      ketuaPelaksana: row.ketua_pelaksana,
      materi: row.materi || [],
      generatedAt: row.generated_at || undefined,
      status: row.status,
      kuotaPeserta: row.kuota_peserta || undefined,
      deskripsi: row.deskripsi || undefined,
      formSchema: row.form_schema || [],
      syaratKelulusan: row.syarat_kelulusan || 80,
    })),
    participants: (participantsResult.data || []).map((row) => ({
      id: row.id,
      kegiatanId: row.kegiatan_id || undefined,
      name: row.name,
      number: row.number,
      role: row.role,
      predicate: row.predicate || undefined,
      institution: row.institution || undefined,
      tempatLahir: row.tempat_lahir || undefined,
      tanggalLahir: row.tanggal_lahir || undefined,
      date: row.certificate_date || undefined,
      verificationToken: row.verification_token || undefined,
    })),
    config: (() => {
      const c = { ...stateResult.data.config } as any;
      delete c.idCardConfig;
      return c as CertificateConfig;
    })(),
    idCardConfig: (stateResult.data.config as any)?.idCardConfig,
    selectedKegiatanId: stateResult.data.selected_kegiatan_id || undefined,
    syncedAt: stateResult.data.synced_at,
  };
};

export const issueCertificates = async (certificates: IssuedCertificate[]) => {
  const client = requireClient();
  if (!certificates.length) return;
  const { error } = await client.from('certificates').upsert(certificates.map((certificate) => ({
    token: certificate.token,
    participant_id: certificate.participantId,
    status: certificate.status,
    payload: certificate.payload,
    issued_at: certificate.issuedAt,
    revoked_at: certificate.revokedAt || null,
    updated_at: new Date().toISOString(),
  })), { onConflict: 'token' });
  if (error) throw error;
};

export const getCertificateByToken = async (token: string): Promise<IssuedCertificate | null> => {
  const client = requireClient();
  const { data, error } = await client
    .from('certificates')
    .select('token, participant_id, status, payload, issued_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    token: data.token,
    participantId: data.participant_id,
    status: data.status,
    payload: data.payload as VerificationPayload,
    issuedAt: data.issued_at,
    revokedAt: data.revoked_at || undefined,
  };
};

// ==========================================
// ==========================================
// FASE 2 & 10: FUNGSI PUBLIK PENDAFTARAN & MONITOR
// ==========================================

export const getPublicPendaftaran = async (kegiatanId: string): Promise<Participant[]> => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('pendaftaran')
    .select('*')
    .eq('kegiatan_id', kegiatanId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  if (!data) return [];
  
  return data.map(d => ({
    id: d.id,
    name: d.nama,
    number: d.nomor_pendaftaran || '',
    role: 'Peserta',
    predicate: d.predikat || 'Memuaskan',
    institution: d.asal_pac || '',
    tempatLahir: d.tempat_lahir || '',
    tanggalLahir: d.tanggal_lahir || '',
    status: d.status,
    kegiatan_id: d.kegiatan_id,
    created_at: d.created_at,
    no_hp: d.no_hp || '',
    alamat: d.alamat || '',
    status_kelulusan: d.status_kelulusan || 'Belum Ditentukan'
  }));
};

export const getPublicKegiatan = async (kegiatanId: string): Promise<Kegiatan | null> => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('kegiatan')
    .select('*')
    .eq('id', kegiatanId)
    .maybeSingle();
    
  if (error) throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    judulKegiatan: data.judul_kegiatan,
    tempatPelaksanaan: data.tempat_pelaksanaan,
    tanggalMulai: data.tanggal_mulai || '',
    tanggalBerakhir: data.tanggal_berakhir || '',
    ketuaPelaksana: data.ketua_pelaksana,
    materi: data.materi || [],
    generatedAt: data.generated_at || undefined,
    status: data.status,
    kuotaPeserta: data.kuota_peserta || undefined,
    deskripsi: data.deskripsi || undefined,
    formSchema: data.form_schema || [],
  };
};

export const submitPendaftaran = async (payload: any) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.from('pendaftaran').insert([payload]);
  if (error) throw error;
};

// ==========================================
// FASE 3: FUNGSI ADMIN PENDAFTARAN
// ==========================================

export const getPendaftaranByKegiatan = async (kegiatanId: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('pendaftaran')
    .select('*')
    .eq('kegiatan_id', kegiatanId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    kegiatanId: row.kegiatan_id,
    nama: row.nama,
    tempatLahir: row.tempat_lahir,
    tanggalLahir: row.tanggal_lahir,
    asalPac: row.asal_pac,
    noHp: row.no_hp,
    alamat: row.alamat,
    jawabanCustom: row.jawaban_custom,
    status: row.status,
    statusKelulusan: row.status_kelulusan,
    predikat: row.predikat,
    tokenKehadiran: row.token_kehadiran || undefined,
    idCardGeneratedAt: row.id_card_generated_at || undefined,
    createdAt: row.created_at,
  }));
};

export const updatePendaftaranStatus = async (id: string, status: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ status })
    .eq('id', id);
    
  if (error) throw error;
};

export const updateStatusKelulusan = async (id: string, status_kelulusan: string, predikat?: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ status_kelulusan, predikat: predikat || null })
    .eq('id', id);
  if (error) throw error;
};

export const updateStatusKelulusanMassal = async (ids: string[], status_kelulusan: string, predikat?: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ status_kelulusan, predikat: predikat || null })
    .in('id', ids);
  if (error) throw error;
};

export const checkInPendaftaran = async (id: string, tokenKehadiran: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ status: 'checkin', token_kehadiran: tokenKehadiran })
    .eq('id', id);
  if (error) throw error;
};

export const cancelCheckIn = async (id: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ status: 'fiks', token_kehadiran: null })
    .eq('id', id);
  if (error) throw error;
};

export const markIdCardGenerated = async (id: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('pendaftaran')
    .update({ id_card_generated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// FASE 6: FUNGSI ABSENSI MATERI
// ==========================================

export const getAbsensiMateri = async (kegiatanId: string, materiId: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  // We join with pendaftaran to get the name
  const { data, error } = await supabase
    .from('absensi_materi')
    .select(`
      *,
      pendaftaran:pendaftaran_id (nama, asal_pac)
    `)
    .eq('kegiatan_id', kegiatanId)
    .eq('materi_id', materiId)
    .order('waktu_absen', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    kegiatanId: row.kegiatan_id,
    materiId: row.materi_id,
    pendaftaranId: row.pendaftaran_id,
    waktuAbsen: row.waktu_absen,
    metode: row.metode,
    pendaftar: row.pendaftaran ? {
      nama: (row.pendaftaran as any).nama,
      asalPac: (row.pendaftaran as any).asal_pac
    } : undefined
  }));
};

export const getAllAbsensiByKegiatan = async (kegiatanId: string) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('absensi_materi')
    .select('*')
    .eq('kegiatan_id', kegiatanId);
    
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    kegiatanId: row.kegiatan_id,
    materiId: row.materi_id,
    pendaftaranId: row.pendaftaran_id,
    waktuAbsen: row.waktu_absen,
    metode: row.metode,
  }));
};

export const insertAbsensiMateri = async (payload: { kegiatan_id: string; materi_id: string; pendaftaran_id: string; metode: string }) => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('absensi_materi')
    .insert([payload]);
    
  if (error) {
    if (error.code === '23505') throw new Error('Peserta sudah absen di materi ini.');
    throw error;
  }
};
