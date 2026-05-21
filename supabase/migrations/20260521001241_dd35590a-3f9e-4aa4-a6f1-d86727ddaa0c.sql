ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_whatsapp text,
  ADD COLUMN IF NOT EXISTS pix_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_base64 text,
  ADD COLUMN IF NOT EXISTS mp_payment_pix_id text;

ALTER TYPE public.message_kind ADD VALUE IF NOT EXISTS 'pix';