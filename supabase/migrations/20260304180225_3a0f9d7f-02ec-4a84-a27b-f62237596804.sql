-- Make product-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'product-images';

-- Add DELETE policy for generations table
CREATE POLICY "Users can delete their own generations"
ON public.generations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add admin DELETE policy for generations
CREATE POLICY "Admins can delete all generations"
ON public.generations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));