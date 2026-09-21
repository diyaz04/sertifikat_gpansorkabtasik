-- ============================================================
-- FIX: Instruktur tidak bisa mengakses data karena RLS
-- ============================================================
-- MASALAH:
-- Semua tabel utama (kegiatan, pendaftaran, participants, app_state, certificates)
-- hanya bisa diakses oleh user dengan role 'admin' melalui fungsi is_admin().
-- Akun instruktur yang sudah login tetap tidak bisa membaca data apa pun,
-- sehingga saat scan QR, daftar peserta kosong dan hasilnya "tidak ditemukan".
--
-- Tabel absensi_materi hanya punya policy untuk role 'anon', padahal
-- instruktur login sebagai 'authenticated' — jadi bahkan absensi pun di-block.
--
-- SOLUSI:
-- Tambahkan policy SELECT (dan UPDATE/INSERT di mana perlu) untuk semua
-- user 'authenticated', sementara policy admin 'for all' yang sudah ada
-- tetap dipertahankan untuk operasi destruktif (DELETE, dsb).
-- ============================================================

-- 1. KEGIATAN: Izinkan semua user yang login untuk MEMBACA data kegiatan
CREATE POLICY "authenticated kegiatan read"
  ON public.kegiatan FOR SELECT TO authenticated USING (true);

-- 2. PENDAFTARAN: Izinkan semua user yang login untuk MEMBACA dan MENGUPDATE
--    (diperlukan untuk check-in, update status kelulusan, dll.)
CREATE POLICY "authenticated pendaftaran read"
  ON public.pendaftaran FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated pendaftaran update"
  ON public.pendaftaran FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. APP_STATE: Izinkan semua user yang login untuk MEMBACA konfigurasi
CREATE POLICY "authenticated app_state read"
  ON public.app_state FOR SELECT TO authenticated USING (true);

-- 4. PARTICIPANTS: Izinkan semua user yang login untuk MEMBACA data peserta
CREATE POLICY "authenticated participants read"
  ON public.participants FOR SELECT TO authenticated USING (true);

-- 5. CERTIFICATES: Izinkan semua user yang login untuk MEMBACA dan MENAMBAH sertifikat
CREATE POLICY "authenticated certificates read"
  ON public.certificates FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated certificates insert"
  ON public.certificates FOR INSERT TO authenticated WITH CHECK (true);

-- 6. ABSENSI_MATERI: Tambahkan policy untuk 'authenticated'
--    (saat ini hanya 'anon' yang punya akses — instruktur yang login justru di-block!)
CREATE POLICY "authenticated absensi read"
  ON public.absensi_materi FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated absensi insert"
  ON public.absensi_materi FOR INSERT TO authenticated WITH CHECK (true);
