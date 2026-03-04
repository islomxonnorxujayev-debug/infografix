-- Harden approve_payment RPC with explicit admin authorization
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _req RECORD;
  _profile RECORD;
  _new_credits integer;
BEGIN
  -- Only authenticated admins can approve payments
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  -- Only update if currently pending (atomic check)
  UPDATE payment_requests
  SET status = 'approved', updated_at = now()
  WHERE id = _payment_id AND status = 'pending'
  RETURNING * INTO _req;

  IF _req IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or already processed');
  END IF;

  -- Find profile
  IF _req.profile_id IS NOT NULL THEN
    SELECT * INTO _profile FROM profiles WHERE id = _req.profile_id;
  ELSIF _req.telegram_id IS NOT NULL THEN
    SELECT * INTO _profile FROM profiles WHERE telegram_id = _req.telegram_id LIMIT 1;
  END IF;

  IF _profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Atomically increment credits
  UPDATE profiles
  SET credits_remaining = credits_remaining + _req.credits, updated_at = now()
  WHERE id = _profile.id
  RETURNING credits_remaining INTO _new_credits;

  RETURN jsonb_build_object('success', true, 'credits_added', _req.credits, 'new_balance', _new_credits);
END;
$function$;

-- Restrict execute permissions to authenticated users only
REVOKE ALL ON FUNCTION public.approve_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_payment(uuid) TO authenticated;