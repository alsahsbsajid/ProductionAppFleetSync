import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, {
    message: 'Full name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  phone: z.string().min(8, {
    message: 'Please enter a valid phone number.',
  }),
  location: z.string().min(5, {
    message: 'Location must be at least 5 characters.',
  }),
  type: z.enum(['individual', 'business']),
  licenseNumber: z.string().min(3, {
    message: 'License number must be at least 3 characters.',
  }),
  company: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>; 