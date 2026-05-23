
-- 1. Tabela clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL UNIQUE,
  email text,
  birthday date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients auth read" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients auth write" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "clients public insert" ON public.clients
  FOR INSERT TO public WITH CHECK (true);

CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_clients_birthday ON public.clients (birthday) WHERE birthday IS NOT NULL;

-- 2. client_id em appointments
ALTER TABLE public.appointments
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);

-- 3. banner_url em barbershop e profiles
ALTER TABLE public.barbershop ADD COLUMN banner_url text;
ALTER TABLE public.profiles ADD COLUMN banner_url text;

-- 4. Configurações de aniversário
ALTER TABLE public.integration_settings
  ADD COLUMN birthday_days_before int NOT NULL DEFAULT 7,
  ADD COLUMN birthday_discount_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN birthday_message_template text NOT NULL DEFAULT
    'Olá {nome}! 🎉 Seu aniversário está chegando e queremos comemorar com você! Use o cupom *ANIVER{desconto}* e ganhe {desconto}% de desconto em qualquer serviço durante o mês do seu aniversário. Agende seu horário e venha celebrar! ✂️🎂',
  ADD COLUMN birthday_notifications_enabled boolean NOT NULL DEFAULT true;

-- 5. Log de aniversários enviados (para não duplicar)
CREATE TABLE public.birthday_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sent_for_year int NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, sent_for_year)
);

ALTER TABLE public.birthday_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bnl owner read" ON public.birthday_notifications_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "bnl public insert" ON public.birthday_notifications_log
  FOR INSERT TO public WITH CHECK (true);
