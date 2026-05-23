CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.haircut_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.haircut_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haircut_styles public read"
  ON public.haircut_styles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "haircut_styles owner write"
  ON public.haircut_styles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER haircut_styles_set_updated_at
  BEFORE UPDATE ON public.haircut_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_haircut_styles_active_sort
  ON public.haircut_styles (is_active, sort_order);