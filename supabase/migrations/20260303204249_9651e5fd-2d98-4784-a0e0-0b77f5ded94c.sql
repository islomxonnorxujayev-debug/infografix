
-- Add telegram fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bot_state text;

-- Make user_id nullable for telegram-only users
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Update payment_requests to reference profiles directly
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS telegram_id bigint;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);

-- Add generations telegram support
ALTER TABLE public.generations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS telegram_id bigint;
