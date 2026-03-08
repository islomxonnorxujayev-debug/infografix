
-- Update handle_new_user to give 1 free credit instead of 3
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, credits_remaining, plan)
  VALUES (NEW.id, NEW.email, 1, 'free');
  RETURN NEW;
END;
$function$;

-- Update approve_payment to also set plan to 'paid'
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _req RECORD;
  _profile RECORD;
  _new_credits integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  UPDATE payment_requests
  SET status = 'approved', updated_at = now()
  WHERE id = _payment_id AND status = 'pending'
  RETURNING * INTO _req;

  IF _req IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or already processed');
  END IF;

  IF _req.profile_id IS NOT NULL THEN
    SELECT * INTO _profile FROM profiles WHERE id = _req.profile_id;
  ELSIF _req.telegram_id IS NOT NULL THEN
    SELECT * INTO _profile FROM profiles WHERE telegram_id = _req.telegram_id LIMIT 1;
  END IF;

  IF _profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  UPDATE profiles
  SET credits_remaining = credits_remaining + _req.credits, updated_at = now(), plan = 'paid'
  WHERE id = _profile.id
  RETURNING credits_remaining INTO _new_credits;

  RETURN jsonb_build_object('success', true, 'credits_added', _req.credits, 'new_balance', _new_credits);
END;
$function$;
