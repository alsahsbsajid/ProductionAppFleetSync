'use client';

import { useState, useEffect, useMemo } from 'react';

// Removed global error handler - fixed at source in data-service.ts
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
import {
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  Car,
  DollarSign,
  Receipt,
  AlertTriangle,
  ExternalLink,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Zap,
  Plus,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { QuickRentalButton } from '@/components/ui/quick-rental-button';
import { TollNoticeDialog } from '@/components/ui/toll-notice-dialog';
import { Rental, TollNotice } from '@/lib/types';
import { RentalService } from '@/lib/data-service';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function getCurrentDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const rentalService = useMemo(() => new RentalService(supabase), [supabase]);
  const { date, time } = getCurrentDateTime();

  // Simplified error handling

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    const fetchRentals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await rentalService.getAllRentals();
        
        if (!isMounted || abortController.signal.aborted) return;
        
        if (response.success && response.data) {
          setRentals(response.data);
        } else {
          console.error('Failed to fetch rentals:', response.message);
          setError(response.message || 'Failed to load rentals');
        }
      } catch (error) {
        console.error('Error fetching rentals:', error);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to load rentals';
        setError(errorMessage);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Set up real-time subscription for rentals
    const setupRealtimeSubscription = () => {
      const channel = supabase
        .channel('rentals-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rentals'
          },
          (payload) => {
            console.log('Rental change detected:', payload);
            // Refetch data when changes occur
            if (isMounted && !abortController.signal.aborted) {
              fetchRentals();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchRentals();
    const unsubscribe = setupRealtimeSubscription();

    return () => {
      isMounted = false;
      abortController.abort();
      unsubscribe();
    };
  }, [rentalService, supabase]);

  // Add refresh function for manual data refresh
  const refreshRentals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await rentalService.getAllRentals();
      
      if (response.success && response.data) {
        setRentals(response.data);
        console.log(`Successfully loaded ${response.data.length} rentals`);
      } else {
        console.warn('Received invalid rental data:', response);
        setError(response.message || 'Failed to load rentals');
      }
    } catch (error) {
      console.error('Error refreshing rentals:', error);
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
          setError('Authentication error. Please log in again.');
        } else {
          setError(`Failed to load rentals: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };



  // Filter rentals based on search term and status filter
  const filteredRentals = rentals.filter(rental => {
    const matchesSearch =
      (rental.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rental.vehicle?.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rental.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rental.vehicle?.registration.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rental.customer?.company?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || rental.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className='bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100'>
            <Activity className='h-3 w-3 mr-1' />
            Active
          </Badge>
        );
      case 'completed':
        return (
          <Badge className='bg-green-100 text-green-700 border-green-200 hover:bg-green-100'>
            <CheckCircle className='h-3 w-3 mr-1' />
            Completed
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge className='bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100'>
            <Clock className='h-3 w-3 mr-1' />
            Upcoming
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className='bg-red-100 text-red-700 border-red-200 hover:bg-red-100'>
            <AlertTriangle className='h-3 w-3 mr-1' />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const handleViewDetails = (rentalId: string) => {
    // Navigate to rental details page
    window.location.href = `/rentals/${rentalId}`;
  };

  const handleExtendRental = async (rentalId: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) {
        toast({
          title: "Error",
          description: "Rental not found.",
          variant: "destructive",
        });
        return;
      }

      const newEndDate = prompt(
        `Current end date: ${rental.endDate}\nEnter new end date (YYYY-MM-DD):`,
        rental.endDate
      );
      
      if (newEndDate && newEndDate !== rental.endDate) {
        // Validate date format
         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
         if (!dateRegex.test(newEndDate)) {
           toast({
             title: "Invalid Date Format",
             description: "Please enter a valid date in YYYY-MM-DD format.",
             variant: "destructive",
           });
           return;
         }

         // Check if new date is after current end date
         if (new Date(newEndDate) <= new Date(rental.endDate)) {
           toast({
             title: "Invalid Date",
             description: "New end date must be after the current end date.",
             variant: "destructive",
           });
           return;
         }

         // Here you would call the API to update the rental
         console.log(`Extending rental ${rentalId} to ${newEndDate}`);
         toast({
           title: "Rental Extended",
           description: `Rental extended to ${newEndDate}. This would update the database in a production environment.`,
         });
        
        // Refresh the data
        await refreshRentals();
      }
    } catch (error) {
       console.error('Error extending rental:', error);
       toast({
         title: "Error",
         description: "Failed to extend rental. Please try again.",
         variant: "destructive",
       });
     }
  };

  const handleCompleteRental = async (rentalId: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
       if (!rental) {
         toast({
           title: "Error",
           description: "Rental not found.",
           variant: "destructive",
         });
         return;
       }

       if (rental.status === 'completed') {
         toast({
           title: "Already Completed",
           description: "This rental is already completed.",
           variant: "destructive",
         });
         return;
       }

       if (confirm(`Complete rental for ${rental.customer?.name}?\n\nVehicle: ${rental.vehicle?.make} ${rental.vehicle?.model}\nEnd Date: ${rental.endDate}`)) {
         // Here you would call the API to update the rental status
         console.log(`Completing rental ${rentalId}`);
         toast({
           title: "Rental Completed",
           description: "Rental marked as completed. This would update the database in a production environment.",
         });
         
         // Refresh the data
         await refreshRentals();
       }
     } catch (error) {
       console.error('Error completing rental:', error);
       toast({
         title: "Error",
         description: "Failed to complete rental. Please try again.",
         variant: "destructive",
       });
     }
  };

  const handleCancelRental = async (rentalId: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
       if (!rental) {
         toast({
           title: "Error",
           description: "Rental not found.",
           variant: "destructive",
         });
         return;
       }

       if (rental.status === 'completed') {
         toast({
           title: "Cannot Cancel",
           description: "Cannot cancel a completed rental.",
           variant: "destructive",
         });
         return;
       }

       const reason = prompt(`Cancel rental for ${rental.customer?.name}?\n\nVehicle: ${rental.vehicle?.make} ${rental.vehicle?.model}\n\nPlease provide a reason for cancellation:`);
       
       if (reason && reason.trim()) {
         // Here you would call the API to update the rental status
         console.log(`Cancelling rental ${rentalId} with reason: ${reason}`);
         toast({
           title: "Rental Cancelled",
           description: "Rental cancelled successfully. This would update the database in a production environment.",
         });
         
         // Refresh the data
         await refreshRentals();
       } else if (reason !== null) {
         toast({
           title: "Missing Information",
           description: "Cancellation reason is required.",
           variant: "destructive",
         });
       }
     } catch (error) {
       console.error('Error cancelling rental:', error);
       toast({
         title: "Error",
         description: "Failed to cancel rental. Please try again.",
         variant: "destructive",
       });
     }
  };

  const totalRevenue = filteredRentals.reduce(
    (sum, rental) => sum + rental.totalAmount,
    0
  );
  const activeRentals = filteredRentals.filter(
    r => r.status === 'active'
  ).length;
  const upcomingRentals = filteredRentals.filter(
    r => r.status === 'upcoming'
  ).length;
  const completedRentals = filteredRentals.filter(
    r => r.status === 'completed'
  ).length;

  const handleNoticesFound = (notices: TollNotice[]) => {
    if (notices.length > 0) {
      // Show a summary of found notices
      const totalAmount = notices.reduce((sum, notice) => sum + notice.total_amount, 0);
      const unpaidCount = notices.filter(n => n.trip_status === 'unpaid').length;
      
      toast({
        title: "Toll Notices Found",
        description: `Found ${notices.length} toll notice(s): ${unpaidCount} unpaid, Total: $${totalAmount.toFixed(2)}. Please review and process these notices.`,
      });
    } else {
      toast({
        title: "No Toll Notices",
        description: "No toll notices found for the selected criteria.",
      });
    }
  };

  // Quick action buttons for the hero section
  const quickActions = [
    {
      title: "Create Rental",
      description: "New customer rental",
      icon: Plus,
      variant: "default" as const,
      action: () => {
        try {
          // Navigate to fleet page where QuickRentalButton is available
          window.location.href = '/fleet';
        } catch (error) {
          console.error("Error navigating to create rental:", error);
        }
      },
    },
    {
      title: "Refresh Data",
      description: "Update rental list",
      icon: Activity,
      variant: "outline" as const,
      action: () => {
        try {
          refreshRentals();
        } catch (error) {
          console.error("Error refreshing data:", error);
        }
      },
    },
    {
      title: "View Reports",
      description: "Rental analytics",
      icon: TrendingUp,
      variant: "outline" as const,
      action: () => {
        try {
          window.location.href = '/reports';
        } catch (error) {
          console.error("Error navigating to reports:", error);
        }
      },
    },
    {
      title: "Fleet Status",
      description: "Vehicle availability",
      icon: Car,
      variant: "outline" as const,
      action: () => {
        try {
          window.location.href = '/fleet';
        } catch (error) {
          console.error("Error navigating to fleet:", error);
        }
      },
    },
  ];

  // Stats data with trends
  const rentalStats = [
    {
      title: "Active Rentals",
      value: activeRentals.toString(),
      change: "+12%",
      trend: "up",
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Currently on road"
    },
    {
      title: "Upcoming Bookings",
      value: upcomingRentals.toString(),
      change: "+8%",
      trend: "up",
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Scheduled ahead"
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      change: "+18%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "This period"
    },
    {
      title: "Completed Rentals",
      value: completedRentals.toString(),
      change: "+5%",
      trend: "up",
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Successfully finished"
    },
  ];

  if (loading) {
    return (
      <div className="w-full">
        {/* Loading Hero Section */}
        <div className="bg-gradient-surface border-b border-border/50">
          <div className="px-6 lg:px-8 xl:px-12 py-8 lg:py-12">
            <div className="mx-auto max-w-7xl">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-80" />
                  <Skeleton className="h-6 w-96" />
                </div>
                <div className="flex gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-32 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="px-6 lg:px-8 xl:px-12 py-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Stats Loading */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Toll Notice Section Loading */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full rounded-xl" />
              </CardContent>
            </Card>

            {/* Table Loading */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full">
        {/* Error Hero Section */}
        <div className="bg-gradient-surface border-b border-border/50">
          <div className="px-6 lg:px-8 xl:px-12 py-8 lg:py-12">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Error Loading Rentals
                  </h1>
                  <p className="text-lg text-muted-foreground mb-4">
                    {error}
                  </p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="default"
                    className="bg-gradient-primary"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="w-full">
      {/* Modern Hero Section */}
      <div className="bg-gradient-surface border-b border-border/50">
        <div className="px-6 lg:px-8 xl:px-12 py-8 lg:py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary">
                    <Car className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold tracking-heading text-foreground">
                      Rental Management
                    </h1>
                    <p className="text-lg text-muted-foreground tracking-subheading">
                      Manage bookings, track vehicles, and optimize fleet utilization
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">{time}</span>
                  </div>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live Data</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshRentals}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {quickActions.map((action, index) => (
                  <Button 
                    key={index}
                    variant={action.variant}
                    onClick={action.action}
                    className={cn(
                      "flex items-center space-x-2 h-12 px-6 rounded-xl transition-all duration-normal",
                      action.variant === "default" && "bg-gradient-primary hover:shadow-lg hover:shadow-primary/25",
                      action.variant === "outline" && "hover:bg-muted/50 hover:shadow-md"
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{action.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-8 xl:px-12 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Enhanced Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {rentalStats.map((stat, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-normal border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground tracking-caption">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold tracking-heading">
                        {stat.value}
                      </p>
                      <div className="flex items-center space-x-1">
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className={cn(
                          "text-sm font-medium",
                          stat.trend === "up" ? "text-green-600" : "text-red-600"
                        )}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-muted-foreground">vs last month</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                      stat.bgColor
                    )}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced Toll Notice Management Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Toll Notice Management</span>
                </CardTitle>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  3 pending
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated toll monitoring and payment management for your rental fleet
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/50">
                  <div className="text-3xl font-bold text-orange-600 mb-1">12</div>
                  <div className="text-sm text-orange-700 font-medium">Unpaid Notices</div>
                  <div className="text-xs text-orange-600 mt-1">Requires attention</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-200/50">
                  <div className="text-3xl font-bold text-red-600 mb-1">3</div>
                  <div className="text-sm text-red-700 font-medium">Overdue Notices</div>
                  <div className="text-xs text-red-600 mt-1">Urgent action needed</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200/50">
                  <div className="text-3xl font-bold text-green-600 mb-1">$342.50</div>
                  <div className="text-sm text-green-700 font-medium">Outstanding Total</div>
                  <div className="text-xs text-green-600 mt-1">Current liability</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <TollNoticeDialog
                  trigger={
                    <Button variant="default" className="bg-gradient-primary hover:shadow-lg hover:shadow-primary/25">
                      <Search className="h-4 w-4 mr-2" />
                      Search Toll Notices
                    </Button>
                  }
                  onNoticesFound={handleNoticesFound}
                />
                <Button variant="outline" className="hover:bg-muted/50">
                  <Receipt className="h-4 w-4 mr-2" />
                  View All Notices
                </Button>
                <Button variant="outline" className="hover:bg-muted/50">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Overdue Alerts
                </Button>
                <Button variant="outline" className="hover:bg-muted/50">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  External Portal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, vehicle, registration, or company..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[140px] h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted/50">
                  <Filter className="mr-2 h-4 w-4" />
                  {statusFilter === 'all'
                    ? 'All Status'
                    : statusFilter === 'active'
                      ? 'Active'
                      : statusFilter === 'completed'
                        ? 'Completed'
                        : statusFilter === 'upcoming'
                          ? 'Upcoming'
                          : 'Cancelled'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  <Car className="mr-2 h-4 w-4 text-gray-600" />
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  <Activity className="mr-2 h-4 w-4 text-blue-600" />
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('upcoming')}>
                  <Clock className="mr-2 h-4 w-4 text-orange-600" />
                  Upcoming
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Enhanced Rentals Table */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Rental Records</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredRentals.length} rental{filteredRentals.length !== 1 ? 's' : ''} found
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Vehicle</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Start Date</TableHead>
                      <TableHead className="font-semibold">End Date</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="font-semibold">Revenue</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRentals.length > 0 ? (
                      filteredRentals.map(rental => (
                        <TableRow
                          key={rental.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50"
                          onClick={() => handleViewDetails(rental.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{rental.customer?.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center">
                                  {rental.customer?.type === 'Business' && rental.customer?.company && (
                                    <>
                                      <span>{rental.customer.company}</span>
                                      <span className="mx-1">•</span>
                                    </>
                                  )}
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {rental.customer?.location}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-foreground">
                                {rental.vehicle?.make} {rental.vehicle?.model}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <span className="font-mono">{rental.vehicle?.registration}</span>
                                <span className="mx-1">•</span>
                                <span className="capitalize">{rental.vehicle?.color}</span>
                                <span className="mx-1">•</span>
                                <span>{rental.vehicle?.year}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(rental.status)}</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {new Date(rental.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {new Date(rental.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {Math.ceil(
                                (new Date(rental.endDate).getTime() -
                                  new Date(rental.startDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )} days
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-green-600 text-lg">
                              ${rental.totalAmount.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={e => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/50">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleViewDetails(rental.id);
                                  }}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                    // Open toll notice dialog with pre-filled vehicle details
                                  }}
                                >
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Check Toll Notices
                                </DropdownMenuItem>
                                {rental.status === 'active' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleExtendRental(rental.id);
                                      }}
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      Extend Rental
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleCompleteRental(rental.id);
                                      }}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Complete Rental
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {rental.status === 'upcoming' && (
                                  <DropdownMenuItem
                                    onClick={e => {
                                      e.stopPropagation();
                                      // Handle cancel rental
                                    }}
                                    className="text-red-600"
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Cancel Rental
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                              <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">No rentals found</p>
                              <p className="text-sm text-muted-foreground">
                                Try adjusting your search criteria or create a new rental
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('Error rendering RentalsPage component:', error);
    
    // Fallback error UI
    return (
      <div className="w-full">
        <div className="bg-gradient-surface border-b border-border/50">
          <div className="px-6 lg:px-8 xl:px-12 py-8 lg:py-12">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Component Error
                  </h1>
                  <p className="text-lg text-muted-foreground mb-4">
                    An unexpected error occurred while rendering the page
                  </p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="default"
                    className="bg-gradient-primary"
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
