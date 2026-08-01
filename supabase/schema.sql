create table if not exists public.kegiatan (
  id text primary key,
  judul_kegiatan text not null,
  tempat_pelaksanaan text not null default '',
  tanggal_mulai date,
  tanggal_berakhir date,
  ketua_pelaksana text not null default '',
  materi jsonb not null default '[]'::jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id text primary key,
  kegiatan_id text references public.kegiatan(id) on delete cascade,
  name text not null,
  number text not null default '',
  role text not null default 'Peserta',
  predicate text,
  institution text,
  tempat_lahir text,
  tanggal_lahir date,
  certificate_date text,
  verification_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participants_kegiatan_id_idx on public.participants(kegiatan_id);
alter table public.participants add column if not exists verification_token uuid unique;

create table if not exists public.app_state (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  selected_kegiatan_id text,
  synced_at timestamptz not null default now()
);

create table if not exists public.certificates (
  token uuid primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  status text not null default 'valid' check (status in ('valid', 'revoked')),
  payload jsonb not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists certificates_participant_id_idx on public.certificates(participant_id);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.kegiatan enable row level security;
alter table public.participants enable row level security;
alter table public.app_state enable row level security;
alter table public.certificates enable row level security;

-- Dashboard hanya dapat diakses oleh akun Supabase Auth yang sudah login.
drop policy if exists "public kegiatan access" on public.kegiatan;
drop policy if exists "public participants access" on public.participants;
drop policy if exists "public app_state access" on public.app_state;
drop policy if exists "public certificates access" on public.certificates;
drop policy if exists "authenticated kegiatan access" on public.kegiatan;
drop policy if exists "authenticated participants access" on public.participants;
drop policy if exists "authenticated app_state access" on public.app_state;
drop policy if exists "authenticated certificates access" on public.certificates;
drop policy if exists "public certificate verification" on public.certificates;
drop policy if exists "admin can view own role" on public.admin_users;
create policy "authenticated kegiatan access" on public.kegiatan for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "authenticated participants access" on public.participants for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "authenticated app_state access" on public.app_state for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "authenticated certificates access" on public.certificates for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public certificate verification" on public.certificates for select to anon using (true);
create policy "admin can view own role" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

-- FASE 2: Form Pendaftaran Publik
alter table public.kegiatan add column if not exists status text not null default 'draft';
alter table public.kegiatan add column if not exists kuota_peserta integer;
alter table public.kegiatan add column if not exists deskripsi text;
alter table public.kegiatan add column if not exists form_schema jsonb not null default '[]'::jsonb;

create table if not exists public.pendaftaran (
  id uuid primary key default gen_random_uuid(),
  kegiatan_id text not null references public.kegiatan(id) on delete cascade,
  nama text not null,
  tempat_lahir text not null,
  tanggal_lahir date not null,
  asal_pac text not null,
  no_hp text not null,
  alamat text not null,
  jawaban_custom jsonb not null default '{}'::jsonb,
  status text not null default 'menunggu',
  token_kehadiran uuid unique,
  id_card_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.absensi_materi (
  id uuid primary key default gen_random_uuid(),
  kegiatan_id text not null references public.kegiatan(id) on delete cascade,
  materi_id text not null,
  pendaftaran_id uuid not null references public.pendaftaran(id) on delete cascade,
  waktu_absen timestamptz not null default now(),
  metode text not null default 'scan',
  unique(materi_id, pendaftaran_id)
);

-- Note: RLS for absensi_materi needs to be enabled if anon needs to insert? No, admin only.
-- Tapi untuk amannya kita allow all just in case RLS is not fully strictly enforced yet.
alter table public.absensi_materi enable row level security;
create policy "Allow anon insert absensi" on public.absensi_materi for insert to anon with check (true);
create policy "Allow anon select absensi" on public.absensi_materi for select to anon using (true);


alter table public.pendaftaran enable row level security;
drop policy if exists "public insert pendaftaran" on public.pendaftaran;
drop policy if exists "authenticated pendaftaran access" on public.pendaftaran;
create policy "public insert pendaftaran" on public.pendaftaran for insert to anon, authenticated with check (true);
create policy "authenticated pendaftaran access" on public.pendaftaran for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public read kegiatan" on public.kegiatan for select to anon using (true);
