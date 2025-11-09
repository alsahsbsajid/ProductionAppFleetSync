'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Loader2,
  Receipt,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  CreditCard,
  Calendar,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { tollService, type TollSearchParams, type TollSearchResult, type TollNotice } from '@/lib/toll-service';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface TollNoticeDialogProps {
  trigger?: React.ReactNode;
  defaultLicencePlate?: string;
  defaultState?: string;
  onNoticesFound: (notices: TollNotice[]) => void;
}

const australianStates = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export function TollNoticeDialog({ 
  trigger, 
  defaultLicencePlate = '', 
  defaultState = 'NSW',
  onNoticesFound
}: TollNoticeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    licencePlate: defaultLicencePlate,
    state: defaultState,
    tollNoticeNumber: '',
    isMotorcycle: false,
  });
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchParams.licencePlate.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a licence plate number.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get the current session for authentication
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to search toll notices.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const res = await fetch('/api/tolls/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(searchParams),
      });
      const result = await res.json();
      
      if (result.success) {
        if (result.notices.length === 0) {
          toast({
            title: 'No Results',
            description: 'No toll notices found for the specified criteria.',
          });
        } else {
          toast({
            title: 'Search Complete',
            description: `Found ${result.notices.length} toll notice(s).`,
          });
          onNoticesFound(result.notices);
        }
        setOpen(false); // Close dialog after search
      } else {
        toast({
          title: 'Search Failed',
          description: result.error || 'Failed to search toll notices.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while searching.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (notice: TollNotice) => {
    if (notice.isPaid) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    
    const isOverdue = new Date(notice.dueDate) < new Date();
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Receipt className="w-3 h-3 mr-1" />
        Unpaid
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Receipt className="h-4 w-4" />
            Check Toll Notices
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Toll Notice Search
          </DialogTitle>
          <DialogDescription>
            Search for outstanding toll notices by entering vehicle details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licencePlate">Licence Plate Number (LPN) *</Label>
                <Input
                  id="licencePlate"
                  placeholder="e.g., YMQ205"
                  value={searchParams.licencePlate}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, licencePlate: e.target.value.toUpperCase() }))}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State of Registration *</Label>
                <Select
                  value={searchParams.state}
                  onValueChange={(value) => setSearchParams(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {australianStates.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tollNoticeNumber">Toll Notice Number (Optional)</Label>
              <Input
                id="tollNoticeNumber"
                placeholder="e.g., 123456789101-A"
                value={searchParams.tollNoticeNumber}
                onChange={(e) => setSearchParams(prev => ({ ...prev, tollNoticeNumber: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isMotorcycle"
                checked={searchParams.isMotorcycle}
                onCheckedChange={(checked) => setSearchParams(prev => ({ ...prev, isMotorcycle: checked as boolean }))}
              />
              <Label htmlFor="isMotorcycle">This vehicle is a motorcycle</Label>
            </div>
            
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search for toll notices
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}