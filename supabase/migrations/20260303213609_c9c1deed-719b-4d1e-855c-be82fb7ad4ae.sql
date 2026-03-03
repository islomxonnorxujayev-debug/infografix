-- Create a private bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to view payment screenshots
CREATE POLICY "Admins can view payment screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-screenshots' AND (SELECT public.has_role(auth.uid(), 'admin')));

-- Allow service role inserts (from edge functions via service key)
CREATE POLICY "Service can upload payment screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots');
