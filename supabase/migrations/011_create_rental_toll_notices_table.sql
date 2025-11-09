-- Migration: Create rental_toll_notices table
-- Description: Table for storing toll notices associated with rentals

CREATE TABLE IF NOT EXISTS rental_toll_notices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
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
  week_of_year INTEGER,
  year INTEGER,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT toll_amount_positive CHECK (toll_amount >= 0),
  CONSTRAINT admin_fee_positive CHECK (admin_fee >= 0),
  CONSTRAINT total_amount_positive CHECK (total_amount >= 0),
  CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2050),
  CONSTRAINT valid_week CHECK (week_of_year >= 1 AND week_of_year <= 53),
  
  -- Unique constraint to prevent duplicate toll notices
  UNIQUE(toll_notice_number, rental_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_rental_id ON rental_toll_notices(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_user_id ON rental_toll_notices(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_licence_plate ON rental_toll_notices(licence_plate);
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_is_paid ON rental_toll_notices(is_paid);
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_week_year ON rental_toll_notices(week_of_year, year);
CREATE INDEX IF NOT EXISTS idx_rental_toll_notices_issued_date ON rental_toll_notices(issued_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE rental_toll_notices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rental toll notices
CREATE POLICY "Users can view own rental toll notices" ON rental_toll_notices
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Users can insert their own rental toll notices
CREATE POLICY "Users can insert own rental toll notices" ON rental_toll_notices
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own rental toll notices
CREATE POLICY "Users can update own rental toll notices" ON rental_toll_notices
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own rental toll notices
CREATE POLICY "Users can delete own rental toll notices" ON rental_toll_notices
  FOR DELETE USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_rental_toll_notices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_rental_toll_notices_updated_at
  BEFORE UPDATE ON rental_toll_notices
  FOR EACH ROW EXECUTE FUNCTION update_rental_toll_notices_updated_at();

-- Add helpful comments
COMMENT ON TABLE rental_toll_notices IS 'Stores toll notices associated with vehicle rentals';
COMMENT ON COLUMN rental_toll_notices.rental_id IS 'References the rental this toll notice belongs to';
COMMENT ON COLUMN rental_toll_notices.licence_plate IS 'Vehicle registration/license plate number';
COMMENT ON COLUMN rental_toll_notices.toll_notice_number IS 'Official toll notice reference number';
COMMENT ON COLUMN rental_toll_notices.week_of_year IS 'Week number (1-53) for weekly aggregation';
COMMENT ON COLUMN rental_toll_notices.year IS 'Year for the toll notice';
COMMENT ON COLUMN rental_toll_notices.synced_at IS 'Last time this record was synced from external toll services';

-- Add a view for weekly toll summaries
CREATE OR REPLACE VIEW rental_toll_weekly_summary AS
SELECT 
  rental_id,
  week_of_year,
  year,
  COUNT(*) as total_tolls,
  SUM(total_amount) as total_amount,
  SUM(admin_fee) as total_admin_fees,
  SUM(toll_amount) as total_toll_amount,
  COUNT(*) FILTER (WHERE is_paid = true) as paid_count,
  COUNT(*) FILTER (WHERE is_paid = false) as unpaid_count,
  SUM(total_amount) FILTER (WHERE is_paid = false) as unpaid_amount,
  MIN(issued_date) as earliest_notice,
  MAX(issued_date) as latest_notice,
  user_id
FROM rental_toll_notices
GROUP BY rental_id, week_of_year, year, user_id
ORDER BY year DESC, week_of_year DESC;

-- Grant necessary permissions
GRANT SELECT ON rental_toll_weekly_summary TO authenticated;

-- Add function to get toll statistics for a rental
CREATE OR REPLACE FUNCTION get_rental_toll_statistics(rental_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_notices', COUNT(*),
    'total_amount', COALESCE(SUM(total_amount), 0),
    'paid_notices', COUNT(*) FILTER (WHERE is_paid = true),
    'unpaid_notices', COUNT(*) FILTER (WHERE is_paid = false),
    'unpaid_amount', COALESCE(SUM(total_amount) FILTER (WHERE is_paid = false), 0),
    'admin_fees', COALESCE(SUM(admin_fee), 0),
    'toll_fees', COALESCE(SUM(toll_amount), 0),
    'unique_motorways', COUNT(DISTINCT motorway),
    'date_range', json_build_object(
      'earliest', MIN(issued_date),
      'latest', MAX(issued_date)
    )
  ) INTO result
  FROM rental_toll_notices
  WHERE rental_id = rental_uuid AND user_id = auth.uid();
  
  RETURN COALESCE(result, '{}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_rental_toll_statistics(UUID) TO authenticated; 