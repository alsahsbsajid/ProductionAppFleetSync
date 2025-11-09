-- Add get_payment_statistics function
-- This function calculates payment statistics for the authenticated user

CREATE OR REPLACE FUNCTION public.get_payment_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  total_payments INTEGER := 0;
  paid_payments INTEGER := 0;
  pending_payments INTEGER := 0;
  overdue_payments INTEGER := 0;
  total_amount DECIMAL(10,2) := 0;
  paid_amount DECIMAL(10,2) := 0;
  overdue_amount DECIMAL(10,2) := 0;
  collection_rate DECIMAL(5,2) := 0;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate payment statistics from payments table
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN status = 'completed' THEN 1 END),
    COUNT(CASE WHEN status = 'pending' THEN 1 END),
    COUNT(CASE WHEN status = 'failed' OR (payment_date < NOW() - INTERVAL '30 days' AND status = 'pending') THEN 1 END),
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'failed' OR (payment_date < NOW() - INTERVAL '30 days' AND status = 'pending') THEN amount ELSE 0 END), 0)
  INTO 
    total_payments,
    paid_payments,
    pending_payments,
    overdue_payments,
    total_amount,
    paid_amount,
    overdue_amount
  FROM public.payments
  WHERE user_id = current_user_id;

  -- Also include rental payment status
  SELECT 
    total_payments + COUNT(*),
    paid_payments + COUNT(CASE WHEN payment_status = 'paid' THEN 1 END),
    pending_payments + COUNT(CASE WHEN payment_status = 'pending' THEN 1 END),
    overdue_payments + COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END),
    total_amount + COALESCE(SUM(total_amount), 0),
    paid_amount + COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0),
    overdue_amount + COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN total_amount ELSE 0 END), 0)
  INTO 
    total_payments,
    paid_payments,
    pending_payments,
    overdue_payments,
    total_amount,
    paid_amount,
    overdue_amount
  FROM public.rentals
  WHERE user_id = current_user_id;

  -- Calculate collection rate
  IF total_amount > 0 THEN
    collection_rate := ROUND((paid_amount / total_amount) * 100, 2);
  END IF;

  -- Return JSON object with statistics
  RETURN json_build_object(
    'total_payments', total_payments,
    'paid_payments', paid_payments,
    'pending_payments', pending_payments,
    'overdue_payments', overdue_payments,
    'total_amount', total_amount,
    'paid_amount', paid_amount,
    'overdue_amount', overdue_amount,
    'collection_rate', collection_rate
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_payment_statistics() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_payment_statistics() IS 'Returns payment statistics for the authenticated user including totals, amounts, and collection rate';