'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  Car,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewStat {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ElementType;
  description: string;
  rentals: number;
}

interface TopVehicle {
  make: string;
  model: string;
  rentals: number;
  revenue: number;
  utilization: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  rentals: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [overviewStats, setOverviewStats] = useState<OverviewStat[]>([]);
  const [topVehicles, setTopVehicles] = useState<TopVehicle[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportsData() {
      setLoading(true);
      try {
        // Try to use the RPC function first
        const { data, error } = await supabase.rpc('get_reports_data');

        if (error) {
          console.warn('RPC function not available, calculating data directly:', error.message);
          // Fallback: Calculate data directly from tables
          await fetchReportsDataFallback();
          return;
        }
        
        const { overviewStats: overview, topVehicles: top, monthlyData: monthly } = data;

        setOverviewStats([
          {
            title: 'Total Revenue',
            value: `$${overview.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: 'All time paid',
            rentals: 0,
          },
          {
            title: 'Active Rentals',
            value: overview.activeRentals.toString(),
            icon: Car,
            description: 'currently rented',
            rentals: overview.activeRentals,
          },
          {
            title: 'Fleet Utilization',
            value: `${overview.fleetUtilization.toFixed(1)}%`,
            icon: TrendingUp,
            description: 'of fleet is rented',
            rentals: 0,
          },
          {
            title: 'Total Customers',
            value: overview.totalCustomers.toString(),
            icon: Users,
            description: 'in the system',
            rentals: 0,
          }
        ]);

        setTopVehicles(top || []);
        setMonthlyData(monthly || []);
      } catch (error) {
        console.error('Error fetching reports data:', error);
        // Try fallback method
        try {
          await fetchReportsDataFallback();
        } catch (fallbackError) {
          console.error('Fallback data fetch also failed:', fallbackError);
          // Set empty data as final fallback
          setOverviewStats([
            {
              title: 'Total Revenue',
              value: '$0',
              icon: DollarSign,
              description: 'All time paid',
              rentals: 0,
            },
            {
              title: 'Active Rentals',
              value: '0',
              icon: Car,
              description: 'currently rented',
              rentals: 0,
            },
            {
              title: 'Fleet Utilization',
              value: '0.0%',
              icon: TrendingUp,
              description: 'of fleet is rented',
              rentals: 0,
            },
            {
              title: 'Total Customers',
              value: '0',
              icon: Users,
              description: 'in the system',
              rentals: 0,
            }
          ]);
          setTopVehicles([]);
          setMonthlyData([]);
        }
      } finally {
        setLoading(false);
      }
    }

    async function fetchReportsDataFallback() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        // Fetch overview statistics
        const [rentalsData, paymentsData, vehiclesData] = await Promise.all([
          supabase.from('rentals').select('*').eq('user_id', session.user.id),
          supabase.from('payments').select('*').eq('user_id', session.user.id),
          supabase.from('vehicles').select('*').eq('user_id', session.user.id)
        ]);

        const rentals = rentalsData.data || [];
        const payments = paymentsData.data || [];
        const vehicles = vehiclesData.data || [];

        // Calculate overview stats
        const totalRevenue = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const activeRentals = rentals.filter(r => r.status === 'active').length;
        const fleetUtilization = vehicles.length > 0 ? (activeRentals / vehicles.length) * 100 : 0;
        const totalCustomers = new Set(rentals.map(r => r.customer_id)).size;

        setOverviewStats([
          {
            title: 'Total Revenue',
            value: `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: 'All time paid',
            rentals: 0,
          },
          {
            title: 'Active Rentals',
            value: activeRentals.toString(),
            icon: Car,
            description: 'currently rented',
            rentals: activeRentals,
          },
          {
            title: 'Fleet Utilization',
            value: `${fleetUtilization.toFixed(1)}%`,
            icon: TrendingUp,
            description: 'of fleet is rented',
            rentals: 0,
          },
          {
            title: 'Total Customers',
            value: totalCustomers.toString(),
            icon: Users,
            description: 'in the system',
            rentals: 0,
          }
        ]);

        // Calculate top vehicles
        const vehicleStats = vehicles.map(vehicle => {
          const vehicleRentals = rentals.filter(r => r.vehicle_id === vehicle.id);
          const vehicleRevenue = vehicleRentals.reduce((sum, rental) => {
            const payment = payments.find(p => p.rental_id === rental.id && p.status === 'completed');
            return sum + (payment?.amount || 0);
          }, 0);
          const utilization = vehicleRentals.length > 0 ? Math.min(100, vehicleRentals.length * 10) : 0;

          return {
            make: vehicle.make || 'Unknown',
            model: vehicle.model || 'Unknown',
            rentals: vehicleRentals.length,
            revenue: vehicleRevenue,
            utilization: utilization
          };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        setTopVehicles(vehicleStats);

        // Generate monthly data (last 6 months)
        const monthlyStats = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthRentals = rentals.filter(r => {
            const startDate = new Date(r.start_date);
            return startDate >= monthStart && startDate <= monthEnd;
          });
          
          const monthRevenue = monthRentals.reduce((sum, rental) => {
            const payment = payments.find(p => p.rental_id === rental.id && p.status === 'completed');
            return sum + (payment?.amount || 0);
          }, 0);

          monthlyStats.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            rentals: monthRentals.length,
            revenue: monthRevenue
          });
        }

        setMonthlyData(monthlyStats);

      } catch (error) {
        console.error('Error in fallback data fetch:', error);
        // Set empty data as fallback
        setOverviewStats([
          {
            title: 'Total Revenue',
            value: '$0',
            icon: DollarSign,
            description: 'All time paid',
            rentals: 0,
          },
          {
            title: 'Active Rentals',
            value: '0',
            icon: Car,
            description: 'currently rented',
            rentals: 0,
          },
          {
            title: 'Fleet Utilization',
            value: '0.0%',
            icon: TrendingUp,
            description: 'of fleet is rented',
            rentals: 0,
          },
          {
            title: 'Total Customers',
            value: '0',
            icon: Users,
            description: 'in the system',
            rentals: 0,
          }
        ]);
        setTopVehicles([]);
        setMonthlyData([]);
      }
    }

