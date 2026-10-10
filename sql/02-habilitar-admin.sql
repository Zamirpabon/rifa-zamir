-- PASO 2 (después de crear a la administradora en Supabase > Authentication > Users)
-- 1. Sustituye el correo entre comillas por el correo REAL.
-- 2. Ejecuta estas sentencias en SQL Editor.
-- 3. Debe devolver una fila con el ID del usuario.

insert into public.raffle_admins(user_id)
select id from auth.users where lower(email)=lower('PON_AQUI_CORREO_ADMIN@ejemplo.com')
on conflict(user_id) do nothing;

select a.user_id,u.email from public.raffle_admins a
join auth.users u on u.id=a.user_id;
