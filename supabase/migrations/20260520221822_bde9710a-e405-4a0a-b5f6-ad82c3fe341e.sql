ALTER TABLE public.integration_settings 
  ADD COLUMN IF NOT EXISTS uazapi_url text,
  ADD COLUMN IF NOT EXISTS uazapi_token text;