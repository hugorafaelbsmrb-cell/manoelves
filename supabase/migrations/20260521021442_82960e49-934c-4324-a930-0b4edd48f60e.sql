
create table public.client_otp_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.client_otp_codes enable row level security;

-- Sem políticas: somente service role (server functions) acessa.
create index if not exists client_otp_codes_expires_idx on public.client_otp_codes (expires_at);
