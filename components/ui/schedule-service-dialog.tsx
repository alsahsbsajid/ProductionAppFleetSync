'use client';

import * as React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Wrench } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker'; // Assuming a DatePicker component exists

interface ScheduleServiceDialogProps {
  vehicleId: string;
  vehicleName: string;
  triggerButton?: React.ReactNode;
}

type ServiceFormData = {
  serviceType: string;
  preferredDate: Date;
  notes?: string;
};

export function ScheduleServiceDialog({
  vehicleId,
  vehicleName,
  triggerButton,
}: ScheduleServiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<ServiceFormData>();

  const onSubmit = (data: ServiceFormData) => {
    // TODO: Implement API call to schedule service
    console.log('Scheduling service for vehicle:', vehicleId, data);
    // Potentially call a service function like:
    // await scheduleVehicleService(vehicleId, data);
    // Show success toast/notification
    setOpen(false); // Close dialog on submit
    form.reset(); // Reset form
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button variant='outline'>
            <Wrench className='mr-2 h-4 w-4' /> Schedule Service
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Schedule Service for {vehicleName}</DialogTitle>
          <DialogDescription>
            Fill in the details below to schedule a new service for this
            vehicle.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 py-4'
          >
            <FormField
              control={form.control}
              name='serviceType'
              rules={{ required: 'Service type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Oil Change, Tire Rotation'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='preferredDate'
              rules={{ required: 'Preferred date is required' }}
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Preferred Date</FormLabel>
                  <FormControl>
                    {/* @ts-ignore */}
                    <DatePicker date={field.value} setDate={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Any specific requests or observations...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type='submit'>Schedule Service</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
