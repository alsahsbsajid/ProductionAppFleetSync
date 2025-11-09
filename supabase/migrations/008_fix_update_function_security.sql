-- Fix security issue with update_updated_at_column function
-- Add SECURITY DEFINER and SET search_path to prevent search_path manipulation attacks

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Updates the updated_at column to current timestamp. Uses SECURITY DEFINER with fixed search_path for security.';