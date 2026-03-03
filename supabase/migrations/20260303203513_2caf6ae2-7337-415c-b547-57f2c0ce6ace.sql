
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_name text NOT NULL,
  credits integer NOT NULL,
  amount text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment requests
CREATE POLICY "Users can view own payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own payment requests
CREATE POLICY "Users can create payment requests"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment requests
CREATE POLICY "Admins can view all payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update payment requests (approve/reject)
CREATE POLICY "Admins can update payment requests"
ON public.payment_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
