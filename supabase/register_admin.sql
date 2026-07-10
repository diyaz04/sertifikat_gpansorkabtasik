-- Jalankan setelah akun berikut dibuat di Supabase Dashboard:
-- Authentication > Users > Add user

insert into public.admin_users (user_id, email)
select id, lower(email)
from auth.users
where lower(email) = 'adminsertifikatansor@gmail.com'
on conflict (user_id) do update
set email = excluded.email;

do $$
begin
  if not exists (
    select 1 from public.admin_users
    where email = 'adminsertifikatansor@gmail.com'
  ) then
    raise exception 'Akun Auth adminsertifikatansor@gmail.com belum ada. Buat dahulu melalui Authentication > Users > Add user.';
  end if;
end $$;

-- Verifikasi hasil pendaftaran admin.
select user_id, email, created_at
from public.admin_users
where email = 'adminsertifikatansor@gmail.com';
