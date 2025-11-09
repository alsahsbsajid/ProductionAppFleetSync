'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Download,
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Search,
  Car,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import { WeeklyPaymentChecker } from '@/components/weekly-payment-checker';
import type { User } from '@supabase/supabase-js';

import { PaymentService } from '@/lib/data-service';
import type { PaymentStatistics, RentalPayment } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function FleetPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentData, setPaymentData] = useState<RentalPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();
  const paymentService = new PaymentService(supabase);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  // Load payment data from service
  const loadPaymentData = async () => {
    setIsLoading(true);
    try {
      const response = await paymentService.getAllPayments();
      if (response.success && response.data) {
        setPaymentData(response.data);
      } else {
        console.error('Error loading payment data:', response.message);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadPaymentData();

    // Set up real-time subscription for payments
    const paymentSubscription = supabase
      .channel('payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Payment change received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setPaymentData(prev => [...prev, payload.new as RentalPayment]);
              break;
            case 'UPDATE':
              setPaymentData(prev => 
                prev.map(payment => 
                  payment.id === payload.new.id ? { ...payment, ...payload.new } : payment
                )
              );
              break;
            case 'DELETE':
              setPaymentData(prev => prev.filter(payment => payment.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      paymentSubscription.unsubscribe();
    };
  }, [user, supabase]);

  // Filter payments based on search and status
  const filteredPayments = paymentData.filter(payment => {
    const matchesSearch =
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.vehicleRegistration
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || payment.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle payment status update
  const handlePaymentUpdate = async (
    rentalId: string,
    newStatus: 'paid' | 'pending' | 'overdue'
  ) => {
    const response = await paymentService.updatePaymentStatus(
      rentalId,
      newStatus
    );
    if (response.success) {
      loadPaymentData(); // Refresh data after update
    } else {
      console.error('Failed to update payment status:', response.message);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    loadPaymentData();
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge
            variant='outline'
            className='bg-green-50 text-green-700 border-green-200'
          >
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge
            variant='outline'
            className='bg-yellow-50 text-yellow-700 border-yellow-200'
          >
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge
            variant='outline'
            className='bg-red-50 text-red-700 border-red-200'
          >
            Overdue
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  // Export payments to CSV
  const exportPayments = () => {
    const csvContent = [
      [
        'Vehicle',
        'Customer',
        'Company',
        'Amount',
        'Status',
        'Due Date',
        'Payment Method',
        'Paid Date',
        'Transaction ID',
      ].join(','),
      ...filteredPayments.map(payment =>
        [
          payment.vehicleRegistration,
          payment.customer,
          payment.company || '',
          payment.revenue,
          payment.paymentStatus,
          payment.paymentDueDate,
          payment.paymentMethod,
          payment.paidDate || '',
          payment.transactionId || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const [paymentStats, setPaymentStats] = useState<PaymentStatistics | null>(
    null
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await paymentService.getPaymentStatistics();
        if (response.success && response.data) {
          setPaymentStats(response.data);
        } else {
          console.error('Error fetching payment statistics:', response.message);
        }
      } catch (error) {
        console.error('Error fetching payment statistics:', error);
        // Optionally, set an error state here
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Fleet Payment Management
          </h1>
          <p className='text-muted-foreground'>
            Monitor and manage rental payments across your entire fleet
            {lastRefresh && (
              <span className='ml-2 text-xs'>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            onClick={handleRefresh}
            variant='outline'
            size='sm'
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={exportPayments}
            className='flex items-center gap-2'
          >
            <Download className='h-4 w-4' />
            Export Payments
          </Button>
        </div>
      </div>

      {/* Payment Statistics Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Payments
            </CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className='h-8 w-20' />
            ) : paymentStats ? (
              <React.Fragment>
                <div className='text-2xl font-bold'>
                  {paymentStats.total}
                </div>
                <p className='text-xs text-muted-foreground'>
                  ${paymentStats.totalAmount.toLocaleString()}
                </p>
              </React.Fragment>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Error loading stats
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Paid</CardTitle>
            {isLoadingStats ? (
              <Skeleton className='h-6 w-10' />
            ) : paymentStats ? (
              <Badge variant='default' className='bg-green-500'>
                {paymentStats.paid}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className='h-8 w-24 my-1' />
            ) : paymentStats ? (
              <React.Fragment>
                <div className='text-2xl font-bold text-green-600'>
                  ${paymentStats.paidAmount.toLocaleString()}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {paymentStats.collectionRate.toFixed(1)}% collection
                  rate
                </p>
              </React.Fragment>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Error loading stats
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pending</CardTitle>
            {isLoadingStats ? (
              <Skeleton className='h-6 w-12' />
            ) : paymentStats ? (
              <Badge
                variant='outline'
                className='border-orange-500 text-orange-500'
              >
                {paymentStats.pending}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className='h-8 w-24 my-1' />
            ) : paymentStats ? (
              <div className='text-2xl font-bold text-orange-600'>
                $
                {(
                  paymentStats.totalAmount -
                  paymentStats.paidAmount -
                  paymentStats.overdueAmount
                ).toLocaleString()}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Error loading stats
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              Awaiting payment
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Overdue</CardTitle>
            {isLoadingStats ? (
              <Skeleton className='h-6 w-12' />
            ) : paymentStats ? (
              <Badge variant='destructive'>{paymentStats.overdue}</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className='h-8 w-24 my-1' />
            ) : paymentStats ? (
              <div className='text-2xl font-bold text-red-600'>
                ${paymentStats.overdueAmount.toLocaleString()}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Error loading stats
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Payment Checker */}
      <WeeklyPaymentChecker
        rentals={paymentData}
        onPaymentUpdate={handlePaymentUpdate}
      />

      {/* Filters */}
      <Card className='rounded-xl shadow-sm'>
        <CardHeader>
          <CardTitle>Payment Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
                <Input
                  placeholder='Search by customer, company, or vehicle...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full md:w-48'>
                <SelectValue placeholder='Payment Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='paid'>Paid</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='overdue'>Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className='rounded-xl shadow-sm'>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <p className='text-sm text-muted-foreground'>
            Showing {filteredPayments.length} of {paymentData.length}{' '}
            payments
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rental Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(payment => {
                const dueDate = new Date(payment.paymentDueDate);
                const today = new Date();
                const isOverdue =
                  today > dueDate && payment.paymentStatus !== 'paid';
                const daysOverdue = isOverdue
                  ? Math.floor(
                      (today.getTime() - dueDate.getTime()) /
                        (24 * 60 * 60 * 1000)
                    )
                  : 0;

                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Car className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium'>
                            {payment.vehicleMake} {payment.vehicleModel}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {payment.vehicleRegistration}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <UserIcon className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium'>
                            {payment.customer}
                          </p>
                          {payment.company && (
                            <p className='text-sm text-muted-foreground'>
                              {payment.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Calendar className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='text-sm'>
                            {payment.startDate
                              ? new Date(
                                  payment.startDate
                                ).toLocaleDateString('en-US')
                              : 'N/A'}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            to{' '}
                            {payment.endDate
                              ? new Date(
                                  payment.endDate
                                ).toLocaleDateString('en-US')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <DollarSign className='h-4 w-4 text-muted-foreground' />
                        <span className='font-medium'>
                          ${payment.revenue}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p
                          className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}
                        >
                          {dueDate.toLocaleDateString('en-US')}
                        </p>
                        {isOverdue && (
                          <p className='text-xs text-red-500'>
                            {daysOverdue} days overdue
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      <span className='text-sm'>
                        {payment.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        {payment.paymentStatus !== 'paid' && (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              handlePaymentUpdate(payment.id, 'paid')
                            }
                          >
                            Mark Paid
                          </Button>
                        )}
                        {payment.paymentStatus === 'paid' &&
                          payment.paidDate && (
                            <span className='text-xs text-green-600'>
                              Paid:{' '}
                              {new Date(
                                payment.paidDate
                              ).toLocaleDateString('en-US')}
                            </span>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
