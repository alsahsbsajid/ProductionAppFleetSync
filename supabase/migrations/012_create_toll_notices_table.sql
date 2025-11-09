-- Migration: Create toll_notices table for general toll notices
-- Description: Table for storing all toll notices (not tied to specific rentals)

CREATE TABLE IF NOT EXISTS toll_notices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  licence_plate VARCHAR(20) NOT NULL,
  state VARCHAR(10) NOT NULL,
  toll_notice_number VARCHAR(100),
  motorway VARCHAR(255) NOT NULL,
  issued_date VARCHAR(50) NOT NULL,
  trip_status VARCHAR(50) NOT NULL,
  admin_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  toll_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date VARCHAR(50) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  vehicle_type VARCHAR(20) DEFAULT 'car',
  search_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'api_search', 'rental_search'
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT toll_amount_positive CHECK (toll_amount >= 0),
  CONSTRAINT admin_fee_positive CHECK (admin_fee >= 0),
  CONSTRAINT total_amount_positive CHECK (total_amount >= 0),
  
  -- Unique constraint to prevent duplicate toll notices per user
  UNIQUE(licence_plate, motorway, issued_date, toll_amount, admin_fee, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_toll_notices_user_id ON toll_notices(user_id);
CREATE INDEX IF NOT EXISTS idx_toll_notices_licence_plate ON toll_notices(licence_plate);
CREATE INDEX IF NOT EXISTS idx_toll_notices_is_paid ON toll_notices(is_paid);
CREATE INDEX IF NOT EXISTS idx_toll_notices_issued_date ON toll_notices(issued_date);
CREATE INDEX IF NOT EXISTS idx_toll_notices_motorway ON toll_notices(motorway);
CREATE INDEX IF NOT EXISTS idx_toll_notices_search_source ON toll_notices(search_source);

-- Add RLS (Row Level Security) policies
ALTER TABLE toll_notices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own toll notices
CREATE POLICY "Users can view own toll notices" ON toll_notices
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Users can insert their own toll notices
CREATE POLICY "Users can insert own toll notices" ON toll_notices
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own toll notices
CREATE POLICY "Users can update own toll notices" ON toll_notices
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own toll notices
CREATE POLICY "Users can delete own toll notices" ON toll_notices
  FOR DELETE USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_toll_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_toll_notices_updated_at
  BEFORE UPDATE ON toll_notices
  FOR EACH ROW EXECUTE FUNCTION update_toll_notices_updated_at();

-- Add helpful comments
COMMENT ON TABLE toll_notices IS 'Stores general toll notices for all users';
COMMENT ON COLUMN toll_notices.licence_plate IS 'Vehicle registration/license plate number';
COMMENT ON COLUMN toll_notices.toll_notice_number IS 'Official toll notice reference number';
COMMENT ON COLUMN toll_notices.search_source IS 'Source of the toll notice data (manual, api_search, rental_search)';

-- Add function to get toll statistics for a user
CREATE OR REPLACE FUNCTION get_user_toll_statistics(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_notices', COUNT(*),
    'total_amount', COALESCE(SUM(total_amount), 0),
    'paid_notices', COUNT(*) FILTER (WHERE is_paid = true),
    'unpaid_notices', COUNT(*) FILTER (WHERE is_paid = false),
    'overdue_notices', COUNT(*) FILTER (WHERE is_paid = false AND due_date < CURRENT_DATE::TEXT),
    'unpaid_amount', COALESCE(SUM(total_amount) FILTER (WHERE is_paid = false), 0),
    'overdue_amount', COALESCE(SUM(total_amount) FILTER (WHERE is_paid = false AND due_date < CURRENT_DATE::TEXT), 0),
    'admin_fees', COALESCE(SUM(admin_fee), 0),
    'toll_fees', COALESCE(SUM(toll_amount), 0),
    'unique_motorways', COUNT(DISTINCT motorway),
    'unique_vehicles', COUNT(DISTINCT licence_plate),
    'date_range', json_build_object(
      'earliest', MIN(issued_date),
      'latest', MAX(issued_date)
    )
  ) INTO result
  FROM toll_notices
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(result, '{}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_toll_statistics(UUID) TO authenticated; 