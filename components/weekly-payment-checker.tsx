'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { PaymentService } from '@/lib/data-service';
import { RentalPayment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface WeeklyPaymentCheckerProps {
  rentals: RentalPayment[];
  onPaymentUpdate?: (
    rentalId: string,
    status: 'paid' | 'pending' | 'overdue'
  ) => void;
}

export function WeeklyPaymentChecker({
  rentals,
  onPaymentUpdate,
}: WeeklyPaymentCheckerProps) {
  const [lastCheckDate, setLastCheckDate] = useState<Date | null>(null);
  const [paymentSummary, setPaymentSummary] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
    collectionRate: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [overduePayments, setOverduePayments] = useState<RentalPayment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<RentalPayment[]>([]);
  
  const supabase = createClient();
  const paymentService = new PaymentService(supabase);

  // Run weekly check on component mount and every hour
  useEffect(() => {
    runWeeklyCheck().catch((error) => {
      console.error('Failed to run initial weekly check:', error);
    });
    const interval = setInterval(() => {
      runWeeklyCheck().catch((error) => {
        console.error('Failed to run scheduled weekly check:', error);
      });
    }, 60 * 60 * 1000); // Every hour
    return () => clearInterval(interval);
  }, []); // Run only once on mount

  // Calculate payment summary using PaymentService
  const runWeeklyCheck = async () => {
    setIsChecking(true);
    try {
      const statsResponse = await paymentService.getPaymentStatistics();
      if (statsResponse.success && statsResponse.data) {
        setPaymentSummary(statsResponse.data);
      }
      
      const overdueResponse = await paymentService.checkOverduePayments();
      if (overdueResponse.success && overdueResponse.data) {
        setOverduePayments(overdueResponse.data);
      }

      const pendingResponse = await paymentService.getPendingPaymentsForFollowUp();
      if (pendingResponse.success && pendingResponse.data) {
        setPendingPayments(pendingResponse.data);
      }

      setLastCheckDate(new Date());
      console.log('Weekly payment check completed');
    } catch (error) {
      console.error('Error during weekly payment check:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Helper function to get payment status icon
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      case 'overdue':
        return <XCircle className='h-4 w-4 text-red-500' />;
      default:
        return <AlertTriangle className='h-4 w-4 text-gray-500' />;
    }
  };

  // Handle marking payment as paid
  const handleMarkAsPaid = (rentalId: string) => {
    if (onPaymentUpdate) {
      onPaymentUpdate(rentalId, 'paid');
    }
  };

  // Manual check function
  const handleManualCheck = () => {
    runWeeklyCheck();
  };

  // Get overdue and pending payments for alerts
  // These are now state variables updated in runWeeklyCheck

  return (
    <div className='space-y-6'>
      {/* Payment Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <DollarSign className='h-4 w-4' />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{paymentSummary.total}</div>
            <p className='text-xs text-muted-foreground'>
              ${paymentSummary.totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-500' />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {paymentSummary.paid}
            </div>
            <p className='text-xs text-muted-foreground'>Current</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Clock className='h-4 w-4 text-yellow-500' />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>
              {paymentSummary.pending}
            </div>
            <p className='text-xs text-muted-foreground'>Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-red-500' />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {paymentSummary.overdue}
            </div>
            <p className='text-xs text-muted-foreground'>
              ${paymentSummary.overdueAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Alerts */}
      {(overduePayments.length > 0 || pendingPayments.length > 0) && (
        <Alert className='border-orange-200 bg-orange-50'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            <div className='space-y-1'>
              {overduePayments.length > 0 && (
                <div className='text-red-700'>
                  <strong>{overduePayments.length} overdue payment(s)</strong> -
                  Total: $
                  {overduePayments
                    .reduce((sum, r) => sum + r.revenue, 0)
                    .toLocaleString()}
                </div>
              )}
              {pendingPayments.length > 0 && (
                <div className='text-yellow-700'>
                  <strong>{pendingPayments.length} pending payment(s)</strong> -
                  Total: $
                  {pendingPayments
                    .reduce((sum, r) => sum + r.revenue, 0)
                    .toLocaleString()}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Last Check Information */}
      <Card>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>
            Weekly Payment Check Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Last checked:</p>
              <p className='font-medium'>
                {lastCheckDate
                  ? lastCheckDate.toLocaleString('en-US')
                  : 'Never'}
              </p>
            </div>
            <Button
              onClick={handleManualCheck}
              variant='outline'
              size='sm'
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                  Checking...
                </>
              ) : (
                'Run Check Now'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
