'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Calendar, Plus, User, Search } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { VehicleService, CustomerService, RentalService } from '@/lib/data-service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import type { Vehicle, Customer, Rental } from '@/lib/types';

// Sample customers data - in a real app, this would come from your backend
const customers = [
  {
    id: 'c1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+61 2 1234 5678',
    status: 'active',
    licenseNumber: 'NSW123456',
  },
  {
    id: 'c2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+61 2 2345 6789',
    status: 'active',
    licenseNumber: 'NSW234567',
  },
  {
    id: 'c3',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+61 2 3456 7890',
    status: 'active',
    licenseNumber: 'NSW345678',
  },
];

// Sample vehicles data - in a real app, this would come from your backend
const sampleVehicles = [
  {
    id: 'v1',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    status: 'available',
    dailyRate: 89,
  },
  {
    id: 'v2',
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    status: 'available',
    dailyRate: 75,
  },
  {
    id: 'v3',
    make: 'Ford',
    model: 'Focus',
    year: 2023,
    status: 'available',
    dailyRate: 82,
  },
];

type RentalFormData = {
  vehicleId?: string;
  customerId?: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  notes?: string;
};

// Fixed NewCustomerFormData to match CustomerService requirements
type NewCustomerFormData = {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  location: string; // Changed from address to location to match Customer type
  type: 'individual' | 'business';
  company?: string;
};

interface RentVehicleDialogProps {
  vehicleId?: string;
  vehicleName?: string;
  isAvailable?: boolean;
  mode?: 'single' | 'multi';
  availableVehicles?: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    status: string;
    dailyRate: number;
  }>;
  onRentalCreated?: () => void | Promise<void>;
}

