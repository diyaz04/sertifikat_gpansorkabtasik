# Sertifikat GP Ansor Kabupaten Tasikmalaya

Aplikasi React/Vite untuk mengelola kegiatan, peserta, materi, dan penerbitan sertifikat. Database utama menggunakan Supabase; `localStorage` tetap dipakai sebagai cache/backup ketika koneksi terputus.

## Menjalankan secara lokal

1. Jalankan `npm install`.
2. Buat project di Supabase.
3. Buka **SQL Editor** Supabase, lalu jalankan seluruh isi `supabase/schema.sql`.
4. Salin `.env.example` menjadi `.env.local` dan isi:

   ```env
   VITE_SUPABASE_URL="https://PROJECT_ID.supabase.co"
   VITE_SUPABASE_ANON_KEY="ANON_KEY_PROJECT"
   ```

5. Jalankan `npm run dev`.

URL dan anon key tersedia di **Supabase → Project Settings → API**. Jangan gunakan `service_role` key di frontend.

6. Buka **Supabase → Authentication → Users → Add user**, lalu buat email dan kata sandi administrator. Akun tersebut dipakai pada halaman login aplikasi.

Halaman awal otomatis memakai gambar landscape pada komputer/laptop dan gambar portrait pada perangkat mobile. Dashboard dilindungi Supabase Auth, sedangkan portal validasi QR tetap dapat dibuka publik.

## Migrasi data lama

Data lama yang sudah tersimpan di browser tidak hilang. Setelah Supabase dikonfigurasi, buka **Kop & Desain → Database Online Supabase**, lalu klik **Migrasikan Data Lokal** satu kali. Setelah itu aplikasi otomatis:

- menarik data Supabase ketika dibuka;
- menyimpan perubahan ke Supabase dengan debounce;
- menyimpan salinan lokal sebagai cache.

Impor peserta dari Google Sheets/CSV tetap tersedia; yang diganti hanya database online utamanya.

## Verifikasi sertifikat

Ketika tombol generate dijalankan, aplikasi membuat UUID acak dan menyimpan snapshot sertifikat resmi pada tabel `certificates`. QR hanya berisi URL dengan UUID tersebut. Portal validasi selalu mengambil nama peserta, kegiatan, materi, penandatangan, dan status dari Supabase—bukan dari isi QR.

PDF tidak diunggah ke Supabase Storage. Snapshot JSON resmi sudah cukup untuk merender ulang dokumen jika fitur unduh ulang ditambahkan atau diperlukan kemudian.

Untuk mencabut sertifikat, ubah record melalui SQL Editor atau Table Editor:

```sql
update public.certificates
set status = 'revoked', revoked_at = now(), updated_at = now()
where token = 'TOKEN-DARI-PORTAL-VALIDASI';
```

Untuk mengaktifkan kembali, ubah `status` menjadi `valid` dan `revoked_at` menjadi `null`.

## Pemeriksaan

- `npm run lint` — pemeriksaan TypeScript
- `npm run build` — production build
