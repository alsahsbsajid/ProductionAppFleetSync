"use client";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleServiceDialog } from '@/components/ui/schedule-service-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Car,
  ArrowLeft,
  Calendar,
  MapPin,
  Wrench,
  Clock,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Plus,
  DollarSign,
  TrendingUp,
  Fuel,
  Palette,
  Gauge,
  GitCommitHorizontal,
} from 'lucide-react';
import { RentVehicleDialog } from '@/components/ui/rent-vehicle-dialog';
import { GenerateReportDialog } from '@/components/ui/generate-report-dialog';
import { Vehicle } from '@/lib/types';
import { VehicleService } from '@/lib/data-service';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);

  const fetchVehicle = useCallback(async () => {
    if (!vehicleId) return;
        setLoading(true);
        const response = await vehicleService.getVehicleById(vehicleId);
        if (response.success && response.data) {
          setVehicle(response.data);
        } else {
          console.error('Failed to fetch vehicle:', response.message);
          setVehicle(null);
        }
        setLoading(false);
  }, [vehicleId, vehicleService]);

  useEffect(() => {
      fetchVehicle();
  }, [fetchVehicle]);

  if (loading) {
    return (
      <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6'>
        <div className='flex flex-col gap-4'>
          <Skeleton className='h-8 w-32' />
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <Skeleton className='h-16 w-16 rounded-md' />
              <div>
                <Skeleton className='h-8 w-64' />
                <Skeleton className='h-4 w-48 mt-2' />
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Skeleton className='h-10 w-32' />
              <Skeleton className='h-10 w-40' />
              <Skeleton className='h-10 w-44' />
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <Skeleton className='h-24' />
            <Skeleton className='h-24' />
            <Skeleton className='h-24' />
          </div>
          <Skeleton className='h-10 w-full' />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6'>
        <div className='flex flex-col gap-4'>
          <Button variant='ghost' onClick={() => router.back()}>
            <ArrowLeft className='mr-2 h-4 w-4' /> Back to Fleet
          </Button>
          <div className='flex flex-col items-center justify-center h-[50vh]'>
            <AlertTriangle className='h-16 w-16 text-muted-foreground mb-4' />
            <h2 className='text-2xl font-bold'>Vehicle Not Found</h2>
            <p className='text-muted-foreground'>
              The vehicle you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button onClick={() => router.push('/fleet')} className='mt-4'>
              Return to Fleet Management
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            className='bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
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
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className='h-5 w-5 text-green-600' />;
      case 'rented':
        return <Calendar className='h-5 w-5 text-blue-600' />;
      case 'maintenance':
        return <Wrench className='h-5 w-5 text-orange-600' />;
      default:
        return <AlertCircle className='h-5 w-5' />;
    }
  };

  return (
    <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6 animate-fade-in'>
      <div className='flex flex-col gap-4'>
        <Button
          variant='ghost'
          onClick={() => router.push('/fleet')}
          className='mb-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' /> Back to Fleet
        </Button>

        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div className='h-16 w-16 rounded-md border bg-muted flex items-center justify-center'>
              <Car className='h-8 w-8 text-muted-foreground' />
            </div>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                {vehicle.make} {vehicle.model}
              </h1>
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground'>
                  {vehicle.registration}
                </span>
                <span>•</span>
                <span className='text-muted-foreground'>{vehicle.year}</span>
                <span>•</span>
                <span className='text-muted-foreground'>
                  Ref: {vehicle.referenceNumber}
                </span>
                <span>•</span>
                {getStatusBadge(vehicle.status)}
              </div>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <RentVehicleDialog
              vehicleId={vehicle.id}
              vehicleName={`${vehicle.make} ${vehicle.model}`}
              isAvailable={vehicle.status === 'available'}
            />
            <ScheduleServiceDialog
              vehicleId={vehicle.id}
              vehicleName={`${vehicle.make} ${vehicle.model}`}
            />
            <GenerateReportDialog
              vehicleId={vehicle.id}
              vehicleName={`${vehicle.make} ${vehicle.model}`}
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Card className='hover:shadow-md transition-shadow'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                {getStatusIcon(vehicle.status)}
                <span className='text-xl font-semibold capitalize'>
                  {vehicle.status}
                </span>
              </div>
              <p className='text-sm text-muted-foreground mt-1'>
                {vehicle.status === 'available'
                  ? 'Available'
                  : vehicle.status === 'rented'
                  ? 'Currently rented out'
                  : 'Undergoing maintenance'}
              </p>
            </CardContent>
          </Card>

          <Card className='hover:shadow-md transition-shadow'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <MapPin className='h-5 w-5 text-muted-foreground' />
                <span className='text-xl font-semibold'>
                  {vehicle.location}
                </span>
              </div>
              <p className='text-sm text-muted-foreground mt-1'>
                Last updated: Today at 9:30 AM
              </p>
            </CardContent>
          </Card>

          <Card className='hover:shadow-md transition-shadow'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Daily Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <DollarSign className='h-5 w-5 text-muted-foreground' />
                <span className='text-xl font-semibold'>
                  ${vehicle.dailyRate}/day
                </span>
              </div>
              <p className='text-sm text-muted-foreground mt-1'>
                Based on current market value
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue='overview' className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='overview'>
              <Info className='mr-2 h-4 w-4' /> Overview
            </TabsTrigger>
            <TabsTrigger value='maintenance'>
              <Wrench className='mr-2 h-4 w-4' /> Maintenance
            </TabsTrigger>
            <TabsTrigger value='rentals'>
              <Calendar className='mr-2 h-4 w-4' /> Rental History
            </TabsTrigger>
            <TabsTrigger value='financials'>
              <TrendingUp className='mr-2 h-4 w-4' /> Financials
            </TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='mt-4'>
              <Card>
                <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-6 text-sm'>
                  <div className='flex items-center gap-3'>
                    <Car className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Type</p>
                      <p className='font-medium capitalize'>{vehicle.type}</p>
                    </div>
                    </div>
                  <div className='flex items-center gap-3'>
                    <Palette className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Color</p>
                      <p className='font-medium'>{vehicle.color}</p>
                    </div>
                    </div>
                  <div className='flex items-center gap-3'>
                    <Fuel className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Fuel Type</p>
                      <p className='font-medium capitalize'>{vehicle.fuelType}</p>
                    </div>
                    </div>
                  <div className='flex items-center gap-3'>
                    <GitCommitHorizontal className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Transmission</p>
                      <p className='font-medium capitalize'>{vehicle.transmission}</p>
                    </div>
                    </div>
                   <div className='flex items-center gap-3'>
                    <Gauge className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>Odometer</p>
                      <p className='font-medium'>{vehicle.odometer} km</p>
                    </div>
                    </div>
                  <div className='flex items-center gap-3'>
                    <FileText className='h-5 w-5 text-muted-foreground' />
                    <div>
                      <p className='text-muted-foreground'>VIN</p>
                      <p className='font-medium font-mono text-xs'>{vehicle.vin || 'N/A'}</p>
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value='maintenance' className='mt-4'>
              <Card>
                <CardHeader>
                <CardTitle>Maintenance Log</CardTitle>
                </CardHeader>
                <CardContent>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
                    <div>
                      <p className='font-medium'>Next Service Due</p>
                      <p className='text-sm text-muted-foreground'>
                        {vehicle.nextService
                          ? new Date(vehicle.nextService).toLocaleDateString()
                          : 'Not scheduled'}
                      </p>
                    </div>
                    <Button size='sm' variant='outline'>
                      Schedule Now
                    </Button>
                    </div>
                  <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
                    <div>
                      <p className='font-medium'>Last Service Date</p>
                      <p className='text-sm text-muted-foreground'>
                        {vehicle.lastService
                          ? new Date(vehicle.lastService).toLocaleDateString()
                          : 'No record'}
                      </p>
                    </div>
                    <Button size='sm' variant='ghost'>View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value='rentals' className='mt-4'>
            <Card>
              <CardHeader>
                <CardTitle>Rental History</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Rental history will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

           <TabsContent value='financials' className='mt-4'>
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Financial details for this vehicle will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
