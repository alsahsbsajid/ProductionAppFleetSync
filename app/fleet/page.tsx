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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Car,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Calendar,
  Wrench,
  CheckCircle2,
  Download,
  AlertCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AddVehicleDialog } from '@/components/ui/add-vehicle-dialog';
import { EditVehicleDialog } from '@/components/ui/edit-vehicle-dialog';
import { DeleteVehicleDialog } from '@/components/ui/delete-vehicle-dialog';
import { RentVehicleDialog } from '@/components/ui/rent-vehicle-dialog';
import { QuickRentalButton } from '@/components/ui/quick-rental-button';
import { Vehicle } from '@/lib/types';
import { VehicleService } from '@/lib/data-service';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export default function FleetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [rentingVehicle, setRentingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

    const fetchVehicles = async () => {
    try {
      setError(null);
      const response = await vehicleService.getAllVehicles();
      if (response.success && response.data) {
        setVehicles(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vehicles');
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to load vehicles. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    };

  useEffect(() => {
    if (!user) return;

    fetchVehicles();

    // Set up real-time subscriptions for both vehicles and rentals
    const vehicleSubscription = supabase
      .channel('vehicles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Vehicle change received:', payload);
          // Refresh data to ensure consistency
          fetchVehicles();
        }
      )
      .subscribe();

    // Also listen for rental changes that affect vehicle status
    const rentalSubscription = supabase
      .channel('rentals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Rental change received:', payload);
          // Refresh vehicles data when rentals change to sync status
          fetchVehicles();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      vehicleSubscription.unsubscribe();
      rentalSubscription.unsubscribe();
    };
  }, [user, supabase, toast]);

  // Filter vehicles based on search term and status filter
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch =
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (vehicleId: string) => {
    router.push(`/fleet/${vehicleId}`);
  };

  const handleVehicleAdded = () => {
    // Real-time subscription will handle the update, but we can also refresh manually
    fetchVehicles();
  };

  const handleVehicleUpdated = () => {
    // Real-time subscription will handle the update, but we can also refresh manually
    fetchVehicles();
  };

  const handleVehicleDeleted = () => {
    // Real-time subscription will handle the update, but we can also refresh manually
    fetchVehicles();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge
            variant='outline'
            className='bg-green-50 text-green-700 border-green-200'
          >
            Available
          </Badge>
        );
      case 'rented':
        return (
          <Badge
            variant='outline'
            className='bg-blue-50 text-blue-700 border-blue-200'
          >
            Rented
          </Badge>
        );
      case 'maintenance':
        return (
          <Badge
            variant='outline'
            className='bg-orange-50 text-orange-700 border-orange-200'
          >
            Maintenance
          </Badge>
        );
      case 'out_of_service':
        return (
          <Badge
            variant='outline'
            className='bg-red-50 text-red-700 border-red-200'
          >
            Out of Service
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const LoadingSkeleton = () => (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-32' />
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-4 gap-4'>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-8 w-16' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className='rounded-xl border'>
        <div className='p-4'>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className='flex items-center space-x-4 py-4'>
              <Skeleton className='h-12 w-12 rounded' />
              <div className='space-y-2 flex-1'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-24' />
              </div>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-8 w-8' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Fleet Management</h1>
            <p className='text-muted-foreground'>Manage and monitor your entire vehicle fleet</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='flex flex-col md:flex-row items-center justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Fleet Management</h1>
          <p className='text-muted-foreground'>
            Manage and monitor your entire vehicle fleet
          </p>
        </div>
        <div className='flex gap-2'>
          <QuickRentalButton
            buttonText='Quick Rental'
            buttonVariant='default'
            onRentalCreated={handleVehicleAdded}
          />
          <AddVehicleDialog onVehicleAdded={handleVehicleAdded} />
          <Button 
            variant='outline'
            onClick={() => {
              toast({
                title: 'Export Coming Soon!',
                description: 'Fleet export functionality will be available soon.',
              });
              // TODO: Implement export functionality
              console.log('Exporting vehicles:', vehicles);
            }}
          >
            <Download className='mr-2 h-4 w-4' /> Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            {error}{' '}
            <Button 
              variant='link' 
              className='p-0 h-auto font-normal underline' 
              onClick={fetchVehicles}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className='mb-6 rounded-xl shadow-sm'>
        <CardHeader className='pb-3'>
          <CardTitle>Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='flex flex-col'>
              <span className='text-sm text-muted-foreground'>
                Total Vehicles
              </span>
              <span className='text-2xl font-bold'>{vehicles.length}</span>
            </div>
            <div className='flex flex-col'>
              <span className='text-sm text-muted-foreground'>
                Available
              </span>
              <span className='text-2xl font-bold text-green-600'>
                {vehicles.filter(v => v.status === 'available').length}
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-sm text-muted-foreground'>Rented</span>
              <span className='text-2xl font-bold text-blue-600'>
                {vehicles.filter(v => v.status === 'rented').length}
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-sm text-muted-foreground'>
                In Maintenance
              </span>
              <span className='text-2xl font-bold text-orange-600'>
                {vehicles.filter(v => v.status === 'maintenance').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='flex flex-col md:flex-row items-center justify-between gap-4 mb-4'>
        <div className='relative w-full md:w-auto md:flex-1 max-w-md'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search by make, model, or registration...'
            className='pl-8'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' className='w-full md:w-auto'>
              <Filter className='mr-2 h-4 w-4' /> Filter:{' '}
              {statusFilter === 'all'
                ? 'All Vehicles'
                : statusFilter === 'available'
                  ? 'Available'
                  : statusFilter === 'rented'
                    ? 'Rented'
                    : statusFilter === 'maintenance'
                      ? 'In Maintenance'
                      : 'Out of Service'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Vehicles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('available')}>
              <CheckCircle2 className='mr-2 h-4 w-4 text-green-600' />{' '}
              Available
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('rented')}>
              <Calendar className='mr-2 h-4 w-4 text-blue-600' /> Rented
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter('maintenance')}
            >
              <Wrench className='mr-2 h-4 w-4 text-orange-600' /> In
              Maintenance
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatusFilter('out_of_service')}
            >
              <AlertCircle className='mr-2 h-4 w-4 text-red-600' /> Out of Service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='rounded-xl border bg-card shadow-sm'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Next Service</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map(vehicle => (
                <TableRow
                  key={vehicle.id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleViewDetails(vehicle.id)}
                >
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      <div className='h-12 w-12 rounded-md border bg-muted flex items-center justify-center'>
                        <Car className='h-6 w-6 text-muted-foreground' />
                      </div>
                      <div>
                        <div className='font-medium'>
                          {vehicle.make} {vehicle.model}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {vehicle.year} • {vehicle.color}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='font-mono'>
                    {vehicle.registration}
                  </TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  <TableCell>{vehicle.location}</TableCell>
                  <TableCell>
                    {vehicle.dailyRate ? `$${vehicle.dailyRate}/day` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {vehicle.nextService ? new Date(vehicle.nextService).toLocaleDateString(
                      'en-AU',
                      {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={e => e.stopPropagation()}
                      >
                        <Button variant='ghost' size='icon'>
                          <MoreHorizontal className='h-4 w-4' />
                          <span className='sr-only'>Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            handleViewDetails(vehicle.id);
                          }}
                        >
                          <Car className='mr-2 h-4 w-4' />
                          View details
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            setEditingVehicle(vehicle);
                          }}
                        >
                          <Edit className='mr-2 h-4 w-4' />
                          Edit vehicle
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            if (vehicle.status === 'available') {
                              setRentingVehicle(vehicle);
                            } else {
                              toast({
                                title: 'Vehicle Unavailable',
                                description: 'This vehicle is not available for rent.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={vehicle.status !== 'available'}
                        >
                          <Calendar className='mr-2 h-4 w-4' />
                          Rent vehicle
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            toast({
                              title: 'Schedule Maintenance',
                              description: `Maintenance scheduling for ${vehicle.make} ${vehicle.model} coming soon!`,
                            });
                            console.log('Scheduling maintenance for:', vehicle);
                          }}
                        >
                          <Wrench className='mr-2 h-4 w-4' />
                          Schedule maintenance
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            setDeletingVehicle(vehicle);
                          }}
                          className='text-destructive focus:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete vehicle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-8'>
                  {vehicles.length === 0 ? (
                    <div className='flex flex-col items-center gap-2'>
                      <Car className='h-8 w-8 text-muted-foreground' />
                      <div>
                        <p className='font-medium'>No vehicles found</p>
                        <p className='text-sm text-muted-foreground'>
                          Get started by adding your first vehicle to the fleet.
                        </p>
                      </div>
                      <AddVehicleDialog onVehicleAdded={handleVehicleAdded} />
                    </div>
                  ) : (
                    <div className='flex flex-col items-center gap-2'>
                      <Search className='h-8 w-8 text-muted-foreground' />
                      <p>No vehicles found matching your search criteria.</p>
                      <Button 
                        variant='outline' 
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog States - Rendered conditionally based on state */}
      {editingVehicle && (
        <EditVehicleDialog 
          vehicle={editingVehicle}
          open={!!editingVehicle}
          onOpenChange={(open) => {
            if (!open) setEditingVehicle(null);
          }}
          onVehicleUpdated={() => {
            handleVehicleUpdated();
            setEditingVehicle(null);
          }}
        />
      )}

      {rentingVehicle && (
        <RentVehicleDialog
          vehicleId={rentingVehicle.id}
          vehicleName={`${rentingVehicle.make} ${rentingVehicle.model}`}
          isAvailable={rentingVehicle.status === 'available'}
          onRentalCreated={() => {
            handleVehicleUpdated();
            setRentingVehicle(null);
          }}
        />
      )}

      {deletingVehicle && (
        <DeleteVehicleDialog 
          vehicle={deletingVehicle}
          open={!!deletingVehicle}
          onOpenChange={(open) => {
            if (!open) setDeletingVehicle(null);
          }}
          onVehicleDeleted={() => {
            handleVehicleDeleted();
            setDeletingVehicle(null);
          }}
        />
      )}
    </div>
  );
}
