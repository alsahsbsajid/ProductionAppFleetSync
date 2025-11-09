'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Car,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { Customer } from '@/lib/types';
import { CustomerService } from '@/lib/data-service';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const customerService = new CustomerService(supabase);

  useEffect(() => {
    if (customerId) {
      const fetchCustomer = async () => {
        setLoading(true);
        const response = await customerService.getCustomerById(customerId);
        if (response.success && response.data) {
          setCustomer(response.data);
        } else {
          console.error('Failed to fetch customer:', response.message);
          setCustomer(null);
        }
        setLoading(false);
      };
      fetchCustomer();
    }
  }, [customerId, customerService]);

  if (loading) {
    return (
      <>
        <Button variant='ghost' onClick={() => router.back()}>
          <ArrowLeft className='mr-2 h-4 w-4' /> Back to Customers
        </Button>
        <Skeleton className='h-8 w-48' />
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-16 w-16 rounded-full' />
            <div>
              <Skeleton className='h-8 w-64 mb-2' />
              <Skeleton className='h-4 w-96' />
            </div>
          </div>
          <div className='flex gap-2'>
            <Skeleton className='h-10 w-24' />
            <Skeleton className='h-10 w-32' />
          </div>
        </div>
        <div className='grid gap-6 md:grid-cols-2'>
          <Skeleton className='h-40' />
          <Skeleton className='h-40' />
        </div>
        <Skeleton className='h-48 mt-6' />
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Button variant='ghost' onClick={() => router.back()}>
          <ArrowLeft className='mr-2 h-4 w-4' /> Back to Customers
        </Button>
        <div className='flex flex-col items-center justify-center h-[50vh]'>
          <AlertTriangle className='h-16 w-16 text-muted-foreground mb-4' />
          <h2 className='text-2xl font-bold'>Customer Not Found</h2>
          <p className='text-muted-foreground'>
            The customer you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button onClick={() => router.push('/customers')} className='mt-4'>
            Return to Customers
          </Button>
        </div>
      </>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge
            variant='outline'
            className='bg-green-50 text-green-700 border-green-200'
          >
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge
            variant='outline'
            className='bg-orange-50 text-orange-700 border-orange-200'
          >
            Inactive
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className='h-5 w-5 text-green-600' />;
      case 'inactive':
        return <AlertCircle className='h-5 w-5 text-orange-600' />;
      default:
        return <AlertCircle className='h-5 w-5' />;
    }
  };

  return (
    <>
      <Button variant='ghost' onClick={() => router.back()}>
        <ArrowLeft className='mr-2 h-4 w-4' /> Back to Customers
      </Button>

      <div className='grid gap-6'>
        {/* Customer Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Image
              src={customer.image || '/placeholder-user.jpg'}
              alt={customer.name}
              width={64}
              height={64}
              className='h-16 w-16 rounded-full object-cover'
            />
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                {customer.name}
              </h1>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <span>{customer.type} Account</span>
                <span>•</span>
                <span>
                  Member since{' '}
                  {customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : 'N/A'}
                </span>
                <span>•</span>
                {getStatusBadge(customer.status)}
              </div>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline'>Edit Profile</Button>
            <Button variant='destructive'>Delete Account</Button>
          </div>
        </div>

        {/* Customer Information */}
        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-2'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <span>{customer.email}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Phone className='h-4 w-4 text-muted-foreground' />
                <span>{customer.phone}</span>
              </div>
              <div className='flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                <span>{customer.location}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-2'>
                <Car className='h-4 w-4 text-muted-foreground' />
              </div>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-muted-foreground' />
                <span>
                  Join Date:{' '}
                  {customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                {getStatusIcon(customer.status)}
                <span>
                  Status:{' '}
                  {customer.status.charAt(0).toUpperCase() +
                    customer.status.slice(1)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Documents */}
        <Tabs defaultValue='documents' className='w-full'>
          <TabsList>
            <TabsTrigger value='documents'>Documents</TabsTrigger>
          </TabsList>

          <TabsContent value='documents' className='mt-4'>
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-center py-8'>
                  <FileText className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
                  <h3 className='text-lg font-medium'>No Documents Found</h3>
                  <p className='text-muted-foreground'>
                    This customer has not uploaded any documents yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
