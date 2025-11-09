-- Migration: Add get_reports_data function for reports page
-- This function provides comprehensive reporting data for the authenticated user

CREATE OR REPLACE FUNCTION public.get_reports_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  overview_stats JSON;
  top_vehicles JSON;
  monthly_data JSON;
  result JSON;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate overview statistics
  WITH stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_revenue,
      COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rentals,
      COUNT(CASE WHEN r.status = 'upcoming' OR r.status = 'confirmed' THEN 1 END) as upcoming_rentals,
      COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rentals,
      COUNT(DISTINCT v.id) as total_vehicles,
      COUNT(CASE WHEN v.status = 'available' THEN 1 END) as available_vehicles
    FROM public.rentals r
    LEFT JOIN public.payments p ON r.id = p.rental_id
    LEFT JOIN public.vehicles v ON r.vehicle_id = v.id
    WHERE r.user_id = current_user_id
  )
  SELECT json_build_object(
    'totalRevenue', total_revenue,
    'activeRentals', active_rentals,
    'upcomingRentals', upcoming_rentals,
    'completedRentals', completed_rentals,
    'totalVehicles', total_vehicles,
    'availableVehicles', available_vehicles
  ) INTO overview_stats
  FROM stats;

  -- Get top performing vehicles
  WITH vehicle_stats AS (
    SELECT 
      v.id,
      v.make,
      v.model,
      v.year,
      v.license_plate,
      COUNT(r.id) as rental_count,
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as revenue,
      ROUND(AVG(CASE WHEN r.status = 'completed' THEN 
        EXTRACT(EPOCH FROM (r.end_date::timestamp - r.start_date::timestamp)) / 86400 
        ELSE NULL END), 1) as avg_rental_days
    FROM public.vehicles v
    LEFT JOIN public.rentals r ON v.id = r.vehicle_id AND r.user_id = current_user_id
    LEFT JOIN public.payments p ON r.id = p.rental_id
    WHERE v.user_id = current_user_id
    GROUP BY v.id, v.make, v.model, v.year, v.license_plate
    ORDER BY revenue DESC, rental_count DESC
    LIMIT 10
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', make || ' ' || model || ' (' || year || ')',
      'registration', license_plate,
      'rentals', rental_count,
      'revenue', revenue,
      'avgDays', COALESCE(avg_rental_days, 0)
    )
  ) INTO top_vehicles
  FROM vehicle_stats;

  -- Get monthly data for the last 12 months
  WITH monthly_stats AS (
    SELECT 
      TO_CHAR(date_trunc('month', r.start_date), 'Mon YYYY') as month,
      EXTRACT(MONTH FROM r.start_date) as month_num,
      EXTRACT(YEAR FROM r.start_date) as year_num,
      COUNT(r.id) as rentals,
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as revenue
    FROM public.rentals r
    LEFT JOIN public.payments p ON r.id = p.rental_id
    WHERE r.user_id = current_user_id
      AND r.start_date >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
    GROUP BY date_trunc('month', r.start_date), month_num, year_num
    ORDER BY year_num, month_num
  )
  SELECT json_agg(
    json_build_object(
      'month', month,
      'rentals', rentals,
      'revenue', revenue
    )
  ) INTO monthly_data
  FROM monthly_stats;

  -- Combine all data into final result
  SELECT json_build_object(
    'overviewStats', COALESCE(overview_stats, '{}'::json),
    'topVehicles', COALESCE(top_vehicles, '[]'::json),
    'monthlyData', COALESCE(monthly_data, '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_reports_data() TO authenticated;

-- Add RLS policy comment
COMMENT ON FUNCTION public.get_reports_data() IS 'Returns comprehensive reporting data for the authenticated user including overview stats, top vehicles, and monthly trends';