export function RentVehicleDialog({
  vehicleId,
  vehicleName,
  isAvailable = true,
  mode = 'single',
  availableVehicles = [],
  onRentalCreated,
}: RentVehicleDialogProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const vehicleService = new VehicleService(supabase);
  const customerService = new CustomerService(supabase);
  const rentalService = new RentalService(supabase);

  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(
    vehicleId || null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('existing');
  const [submitting, setSubmitting] = useState(false);
  
  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const rentalForm = useForm<RentalFormData>({
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0], // Today
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      pickupLocation: '',
      returnLocation: '',
      notes: '',
    },
  });
  const newCustomerForm = useForm<NewCustomerFormData>({
    defaultValues: {
      type: 'individual',
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      location: '',
      company: '',
    },
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
  React.useEffect(() => {
    if (open && !dataLoaded) {
      fetchData();
    }
  }, [open, dataLoaded, user]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  // Use fetched vehicles or fallback to availableVehicles prop
  const vehiclesToUse = vehicles.length > 0 ? vehicles : availableVehicles;

  // Filter vehicles based on search term
  const filteredVehicles = vehiclesToUse.filter(
    vehicle =>
      vehicle.make.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
      vehicle.year.toString().includes(vehicleSearchTerm)
  );

  // Calculate rental cost
  const calculateRentalCost = (startDate: string, endDate: string, dailyRate: number): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * dailyRate;
  };

  const onRentalSubmit = async (data: RentalFormData) => {
    // Validate rental form data
    if (!data.startDate || !data.endDate || !data.pickupLocation || !data.returnLocation) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required rental fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate date range
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast({
        title: 'Invalid Start Date',
        description: 'Start date cannot be in the past.',
        variant: 'destructive',
      });
      return;
    }

    if (endDate <= startDate) {
      toast({
        title: 'Invalid Date Range',
        description: 'End date must be after start date.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = selectedCustomer;

      // If creating a new customer, create them first
      if (activeTab === 'new') {
        const newCustomerData = newCustomerForm.getValues();
        const customerResponse = await customerService.createCustomer({
          ...newCustomerData,
          status: 'active',
        });

        if (!customerResponse.success || !customerResponse.data) {
          toast({
            title: 'Error Creating Customer',
            description: customerResponse.message || 'Failed to create customer',
            variant: 'destructive',
          });
          return;
        }

        finalCustomerId = customerResponse.data.id;
        toast({
          title: 'Customer Created',
          description: `${newCustomerData.name} has been added successfully.`,
        });
      }

      if (!finalCustomerId || !selectedVehicle) {
        toast({
          title: 'Error',
          description: 'Please select both a vehicle and customer.',
          variant: 'destructive',
        });
        return;
      }

      // Get selected vehicle data for cost calculation
      const selectedVehicleData = vehiclesToUse.find(v => v.id === selectedVehicle);
      if (!selectedVehicleData) {
        toast({
          title: 'Error',
          description: 'Selected vehicle not found.',
          variant: 'destructive',
        });
        return;
      }

      // Validate that the vehicle has a valid daily rate
      if (!selectedVehicleData.dailyRate || selectedVehicleData.dailyRate <= 0) {
        toast({
          title: 'Invalid Vehicle Rate',
          description: 'This vehicle does not have a valid daily rate set. Please contact an administrator to update the vehicle pricing.',
          variant: 'destructive',
        });
        return;
      }

      // Calculate total amount
      const totalAmount = calculateRentalCost(data.startDate, data.endDate, selectedVehicleData.dailyRate || 0);

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
        toast({
          title: 'Error Creating Rental',
          description: rentalResponse.message || 'Failed to create rental',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating rental:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onNewCustomerSubmit = async (data: NewCustomerFormData) => {
    // Validate new customer form data
    if (!data.name || !data.email || !data.phone || !data.licenseNumber || !data.location) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required customer fields.',
        variant: 'destructive',
      });
      return;
    }

    // Proceed with rental creation (customer will be created in onRentalSubmit)
    const rentalData = rentalForm.getValues();
    await onRentalSubmit(rentalData);
  };

  const resetDialog = () => {
    rentalForm.reset();
    newCustomerForm.reset();
    setSelectedCustomer(null);
    setSelectedVehicle(mode === 'multi' ? null : vehicleId || null);
    setSearchTerm('');
    setVehicleSearchTerm('');
    setActiveTab('existing');
    setSubmitting(false);
    setOpen(false);
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    rentalForm.setValue('customerId', customerId);
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    rentalForm.setValue('vehicleId', vehicleId);
  };

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const selectedVehicleData = vehiclesToUse.find(
    v => v.id === selectedVehicle
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isAvailable ? 'default' : 'outline'}
          disabled={!isAvailable || !user}
        >
          <Calendar className='mr-2 h-4 w-4' />
          {mode === 'multi'
            ? 'Create New Rental'
            : isAvailable
              ? 'Rent Vehicle'
              : 'Currently Rented'}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'multi'
              ? 'Create New Rental'
              : `Rent Vehicle - ${vehicleName}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'multi'
              ? 'Select a vehicle and customer to create a new rental booking.'
              : 'Create a new rental booking for this vehicle. You can select an existing customer or add a new one.'}
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle Selection (only in multi mode) */}
        {mode === 'multi' && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Select Vehicle</Label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by make, model, or year...'
                  value={vehicleSearchTerm}
                  onChange={e => setVehicleSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>

            <div className='space-y-2 max-h-48 overflow-y-auto'>
              {filteredVehicles.map(vehicle => (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedVehicle === vehicle.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleVehicleSelect(vehicle.id)}
                >
                  <CardContent className='p-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-medium'>
                          {vehicle.make} {vehicle.model}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          Year: {vehicle.year}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          ${vehicle.dailyRate || 0}/day
                        </p>
                      </div>
                      <div className='text-right'>
                        <Badge variant='outline' className='mb-1'>
                          {vehicle.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {loading && (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                  <p className='text-muted-foreground'>Loading vehicles...</p>
                </div>
              )}

              {!loading && filteredVehicles.length === 0 && (
                <div className='text-center py-8'>
                  <Calendar className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
                  <p className='text-muted-foreground'>No vehicles found</p>
                </div>
              )}
            </div>

            {/* Selected Vehicle Info */}
            {selectedVehicleData && (
              <Card className='bg-muted/50'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm'>Selected Vehicle</CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    <div>
                      <p className='font-medium'>
                        {selectedVehicleData.make} {selectedVehicleData.model}
                      </p>
                      <p className='text-muted-foreground'>
                        Year: {selectedVehicleData.year}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>
                        ${selectedVehicleData.dailyRate || 0}/day
                      </p>
                      <p className='text-muted-foreground'>
                        {selectedVehicleData.status}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='existing'>Existing Customer</TabsTrigger>
            <TabsTrigger value='new'>New Customer</TabsTrigger>
          </TabsList>

          <TabsContent value='existing' className='space-y-4'>
            {/* Customer Search */}
            <div className='space-y-2'>
              <Label>Search Customer</Label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by name, email, or phone...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>

            {/* Customer List */}
            <div className='space-y-2 max-h-48 overflow-y-auto'>
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
                  <p className='text-muted-foreground'>No customers found</p>
                </div>
              )}
            </div>

            {/* Selected Customer Info */}
            {selectedCustomerData && (
              <Card className='bg-muted/50'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm'>Selected Customer</CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    <div>
                      <p className='font-medium'>{selectedCustomerData.name}</p>
                      <p className='text-muted-foreground'>
                        {selectedCustomerData.email}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>
                        {selectedCustomerData.phone}
                      </p>
                      <p className='text-muted-foreground'>
                        {selectedCustomerData.licenseNumber}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='new' className='space-y-4'>
            <Form {...newCustomerForm}>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={newCustomerForm.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder='John Smith' {...field} required />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='john@example.com'
                          type='email'
                          {...field}
                          required
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
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder='+61 2 1234 5678' {...field} required />
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
                      <FormLabel>License Number *</FormLabel>
                      <FormControl>
                        <Input placeholder='NSW123456' {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newCustomerForm.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {newCustomerForm.watch('type') === 'business' && (
                  <FormField
                    control={newCustomerForm.control}
                    name='company'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder='ABC Company Pty Ltd' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={newCustomerForm.control}
                name='location'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='123 Main St, Sydney NSW 2000'
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </TabsContent>
        </Tabs>

        {/* Rental Details Form */}
        <div className='border-t pt-4'>
          <h4 className='font-medium mb-4'>Rental Details</h4>
          <Form {...rentalForm}>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={rentalForm.control}
                name='startDate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} required />
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
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} required />
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
                    <FormLabel>Pickup Location *</FormLabel>
                    <FormControl>
                      <Input placeholder='Sydney CBD' {...field} required />
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
                    <FormLabel>Return Location *</FormLabel>
                    <FormControl>
                      <Input placeholder='Sydney CBD' {...field} required />
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

          {/* Cost Calculation Preview */}
          {selectedVehicleData && rentalForm.watch('startDate') && rentalForm.watch('endDate') && (
            <Card className='bg-green-50 border-green-200 mt-4'>
              <CardContent className='p-4'>
                <div className='flex justify-between items-center'>
                  <span className='font-medium'>Estimated Total Cost:</span>
                  <span className='text-lg font-bold text-green-700'>
                    ${calculateRentalCost(
                      rentalForm.watch('startDate'),
                      rentalForm.watch('endDate'),
                      selectedVehicleData.dailyRate || 0
                    ).toFixed(2)}
                  </span>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  {Math.ceil(Math.abs(new Date(rentalForm.watch('endDate')).getTime() - new Date(rentalForm.watch('startDate')).getTime()) / (1000 * 60 * 60 * 24))} days × ${selectedVehicleData.dailyRate || 0}/day
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={resetDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (activeTab === 'existing' && selectedCustomer) {
                rentalForm.handleSubmit(onRentalSubmit)();
              } else if (activeTab === 'new') {
                newCustomerForm.handleSubmit(onNewCustomerSubmit)();
              }
            }}
            disabled={
              (activeTab === 'existing' && !selectedCustomer) ||
              (activeTab === 'new' && !newCustomerForm.formState.isValid) ||
              (mode === 'multi' && !selectedVehicle) ||
              submitting
            }
          >
            {submitting ? 'Creating...' : 'Create Rental'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
