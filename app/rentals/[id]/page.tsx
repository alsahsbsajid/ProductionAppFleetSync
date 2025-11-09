'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  MoreHorizontal,
  Receipt,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  CreditCard,
  Calendar,
  MapPin,
  DollarSign,
  Car,
  Download,
  RefreshCw,
  Plus,
  XCircle,
  ArrowLeft,
  User,
  Clock,
  Edit,
  Trash2,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { RentalService } from '@/lib/data-service';
import { getSyncService } from '@/lib/sync-service';
import { tollService, type TollNotice, type TollSearchParams } from '@/lib/toll-service';
import { useAuth } from '@/hooks/use-auth';
import { TollNoticeDialog } from '@/components/ui/toll-notice-dialog';
import type { Rental, Vehicle, Customer } from '@/lib/types';
import { logger } from '@/lib/logger';

// Extended TollNotice for rental tracking
interface RentalTollNotice extends TollNotice {
  rentalId: string;
  weekOfYear: number;
  year: number;
  createdAt: string;
  syncedAt: string;
}

// Weekly toll summary
interface WeeklyTollSummary {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  totalTolls: number;
  totalAmount: number;
  adminFees: number;
  unpaidCount: number;
  paidCount: number;
  notices: RentalTollNotice[];
}

export default function RentalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();
  const rentalService = useMemo(() => new RentalService(supabase), [supabase]);
  const syncService = useMemo(() => getSyncService(supabase), [supabase]);
  
  const rentalId = params.id as string;

  // State management
  const [rental, setRental] = useState<Rental | null>(null);
  const [tollNotices, setTollNotices] = useState<RentalTollNotice[]>([]);
  const [weeklyTollSummaries, setWeeklyTollSummaries] = useState<WeeklyTollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tollLoading, setTollLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [isSearchingTolls, setIsSearchingTolls] = useState(false);

  // Fetch rental details
  const fetchRentalDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await rentalService.getRentalById(rentalId);
      
      if (response.success && response.data) {
        setRental(response.data);
        // Load toll data for this rental
        await fetchTollNoticesForRental(response.data);
      } else {
        setError(response.message || 'Failed to load rental details');
      }
    } catch (error) {
      console.error('Error fetching rental details:', error);
      setError('Failed to load rental details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch toll notices for the rental
  const fetchTollNoticesForRental = async (rentalData: Rental) => {
    if (!rentalData.vehicle?.registration) {
      console.warn('No vehicle registration found for rental');
      return;
    }

    try {
      setTollLoading(true);
      
      // First, get existing toll notices from Supabase
      const existingNotices = await getRentalTollNoticesFromDB(rentalId);
      setTollNotices(existingNotices);
      generateWeeklySummaries(existingNotices);
      
      // Search for new toll notices
      await searchAndSyncTollNotices(rentalData.vehicle.registration, rentalData);
      
    } catch (error) {
      console.error('Error fetching toll notices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load toll notices',
        variant: 'destructive',
      });
    } finally {
      setTollLoading(false);
    }
  };

  // Get existing toll notices from database
  const getRentalTollNoticesFromDB = async (rentalId: string): Promise<RentalTollNotice[]> => {
    try {
      const { data, error } = await supabase
        .from('rental_toll_notices')
        .select('*')
        .eq('rental_id', rentalId)
        .order('issued_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(notice => ({
        id: notice.id,
        rentalId: notice.rental_id,
        licence_plate: notice.licence_plate,
        state: notice.state,
        toll_notice_number: notice.toll_notice_number,
        motorway: notice.motorway,
        issued_date: notice.issued_date,
        trip_status: notice.trip_status,
        admin_fee: notice.admin_fee,
        toll_amount: notice.toll_amount,
        total_amount: notice.total_amount,
        due_date: notice.due_date,
        is_paid: notice.is_paid,
        vehicle_type: notice.vehicle_type,
        weekOfYear: notice.week_of_year,
        year: notice.year,
        createdAt: notice.created_at,
        syncedAt: notice.synced_at,
        user_id: notice.user_id
      }));
    } catch (error) {
      console.error('Error fetching rental toll notices:', error);
      return [];
    }
  };

  // Handle new toll notices found through manual search
  const handleNewTollNoticesFound = async (newNotices: TollNotice[]) => {
    if (!rental) return;
    
    try {
      // Filter notices that are within the rental period
      const rentalStart = new Date(rental.startDate);
      const rentalEnd = new Date(rental.endDate);
      
      const relevantNotices = newNotices.filter(notice => {
        const noticeDate = new Date(notice.issued_date);
        return noticeDate >= rentalStart && noticeDate <= rentalEnd;
      });
      
      if (relevantNotices.length === 0) {
        toast({
          title: 'No Relevant Notices',
          description: 'No toll notices found within the rental period.',
        });
        return;
      }
      
      // Save to database and update state
      await saveNewTollNoticesToDB(relevantNotices, rental);
      
      // Refresh the toll notices display
      const updatedNotices = await getRentalTollNoticesFromDB(rentalId);
      setTollNotices(updatedNotices);
      generateWeeklySummaries(updatedNotices);
      
      toast({
        title: 'Toll Notices Added',
        description: `Added ${relevantNotices.length} toll notices to this rental.`,
      });
      
    } catch (error) {
      console.error('Error handling new toll notices:', error);
      toast({
        title: 'Error',
        description: 'Failed to add new toll notices.',
        variant: 'destructive',
      });
    }
  };

  // Search and sync new toll notices
  const searchAndSyncTollNotices = async (licencePlate: string, rentalData: Rental) => {
    // Prevent multiple concurrent searches
    if (isSearchingTolls) {
      logger.info('Toll search already in progress, skipping duplicate request', { licencePlate });
      return;
    }

    setIsSearchingTolls(true);
    
    try {
      // Search for toll notices using the toll service
      const searchParams: TollSearchParams = {
        licencePlate: licencePlate,
        state: 'NSW', // Default to NSW, could be made configurable
      };

      logger.info('Starting toll notice search', { licencePlate, rentalId });
      const searchResult = await tollService.searchTollNotices(searchParams);
      
      if (searchResult.success && searchResult.notices.length > 0) {
        // Filter notices that fall within the rental period
        const rentalStart = new Date(rentalData.startDate);
        const rentalEnd = new Date(rentalData.endDate);
        
        const rentalTollNotices = searchResult.notices.filter(notice => {
          const noticeDate = new Date(notice.issued_date);
          return noticeDate >= rentalStart && noticeDate <= rentalEnd;
        });

        if (rentalTollNotices.length > 0) {
          // Save new notices to database
          await saveNewTollNoticesToDB(rentalTollNotices, rentalData);
          
          // Refresh the toll notices
          const updatedNotices = await getRentalTollNoticesFromDB(rentalId);
          setTollNotices(updatedNotices);
          generateWeeklySummaries(updatedNotices);
          
          toast({
            title: 'Toll Notices Updated',
            description: `Found ${rentalTollNotices.length} toll notices for this rental period.`,
          });
        } else {
          toast({
            title: 'No New Toll Notices',
            description: 'No toll notices found for this rental period.',
          });
        }
      } else if (searchResult.success && searchResult.notices.length === 0) {
        toast({
          title: 'No Toll Notices Found',
          description: 'No toll notices found for this license plate.',
        });
      } else {
        throw new Error(searchResult.error || 'Failed to search toll notices');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error searching toll notices', { error: errorMessage, licencePlate, rentalId });
      
      toast({
        title: 'Search Error',
        description: `Failed to search for toll notices: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsSearchingTolls(false);
    }
  };

  // Save new toll notices to database
  const saveNewTollNoticesToDB = async (notices: TollNotice[], rentalData: Rental) => {
    try {
      const rentalTollNotices = notices.map(notice => {
        const noticeDate = new Date(notice.issued_date);
        const weekOfYear = getWeekOfYear(noticeDate);
        
        return {
          rental_id: rentalId,
          licence_plate: notice.licence_plate,
          state: notice.state,
          toll_notice_number: notice.toll_notice_number,
          motorway: notice.motorway,
          issued_date: notice.issued_date,
          trip_status: notice.trip_status,
          admin_fee: notice.admin_fee,
          toll_amount: notice.toll_amount,
          total_amount: notice.total_amount,
          due_date: notice.due_date,
          is_paid: notice.is_paid,
          vehicle_type: notice.vehicle_type || 'car',
          week_of_year: weekOfYear,
          year: noticeDate.getFullYear(),
          synced_at: new Date().toISOString(),
          user_id: user?.id,
        };
      });

      const { error } = await supabase
        .from('rental_toll_notices')
        .upsert(rentalTollNotices, {
          onConflict: 'toll_notice_number,rental_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving toll notices to DB:', error);
      throw error;
    }
  };

  // Generate weekly summaries
  const generateWeeklySummaries = (notices: RentalTollNotice[]) => {
    const weeklyMap = new Map<string, WeeklyTollSummary>();

    notices.forEach(notice => {
      const key = `${notice.year}-${notice.weekOfYear}`;
      
      if (!weeklyMap.has(key)) {
        const { startDate, endDate } = getWeekDates(notice.year, notice.weekOfYear);
        weeklyMap.set(key, {
          weekNumber: notice.weekOfYear,
          year: notice.year,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalTolls: 0,
          totalAmount: 0,
          adminFees: 0,
          unpaidCount: 0,
          paidCount: 0,
          notices: [],
        });
      }

      const summary = weeklyMap.get(key)!;
      summary.totalTolls++;
      summary.totalAmount += notice.total_amount;
      summary.adminFees += notice.admin_fee;
      summary.notices.push(notice);
      
      if (notice.is_paid) {
        summary.paidCount++;
      } else {
        summary.unpaidCount++;
      }
    });

    const summaries = Array.from(weeklyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });

    setWeeklyTollSummaries(summaries);
  };

  // Helper function to get week of year
  const getWeekOfYear = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Helper function to get week start and end dates
  const getWeekDates = (year: number, weekNumber: number): { startDate: Date; endDate: Date } => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (weekNumber - 1) * 7 - firstDayOfYear.getDay();
    const startDate = new Date(year, 0, 1 + daysToAdd);
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  };

  // Mark toll notice as paid
  const handleMarkAsPaid = async (noticeId: string) => {
    try {
      const { error } = await supabase
        .from('rental_toll_notices')
        .update({ 
          is_paid: true, 
          trip_status: 'Paid',
          synced_at: new Date().toISOString()
        })
        .eq('id', noticeId);

      if (error) throw error;

      // Update local state
      setTollNotices(prev => 
        prev.map(notice => 
          notice.id === noticeId 
            ? { ...notice, isPaid: true, tripStatus: 'Paid' }
            : notice
        )
      );

      // Regenerate weekly summaries
      const updatedNotices = tollNotices.map(notice => 
        notice.id === noticeId 
          ? { ...notice, is_paid: true, trip_status: 'Paid' }
          : notice
      );
      generateWeeklySummaries(updatedNotices);

      toast({
        title: 'Success',
        description: 'Toll notice marked as paid',
      });
    } catch (error) {
      console.error('Error marking toll notice as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update toll notice',
        variant: 'destructive',
      });
    }
  };

  // Refresh toll data
  const handleRefreshTollData = async () => {
    if (rental) {
      await fetchTollNoticesForRental(rental);
    }
  };

  // Export toll data to CSV
  const handleExportTollData = () => {
    if (tollNotices.length === 0) {
      toast({
        title: 'No Data',
        description: 'No toll notices to export.',
      });
      return;
    }

    const csvContent = [
      'Rental ID,Vehicle Registration,Licence Plate,Notice Number,Motorway,Issued Date,Due Date,Admin Fee,Toll Amount,Total Amount,Status,Week of Year,Year',
      ...tollNotices.map(n => [
        rentalId,
        rental?.vehicle?.registration || '',
        n.licence_plate,
        n.toll_notice_number || '',
        n.motorway,
        n.issued_date,
        n.due_date,
        `$${n.admin_fee.toFixed(2)}`,
        `$${n.toll_amount.toFixed(2)}`,
        `$${n.total_amount.toFixed(2)}`,
        n.is_paid ? 'Paid' : 'Unpaid',
        n.weekOfYear,
        n.year,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rental-${rentalId}-toll-notices.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: 'Toll notices exported successfully.',
    });
  };

  // Filter toll notices
  const filteredTollNotices = tollNotices.filter(notice => {
    const matchesSearch =
      notice.licence_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.toll_notice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.motorway.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && notice.is_paid) ||
      (statusFilter === 'unpaid' && !notice.is_paid);

    const matchesWeek =
      selectedWeek === 'all' ||
      selectedWeek === `${notice.year}-${notice.weekOfYear}`;

    return matchesSearch && matchesStatus && matchesWeek;
  });

  // Get status badge
  const getStatusBadge = (notice: RentalTollNotice) => {
    const isOverdue = !notice.is_paid && new Date(notice.due_date) < new Date();

    if (notice.is_paid) {
      return (
        <Badge variant='outline' className='text-green-600 border-green-600'>
          <CheckCircle className='mr-1 h-3 w-3' /> Paid
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant='destructive'>
          <AlertTriangle className='mr-1 h-3 w-3' /> Overdue
        </Badge>
      );
    }
    return (
      <Badge variant='outline' className='text-yellow-600 border-yellow-600'>
        <AlertTriangle className='mr-1 h-3 w-3' /> Unpaid
      </Badge>
    );
  };

  // Calculate rental statistics
  const rentalStats = useMemo(() => {
    const totalTolls = tollNotices.length;
    const unpaidTolls = tollNotices.filter(n => !n.is_paid).length;
    const totalAmount = tollNotices.reduce((sum, n) => sum + n.total_amount, 0);
    const unpaidAmount = tollNotices.filter(n => !n.is_paid).reduce((sum, n) => sum + n.total_amount, 0);
    
    return {
      totalTolls,
      unpaidTolls,
      totalAmount,
      unpaidAmount,
      paidTolls: totalTolls - unpaidTolls,
    };
  }, [tollNotices]);

  // Load data on component mount
  useEffect(() => {
    const loadRentalData = async () => {
      if (rentalId && user) {
        try {
          await fetchRentalDetails();
        } catch (error) {
          // This catch will handle any unhandled promise rejections from fetchRentalDetails
          logger.error('Error loading rental data in useEffect', { error, rentalId });
          console.error('Failed to load rental data:', error);
          // The error is already handled in fetchRentalDetails, but this prevents unhandled rejections
        }
      }
    };
    
    loadRentalData();
  }, [rentalId, user]);

  // Loading state
  if (loading) {
    return (
      <div className='container mx-auto px-4 py-6 space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-48' />
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <Skeleton className='h-40 w-full' />
            <Skeleton className='h-96 w-full' />
          </div>
          <div className='space-y-6'>
            <Skeleton className='h-32 w-full' />
            <Skeleton className='h-48 w-full' />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !rental) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            {error || 'Rental not found'}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/rentals')} 
          className='mt-4'
          variant='outline'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Rentals
        </Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button 
            onClick={() => router.push('/rentals')} 
            variant='outline'
            size='icon'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Rental Details</h1>
            <p className='text-muted-foreground'>
              View rental information and toll notices
            </p>
          </div>
        </div>
        <div className='flex gap-2'>
          <TollNoticeDialog
            defaultLicencePlate={rental?.vehicle?.registration || ''}
            defaultState="NSW"
            onNoticesFound={handleNewTollNoticesFound}
            trigger={
              <Button variant='outline'>
                <Receipt className='mr-2 h-4 w-4' />
                Check Toll Notices
              </Button>
            }
          />
          <Button 
            onClick={handleRefreshTollData}
            variant='outline'
            disabled={tollLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${tollLoading ? 'animate-spin' : ''}`} />
            Refresh Tolls
          </Button>
          <Button 
            onClick={handleExportTollData}
            variant='outline'
          >
            <Download className='mr-2 h-4 w-4' />
            Export
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Main Content */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Rental Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Car className='h-5 w-5' />
                Rental Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Vehicle</h4>
                  <p className='font-medium'>
                    {rental.vehicle?.make} {rental.vehicle?.model} ({rental.vehicle?.year})
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Registration: {rental.vehicle?.registration}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Customer</h4>
                  <p className='font-medium'>{rental.customer?.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {rental.customer?.email}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Rental Period</h4>
                  <p className='font-medium'>
                    {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                  </p>
                  <div className='text-sm text-muted-foreground'>
                    Status: <Badge variant={rental.status === 'active' ? 'default' : 'secondary'}>
                      {rental.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Total Amount</h4>
                  <p className='font-medium text-lg'>
                    ${rental.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              {rental.notes && (
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Notes</h4>
                  <p className='text-sm'>{rental.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Toll Notices */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2'>
                  <Receipt className='h-5 w-5' />
                  Toll Notices
                  {tollLoading && <RefreshCw className='h-4 w-4 animate-spin' />}
                </CardTitle>
                <div className='flex gap-2'>
                  <Input
                    placeholder='Search toll notices...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-64'
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='icon'>
                        <Filter className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        All Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('paid')}>
                        Paid Only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('unpaid')}>
                        Unpaid Only
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue='all' className='space-y-4'>
                <TabsList>
                  <TabsTrigger value='all'>All Tolls</TabsTrigger>
                  <TabsTrigger value='weekly'>Weekly Summary</TabsTrigger>
                </TabsList>
                
                <TabsContent value='all' className='space-y-4'>
                  {filteredTollNotices.length > 0 ? (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Notice Number</TableHead>
                            <TableHead>Motorway</TableHead>
                            <TableHead>Issued Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTollNotices.map((notice) => (
                            <TableRow key={notice.id}>
                              <TableCell className='font-mono text-sm'>
                                {notice.toll_notice_number || 'N/A'}
                              </TableCell>
                              <TableCell>{notice.motorway}</TableCell>
                              <TableCell>
                                {new Date(notice.issued_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className='font-medium'>
                                ${notice.total_amount.toFixed(2)}
                                <div className='text-xs text-muted-foreground'>
                                  Toll: ${notice.toll_amount.toFixed(2)} + Admin: ${notice.admin_fee.toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(notice.due_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(notice)}
                              </TableCell>
                              <TableCell className='text-right'>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon'>
                                      <MoreHorizontal className='h-4 w-4' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align='end'>
                                    {!notice.is_paid && (
                                      <DropdownMenuItem
                                        onClick={() => handleMarkAsPaid(notice.id)}
                                      >
                                        <CheckCircle className='mr-2 h-4 w-4' />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>
                                      <ExternalLink className='mr-2 h-4 w-4' />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <Receipt className='mx-auto h-12 w-12 mb-4 opacity-50' />
                      <p>No toll notices found for this rental</p>
                      <p className='text-sm'>
                        {tollLoading ? 'Searching for toll notices...' : 'Try refreshing or check back later'}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value='weekly' className='space-y-4'>
                  {weeklyTollSummaries.length > 0 ? (
                    <div className='space-y-4'>
                      {weeklyTollSummaries.map((summary) => (
                        <Card key={`${summary.year}-${summary.weekNumber}`}>
                          <CardHeader className='pb-3'>
                            <div className='flex items-center justify-between'>
                              <CardTitle className='text-lg'>
                                Week {summary.weekNumber}, {summary.year}
                              </CardTitle>
                              <div className='text-sm text-muted-foreground'>
                                {summary.startDate} to {summary.endDate}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                              <div>
                                <p className='text-sm text-muted-foreground'>Total Tolls</p>
                                <p className='text-2xl font-bold'>{summary.totalTolls}</p>
                              </div>
                              <div>
                                <p className='text-sm text-muted-foreground'>Total Amount</p>
                                <p className='text-2xl font-bold'>${(summary.totalAmount || 0).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className='text-sm text-muted-foreground'>Paid</p>
                                <p className='text-2xl font-bold text-green-600'>{summary.paidCount}</p>
                              </div>
                              <div>
                                <p className='text-sm text-muted-foreground'>Unpaid</p>
                                <p className='text-2xl font-bold text-red-600'>{summary.unpaidCount}</p>
                              </div>
                            </div>
                            
                            {summary.notices.length > 0 && (
                              <div className='space-y-2'>
                                <h4 className='font-medium text-sm'>Notices This Week:</h4>
                                {summary.notices.map((notice) => (
                                  <div key={notice.id} className='flex items-center justify-between p-2 border rounded'>
                                    <div className='flex items-center gap-2'>
                                      <span className='font-mono text-sm'>{notice.toll_notice_number}</span>
                                      <span className='text-sm text-muted-foreground'>{notice.motorway}</span>
                                      {getStatusBadge(notice)}
                                    </div>
                                    <span className='font-medium'>${(notice.total_amount || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <Calendar className='mx-auto h-12 w-12 mb-4 opacity-50' />
                      <p>No weekly toll data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Toll Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Toll Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold'>{rentalStats.totalTolls}</p>
                  <p className='text-sm text-muted-foreground'>Total Tolls</p>
                </div>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-green-600'>{rentalStats.paidTolls}</p>
                  <p className='text-sm text-muted-foreground'>Paid</p>
                </div>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-red-600'>{rentalStats.unpaidTolls}</p>
                  <p className='text-sm text-muted-foreground'>Unpaid</p>
                </div>
                <div className='text-center'>
                  <p className='text-2xl font-bold'>${(rentalStats.totalAmount || 0).toFixed(2)}</p>
                  <p className='text-sm text-muted-foreground'>Total Amount</p>
                </div>
              </div>
              
              {(rentalStats.unpaidAmount || 0) > 0 && (
                <Alert>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    ${(rentalStats.unpaidAmount || 0).toFixed(2)} in unpaid tolls
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <Button 
                onClick={handleRefreshTollData}
                variant='outline' 
                className='w-full justify-start'
                disabled={tollLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${tollLoading ? 'animate-spin' : ''}`} />
                Refresh Toll Data
              </Button>
              
              <Button 
                variant='outline' 
                className='w-full justify-start'
                onClick={() => {
                  // Export functionality
                  toast({
                    title: 'Export Coming Soon',
                    description: 'Toll data export functionality will be available soon.',
                  });
                }}
              >
                <Download className='mr-2 h-4 w-4' />
                Export Toll Data
              </Button>
              
              <Button 
                variant='outline' 
                className='w-full justify-start'
                onClick={() => router.push(`/rentals/${rentalId}/edit`)}
              >
                <Edit className='mr-2 h-4 w-4' />
                Edit Rental
              </Button>
            </CardContent>
          </Card>

          {/* Week Filter */}
          {weeklyTollSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Filter by Week</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className='w-full p-2 border rounded'
                >
                  <option value='all'>All Weeks</option>
                  {weeklyTollSummaries.map((summary) => (
                    <option key={`${summary.year}-${summary.weekNumber}`} value={`${summary.year}-${summary.weekNumber}`}>
                      Week {summary.weekNumber}, {summary.year} ({summary.totalTolls} tolls)
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}