'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { validateInput, sanitizeInput } from '@/lib/client-validation';

// Password strength validation
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPasswordErrors([]);
    
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
      const sanitizedPassword = password;
      
      // Validate email
      if (!validateInput.email(sanitizedEmail)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Validate password strength
      const passwordValidation = validatePassword(sanitizedPassword);
      if (!passwordValidation.isValid) {
        setPasswordErrors(passwordValidation.errors);
        throw new Error('Password does not meet security requirements');
      }
      
      // Check password confirmation
      if (sanitizedPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });
      
      if (error) throw error;
      
      if (user) {
        setSuccess(
          'Account created successfully! Please check your email for a confirmation link.'
        );
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <Card className="w-full max-w-md card-apple border-border/20 shadow-2xl">
        <CardHeader className="text-center pb-8">
            <div className='mx-auto flex aspect-square size-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg mb-6'>
                <Car className='size-8 text-white' />
            </div>
          <CardTitle className="text-3xl font-bold font-display tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-base font-medium mt-2">
            Enter your email and a password to create an account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {success ? (
            <div className="text-center p-6 bg-green-50 border border-green-200 rounded-2xl">
              <div className="text-green-600 font-medium">{success}</div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="form-group-apple">
                <Label htmlFor="email" className="font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-border/30 bg-white/80 backdrop-blur-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 font-medium"
                />
              </div>
              <div className="form-group-apple">
                <Label htmlFor="password" className="font-medium text-foreground">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border/30 bg-white/80 backdrop-blur-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 font-medium"
                />
                {passwordErrors.length > 0 && (
                  <div className="text-xs text-destructive space-y-1 bg-destructive/10 p-3 rounded-xl mt-2">
                    {passwordErrors.map((error, index) => (
                      <div key={index} className="font-medium">• {error}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group-apple">
                <Label htmlFor="confirmPassword" className="font-medium text-foreground">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  required 
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-border/30 bg-white/80 backdrop-blur-sm transition-all duration-200 focus:ring-4 focus:ring-primary/10 font-medium"
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl">{error}</p>}
              <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:scale-[1.02] font-semibold" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>
          )}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground font-medium">Already have an account? </span>
            <Link href="/login" className="text-primary font-semibold hover:underline transition-colors">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}