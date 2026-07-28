-- =====================================================================
-- OPTIONAL: Cara Menjaga Database Tetap Aktif Menggunakan Ekstensi pg_cron
-- =====================================================================
-- Script ini digunakan jika Anda ingin menjalankan cron job langsung dari
-- dalam server database Supabase (tanpa mengandalkan GitHub Actions atau layanan luar).

-- Langkah Penggunaan:
-- 1. Buka dashboard proyek Anda di https://supabase.com
-- 2. Masuk ke menu "Database" -> "Extensions" dan cari "pg_cron", lalu aktifkan (Enable).
-- 3. Masuk ke menu "SQL Editor", salin dan jalankan seluruh query di bawah ini:

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Menjadwalkan cron job internal setiap 5 hari sekali pada pukul 00:00 UTC
SELECT cron.schedule(
  'keep-supabase-active',  -- Nama identifier cron job
  '0 0 */5 * *',           -- Jadwal cron (Setiap 5 hari sekali jam 00:00 UTC)
  $$
    -- Melakukan update ringan pada timestamp synced_at di tabel app_state
    -- agar server Supabase mencatat adanya aktivitas tulis/baca database secara otomatis
    UPDATE public.app_state SET synced_at = now() WHERE id = 'main';
  $$
);

-- =====================================================================
-- PERINTAH PENDUKUNG (Jalankan terpisah jika diperlukan):
-- =====================================================================
-- 1. Untuk melihat daftar cron job yang sedang aktif di database:
--    SELECT * FROM cron.job;
--
-- 2. Untuk melihat riwayat eksekusi cron job:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- 3. Untuk membatalkan/menghapus cron job ini sewaktu-waktu:
--    SELECT cron.unschedule('keep-supabase-active');
