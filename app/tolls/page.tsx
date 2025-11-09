'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { TollNoticeDialog } from '@/components/ui/toll-notice-dialog';
import { tollService, type TollNotice } from '@/lib/toll-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TollStatistics {
  total_notices: number;
  total_amount: number;
  paid_notices: number;
  unpaid_notices: number;
  overdue_notices: number;
  unpaid_amount: number;
  overdue_amount?: number;
  admin_fees: number;
  toll_fees: number;
  unique_motorways: number;
  unique_vehicles: number;
}

type SortField = 'created_at' | 'licence_plate' | 'motorway' | 'issued_date' | 'total_amount' | 'is_paid';
type SortOrder = 'asc' | 'desc';

export default function TollsPage() {
  const { toast } = useToast();
  const [notices, setNotices] = useState<TollNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [stats, setStats] = useState<TollStatistics>({
    total_notices: 0,
    total_amount: 0,
    paid_notices: 0,
    unpaid_notices: 0,
    overdue_notices: 0,
    unpaid_amount: 0,
    admin_fees: 0,
    toll_fees: 0,
    unique_motorways: 0,
    unique_vehicles: 0,
  });
  const [needsMigration, setNeedsMigration] = useState(false);

  const fetchTollData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tolls/search?sortBy=${sortField}&sortOrder=${sortOrder}&licencePlate=${encodeURIComponent(searchTerm)}&status=${statusFilter}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch toll data');
      }

      const result = await response.json();
      
      if (result.success) {
        setNotices(result.notices || []);
        if (result.statistics) {
          setStats(result.statistics);
        }
        
        // Check if migration is needed
        if (result.needsMigration) {
          setNeedsMigration(true);
          toast({
            title: 'Database Setup Required',
            description: result.message || 'Please run the database migration to save toll notices.',
            variant: 'destructive',
          });
        } else {
          setNeedsMigration(false);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch toll data');
      }
    } catch (error) {
      console.error('Error fetching toll data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch toll notices. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTollData();
  }, [sortField, sortOrder]);

  // Apply client-side filtering for real-time search
  const filteredNotices = notices.filter(notice => {
    const matchesSearch = searchTerm === '' ||
      notice.licence_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.toll_notice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.motorway?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && notice.is_paid) ||
      (statusFilter === 'unpaid' && !notice.is_paid);

    return matchesSearch && matchesStatus;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="ml-1 h-3 w-3" /> : 
      <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const handleNoticesFound = async (newNotices: TollNotice[]) => {
    // Refresh the data from the database to get the latest notices
    await fetchTollData();
    toast({
      title: 'Toll Notices Found',
      description: `Found ${newNotices.length} new toll notices.`,
    });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const getStatusBadge = (notice: TollNotice) => {
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

  const handleRefreshData = async () => {
    await fetchTollData();
    toast({
      title: 'Data Refreshed',
      description: 'Toll notice data has been updated.',
    });
  };

  const handleExportData = () => {
    if (filteredNotices.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There are no toll notices to export.',
        variant: 'destructive',
      });
      return;
    }

    // Convert filtered notices to CSV
    const headers = ['Licence Plate', 'Notice Number', 'Motorway', 'Issued Date', 'Status', 'Admin Fee', 'Toll Amount', 'Total Amount', 'Due Date'];
    const csvContent = [
      headers.join(','),
      ...filteredNotices.map(notice => [
        notice.licence_plate,
        notice.toll_notice_number || '',
        notice.motorway,
        notice.issued_date,
        notice.is_paid ? 'Paid' : 'Unpaid',
        `$${notice.admin_fee.toFixed(2)}`,
        `$${notice.toll_amount.toFixed(2)}`,
        `$${notice.total_amount.toFixed(2)}`,
        notice.due_date
      ].join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `toll-notices-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: `Exported ${filteredNotices.length} toll notices to CSV.`,
    });
  };

  const handleMarkAsPaid = async (noticeId: string) => {
    try {
      // Here you would typically call an API to mark the notice as paid
      // For now, we'll just show a placeholder message
      toast({
        title: 'Feature Coming Soon',
        description: 'Mark as paid functionality will be implemented soon.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update toll notice status.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className='flex flex-col space-y-4 p-8'>
        <div className='flex items-center justify-between'>
          <div>
            <Skeleton className='h-8 w-48 mb-2' />
            <Skeleton className='h-4 w-96' />
          </div>
          <div className='flex space-x-2'>
            <Skeleton className='h-10 w-32' />
            <Skeleton className='h-10 w-24' />
          </div>
        </div>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-4' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-7 w-12 mb-1' />
                <Skeleton className='h-3 w-20' />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-4 p-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Toll Notices</h1>
          <p className='text-muted-foreground'>
            Manage and track toll notices for your vehicles
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <TollNoticeDialog 
            onNoticesFound={handleNoticesFound}
            trigger={
              <Button className='flex items-center space-x-2'>
                <Plus className='h-4 w-4' />
                <span>Check Toll Notices</span>
              </Button>
            }
          />
          <Button variant='outline' onClick={handleRefreshData}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
          <Button variant='outline' onClick={handleExportData}>
            <Download className='mr-2 h-4 w-4' />
            Export
          </Button>
        </div>
      </div>

      {/* Migration Alert */}
      {needsMigration && (
        <Alert variant="destructive">
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            <strong>Database Setup Required:</strong> The toll notices table hasn't been created yet. 
            Toll searches will work but data won't be saved permanently. To set up the database, run:{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-sm">node scripts/apply-toll-notices-migration.mjs</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Important Notice */}
      <Alert>
        <AlertTriangle className='h-4 w-4' />
        <AlertDescription>
          <strong>Important:</strong> Using toll notices to pay for toll travel is more expensive. Consider opening a toll account or buying a pass to avoid future notices. Visit the{' '}
          <a
            href='https://www.linkt.com.au/'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:underline inline-flex items-center'
          >
            Linkt portal
            <ExternalLink className='ml-1 h-3 w-3' />
          </a>{' '}
          for more information.
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Notices</CardTitle>
            <Receipt className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total_notices}</div>
            <p className='text-xs text-muted-foreground'>
              {stats.unique_vehicles} unique vehicles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Unpaid Amount</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              ${stats.unpaid_amount?.toFixed(2) || '0.00'}
            </div>
            <p className='text-xs text-muted-foreground'>
              {stats.unpaid_notices} unpaid notices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Overdue</CardTitle>
            <AlertTriangle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {stats.overdue_notices}
            </div>
            <p className='text-xs text-muted-foreground'>
              ${stats.overdue_amount?.toFixed(2) || '0.00'} overdue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Paid Notices</CardTitle>
            <CheckCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.paid_notices}
            </div>
            <p className='text-xs text-muted-foreground'>
              ${(stats.total_amount - stats.unpaid_amount)?.toFixed(2) || '0.00'} paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='flex-1'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by licence plate, notice number, or motorway...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-8'
            />
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <Filter className='h-4 w-4 text-muted-foreground' />
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='paid'>Paid</SelectItem>
              <SelectItem value='unpaid'>Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toll Notices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Toll Notices ({filteredNotices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotices.length === 0 ? (
            <div className='text-center py-8'>
              <Receipt className='mx-auto h-12 w-12 text-muted-foreground' />
              <h3 className='mt-2 text-sm font-semibold text-gray-900'>No toll notices</h3>
              <p className='mt-1 text-sm text-gray-500'>
                {notices.length === 0 
                  ? 'Get started by checking for toll notices.' 
                  : 'No notices match your current search and filter criteria.'
                }
              </p>
              {notices.length === 0 && (
                                 <div className='mt-6'>
                   <TollNoticeDialog 
                     onNoticesFound={handleNoticesFound}
                     trigger={
                       <Button>
                         <Plus className='mr-2 h-4 w-4' />
                         Check Toll Notices
                       </Button>
                     }
                   />
                 </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('licence_plate')}
                  >
                    <div className="flex items-center">
                      <Car className='mr-2 h-4 w-4' />
                      Licence Plate
                      {getSortIcon('licence_plate')}
                    </div>
                  </TableHead>
                  <TableHead>Notice Number</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('motorway')}
                  >
                    <div className="flex items-center">
                      <MapPin className='mr-2 h-4 w-4' />
                      Motorway
                      {getSortIcon('motorway')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('issued_date')}
                  >
                    <div className="flex items-center">
                      <Calendar className='mr-2 h-4 w-4' />
                      Issued Date
                      {getSortIcon('issued_date')}
                    </div>
                  </TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Admin Fee</TableHead>
                  <TableHead>Toll Amount</TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center">
                      Total Amount
                      {getSortIcon('total_amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('is_paid')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('is_paid')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotices.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell className='font-medium'>
                      <Badge variant='outline'>{notice.licence_plate}</Badge>
                    </TableCell>
                    <TableCell>{notice.toll_notice_number || '-'}</TableCell>
                    <TableCell>{notice.motorway}</TableCell>
                    <TableCell>{notice.issued_date}</TableCell>
                    <TableCell>{notice.due_date}</TableCell>
                    <TableCell>${notice.admin_fee.toFixed(2)}</TableCell>
                    <TableCell>${notice.toll_amount.toFixed(2)}</TableCell>
                    <TableCell className='font-medium'>
                      ${notice.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(notice)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <span className='sr-only'>Open menu</span>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {!notice.is_paid && (
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(notice.id)}>
                              <CreditCard className='mr-2 h-4 w-4' />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
