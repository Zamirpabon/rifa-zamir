-- Sensacional Rifa · Ejecutar una vez en Supabase > SQL Editor
-- Número 00 a 99: exactamente 100 números.
-- Políticas: público solo ve número/estado/emoji; compradores solo administración.

create table if not exists public.raffle_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.raffle_settings (
  id smallint primary key default 1 check(id=1),
  title text not null default 'Sensacional Rifa' check(length(title) between 1 and 70),
  subtitle text not null default 'Una noble causa, una gran ilusión',
  prize text not null default '$700.000' check(length(prize) between 1 and 60),
  draw_date date not null default '2026-12-19',
  lottery text not null default 'Lotería de Boyacá',
  ticket_price integer not null default 20000 check(ticket_price between 1000 and 10000000),
  organizer text not null default 'Organización de la rifa',
  whatsapp text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.raffle_numbers (
  number text primary key check(number ~ '^[0-9]{2}$'),
  status text not null default 'disponible' check(status in ('disponible','apartado','pendiente','pagado')),
  emoji text not null default '' check(char_length(emoji)<=16),
  updated_at timestamptz not null default now()
);

create table if not exists public.raffle_buyers (
  number text primary key references public.raffle_numbers(number) on delete cascade,
  buyer_name text not null default '' check(char_length(buyer_name)<=120),
  buyer_phone text not null default '' check(char_length(buyer_phone)<=30),
  amount_paid integer not null default 0 check(amount_paid between 0 and 10000000),
  notes text not null default '' check(char_length(notes)<=500),
  updated_at timestamptz not null default now()
);

insert into public.raffle_settings(id) values (1) on conflict (id) do nothing;
insert into public.raffle_numbers(number)
select lpad(i::text,2,'0') from generate_series(0,99) as i
on conflict (number) do nothing;

-- Solo permisos de lectura pública para datos NO sensibles.
revoke all on public.raffle_admins from anon, authenticated;
revoke all on public.raffle_buyers from anon, authenticated;
revoke all on public.raffle_numbers from anon, authenticated;
revoke all on public.raffle_settings from anon, authenticated;
grant select on public.raffle_numbers to anon, authenticated;
grant select on public.raffle_settings to anon, authenticated;
grant update(title,subtitle,prize,draw_date,lottery,ticket_price,organizer,whatsapp,updated_at)
  on public.raffle_settings to authenticated;
grant select on public.raffle_buyers to authenticated;
grant select on public.raffle_admins to authenticated;

alter table public.raffle_admins enable row level security;
alter table public.raffle_settings enable row level security;
alter table public.raffle_numbers enable row level security;
alter table public.raffle_buyers enable row level security;

-- Idempotencia si se ejecuta nuevamente.
drop policy if exists "La administradora comprueba su acceso" on public.raffle_admins;
create policy "La administradora comprueba su acceso" on public.raffle_admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Mostrar estados sin compradores" on public.raffle_numbers;
create policy "Mostrar estados sin compradores" on public.raffle_numbers
  for select to anon, authenticated using (true);

drop policy if exists "Mostrar datos del sorteo" on public.raffle_settings;
create policy "Mostrar datos del sorteo" on public.raffle_settings
  for select to anon, authenticated using (true);

drop policy if exists "Administradora edita datos del sorteo" on public.raffle_settings;
create policy "Administradora edita datos del sorteo" on public.raffle_settings
  for update to authenticated
  using (exists(select 1 from public.raffle_admins a where a.user_id=(select auth.uid())))
  with check (exists(select 1 from public.raffle_admins a where a.user_id=(select auth.uid())));

drop policy if exists "Solo administradora ve compradores" on public.raffle_buyers;
create policy "Solo administradora ve compradores" on public.raffle_buyers
  for select to authenticated
  using (exists(select 1 from public.raffle_admins a where a.user_id=(select auth.uid())));

-- Operación atómica para uno o varios números. La función comprueba el rol en servidor.
create or replace function public.save_raffle_numbers(
  p_numbers text[],
  p_status text,
  p_buyer_name text default '',
  p_buyer_phone text default '',
  p_amount_paid integer default 0,
  p_emoji text default '',
  p_notes text default ''
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_num text;
  v_count integer:=0;
  v_price integer;
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.raffle_admins where user_id=(select auth.uid())
  ) then
    raise exception 'No tienes permiso de administración';
  end if;
  if p_numbers is null or cardinality(p_numbers)<1 or cardinality(p_numbers)>100 then
    raise exception 'Selecciona entre 1 y 100 números';
  end if;
  if p_status is null or p_status not in ('disponible','apartado','pendiente','pagado') then
    raise exception 'Estado inválido';
  end if;
  if coalesce(p_amount_paid,-1)<0 or p_amount_paid>10000000 then
    raise exception 'Abono inválido';
  end if;
  if length(coalesce(p_emoji,''))>16 or length(coalesce(p_buyer_name,''))>120 or
     length(coalesce(p_buyer_phone,''))>30 or length(coalesce(p_notes,''))>500 then
    raise exception 'Hay campos demasiado largos';
  end if;
  select ticket_price into v_price from public.raffle_settings where id=1;
  if p_status<>'disponible' and btrim(coalesce(p_buyer_name,''))='' then
    raise exception 'Indica el nombre del comprador';
  end if;
  if p_status='pagado' and p_amount_paid<v_price then
    raise exception 'El importe pagado es menor al valor de la boleta';
  end if;
  for v_num in select distinct unnest(p_numbers) loop
    if v_num is null or v_num !~ '^[0-9]{2}$' then
      raise exception 'Número inválido: %',v_num;
    end if;
    update public.raffle_numbers
      set status=p_status,emoji=case when p_status='disponible' then '' else coalesce(p_emoji,'') end,updated_at=now()
      where number=v_num;
    if not found then raise exception 'No existe el número %',v_num; end if;
    if p_status='disponible' then
      delete from public.raffle_buyers where number=v_num;
    else
      insert into public.raffle_buyers(number,buyer_name,buyer_phone,amount_paid,notes,updated_at)
        values(v_num,coalesce(p_buyer_name,''),coalesce(p_buyer_phone,''),p_amount_paid,coalesce(p_notes,''),now())
        on conflict(number) do update set
          buyer_name=excluded.buyer_name,
          buyer_phone=excluded.buyer_phone,
          amount_paid=excluded.amount_paid,
          notes=excluded.notes,
          updated_at=excluded.updated_at;
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.save_raffle_numbers(text[],text,text,text,integer,text,text) from public,anon;
grant execute on function public.save_raffle_numbers(text[],text,text,text,integer,text,text) to authenticated;

-- No guardes números de tarjeta bancaria ni contraseñas en observaciones.
