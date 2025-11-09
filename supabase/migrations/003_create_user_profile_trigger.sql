-- supabase/migrations/003_create_user_profile_trigger.sql

-- Function to create a user profile when a new user signs up in Supabase Auth.
-- This function is called by a trigger on the `auth.users` table.
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into public.users, linking it to the new auth.users record.
  -- It captures the email from the new auth user record.
  -- It also attempts to pull first_name, last_name, and company_name from the user's metadata if available at signup.
  INSERT INTO public.users (id, email, first_name, last_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the security definer function to be owned by the postgres role
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;

-- Grant execute permission to the 'authenticated' role
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;

-- Grant execute permission to the 'service_role' role
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;


-- Trigger to call the function after a new user is created.
-- This ensures that every user in `auth.users` has a corresponding profile in `public.users`.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Note for developers:
-- This trigger automatically creates a user profile. If you need to manually create a user profile
-- for an existing auth user that does not have one, you can run the following SQL:
--
-- INSERT INTO public.users (id, email)
-- SELECT id, email FROM auth.users WHERE id = 'YOUR_USER_ID'
-- ON CONFLICT (id) DO NOTHING;
--
-- This is useful for users created before this trigger was in place. 