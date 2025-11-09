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
import { AddCustomerDialog } from '@/components/ui/add-customer-dialog';
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
  Plus,
  User,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/lib/types';
import { CustomerService } from '@/lib/data-service';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();
  const customerService = new CustomerService(supabase);

  const fetchCustomers = async () => {
    setLoading(true);
    const response = await customerService.getAllCustomers();
    if (response.success && response.data) {
      setCustomers(response.data);
    } else {
      console.error('Failed to fetch customers:', response.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCustomerAdded = () => {
    fetchCustomers();
  };

  // Filter customers based on search term and status filter
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

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

  return (
    <div className='w-full max-w-screen-xl mx-auto px-6 py-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Customers</h1>
          <p className='text-muted-foreground'>
            Manage your customer database and relationships.
          </p>
        </div>
        <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
      </div>

      <Card className='rounded-xl shadow-sm'>
        <CardHeader>
          <CardTitle>Customer Overview</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-6 md:grid-cols-3'>
          <div className='flex items-center gap-2'>
            <User className='h-5 w-5 text-muted-foreground' />
            <div>
              <p className='text-sm font-medium'>Total Customers</p>
              <p className='text-2xl font-bold'>{customers.length}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5 text-muted-foreground' />
            <div>
              <p className='text-sm font-medium'>Active Customers</p>
              <p className='text-2xl font-bold'>
                {customers.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Mail className='h-5 w-5 text-muted-foreground' />
            <div>
              <p className='text-sm font-medium'>Business Customers</p>
              <p className='text-2xl font-bold'>
                {customers.filter(c => c.type === 'Business').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='flex items-center gap-2 mb-4'>
        <div className='relative flex-1 max-w-md'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search customers...'
            className='pl-8'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline'>
              <Filter className='mr-2 h-4 w-4' />{' '}
              {statusFilter === 'all' ? 'All Status' : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
              Inactive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='rounded-xl border bg-card shadow-sm'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>

              <TableHead>Join Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map(customer => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Image
                      src={customer.image || '/placeholder-user.jpg'}
                      alt={customer.name}
                      width={40}
                      height={40}
                      className='h-10 w-10 rounded-full object-cover'
                    />
                    <div>
                      <p className='font-medium'>{customer.name}</p>
                      <p className='text-sm text-muted-foreground'>
                        {customer.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{getStatusBadge(customer.status)}</TableCell>
                <TableCell>{customer.location}</TableCell>
                <TableCell>{customer.type}</TableCell>

                <TableCell>
                  {customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' className='h-8 w-8 p-0'>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={() => handleViewDetails(customer.id)}
                      >
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit customer</DropdownMenuItem>
                      <DropdownMenuItem className='text-red-600'>
                        Delete customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
