'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import React from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const _router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Login Error:', signInError.message);
        setError(signInError.message);
        toast.error('Login Failed', {
          description: signInError.message,
        });
        setLoading(false); // Stop loading on error
        return;
      }

      toast.success('Login Successful!', {
        description: 'Redirecting to your dashboard...',
      });

      // A hard redirect is more reliable for auth state changes
      window.location.href = '/';
    } catch (err: any) {
      console.error('Exception during login:', err.message);
      setError(err.message);
      toast.error('An unexpected error occurred', {
        description: err.message,
      });
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20'>
      <Card className='w-full max-w-md card-apple border-border/20 shadow-2xl'>
        <CardHeader className='text-center pb-8'>
          <div className='mx-auto flex aspect-square size-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg mb-6'>
            <Car className='size-8 text-white' />
          </div>
          <CardTitle className='text-3xl font-bold font-display tracking-tight'>Login to FleetSync</CardTitle>
          <CardDescription className='text-base font-medium mt-2'>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className='px-8 pb-8'>
          <form onSubmit={handleLogin} className='space-y-6'>
            <div className='form-group-apple'>
              <Label htmlFor='email' className='font-medium text-foreground'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='m@example.com'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='h-12 rounded-xl border-border/30 bg-white/80 backdrop-blur-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 font-medium'
              />
            </div>
            <div className='form-group-apple'>
              <Label htmlFor='password' className='font-medium text-foreground'>Password</Label>
              <Input
                id='password'
                type='password'
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='h-12 rounded-xl border-border/30 bg-white/80 backdrop-blur-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 font-medium'
              />
            </div>
            {error && <p className='text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl'>{error}</p>}
            <Button type='submit' className='w-full h-12 rounded-xl bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:scale-[1.02] font-semibold' disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className='mt-6 text-center text-sm'>
            <span className='text-muted-foreground font-medium'>Don&apos;t have an account? </span>
            <Link href='/signup' className='text-primary font-semibold hover:underline transition-colors'>
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}