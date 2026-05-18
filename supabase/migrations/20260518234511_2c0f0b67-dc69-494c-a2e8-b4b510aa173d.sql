
-- =====================
-- ENUMS
-- =====================
create type public.app_role as enum ('owner', 'barber');
create type public.appointment_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.order_status as enum ('open', 'closed', 'cancelled');
create type public.payment_method as enum ('pix', 'card', 'cash');
create type public.message_kind as enum ('confirmation', 'reminder_24h', 'reminder_2h', 'reengagement', 'waitlist', 'subscription');

-- =====================
-- HELPER: updated_at
-- =====================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- =====================
-- BARBERSHOP (singleton-ish: 1 linha)
-- =====================
create table public.barbershop (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Barbearia Mano Elves',
  address text,
  phone text,
  logo_url text,
  pix_key text,
  no_show_protection boolean not null default true,
  no_show_deposit_cents integer not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_barbershop_updated before update on public.barbershop for each row execute procedure public.set_updated_at();

insert into public.barbershop (name) values ('Barbearia Mano Elves');

-- =====================
-- PROFILES
-- =====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  slug text unique,
  bio text,
  avatar_url text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles for each row execute procedure public.set_updated_at();

-- =====================
-- USER ROLES + has_role
-- =====================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- Trigger: novo usuário -> cria profile; primeiro usuário vira owner, demais viram barber
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
  base_slug text;
  final_slug text;
  i int := 0;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'barber');
    -- gerar slug único para barbeiros
    base_slug := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then base_slug := 'barbeiro'; end if;
    final_slug := base_slug;
    while exists (select 1 from public.profiles where slug = final_slug) loop
      i := i + 1;
      final_slug := base_slug || '-' || i;
    end loop;
    update public.profiles set slug = final_slug where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- SERVICES
-- =====================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_services_updated before update on public.services for each row execute procedure public.set_updated_at();

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_combos_updated before update on public.combos for each row execute procedure public.set_updated_at();

create table public.combo_services (
  combo_id uuid not null references public.combos(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  primary key (combo_id, service_id)
);

-- =====================
-- WORKING HOURS / TIME OFF / BUFFER
-- =====================
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6), -- 0=domingo
  start_time time not null,
  end_time time not null,
  unique (barber_id, weekday, start_time)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text
);

create table public.buffer_settings (
  barber_id uuid primary key references public.profiles(id) on delete cascade,
  buffer_minutes integer not null default 10 check (buffer_minutes >= 0)
);

-- =====================
-- COMMISSION
-- =====================
create table public.commission_rules (
  barber_id uuid primary key references public.profiles(id) on delete cascade,
  service_pct numeric(5,2) not null default 50 check (service_pct between 0 and 100),
  product_pct numeric(5,2) not null default 10 check (product_pct between 0 and 100)
);

-- =====================
-- PRODUCTS
-- =====================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  stock integer not null default 0,
  low_stock_alert integer not null default 5,
  is_internal_use boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated before update on public.products for each row execute procedure public.set_updated_at();

-- =====================
-- APPOINTMENTS
-- =====================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete restrict,
  client_name text not null,
  client_whatsapp text not null,
  client_email text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  total_cents integer not null default 0,
  combo_id uuid references public.combos(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.appointments (barber_id, start_at);
create trigger trg_appointments_updated before update on public.appointments for each row execute procedure public.set_updated_at();

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  price_cents integer not null,
  duration_minutes integer not null
);

-- =====================
-- ORDERS / PDV
-- =====================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  barber_id uuid not null references public.profiles(id) on delete restrict,
  client_name text not null,
  status public.order_status not null default 'open',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  invoice_number text, -- NFS-e mock
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create trigger trg_orders_updated before update on public.orders for each row execute procedure public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('service', 'combo', 'product')),
  ref_id uuid not null,
  description text not null,
  qty integer not null default 1 check (qty > 0),
  unit_price_cents integer not null,
  total_cents integer not null
);

-- =====================
-- PAYMENTS (com split)
-- =====================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  barber_id uuid not null references public.profiles(id) on delete restrict,
  method public.payment_method not null,
  total_cents integer not null,
  owner_amount_cents integer not null default 0,
  barber_amount_cents integer not null default 0,
  paid_at timestamptz not null default now()
);

