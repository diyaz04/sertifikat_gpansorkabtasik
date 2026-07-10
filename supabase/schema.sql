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
create policy "authenticated kegiatan access" on public.kegiatan for all to authenticated using (true) with check (true);
create policy "authenticated participants access" on public.participants for all to authenticated using (true) with check (true);
create policy "authenticated app_state access" on public.app_state for all to authenticated using (true) with check (true);
create policy "authenticated certificates access" on public.certificates for all to authenticated using (true) with check (true);
create policy "public certificate verification" on public.certificates for select to anon using (true);
