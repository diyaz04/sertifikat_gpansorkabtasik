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
}

export interface Signee {
  id: string;
  name: string;
  title: string; // e.g. Ketua Pimpinan Cabang, Sekretaris
  signatureDataUrl?: string; // Base64 data atau URL file tanda tangan
  type: 'drawn' | 'upload' | 'text';
}

export type JenisKegiatan = 'PKD' | 'PKL' | 'Dirosah Ula';

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
