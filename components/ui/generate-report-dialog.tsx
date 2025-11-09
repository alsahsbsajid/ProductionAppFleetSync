'use client';

import { useState } from 'react';
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
import { FileText } from 'lucide-react';

interface GenerateReportDialogProps {
  vehicleId: string;
  vehicleName: string;
}

export function GenerateReportDialog({
  vehicleId,
  vehicleName,
}: GenerateReportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    // TODO: Implement report generation logic
    console.log(`Generating report for ${vehicleName} (ID: ${vehicleId})`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // toast({ title: "Report Generation Started", description: "Your report will be available shortly." });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>
          <FileText className='mr-2 h-4 w-4' /> Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Generate a report for {vehicleName}. You can specify report
            parameters here in the future.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <p>Report generation options will be added here.</p>
          <p>Vehicle ID: {vehicleId}</p>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type='submit' onClick={handleSubmit}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
