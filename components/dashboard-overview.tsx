'use client';

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
  Car,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  MapPin,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from 'lucide-react';

const overviewStats = [
  {
    title: 'Total Vehicles',
    value: '247',
    change: '+12',
    changeType: 'positive' as const,
    icon: Car,
    description: 'Active fleet vehicles',
  },

  {
    title: 'Pending Fines',
    value: '7',
    change: '-2',
    changeType: 'negative' as const,
    icon: AlertTriangle,
    description: 'Requiring attention',
  },
  {
    title: 'Revenue This Week',
    value: '$31,863',
    change: '+12.5%',
    changeType: 'positive' as const,
    icon: DollarSign,
    description: 'vs last week',
  },
];

const alerts = [
  {
    id: 1,
    type: 'maintenance',
    priority: 'high',
    title: 'Urgent Maintenance Required',
    description: 'Toyota Camry (NSW-123) has exceeded service interval',
    time: '2 hours ago',
    action: 'Schedule Service',
  },
  {
    id: 2,
    type: 'fine',
    priority: 'medium',
    title: 'Traffic Fine Received',
    description: 'Speed camera fine for Honda Civic (NSW-456) - $150',
    time: '4 hours ago',
    action: 'Review Fine',
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'payment',
    customer: 'Sarah Johnson',
    vehicle: 'Honda Accord (NSW-456)',
    time: '15 minutes ago',
    amount: '$560',
    description: 'Rental payment received',
  },
  {
    id: 2,
    type: 'payment',
    customer: 'Michael Chen',
    vehicle: 'Ford Focus (NSW-789)',
    time: '45 minutes ago',
    amount: '$490',
    description: 'Rental payment received',
  },
  {
    id: 3,
    type: 'payment',
    customer: 'Emma Wilson',
    vehicle: 'Mazda CX-5 (NSW-101)',
    time: '1 hour ago',
    amount: '$630',
    description: 'Rental payment received',
  },
  {
    id: 4,
    type: 'maintenance',
    customer: 'John Smith',
    vehicle: 'Toyota Camry (NSW-123)',
    time: '2 hours ago',
    location: 'Sydney CBD',
    description: 'Maintenance scheduled',
  },
];

export function DashboardOverview() {
  return (
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
                <span
                  className={`flex items-center ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className='h-3 w-3 mr-1' />
                  ) : (
                    <ArrowDownRight className='h-3 w-3 mr-1' />
                  )}
                  {stat.change}
                </span>
                <span>{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5' />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>
              Important items requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {alerts.map(alert => (
              <div
                key={alert.id}
                className='flex items-start space-x-3 p-3 rounded-lg border'
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    alert.priority === 'high'
                      ? 'bg-red-500'
                      : alert.priority === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                />
                <div className='flex-1 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium'>{alert.title}</p>
                    <Badge
                      variant={
                        alert.priority === 'high'
                          ? 'destructive'
                          : alert.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {alert.priority}
                    </Badge>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {alert.description}
                  </p>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-muted-foreground'>
                      {alert.time}
                    </span>
                    <Button size='sm' variant='outline'>
                      {alert.action}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock className='h-5 w-5' />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest fleet operations and customer interactions
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {recentActivity.map(activity => (
              <div
                key={activity.id}
                className='flex items-start space-x-3 p-3 rounded-lg border'
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'payment'
                      ? 'bg-green-50 text-green-600'
                      : activity.type === 'maintenance'
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {activity.type === 'payment' ? (
                    <CheckCircle className='h-4 w-4' />
                  ) : activity.type === 'maintenance' ? (
                    <Wrench className='h-4 w-4' />
                  ) : (
                    <AlertTriangle className='h-4 w-4' />
                  )}
                </div>
                <div className='flex-1 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium'>
                      {activity.type === 'payment'
                        ? 'Payment Received'
                        : activity.type === 'maintenance'
                          ? 'Maintenance Scheduled'
                          : 'Alert'}
                    </p>
                    <span className='text-xs text-muted-foreground'>
                      {activity.time}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {activity.customer && `${activity.customer} - `}
                    {activity.vehicle}
                  </p>
                  <div className='flex items-center justify-between'>
                    <p className='text-xs text-muted-foreground'>
                      {activity.description}
                    </p>
                    {activity.type === 'payment' && (
                      <span className='text-sm font-medium text-green-600'>
                        {activity.amount}
                      </span>
                    )}
                    {activity.type === 'maintenance' && activity.location && (
                      <div className='flex items-center text-xs text-muted-foreground'>
                        <MapPin className='h-3 w-3 mr-1' />
                        {activity.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Status Overview</CardTitle>
          <CardDescription>
            Current status and utilization of your vehicle fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6 md:grid-cols-3'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>Available Vehicles</span>
                <span className='text-sm text-muted-foreground'>158/247</span>
              </div>
              <Progress value={64} className='h-2' />
              <p className='text-xs text-muted-foreground'>
                64% of fleet available
              </p>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>
                  Maintenance Required
                </span>
                <span className='text-sm text-muted-foreground'>12/247</span>
              </div>
              <Progress value={5} className='h-2' />
              <p className='text-xs text-muted-foreground'>
                5% requiring maintenance
              </p>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>Utilization Rate</span>
                <span className='text-sm text-muted-foreground'>89/247</span>
              </div>
              <Progress value={36} className='h-2' />
              <p className='text-xs text-muted-foreground'>
                36% currently rented
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
