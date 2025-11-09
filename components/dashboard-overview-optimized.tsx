'use client';

import React, { memo, useMemo, lazy, Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Car,
  AlertTriangle,
  DollarSign,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Eye,
  MoreHorizontal,
  Zap,
  Shield,
  Activity,
} from 'lucide-react';

// Enhanced stat card component with modern design
const StatCard = memo(({ stat }: { stat: any }) => {
  const Icon = stat.icon;
  const isPositive = stat.changeType === 'positive';
  const isNeutral = stat.changeType === 'neutral';

  return (
    <Card className='group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 border-border/50'>
      {/* Background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
      
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-semibold text-muted-foreground tracking-wide uppercase'>
            {stat.title}
          </CardTitle>
          {stat.subtitle && (
            <p className='text-xs text-muted-foreground/70'>{stat.subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.iconBg} shadow-lg`}>
          <Icon className='h-5 w-5 text-white' />
        </div>
      </CardHeader>
      
      <CardContent className='space-y-3'>
        <div className='flex items-baseline gap-2'>
          <div className='text-3xl font-bold tracking-tight'>{stat.value}</div>
          {stat.unit && (
            <span className='text-sm font-medium text-muted-foreground'>{stat.unit}</span>
          )}
        </div>
        
        {stat.progress !== undefined && (
          <div className='space-y-2'>
            <div className='flex justify-between text-xs'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium'>{stat.progress}%</span>
            </div>
            <Progress value={stat.progress} className='h-2' />
          </div>
        )}
        
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1.5 text-sm'>
            {stat.change && !isNeutral && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                isPositive 
                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}>
                {isPositive ? (
                  <TrendingUp className='h-3 w-3' />
                ) : (
                  <TrendingDown className='h-3 w-3' />
                )}
                <span className='font-medium text-xs'>{stat.change}</span>
              </div>
            )}
            <span className='text-muted-foreground text-xs'>{stat.description}</span>
          </div>
          
          {stat.action && (
            <Button variant='ghost' size='sm' className='h-8 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity'>
              {stat.action}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Memoized alert item component
const AlertItem = memo(({ alert }: { alert: any }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className='flex items-start space-x-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50'>
      <div className='flex-shrink-0'>
        {alert.type === 'maintenance' ? (
          <Wrench className='h-5 w-5 text-orange-500' />
        ) : (
          <AlertTriangle className='h-5 w-5 text-red-500' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center space-x-2'>
          <h4 className='truncate text-sm font-medium'>{alert.title}</h4>
          <Badge
            variant='outline'
            className={`text-xs ${
              priorityColors[alert.priority as keyof typeof priorityColors]
            }`}
          >
            {alert.priority}
          </Badge>
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>
          {alert.description}
        </p>
        <div className='mt-2 flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>{alert.time}</span>
          <Button variant='outline' size='sm'>
            {alert.action}
          </Button>
        </div>
      </div>
    </div>
  );
});

AlertItem.displayName = 'AlertItem';

// Memoized activity item component
const ActivityItem = memo(({ activity }: { activity: any }) => {
  return (
    <div className='flex items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-accent/50'>
      <div className='flex-shrink-0'>
        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100'>
          <CheckCircle className='h-4 w-4 text-green-600' />
        </div>
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between'>
          <p className='truncate text-sm font-medium'>{activity.customer}</p>
          <span className='text-sm font-semibold text-green-600'>
            ${activity.amount.toLocaleString()}
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>{activity.vehicle}</p>
        <div className='flex justify-between text-xs text-muted-foreground'>
          <p>{activity.description}</p>
          <span>{new Date(activity.time).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

// Main dashboard component with enhanced data and modern design
export const DashboardOverview = memo(() => {
  const stats = useMemo(
    () => [
      {
        title: 'Total Fleet',
        subtitle: 'Active vehicles',
        value: '58',
        unit: 'vehicles',
        icon: Car,
        iconBg: 'from-blue-500 to-blue-600',
        description: 'vs last month',
        change: '+2',
        changeType: 'positive',
        progress: 85,
        action: 'View All',
      },
      {
        title: 'Active Rentals',
        subtitle: 'Currently rented',
        value: '42',
        unit: 'rentals',
        icon: Calendar,
        iconBg: 'from-green-500 to-green-600',
        description: 'vs last week',
        change: '+8',
        changeType: 'positive',
        progress: 72,
        action: 'Manage',
      },
      {
        title: 'Revenue',
        subtitle: 'This month',
        value: '$24,580',
        icon: DollarSign,
        iconBg: 'from-emerald-500 to-emerald-600',
        description: 'vs last month',
        change: '+12.5%',
        changeType: 'positive',
        action: 'Details',
      },
      {
        title: 'Alerts',
        subtitle: 'Require attention',
        value: '4',
        unit: 'items',
        icon: AlertTriangle,
        iconBg: 'from-red-500 to-red-600',
        description: 'overdue payments',
        change: '+1',
        changeType: 'negative',
        action: 'Review',
      },
      {
        title: 'Customers',
        subtitle: 'Total registered',
        value: '156',
        unit: 'customers',
        icon: Users,
        iconBg: 'from-purple-500 to-purple-600',
        description: 'this month',
        change: '+12',
        changeType: 'positive',
        progress: 78,
        action: 'View',
      },
      {
        title: 'Utilization',
        subtitle: 'Fleet efficiency',
        value: '89%',
        icon: Activity,
        iconBg: 'from-orange-500 to-orange-600',
        description: 'optimal range',
        change: '+3.2%',
        changeType: 'positive',
        progress: 89,
        action: 'Optimize',
      },
    ],
    []
  );

  const recentActivity = useMemo(
    () => [
      {
        id: '1',
        customer: 'John Doe',
        vehicle: 'Toyota Camry',
        time: new Date().toISOString(),
        amount: 450,
        description: 'Weekly rental payment',
      },
      {
        id: '2',
        customer: 'Jane Smith',
        vehicle: 'Honda Civic',
        time: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        amount: 320,
        description: 'Weekly rental payment',
      },
      {
        id: '3',
        customer: 'ACME Corp',
        vehicle: 'Ford Transit',
        time: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        amount: 850,
        description: 'Monthly corporate lease',
      },
    ],
    []
  );

  return (
    <div className='h-full w-full space-y-6'>
      {/* Stats Grid - Responsive and full width */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
        {stats.map((stat, index) => (
          <StatCard key={`${stat.title}-${index}`} stat={stat} />
        ))}
      </div>

      {/* Main Content Grid - Flexible layout */}
      <div className='grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100%-theme(space.6)-theme(space.24))]'>
        {/* Charts Section - Takes up more space */}
        <Card className='xl:col-span-3 group hover:shadow-lg transition-all duration-300'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-xl font-bold'>Revenue Analytics</CardTitle>
              <CardDescription className='text-base'>Daily revenue trends and performance metrics</CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
                <TrendingUp className='h-3 w-3 mr-1' />
                +12.5%
              </Badge>
              <Button variant='ghost' size='sm' className='opacity-0 group-hover:opacity-100 transition-opacity'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className='h-[300px] w-full rounded-lg' />}>
              <div className='relative h-[300px] w-full'>
                {/* Enhanced Chart Placeholder */}
                <div className='flex h-full w-full items-end gap-2 rounded-lg bg-gradient-to-t from-muted/20 to-transparent p-6'>
                  {[20, 45, 30, 50, 70, 40, 60, 35, 75, 55, 80, 65, 90, 45, 60].map(
                    (height, i) => (
                      <div
                        key={i}
                        className='flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t-sm transition-all duration-300 hover:from-primary/80 hover:to-primary/40'
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>
                {/* Chart overlay info */}
                <div className='absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border/50'>
                  <div className='text-sm font-medium'>Today</div>
                  <div className='text-2xl font-bold text-primary'>$1,247</div>
                  <div className='text-xs text-muted-foreground'>+8.2% from yesterday</div>
                </div>
              </div>
            </Suspense>
          </CardContent>
        </Card>

        {/* Activity Section - Takes up remaining space */}
        <Card className='xl:col-span-1 group hover:shadow-lg transition-all duration-300'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-lg font-bold'>Recent Activity</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Button variant='ghost' size='sm' className='opacity-0 group-hover:opacity-100 transition-opacity'>
              <Eye className='h-4 w-4' />
            </Button>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.length > 0 ? (
                recentActivity.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                /* Enhanced Empty State */
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4'>
                    <Activity className='h-8 w-8 text-muted-foreground' />
                  </div>
                  <h3 className='font-semibold text-lg mb-2'>No Recent Activity</h3>
                  <p className='text-muted-foreground text-sm mb-4 max-w-[200px]'>
                    When customers make payments or rentals are created, they'll appear here.
                  </p>
                  <Button size='sm' className='gap-2'>
                    <Plus className='h-4 w-4' />
                    Create Rental
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights Grid - Full width and responsive */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6'>
        {/* Quick Actions Card */}
        <Card className='group hover:shadow-lg transition-all duration-300'>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <Zap className='h-5 w-5 text-primary' />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Button variant='outline' className='w-full justify-start gap-2'>
              <Plus className='h-4 w-4' />
              New Rental
            </Button>
            <Button variant='outline' className='w-full justify-start gap-2'>
              <Users className='h-4 w-4' />
              Add Customer
            </Button>
            <Button variant='outline' className='w-full justify-start gap-2'>
              <Car className='h-4 w-4' />
              Add Vehicle
            </Button>
          </CardContent>
        </Card>

        {/* Fleet Status Card */}
        <Card className='group hover:shadow-lg transition-all duration-300'>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <Shield className='h-5 w-5 text-green-500' />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Available</span>
              <span className='font-semibold text-green-600'>16 vehicles</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Rented</span>
              <span className='font-semibold text-blue-600'>42 vehicles</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Maintenance</span>
              <span className='font-semibold text-orange-600'>3 vehicles</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className='group hover:shadow-lg transition-all duration-300'>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <Clock className='h-5 w-5 text-blue-500' />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Vehicle Returns</div>
              <div className='text-xs text-muted-foreground'>3 vehicles due today</div>
            </div>
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Maintenance</div>
              <div className='text-xs text-muted-foreground'>2 services scheduled</div>
            </div>
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Payments</div>
              <div className='text-xs text-muted-foreground'>5 due this week</div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className='group hover:shadow-lg transition-all duration-300'>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <TrendingUp className='h-5 w-5 text-emerald-500' />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Revenue Growth</span>
                <span className='font-semibold text-green-600'>+12.5%</span>
              </div>
              <Progress value={75} className='h-2' />
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Customer Satisfaction</span>
                <span className='font-semibold text-blue-600'>4.8/5</span>
              </div>
              <Progress value={96} className='h-2' />
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Fleet Utilization</span>
                <span className='font-semibold text-orange-600'>89%</span>
              </div>
              <Progress value={89} className='h-2' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

DashboardOverview.displayName = 'DashboardOverview';

export default DashboardOverview;