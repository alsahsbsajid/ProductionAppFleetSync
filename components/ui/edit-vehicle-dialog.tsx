'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VehicleService } from '@/lib/data-service';
import { createClient } from '@/lib/supabase/client';
import { Vehicle } from '@/lib/types';

const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  registration: z.string().min(1, 'Registration is required'),
  type: z.string().min(1, 'Type is required'),
  color: z.string().min(1, 'Color is required'),
  location: z.string().min(1, 'Location is required'),
  dailyRate: z.number().min(0, 'Daily rate must be positive'),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  vin: z.string().optional(),
  status: z.enum(['available', 'rented', 'maintenance', 'out_of_service']),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  onVehicleUpdated?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditVehicleDialog({ 
  vehicle, 
  onVehicleUpdated, 
  children,
  open: controlledOpen,
  onOpenChange 
}: EditVehicleDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setOpen(newOpen);
    }
  };

  // Auto-open when vehicle is provided and using controlled mode
  React.useEffect(() => {
    if (controlledOpen !== undefined && vehicle && !isOpen) {
      handleOpenChange(true);
    }
  }, [vehicle, controlledOpen, isOpen]);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
      type: vehicle.type,
      color: vehicle.color,
      location: vehicle.location,
      dailyRate: vehicle.dailyRate || 0,
      fuelType: vehicle.fuelType || 'gasoline',
      transmission: vehicle.transmission || 'automatic',
      vin: vehicle.vin || '',
      status: vehicle.status,
    },
  });

  React.useEffect(() => {
    // Update form values when vehicle prop changes
    form.reset({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
      type: vehicle.type,
      color: vehicle.color,
      location: vehicle.location,
      dailyRate: vehicle.dailyRate || 0,
      fuelType: vehicle.fuelType || 'gasoline',
      transmission: vehicle.transmission || 'automatic',
      vin: vehicle.vin || '',
      status: vehicle.status,
    });
  }, [vehicle, form]);

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    try {
      const response = await vehicleService.updateVehicle(vehicle.id, data);

      if (response.success) {
        toast({
          title: 'Success!',
          description: 'Vehicle updated successfully.',
        });
        
        handleOpenChange(false);
        
        // Notify parent component to refresh
        if (onVehicleUpdated) {
          onVehicleUpdated();
        }
      } else {
        throw new Error(response.error || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update vehicle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant='ghost' size='sm'>
            <Edit className='mr-2 h-4 w-4' />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update the details of {vehicle.make} {vehicle.model} ({vehicle.registration}).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='make'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make *</FormLabel>
                    <FormControl>
                      <Input placeholder='Toyota' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='model'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder='Camry' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='year'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={new Date().getFullYear().toString()} 
                        type='number' 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='registration'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration *</FormLabel>
                    <FormControl>
                      <Input placeholder='NSW-123' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select vehicle type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='sedan'>Sedan</SelectItem>
                        <SelectItem value='suv'>SUV</SelectItem>
                        <SelectItem value='hatchback'>Hatchback</SelectItem>
                        <SelectItem value='coupe'>Coupe</SelectItem>
                        <SelectItem value='wagon'>Wagon</SelectItem>
                        <SelectItem value='convertible'>Convertible</SelectItem>
                        <SelectItem value='truck'>Truck</SelectItem>
                        <SelectItem value='van'>Van</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='color'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color *</FormLabel>
                    <FormControl>
                      <Input placeholder='Silver' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input placeholder='Sydney CBD' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='dailyRate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Rate ($) *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder='89.00' 
                        type='number' 
                        step='0.01'
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='available'>Available</SelectItem>
                        <SelectItem value='rented'>Rented</SelectItem>
                        <SelectItem value='maintenance'>Maintenance</SelectItem>
                        <SelectItem value='out_of_service'>Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='fuelType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='gasoline'>Gasoline</SelectItem>
                        <SelectItem value='diesel'>Diesel</SelectItem>
                        <SelectItem value='electric'>Electric</SelectItem>
                        <SelectItem value='hybrid'>Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='transmission'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transmission</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='automatic'>Automatic</SelectItem>
                        <SelectItem value='manual'>Manual</SelectItem>
                        <SelectItem value='cvt'>CVT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='vin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='1HGCM82633A123456' {...field} />
                  </FormControl>
                  <FormDescription>
                    Vehicle Identification Number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading}>
                {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Update Vehicle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 