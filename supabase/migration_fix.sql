-- 1. Create app_users table if it doesn't exist
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'instruktur',
  permissions text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
create policy "Users can read all app_users" on public.app_users for select to authenticated using (true);
create policy "Super admin can insert" on public.app_users for insert to authenticated with check (true);
create policy "Super admin can update" on public.app_users for update to authenticated using (true) with check (true);

-- 2. Add missing columns to pendaftaran
alter table public.pendaftaran 
  add column if not exists status_kelulusan text not null default 'Belum Ditentukan',
  add column if not exists predikat text;

-- 3. Update is_admin function to check app_users instead of admin_users
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_users
    where id = (select auth.uid()) and role = 'admin'
  ) or exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
