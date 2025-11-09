'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VehicleService } from '@/lib/data-service';
import { createClient } from '@/lib/supabase/client';
import { Vehicle } from '@/lib/types';

interface DeleteVehicleDialogProps {
  vehicle: Vehicle;
  onVehicleDeleted?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteVehicleDialog({ 
  vehicle, 
  onVehicleDeleted, 
  children,
  open: controlledOpen,
  onOpenChange 
}: DeleteVehicleDialogProps) {
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

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await vehicleService.deleteVehicle(vehicle.id);

      if (response.success) {
        toast({
          title: 'Success!',
          description: 'Vehicle deleted successfully.',
        });
        
        handleOpenChange(false);
        
        // Notify parent component to refresh
        if (onVehicleDeleted) {
          onVehicleDeleted();
        }
      } else {
        throw new Error(response.error || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete vehicle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant='ghost' size='sm' className='text-destructive hover:text-destructive'>
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{vehicle.make} {vehicle.model}</strong> ({vehicle.registration})?
            <br /><br />
            This action cannot be undone and will permanently remove the vehicle from your fleet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={loading}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Delete Vehicle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 