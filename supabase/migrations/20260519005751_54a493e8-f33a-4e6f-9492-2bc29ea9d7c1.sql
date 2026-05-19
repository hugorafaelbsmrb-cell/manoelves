
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  mp_access_token text,
  mp_public_key text,
  mp_webhook_secret text,
  whatsapp_token text,
  whatsapp_phone_id text,
  updated_at timestamptz not null default now()
);

-- garante linha única
insert into public.integration_settings (id) values (gen_random_uuid())
  on conflict do nothing;

alter table public.integration_settings enable row level security;

create policy "intset owner read" on public.integration_settings
  for select to authenticated using (has_role(auth.uid(), 'owner'));
create policy "intset owner write" on public.integration_settings
  for all to authenticated using (has_role(auth.uid(), 'owner'))
  with check (has_role(auth.uid(), 'owner'));

alter table public.orders
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_init_point text,
  add column if not exists payment_status text default 'pending';

alter table public.subscriptions
  add column if not exists mp_preapproval_id text,
  add column if not exists mp_init_point text,
  add column if not exists mp_status text default 'pending';
