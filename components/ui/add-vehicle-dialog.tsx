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
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
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
import { useAuth } from '@/hooks/use-auth';

const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  registration: z.string().trim().min(1, 'Registration is required'),
  type: z.string().min(1, 'Type is required'),
  color: z.string().min(1, 'Color is required'),
  location: z.string().min(1, 'Location is required'),
  dailyRate: z.number().min(0, 'Daily rate must be positive'),
  fuelType: z.string().min(1, 'Fuel type is required'),
  transmission: z.string().min(1, 'Transmission is required'),
  vin: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface AddVehicleDialogProps {
  onVehicleAdded?: () => void;
}

export function AddVehicleDialog({ onVehicleAdded }: AddVehicleDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      registration: '',
      type: 'sedan',
      color: '',
      location: '',
      dailyRate: 0,
      fuelType: 'gasoline',
      transmission: 'automatic',
      vin: '',
    },
  });

  // Debug form state
  React.useEffect(() => {
    console.log('🔧 AddVehicleDialog mounted');
    console.log('User:', user ? `${user.id} (${user.email})` : 'Not authenticated');
    console.log('Supabase client:', supabase ? 'Connected' : 'Not connected');
    console.log('Vehicle service:', vehicleService ? 'Initialized' : 'Not initialized');
  }, [user]);

  // Watch form errors
  React.useEffect(() => {
    const subscription = form.watch(() => {
      const errors = form.formState.errors;
      if (Object.keys(errors).length > 0) {
        console.log('📝 Form validation errors:', errors);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    
    try {
      console.log('🚗 Starting vehicle creation process...');
      console.log('Form data:', data);
      
      if (!user) {
        const errorMsg = 'User not authenticated. Please login first.';
        console.error('❌ Authentication error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ User authenticated:', user.id);

      // Transform data to match Vehicle type
      const vehicleData = {
        make: data.make,
        model: data.model,
        year: data.year,
        registration: data.registration,
        type: data.type,
        color: data.color,
        location: data.location,
        status: 'available' as const,
        dailyRate: data.dailyRate,
        fuelType: data.fuelType,
        transmission: data.transmission,
        vin: data.vin || undefined,
        referenceNumber: Math.floor(Math.random() * 1000000),
        odometer: 0,
      };

      console.log('🔄 Calling vehicleService.createVehicle...');
      console.log('Vehicle data to create:', vehicleData);
      
      const response = await vehicleService.createVehicle(vehicleData);
      
      console.log('📝 VehicleService response:', response);

      if (response.success) {
        console.log('✅ Vehicle created successfully:', response.data);
        
        toast({
          title: 'Success! 🎉',
          description: `Vehicle ${data.make} ${data.model} added successfully.`,
        });
        
        form.reset({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          registration: '',
          type: 'sedan',
          color: '',
          location: '',
          dailyRate: 0,
          fuelType: 'gasoline',
          transmission: 'automatic',
          vin: '',
        });
        
        setOpen(false);
        
        if (onVehicleAdded) {
          console.log('🔄 Calling onVehicleAdded callback...');
          onVehicleAdded();
        }
      } else {
        const errorMsg = response.error || response.message || 'Failed to add vehicle';
        console.error('❌ Vehicle creation failed:', errorMsg);
        console.error('Full response:', response);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add vehicle. Please try again.';
      
      console.error('❌ Error in onSubmit:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      toast({
        title: 'Error ❌',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Also show browser alert as backup
      alert(`Failed to add vehicle: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className='mr-2 h-4 w-4' /> Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Enter the details of the new vehicle to add it to your fleet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {!user && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="text-sm">⚠️ You must be logged in to add vehicles.</p>
              </div>
            )}
            
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
                <p className="text-sm">⚠️ Please fix the following errors:</p>
                <ul className="list-disc list-inside text-xs mt-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>{field}: {error?.message}</li>
                  ))}
                </ul>
              </div>
            )}

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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || new Date().getFullYear())}
                        value={field.value || ''}
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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='fuelType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select fuel type' />
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
                    <FormLabel>Transmission *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select transmission' />
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
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  type='button' 
                  variant='ghost' 
                  size='sm'
                  onClick={() => {
                    console.log('🧪 Debug Test:');
                    console.log('- User:', user);
                    console.log('- Form values:', form.getValues());
                    console.log('- Form errors:', form.formState.errors);
                    console.log('- Form valid:', form.formState.isValid);
                    console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
                    toast({
                      title: 'Debug Info',
                      description: 'Check console for debug information',
                    });
                  }}
                >
                  🧪 Debug
                </Button>
              )}
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading || !user}>
                {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {!user ? 'Login Required' : 'Add Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
