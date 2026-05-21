
-- 1) Janelas exclusivas por plano de assinatura
CREATE TABLE public.subscription_plan_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  barber_id uuid NULL,
  weekday int NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plan_windows_plan ON public.subscription_plan_windows(plan_id);

ALTER TABLE public.subscription_plan_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spw public read"
  ON public.subscription_plan_windows
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "spw owner write"
  ON public.subscription_plan_windows
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

-- 2) Imagem do produto
ALTER TABLE public.products ADD COLUMN image_url text;

-- 3) Bucket público de produtos
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "products bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "products bucket owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "products bucket owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "products bucket owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'owner'::app_role));
