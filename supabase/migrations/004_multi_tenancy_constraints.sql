-- This migration updates unique constraints to support multi-tenancy.
-- It allows different users to have records with the same values for certain fields (e.g., license_plate, email).

-- Drop old global unique constraints
-- Using IF EXISTS to prevent errors if the script is run multiple times or if constraints were already removed.
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_vin_key;
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_license_plate_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
ALTER TABLE public.rentals DROP CONSTRAINT IF EXISTS rentals_rental_number_key;

-- Add compound unique constraints scoped to user_id
-- This ensures that values are unique per user, not globally.

-- For vehicles, license_plate must be unique for each user.
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_license_plate_key UNIQUE (user_id, license_plate);

-- For vehicles, VIN should also be unique per user. This allows multiple NULLs per user.
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_vin_key UNIQUE (user_id, vin);

-- For customers, email must be unique for each user.
ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_email_key UNIQUE (user_id, email);

-- For rentals, rental_number must be unique for each user.
ALTER TABLE public.rentals ADD CONSTRAINT rentals_user_id_rental_number_key UNIQUE (user_id, rental_number); 