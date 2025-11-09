-- Ensure the company column exists in the customers table
-- This migration will force a schema refresh

-- Add the company column if it doesn't exist
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company TEXT;

-- Add type column if it doesn't exist  
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'individual';

-- Add image column if it doesn't exist
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS image TEXT;

-- Update any existing records that might have NULL type
UPDATE public.customers SET type = 'individual' WHERE type IS NULL;

-- Add comment to force schema cache refresh
COMMENT ON COLUMN public.customers.company IS 'Company name for business customers';
COMMENT ON COLUMN public.customers.type IS 'Customer type: individual or business';
COMMENT ON COLUMN public.customers.image IS 'URL to customer profile image';

-- Refresh statistics to ensure schema is up to date
ANALYZE public.customers; 