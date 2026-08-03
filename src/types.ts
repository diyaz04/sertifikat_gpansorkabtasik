export interface Participant {
  id: string;
  kegiatanId?: string; // Hubungan ke Kegiatan (opsional)
  name: string;
  number: string; // Nomor Sertifikat
  role: string;   // Peran (e.g. Peserta, Lulusan Terbaik, Instruktur)
  predicate?: string; // Predikat kelulusan (e.g. Memuaskan, Istimewa)
  institution?: string; // Utusan Peserta / PAC (e.g. PAC Singaparna)
  tempatLahir?: string; // Tempat Lahir
  tanggalLahir?: string; // Tanggal Lahir (YYYY-MM-DD atau teks)
  date?: string; // Tanggal pelaksanaan / penerbitan
  verificationToken?: string; // Token acak yang ditanam pada QR
}

export interface MateriItem {
  id: string;
  title: string;
  hours: number; // Jam Pelajaran (JP)
  instructor?: string; // Pemateri / Instruktur
  tanggal?: string; // YYYY-MM-DD
  jamMulai?: string; // HH:MM
  jamSelesai?: string; // HH:MM
  ruangan?: string;
  aktif?: boolean; // Tanda materi sedang menerima scan absen
}

export interface Signee {
  id: string;
  name: string;
  title: string; // e.g. Ketua Pimpinan Cabang, Sekretaris
  signatureDataUrl?: string; // Base64 data atau URL file tanda tangan
  type: 'drawn' | 'upload' | 'text';
}

export type JenisKegiatan = 'PKD' | 'PKL' | 'Dirosah Ula';
export type KegiatanStatus = 'draft' | 'dibuka' | 'ditutup' | 'selesai';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  options?: string[]; // Untuk select/radio
}

export interface Kegiatan {
  id: string;
  jenisKegiatan?: JenisKegiatan; // PKD | PKL | Dirosah Ula (default: PKD)
  judulKegiatan: string; // PKD 1 PAC Karangjaya
  tempatPelaksanaan: string; // Tempat pelaksanaan
  tanggalMulai: string; // Tanggal Mulai (YYYY-MM-DD)
  tanggalBerakhir: string; // Tanggal Berakhir (YYYY-MM-DD)
  ketuaPelaksana: string; // Ketua Pelaksana kegiatan
  materi: MateriItem[]; // Daftar materi khusus kegiatan ini
  generatedAt?: string; // Waktu sertifikat kegiatan disimpan/digenerate
  penandatanganPklNama?: string; // Nama penandatangan khusus halaman 2 PKL
  penandatanganPklJabatan?: string; // Jabatan penandatangan khusus halaman 2 PKL
  // FASE 2: Form Pendaftaran
  status?: KegiatanStatus;
  kuotaPeserta?: number;
  deskripsi?: string;
  formSchema?: FormField[];
  syaratKelulusan?: number; // Persentase kehadiran minimal (default 80)
  penandatanganSatuNama?: string; // e.g. Badrudin, S.Ag
  penandatanganSatuJabatan?: string; // e.g. Ketua
  penandatanganDuaNama?: string;
  penandatanganDuaJabatan?: string;
  penandatanganInstrukturNama?: string;
  penandatanganInstrukturJabatan?: string;
  penandatanganDirosahNama?: string;
  penandatanganDirosahJabatan?: string;
}

export type PendaftaranStatus = 'daftar' | 'checkin' | 'fiks' | 'ditolak';

export interface Pendaftaran {
  id: string;
  kegiatanId: string;
  
  // Field Bawaan Wajib
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  asalPac: string;
  noHp: string;
  alamat: string;
  
  // Field Dinamis (dari formSchema)
  jawabanCustom: Record<string, any>;
  
  status: PendaftaranStatus;
  statusKelulusan?: 'Lulus' | 'Tidak Lulus' | 'Belum Ditentukan';
  predikat?: string;
  tokenKehadiran?: string;
  idCardGeneratedAt?: string;
  createdAt: string;
}

export interface AbsensiMateri {
  id: string;
  kegiatanId: string;
  materiId: string;
  pendaftaranId: string;
  waktuAbsen: string;
  metode: 'scan' | 'manual';
  pendaftar?: Pendaftaran; // Untuk menampilkan nama di UI
}

export interface CertificateConfig {
  title: string; // e.g. SERTIFIKAT KADERISASI
  eventName: string; // e.g. Pelatihan Kepemimpinan Dasar (PKD)
  subEventName?: string; // e.g. Angkatan XV PAC GP Ansor Singaparna
  location: string; // e.g. Tasikmalaya
  dateText: string; // e.g. 09 - 11 Juli 2026
  materi: MateriItem[];
  signees: Signee[];
  customBackgroundUrl?: string; // Jika user menyimpan template di public atau upload
  issuedDateText?: string; // Tanggal selesai/terbit pada sertifikat depan
  ketuaPelaksana?: string; // Nama ketua pelaksana untuk template depan
  lastCertificateSequence?: number; // Nomor urut global lintas kegiatan
  jenisKegiatan?: JenisKegiatan; // Untuk memilih template gambar (PKD / PKL / Dirosah Ula)
  penandatanganPklNama?: string; // Nama penandatangan khusus halaman 2 PKL
  penandatanganPklJabatan?: string; // Jabatan penandatangan khusus halaman 2 PKL
  penandatanganSatuNama?: string;
  penandatanganSatuJabatan?: string;
  penandatanganDuaNama?: string;
  penandatanganDuaJabatan?: string;
  penandatanganInstrukturNama?: string;
  penandatanganInstrukturJabatan?: string;
  penandatanganDirosahNama?: string;
  penandatanganDirosahJabatan?: string;
}

export interface IdCardConfig {
  templateUrl?: string; // URL custom template id card
  
  // Custom Coordinates (x, y) - opsional jika ingin di-override
  nameCoords?: { x: number; y: number; fontSize?: number; align?: 'left'|'center'|'right' };
  pacCoords?: { x: number; y: number; fontSize?: number; align?: 'left'|'center'|'right' };
  qrCoords?: { x: number; y: number; size?: number };
}

export interface VerificationPayload {
  p: Participant;
  c: {
    title: string;
    eventName: string;
    subEventName?: string;
    location: string;
    dateText: string;
    materi: { t: string; h: number }[]; // Minimalized for smaller URL size
    signees: { n: string; t: string }[];
    jenisKegiatan?: JenisKegiatan;
    penandatanganPklNama?: string;
    penandatanganPklJabatan?: string;
  };
}

export type CertificateStatus = 'valid' | 'revoked';

export interface IssuedCertificate {
  token: string;
  participantId: string;
  status: CertificateStatus;
  payload: VerificationPayload;
  issuedAt: string;
  revokedAt?: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'instruktur';
  permissions: string[];
  createdAt?: string;
}
