'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { VehicleService, CustomerService, RentalService } from '@/lib/data-service';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import type { Vehicle, Customer, Rental } from '@/lib/types';
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
import { Calendar, Plus, User, Search, Car } from 'lucide-react';
import {
  Form,
  FormControl,
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Data will be fetched dynamically from the database

// Validation schemas
const quickRentalSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle selection is required'),
  customerId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  returnLocation: z.string().min(1, 'Return location is required'),
  notes: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

const newCustomerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Please enter a valid phone number'),
  licenseNumber: z.string().min(3, 'License number must be at least 3 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
});

type QuickRentalFormData = z.infer<typeof quickRentalSchema>;
type NewCustomerFormData = z.infer<typeof newCustomerSchema>;

interface QuickRentalButtonProps {
  buttonText?: string;
  buttonVariant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive';
  onRentalCreated?: () => void;
}

export function QuickRentalButton({
  buttonText = 'Create New Rental',
  buttonVariant = 'default',
  onRentalCreated,
}: QuickRentalButtonProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);
  const customerService = new CustomerService(supabase);
  const rentalService = new RentalService(supabase);
  
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('existing');
  const [currentStep, setCurrentStep] = useState<
    'vehicle' | 'customer' | 'details'
  >('vehicle');
  
  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rentalForm = useForm<QuickRentalFormData>({
    resolver: zodResolver(quickRentalSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pickupLocation: 'Sydney CBD',
      returnLocation: 'Sydney CBD',
      notes: '',
    },
  });
  const newCustomerForm = useForm<NewCustomerFormData>({
    resolver: zodResolver(newCustomerSchema),
  });

  // Data fetching functions
  const fetchVehicles = async () => {
    try {
      const response = await vehicleService.getAllVehicles();
      if (response.success && response.data) {
        // Filter only available vehicles for rental
        const availableVehicles = response.data.filter(vehicle => vehicle.status === 'available');
        setVehicles(availableVehicles);
      } else {
        throw new Error(response.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vehicles. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAllCustomers();
      if (response.success && response.data) {
        // Filter only active customers
        const activeCustomers = response.data.filter(customer => customer.status === 'active');
        setCustomers(activeCustomers);
      } else {
        throw new Error(response.error || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchData = async () => {
    if (dataLoaded || !user) return;
    
    setLoading(true);
    try {
      await Promise.all([fetchVehicles(), fetchCustomers()]);
      setDataLoaded(true);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open && !dataLoaded) {
      fetchData();
    }
  }, [open, dataLoaded, user]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.phone.includes(customerSearchTerm)
  );

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(
    vehicle =>
      vehicle.make.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
      vehicle.year.toString().includes(vehicleSearchTerm) ||
      vehicle.type.toLowerCase().includes(vehicleSearchTerm.toLowerCase())
  );

  const onRentalSubmit = async (data: QuickRentalFormData) => {
    if (!selectedVehicle || (!selectedCustomer && activeTab === 'existing')) {
      toast({
        title: 'Missing Information',
        description: 'Please select both a vehicle and customer.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      let finalCustomerId = selectedCustomer;

      // Create new customer if needed
      if (activeTab === 'new') {
        const newCustomerData = newCustomerForm.getValues();
        if (!newCustomerData.name || !newCustomerData.email || !newCustomerData.phone) {
          throw new Error('Please fill in all required customer information');
        }

        const customerResponse = await customerService.createCustomer({
          name: newCustomerData.name,
          email: newCustomerData.email,
          phone: newCustomerData.phone,
          licenseNumber: newCustomerData.licenseNumber,
          location: newCustomerData.address,
          type: 'Individual',
          status: 'active',
        });

        if (!customerResponse.success) {
          throw new Error(customerResponse.message || 'Failed to create customer');
        }

        finalCustomerId = customerResponse.data?.id || null;
      }

      if (!finalCustomerId) {
        throw new Error('Customer ID is required');
      }

      // Calculate rental amount
      const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
      if (!selectedVehicleData) {
        throw new Error('Selected vehicle not found');
      }

      if (!selectedVehicleData.dailyRate) {
        throw new Error('Vehicle daily rate not available');
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const totalAmount = totalDays * selectedVehicleData.dailyRate;

      // Create the rental
      const rentalData: Omit<Rental, 'id' | 'createdAt' | 'vehicle' | 'customer'> = {
        vehicleId: selectedVehicle,
        customerId: finalCustomerId,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'active',
        totalAmount,
        notes: data.notes || '',
      };

      const rentalResponse = await rentalService.createRental(rentalData);

      if (rentalResponse.success) {
        const customerName = activeTab === 'existing' 
          ? customers.find(c => c.id === finalCustomerId)?.name 
          : newCustomerForm.getValues().name;

        toast({
          title: 'Rental Created Successfully!',
          description: `Rental for ${customerName} has been created. Total: $${totalAmount.toFixed(2)}`,
        });

        // Call the onRentalCreated callback if provided
        if (onRentalCreated) {
          await onRentalCreated();
        }

        // Reset forms and close dialog
        resetDialog();
      } else {
        throw new Error(rentalResponse.message || 'Failed to create rental');
      }
    } catch (error) {
      console.error('Error creating rental:', error);
      toast({
        title: 'Error Creating Rental',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onNewCustomerSubmit = async (data: NewCustomerFormData) => {
    // Validate new customer form
    if (!data.name || !data.email || !data.phone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required customer information.',
        variant: 'destructive',
      });
      return;
    }

    // Get rental form data and proceed with rental creation
    const rentalData = rentalForm.getValues();
    await onRentalSubmit(rentalData);
  };

  const resetDialog = () => {
    rentalForm.reset();
    newCustomerForm.reset();
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setCustomerSearchTerm('');
    setVehicleSearchTerm('');
    setActiveTab('existing');
    setCurrentStep('vehicle');
    setOpen(false);
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    rentalForm.setValue('vehicleId', vehicleId);
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    rentalForm.setValue('customerId', customerId);
  };

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  const canProceedToCustomer = selectedVehicle !== null;
  const canProceedToDetails =
    selectedVehicle !== null &&
    (selectedCustomer !== null || activeTab === 'new');
  const canSubmit = canProceedToDetails && 
    rentalForm.formState.isValid && 
    (activeTab === 'existing' || newCustomerForm.formState.isValid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          <Plus className='mr-2 h-4 w-4' />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Create New Rental</DialogTitle>
          <DialogDescription>
            Select a vehicle and customer to create a new rental booking in just
            a few steps.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className='flex items-center space-x-4 mb-6'>
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'vehicle'
                ? 'text-primary'
                : selectedVehicle
                  ? 'text-green-600'
                  : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'vehicle'
                  ? 'bg-primary text-primary-foreground'
                  : selectedVehicle
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              1
            </div>
            <span className='text-sm font-medium'>Vehicle</span>
          </div>
          <Separator className='flex-1' />
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'customer'
                ? 'text-primary'
                : selectedCustomer || activeTab === 'new'
                  ? 'text-green-600'
                  : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'customer'
                  ? 'bg-primary text-primary-foreground'
                  : selectedCustomer || activeTab === 'new'
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className='text-sm font-medium'>Customer</span>
          </div>
          <Separator className='flex-1' />
          <div
            className={`flex items-center space-x-2 ${
              currentStep === 'details'
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'details'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              3
            </div>
            <span className='text-sm font-medium'>Details</span>
          </div>
        </div>

        {/* Step 1: Vehicle Selection */}
        {currentStep === 'vehicle' && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Select Vehicle</Label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by make, model, year, or type...'
                  value={vehicleSearchTerm}
                  onChange={e => setVehicleSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto'>
              {filteredVehicles.map(vehicle => (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedVehicle === vehicle.id
                      ? 'ring-2 ring-primary shadow-md'
                      : ''
                  }`}
                  onClick={() => handleVehicleSelect(vehicle.id)}
                >
                  <CardContent className='p-4'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center space-x-2 mb-2'>
                          <Car className='h-4 w-4 text-muted-foreground' />
                          <p className='font-semibold'>
                            {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                        <div className='space-y-1 text-sm text-muted-foreground'>
                          <p>Year: {vehicle.year}</p>
                          <p>Type: {vehicle.type}</p>
                          <p className='font-medium text-foreground'>
                            ${vehicle.dailyRate}/day
                          </p>
                        </div>
                      </div>
                      <Badge variant='outline' className='ml-2'>
                        {vehicle.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading && (
              <div className='text-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                <p className='text-muted-foreground'>Loading vehicles...</p>
              </div>
            )}
            
            {!loading && filteredVehicles.length === 0 && (
              <div className='text-center py-12'>
                <Car className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
                <p className='text-muted-foreground'>
                  {vehicleSearchTerm ? 'No vehicles found matching your search' : 'No available vehicles found'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customer Selection */}
        {currentStep === 'customer' && (
          <div className='space-y-4'>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='existing'>Existing Customer</TabsTrigger>
                <TabsTrigger value='new'>New Customer</TabsTrigger>
              </TabsList>

              <TabsContent value='existing' className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Search Customer</Label>
                  <div className='relative'>
                    <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                    <Input
                      placeholder='Search by name, email, or phone...'
                      value={customerSearchTerm}
                      onChange={e => setCustomerSearchTerm(e.target.value)}
                      className='pl-8'
                    />
                  </div>
                </div>

                <div className='space-y-2 max-h-64 overflow-y-auto'>
                  {filteredCustomers.map(customer => (
                    <Card
                      key={customer.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedCustomer === customer.id
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                      onClick={() => handleCustomerSelect(customer.id)}
                    >
                      <CardContent className='p-3'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='font-medium'>{customer.name}</p>
                            <p className='text-sm text-muted-foreground'>
                              {customer.email}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {customer.phone}
                            </p>
                          </div>
                          <div className='text-right'>
                            <Badge variant='outline' className='mb-1'>
                              {customer.status}
                            </Badge>
                            <p className='text-xs text-muted-foreground'>
                              {customer.licenseNumber}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {loading && (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                      <p className='text-muted-foreground'>Loading customers...</p>
                    </div>
                  )}
                  
                  {!loading && filteredCustomers.length === 0 && (
                    <div className='text-center py-8'>
                      <User className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
                      <p className='text-muted-foreground'>
                        {customerSearchTerm ? 'No customers found matching your search' : 'No active customers found'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='new' className='space-y-4'>
                <Form {...newCustomerForm}>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={newCustomerForm.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder='John Smith' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newCustomerForm.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='john@example.com'
                              type='email'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newCustomerForm.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder='+61 2 1234 5678' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newCustomerForm.control}
                      name='licenseNumber'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder='NSW123456' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={newCustomerForm.control}
                    name='address'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='123 Main St, Sydney NSW 2000'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 3: Rental Details */}
        {currentStep === 'details' && (
          <div className='space-y-6'>
            {/* Selected Summary */}
            <div className='grid grid-cols-2 gap-4'>
              {selectedVehicleData && (
                <Card className='bg-muted/50'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm flex items-center'>
                      <Car className='mr-2 h-4 w-4' />
                      Selected Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    <div className='space-y-1 text-sm'>
                      <p className='font-medium'>
                        {selectedVehicleData.make} {selectedVehicleData.model}
                      </p>
                      <p className='text-muted-foreground'>
                        Year: {selectedVehicleData.year}
                      </p>
                      <p className='text-muted-foreground'>
                        ${selectedVehicleData.dailyRate}/day
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(selectedCustomerData || activeTab === 'new') && (
                <Card className='bg-muted/50'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm flex items-center'>
                      <User className='mr-2 h-4 w-4' />
                      {activeTab === 'existing'
                        ? 'Selected Customer'
                        : 'New Customer'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    {activeTab === 'existing' && selectedCustomerData ? (
                      <div className='space-y-1 text-sm'>
                        <p className='font-medium'>
                          {selectedCustomerData.name}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedCustomerData.email}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedCustomerData.phone}
                        </p>
                      </div>
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        New customer will be created
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rental Form */}
            <Form {...rentalForm}>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={rentalForm.control}
                  name='startDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={rentalForm.control}
                  name='endDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={rentalForm.control}
                  name='pickupLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <Input placeholder='Sydney CBD' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={rentalForm.control}
                  name='returnLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Location</FormLabel>
                      <FormControl>
                        <Input placeholder='Sydney CBD' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={rentalForm.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Any special requirements or notes...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>
        )}

        <DialogFooter className='flex justify-between'>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={resetDialog}>
              Cancel
            </Button>
            {currentStep !== 'vehicle' && (
              <Button
                variant='outline'
                onClick={() => {
                  if (currentStep === 'customer') setCurrentStep('vehicle');
                  if (currentStep === 'details') setCurrentStep('customer');
                }}
              >
                Back
              </Button>
            )}
          </div>

          <div className='flex gap-2'>
            {currentStep === 'vehicle' && (
              <Button
                onClick={() => setCurrentStep('customer')}
                disabled={!canProceedToCustomer}
              >
                Next: Select Customer
              </Button>
            )}
            {currentStep === 'customer' && (
              <Button
                onClick={() => setCurrentStep('details')}
                disabled={!canProceedToDetails}
              >
                Next: Rental Details
              </Button>
            )}
            {currentStep === 'details' && (
              <Button
                onClick={() => {
                  if (activeTab === 'existing' && selectedCustomer) {
                    rentalForm.handleSubmit(onRentalSubmit)();
                  } else if (activeTab === 'new') {
                    newCustomerForm.handleSubmit(onNewCustomerSubmit)();
                  }
                }}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Creating Rental...
                  </>
                ) : (
                  'Create Rental'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