    fetchReportsData().catch((error) => {
      console.error('Failed to fetch reports data:', error);
      // Ensure we have some fallback data even if everything fails
      setOverviewStats([
        {
          title: 'Total Revenue',
          value: '$0',
          icon: DollarSign,
          description: 'All time paid',
          rentals: 0,
        },
        {
          title: 'Active Rentals',
          value: '0',
          icon: Car,
          description: 'currently rented',
          rentals: 0,
        },
        {
          title: 'Fleet Utilization',
          value: '0.0%',
          icon: TrendingUp,
          description: 'of fleet is rented',
          rentals: 0,
        },
        {
          title: 'Total Customers',
          value: '0',
          icon: Users,
          description: 'in the system',
          rentals: 0,
        }
      ]);
      setTopVehicles([]);
      setMonthlyData([]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <div className='mb-6'>
          <Skeleton className='h-8 w-64 mb-2' />
          <Skeleton className='h-4 w-96' />
        </div>
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className='h-28' />
            ))}
          </div>
          <div className='grid gap-6 lg:grid-cols-2'>
            <Skeleton className='h-64' />
            <Skeleton className='h-64' />
          </div>
          <Skeleton className='h-80' />
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      <div className="px-6 lg:px-8 xl:px-12 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className='mb-6'>
            <h1 className='text-3xl font-bold tracking-tight'>Reports</h1>
            <p className='text-muted-foreground'>
              Comprehensive analytics and insights for your fleet
            </p>
          </div>
          <div className='space-y-6'>
        {/* Overview Stats */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {overviewStats.map(stat => (
            <Card key={stat.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {stat.title}
                </CardTitle>
                <stat.icon className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stat.value}</div>
                <div className='flex items-center space-x-1 text-xs text-muted-foreground'>
                  {stat.change && (
                    <span
                      className={`flex items-center ${
                        stat.changeType === 'positive'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className='h-3 w-3 mr-1' />
                      ) : (
                        <ArrowDownRight className='h-3 w-3 mr-1' />
                      )}
                      {stat.change}
                    </span>
                  )}
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BarChart3 className='h-5 w-5' />
                Monthly Revenue Trend
              </CardTitle>
              <CardDescription>
                Revenue and rental activity over the past months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {monthlyData.length > 0 ? monthlyData.map((data) => (
                  <div
                    key={data.month}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='w-12 text-sm font-medium'>
                        {data.month}
                      </div>
                      <div className='flex-1'>
                        <Progress
                          value={(data.revenue / Math.max(...monthlyData.map(d => d.revenue), 1)) * 100}
                          className='h-2'
                        />
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-medium'>
                        ${(data.revenue / 1000).toFixed(1)}k
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {data.rentals} payments
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No revenue data for the past 4 months.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Top Performing Vehicles
              </CardTitle>
              <CardDescription>
                Vehicles with highest revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {topVehicles.length > 0 ? topVehicles.map((vehicle, index) => (
                  <div
                    key={`${vehicle.make}-${vehicle.model}-${index}`}
                    className='flex items-center justify-between p-3 rounded-lg border'
                  >
                    <div className='flex items-center space-x-3'>
                      <Badge variant='outline'>#{index + 1}</Badge>
                      <div>
                        <p className='text-sm font-medium'>
                          {vehicle.make} {vehicle.model}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {vehicle.rentals} rentals
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-medium'>
                        ${vehicle.revenue.toLocaleString()}
                      </p>
                      <div className='flex items-center space-x-1 justify-end'>
                        <Progress
                          value={vehicle.utilization}
                          className='h-1 w-12'
                        />
                        <span className='text-xs text-muted-foreground'>
                          {vehicle.utilization}%
                        </span>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No vehicle performance data available.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Fleet Utilization Report */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle>Fleet Utilization Report</CardTitle>
              <CardDescription>
                Detailed breakdown of vehicle usage and performance metrics
              </CardDescription>
            </div>
            <div className='flex space-x-2'>
              <Button variant='outline' size='sm'>
                <Filter className='h-4 w-4 mr-2' />
                Filter
              </Button>
              <Button variant='outline' size='sm'>
                <Download className='h-4 w-4 mr-2' />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topVehicles.length > 0 ? topVehicles.slice(0, 5).map((vehicle, index) => (
                  <TableRow key={`${vehicle.make}-${vehicle.model}-${index}`}>
                    <TableCell className='font-medium'>
                      {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell>
                      <Badge variant='secondary'>N/A</Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <Progress
                          value={vehicle.utilization}
                          className='h-2 w-16'
                        />
                        <span className='text-sm'>
                          {vehicle.utilization}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>${vehicle.revenue.toLocaleString()}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      N/A
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No data to display.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
