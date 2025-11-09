-- Add columns to match the Customer data model in the application
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS image TEXT;

-- Remove the old global unique constraint on the email column
-- The name 'customers_email_key' is a standard convention, but might differ.
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- Add a new composite unique constraint for multi-tenancy (user_id and email)
-- This ensures email is unique per user, not across the entire table.
ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_email_key UNIQUE (user_id, email); 