-- =====================
-- SUBSCRIPTIONS
-- =====================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_whatsapp text not null,
  plan_name text not null,
  monthly_price_cents integer not null,
  credits_remaining integer not null default 0,
  next_charge_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================
-- WAITLIST
-- =====================
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  client_whatsapp text not null,
  preferred_period text,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

-- =====================
-- MESSAGES LOG
-- =====================
create table public.messages_log (
  id uuid primary key default gen_random_uuid(),
  kind public.message_kind not null,
  to_phone text not null,
  to_name text,
  payload text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================
-- ENABLE RLS
-- =====================
alter table public.barbershop enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.services enable row level security;
alter table public.combos enable row level security;
alter table public.combo_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.buffer_settings enable row level security;
alter table public.commission_rules enable row level security;
alter table public.products enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.waitlist enable row level security;
alter table public.messages_log enable row level security;

-- =====================
-- POLICIES (público + owner + barbeiro)
-- =====================

-- barbershop: público lê; owner edita
create policy "barbershop public read" on public.barbershop for select using (true);
create policy "barbershop owner write" on public.barbershop for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- profiles: público lê; usuário edita o próprio; owner edita todos
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles owner all" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- user_roles: usuário vê o próprio; owner gerencia
create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "roles owner write" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- services / combos / combo_services: leitura pública; owner edita
create policy "services public read" on public.services for select using (true);
create policy "services owner write" on public.services for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

create policy "combos public read" on public.combos for select using (true);
create policy "combos owner write" on public.combos for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

create policy "combo_services public read" on public.combo_services for select using (true);
create policy "combo_services owner write" on public.combo_services for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- working_hours / time_off / buffer: leitura pública (precisa pro fluxo de agendamento); barbeiro edita o seu; owner edita tudo
create policy "wh public read" on public.working_hours for select using (true);
create policy "wh barber write" on public.working_hours for all to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

create policy "to public read" on public.time_off for select using (true);
create policy "to barber write" on public.time_off for all to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

create policy "buffer public read" on public.buffer_settings for select using (true);
create policy "buffer barber write" on public.buffer_settings for all to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

-- commission_rules: barbeiro lê o seu; owner gerencia
create policy "commission barber read" on public.commission_rules for select to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "commission owner write" on public.commission_rules for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- products: leitura pública; owner edita
create policy "products public read" on public.products for select using (true);
create policy "products owner write" on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- appointments: insert público (cliente final agenda sem login), select/update barbeiro do agendamento + owner
create policy "appt public insert" on public.appointments for insert with check (true);
create policy "appt read" on public.appointments for select to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "appt update" on public.appointments for update to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "appt delete owner" on public.appointments for delete to authenticated
  using (public.has_role(auth.uid(), 'owner'));

-- appointment_items: insert público (junto com agendamento); leitura barbeiro/owner
create policy "appti public insert" on public.appointment_items for insert with check (true);
create policy "appti read" on public.appointment_items for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id and (a.barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))));

-- orders / items / payments: barbeiro vê os seus; owner tudo
create policy "orders rw" on public.orders for all to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

create policy "order_items rw" on public.order_items for all to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))))
  with check (exists (select 1 from public.orders o where o.id = order_id and (o.barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))));

create policy "payments rw" on public.payments for all to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

-- subscriptions / waitlist / messages_log: owner
create policy "subs owner" on public.subscriptions for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

create policy "waitlist insert public" on public.waitlist for insert with check (true);
create policy "waitlist read" on public.waitlist for select to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "waitlist write" on public.waitlist for update to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'))
  with check (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
create policy "waitlist delete" on public.waitlist for delete to authenticated
  using (barber_id = auth.uid() or public.has_role(auth.uid(), 'owner'));

create policy "msg owner read" on public.messages_log for select to authenticated
  using (public.has_role(auth.uid(), 'owner'));
create policy "msg insert any auth" on public.messages_log for insert to authenticated with check (true);
create policy "msg insert anon" on public.messages_log for insert with check (true);
