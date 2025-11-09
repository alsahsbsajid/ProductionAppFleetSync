-- supabase/migrations/009_production_security_hardening.sql
-- Production Security Hardening Migration
-- This migration implements comprehensive security measures for production deployment

-- 1. Enhanced RLS Policies with more granular permissions
-- Drop existing broad policies and create more specific ones
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can manage own rentals" ON public.rentals;
DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage own tolls" ON public.tolls;
DROP POLICY IF EXISTS "Users can manage own maintenance records" ON public.maintenance_records;

-- Create separate policies for SELECT, INSERT, UPDATE, DELETE operations
-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role IN ('user', 'admin'));

-- Customers table policies
CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE USING (auth.uid() = user_id);

-- Vehicles table policies
CREATE POLICY "Users can view own vehicles" ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON public.vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- Rentals table policies
CREATE POLICY "Users can view own rentals" ON public.rentals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rentals" ON public.rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rentals" ON public.rentals
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rentals" ON public.rentals
  FOR DELETE USING (auth.uid() = user_id);

-- Payments table policies
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tolls table policies
CREATE POLICY "Users can view own tolls" ON public.tolls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tolls" ON public.tolls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tolls" ON public.tolls
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tolls" ON public.tolls
  FOR DELETE USING (auth.uid() = user_id);

-- Maintenance records table policies
CREATE POLICY "Users can view own maintenance records" ON public.maintenance_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance records" ON public.maintenance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance records" ON public.maintenance_records
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance records" ON public.maintenance_records
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Add data validation constraints
-- Email validation
ALTER TABLE public.users ADD CONSTRAINT users_email_format_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.customers ADD CONSTRAINT customers_email_format_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone validation (Australian format)
ALTER TABLE public.users ADD CONSTRAINT users_phone_format_check 
  CHECK (phone IS NULL OR phone ~* '^(\+61|0)[2-9][0-9]{8}$');

ALTER TABLE public.customers ADD CONSTRAINT customers_phone_format_check 
  CHECK (phone IS NULL OR phone ~* '^(\+61|0)[2-9][0-9]{8}$');

-- License plate validation (Australian format)
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_license_plate_format_check 
  CHECK (license_plate ~* '^[A-Z0-9]{2,6}$');

-- VIN validation (17 characters)
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_vin_format_check 
  CHECK (vin IS NULL OR (LENGTH(vin) = 17 AND vin ~* '^[A-HJ-NPR-Z0-9]{17}$'));

-- Year validation
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_year_range_check 
  CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1);

-- Mileage validation
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_mileage_positive_check 
  CHECK (mileage >= 0);

-- Rate validation
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_daily_rate_positive_check 
  CHECK (daily_rate > 0);

ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_weekly_rate_positive_check 
  CHECK (weekly_rate IS NULL OR weekly_rate > 0);

ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_monthly_rate_positive_check 
  CHECK (monthly_rate IS NULL OR monthly_rate > 0);

-- Payment amount validation
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive_check 
  CHECK (amount > 0);

-- Rental date validation
ALTER TABLE public.rentals ADD CONSTRAINT rentals_date_logic_check 
  CHECK (end_date >= start_date);

ALTER TABLE public.rentals ADD CONSTRAINT rentals_return_date_logic_check 
  CHECK (actual_return_date IS NULL OR actual_return_date >= start_date);

-- Total days validation
ALTER TABLE public.rentals ADD CONSTRAINT rentals_total_days_positive_check 
  CHECK (total_days > 0);

-- Amount validation
ALTER TABLE public.rentals ADD CONSTRAINT rentals_amounts_positive_check 
  CHECK (subtotal >= 0 AND total_amount >= 0 AND tax_amount >= 0 AND deposit_amount >= 0);

-- 3. Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow viewing audit logs for admin users
CREATE POLICY "Admin users can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 4. Create security functions
-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, table_name, operation, record_id, 
    new_values, ip_address, user_agent
  ) VALUES (
    p_user_id, 'security_events', p_event_type, NULL,
    jsonb_build_object('description', p_description),
    p_ip_address, p_user_agent
  );
END;
$$;

-- Function to validate user permissions
CREATE OR REPLACE FUNCTION public.validate_user_access(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_user_id UUID;
BEGIN
  -- Check if user exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id AND created_at IS NOT NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check resource ownership based on type
  CASE p_resource_type
    WHEN 'customer' THEN
      SELECT user_id INTO v_resource_user_id FROM public.customers WHERE id = p_resource_id;
    WHEN 'vehicle' THEN
      SELECT user_id INTO v_resource_user_id FROM public.vehicles WHERE id = p_resource_id;
    WHEN 'rental' THEN
      SELECT user_id INTO v_resource_user_id FROM public.rentals WHERE id = p_resource_id;
    WHEN 'payment' THEN
      SELECT user_id INTO v_resource_user_id FROM public.payments WHERE id = p_resource_id;
    ELSE
      RETURN FALSE;
  END CASE;

  RETURN v_resource_user_id = p_user_id;
END;
$$;

-- 5. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Add indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation ON public.audit_logs(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- 7. Create cleanup function for old audit logs and rate limits
CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete audit logs older than 90 days
  DELETE FROM public.audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete rate limit records older than 1 hour
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- 8. Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Security audit log for tracking data changes and access patterns';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting table for API endpoint protection';
COMMENT ON FUNCTION public.log_security_event IS 'Logs security-related events for monitoring and compliance';
COMMENT ON FUNCTION public.validate_user_access IS 'Validates user access permissions for resources';
COMMENT ON FUNCTION public.cleanup_security_tables IS 'Cleans up old audit logs and rate limit records';

-- 9. Grant necessary permissions
-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_user_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_security_tables TO service_role;