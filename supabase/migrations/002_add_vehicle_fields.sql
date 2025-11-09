-- Add missing vehicle fields
-- Migration to add type, location, and transmission fields to vehicles table

-- Add vehicle type field
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'sedan' 
CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'coupe', 'wagon', 'convertible', 'truck', 'van'));

-- Add location field
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'N/A';

-- Add transmission field
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'automatic' 
CHECK (transmission IN ('automatic', 'manual', 'cvt'));

-- Add reference number field for easier vehicle identification
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS reference_number INTEGER DEFAULT 0;

-- Create index on reference_number for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_reference_number ON public.vehicles(reference_number);

-- Update existing vehicles to have reference numbers if they don't have them
UPDATE public.vehicles 
SET reference_number = FLOOR(RANDOM() * 1000000)
WHERE reference_number = 0 OR reference_number IS NULL; 