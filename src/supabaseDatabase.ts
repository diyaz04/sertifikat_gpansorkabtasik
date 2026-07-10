import { createClient } from '@supabase/supabase-js';
import { CertificateConfig, IssuedCertificate, Kegiatan, Participant, VerificationPayload } from './types';

export interface SupabaseDbPayload {
  kegiatanList: Kegiatan[];
  participants: Participant[];
  config: CertificateConfig;
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

export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
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
    config: payload.config,
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
    config: stateResult.data.config as CertificateConfig,
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
