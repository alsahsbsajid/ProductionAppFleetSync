'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  Monitor,
  CreditCard,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    maintenanceReminders: true,
    fineAlerts: true,
    tollNotifications: false,
  });

  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en',
    timezone: 'Australia/Sydney',
    dateFormat: 'dd/mm/yyyy',
    currency: 'AUD',
  });

  const [profile, setProfile] = useState({
    name: 'Fleet Manager',
    email: 'manager@fleetsync.com',
    phone: '+61 2 1234 5678',
    company: 'FleetSync Solutions',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripePublishableKey: '',
    stripeSecretKey: '',
    paymentReferenceFormat: 'RENT-{rentalId}',
    enablePaymentNotifications: true,
    testMode: true,
  });

  const [showStripeSecret, setShowStripeSecret] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isTestingStripe, setIsTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState('');

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('fleetsync-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.preferences) setPreferences(parsed.preferences);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.paymentSettings) setPaymentSettings(parsed.paymentSettings);
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  // Validate Stripe API keys
  const validateStripeKeys = () => {
    const errors = [];
    
    if (!paymentSettings.stripePublishableKey) {
      errors.push('Publishable key is required');
    } else if (!paymentSettings.stripePublishableKey.startsWith('pk_')) {
      errors.push('Publishable key should start with "pk_"');
    }
    
    if (!paymentSettings.stripeSecretKey) {
      errors.push('Secret key is required');
    } else if (!paymentSettings.stripeSecretKey.startsWith('sk_')) {
      errors.push('Secret key should start with "sk_"');
    }
    
    // Check if keys match environment
    if (paymentSettings.stripePublishableKey && paymentSettings.stripeSecretKey) {
      const pubIsTest = paymentSettings.stripePublishableKey.startsWith('pk_test_');
      const secIsTest = paymentSettings.stripeSecretKey.startsWith('sk_test_');
      
      if (pubIsTest !== secIsTest) {
        errors.push('Keys must be from the same environment (both test or both live)');
      }
    }
    
    return errors;
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Validate Stripe keys if provided
      if (paymentSettings.stripePublishableKey || paymentSettings.stripeSecretKey) {
        const validationErrors = validateStripeKeys();
        if (validationErrors.length > 0) {
          setSaveMessage(`Validation Error: ${validationErrors.join(', ')}`);
          setIsSaving(false);
          return;
        }
      }
      
      // Save to localStorage for now (in production, save to backend)
      const settingsData = {
        notifications,
        preferences,
        profile,
        paymentSettings,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('fleetsync-settings', JSON.stringify(settingsData));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('Settings saved successfully!');
      console.log('Settings saved:', settingsData);
      
    } catch (error) {
      setSaveMessage('Failed to save settings. Please try again.');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Test Stripe integration
  const handleTestStripe = async () => {
    setIsTestingStripe(true);
    setStripeTestResult('');
    
    try {
      const validationErrors = validateStripeKeys();
      if (validationErrors.length > 0) {
        setStripeTestResult(`❌ ${validationErrors.join(', ')}`);
        setIsTestingStripe(false);
        return;
      }
      
      // Test payment intent creation
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalId: 'TEST-' + Date.now(),
          amount: 100,
          currency: 'aud',
          customerName: 'Test Customer',
          vehicleRegistration: 'TEST123',
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setStripeTestResult('✅ Stripe integration test successful! Payment intent created.');
      } else {
        setStripeTestResult(`❌ Test failed: ${result.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      setStripeTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingStripe(false);
      // Clear message after 5 seconds
      setTimeout(() => setStripeTestResult(''), 5000);
    }
  };

  // Open Stripe Dashboard
  const openStripeDashboard = () => {
    const isTestMode = paymentSettings.testMode;
    const url = isTestMode 
      ? 'https://dashboard.stripe.com/test/apikeys'
      : 'https://dashboard.stripe.com/apikeys';
    window.open(url, '_blank');
  };

  // Open interactive test page
  const openTestPage = () => {
    window.open('/debug/stripe-test-interactive.html', '_blank');
  };

  const handleResetSettings = () => {
    // Reset to default values
    setNotifications({
      emailAlerts: true,
      pushNotifications: true,
      maintenanceReminders: true,
      fineAlerts: true,
      tollNotifications: false,
    });
    setPreferences({
      theme: 'system',
      language: 'en',
      timezone: 'Australia/Sydney',
      dateFormat: 'dd/mm/yyyy',
      currency: 'AUD',
    });
    setPaymentSettings({
      stripePublishableKey: '',
      stripeSecretKey: '',
      paymentReferenceFormat: 'RENT-{rentalId}',
      enablePaymentNotifications: true,
      testMode: true,
    });
    setSaveMessage('Settings reset to defaults');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="w-full">
      <div className="px-6 lg:px-8 xl:px-12 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-2'>
              <Settings className='h-6 w-6' />
              <h1 className='text-3xl font-bold'>Settings</h1>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={handleResetSettings}>
                <RefreshCw className='mr-2 h-4 w-4' />
                Reset
              </Button>
              <Button onClick={handleSaveSettings}>
                <Save className='mr-2 h-4 w-4' />
                Save Changes
              </Button>
            </div>
          </div>

          <Tabs defaultValue='general' className='space-y-6'>
        <TabsList className='grid w-full grid-cols-6'>
          <TabsTrigger value='general' className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            General
          </TabsTrigger>
          <TabsTrigger value='profile' className='flex items-center gap-2'>
            <User className='h-4 w-4' />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value='notifications'
            className='flex items-center gap-2'
          >
            <Bell className='h-4 w-4' />
            Notifications
          </TabsTrigger>
          <TabsTrigger value='payments' className='flex items-center gap-2'>
            <CreditCard className='h-4 w-4' />
            Payments
          </TabsTrigger>
          <TabsTrigger value='security' className='flex items-center gap-2'>
            <Shield className='h-4 w-4' />
            Security
          </TabsTrigger>
          <TabsTrigger value='system' className='flex items-center gap-2'>
            <Database className='h-4 w-4' />
            System
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value='general' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Palette className='h-5 w-5' />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='theme'>Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={value =>
                    setPreferences({ ...preferences, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='light'>
                      <div className='flex items-center gap-2'>
                        <Sun className='h-4 w-4' />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value='dark'>
                      <div className='flex items-center gap-2'>
                        <Moon className='h-4 w-4' />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value='system'>
                      <div className='flex items-center gap-2'>
                        <Monitor className='h-4 w-4' />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                Localization
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='language'>Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={value =>
                      setPreferences({ ...preferences, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='en'>English</SelectItem>
                      <SelectItem value='es'>Español</SelectItem>
                      <SelectItem value='fr'>Français</SelectItem>
                      <SelectItem value='de'>Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='timezone'>Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={value =>
                      setPreferences({ ...preferences, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Australia/Sydney'>
                        Sydney (UTC+10)
                      </SelectItem>
                      <SelectItem value='Australia/Melbourne'>
                        Melbourne (UTC+10)
                      </SelectItem>
                      <SelectItem value='Australia/Perth'>
                        Perth (UTC+8)
                      </SelectItem>
                      <SelectItem value='UTC'>UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='dateFormat'>Date Format</Label>
                  <Select
                    value={preferences.dateFormat}
                    onValueChange={value =>
                      setPreferences({ ...preferences, dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='dd/mm/yyyy'>DD/MM/YYYY</SelectItem>
                      <SelectItem value='mm/dd/yyyy'>MM/DD/YYYY</SelectItem>
                      <SelectItem value='yyyy-mm-dd'>YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='currency'>Currency</Label>
                  <Select
                    value={preferences.currency}
                    onValueChange={value =>
                      setPreferences({ ...preferences, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='AUD'>
                        AUD - Australian Dollar
                      </SelectItem>
                      <SelectItem value='USD'>USD - US Dollar</SelectItem>
                      <SelectItem value='EUR'>EUR - Euro</SelectItem>
                      <SelectItem value='GBP'>
                        GBP - British Pound
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value='profile' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Full Name</Label>
                  <Input
                    id='name'
                    value={profile.name}
                    onChange={e =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email Address</Label>
                  <Input
                    id='email'
                    type='email'
                    value={profile.email}
                    onChange={e =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone Number</Label>
                  <Input
                    id='phone'
                    value={profile.phone}
                    onChange={e =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='company'>Company</Label>
                  <Input
                    id='company'
                    value={profile.company}
                    onChange={e =>
                      setProfile({ ...profile, company: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='currentPassword'>Current Password</Label>
                <Input id='currentPassword' type='password' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='newPassword'>New Password</Label>
                <Input id='newPassword' type='password' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>
                  Confirm New Password
                </Label>
                <Input id='confirmPassword' type='password' />
              </div>
              <Button className='w-full md:w-auto'>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value='notifications' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Email Alerts</Label>
                  <p className='text-sm text-muted-foreground'>
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={checked =>
                    setNotifications({
                      ...notifications,
                      emailAlerts: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Push Notifications</Label>
                  <p className='text-sm text-muted-foreground'>
                    Receive real-time notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={checked =>
                    setNotifications({
                      ...notifications,
                      pushNotifications: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Maintenance Reminders</Label>
                  <p className='text-sm text-muted-foreground'>
                    Get notified about upcoming vehicle maintenance
                  </p>
                </div>
                <Switch
                  checked={notifications.maintenanceReminders}
                  onCheckedChange={checked =>
                    setNotifications({
                      ...notifications,
                      maintenanceReminders: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Fine Alerts</Label>
                  <p className='text-sm text-muted-foreground'>
                    Receive notifications about traffic fines
                  </p>
                </div>
                <Switch
                  checked={notifications.fineAlerts}
                  onCheckedChange={checked =>
                    setNotifications({
                      ...notifications,
                      fineAlerts: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Toll Notifications</Label>
                  <p className='text-sm text-muted-foreground'>
                    Get notified about toll charges
                  </p>
                </div>
                <Switch
                  checked={notifications.tollNotifications}
                  onCheckedChange={checked =>
                    setNotifications({
                      ...notifications,
                      tollNotifications: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value='payments' className='space-y-6'>
          {/* Complete Setup Guide */}
          <Card className='border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-primary'>
                <CreditCard className='h-6 w-6' />
                Complete Stripe Setup Guide
              </CardTitle>
              <p className='text-sm text-primary/80'>
                Follow this step-by-step guide to accept payments in under
                10 minutes - no technical knowledge required!
              </p>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Step 1: Create Account */}
              <div className='flex items-start gap-4 p-5 bg-card rounded-xl border border-primary/20 shadow-sm'>
                <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold shadow-md'>
                  1
                </div>
                <div className='flex-1'>
                  <h4 className='font-semibold text-foreground mb-2 text-lg'>
                    Create Your Free Stripe Account
                  </h4>
                  <p className='text-sm text-muted-foreground mb-3'>
                    Sign up at <strong>stripe.com</strong> - it's completely
                    free! No setup fees, no monthly fees. You only pay a
                    small percentage when you receive payments.
                  </p>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='flex items-center gap-1 text-xs text-accent'>
                      <CheckCircle2 className='h-3 w-3' />
                      <span>Free to start</span>
                    </div>
                    <div className='flex items-center gap-1 text-xs text-accent'>
                      <CheckCircle2 className='h-3 w-3' />
                      <span>2.9% + 30¢ per transaction</span>
                    </div>
                    <div className='flex items-center gap-1 text-xs text-accent'>
                      <CheckCircle2 className='h-3 w-3' />
                      <span>Accept cards worldwide</span>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button 
                      className='bg-primary hover:bg-primary/90 text-primary-foreground'
                      onClick={() => window.open('https://dashboard.stripe.com/register', '_blank')}
                    >
                      🚀 Sign Up at Stripe.com
                    </Button>
                    <Button
                      variant='outline'
                      className='text-primary border-primary/30'
                      onClick={() => window.open('https://docs.stripe.com/keys', '_blank')}
                    >
                      ❓ Need Help?
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2: Get API Keys */}
              <div className='flex items-start gap-4 p-5 bg-card rounded-xl border border-accent/20 shadow-sm'>
                <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground rounded-full flex items-center justify-center text-lg font-bold shadow-md'>
                  2
                </div>
                <div className='flex-1'>
                  <h4 className='font-semibold text-foreground mb-2 text-lg'>
                    Get Your API Keys
                  </h4>
                  <p className='text-sm text-muted-foreground mb-3'>
                    In your Stripe Dashboard, navigate to:{' '}
                    <strong>Developers → API Keys</strong>
                  </p>
                  <div className='bg-muted rounded-lg p-4 mb-4'>
                    <h5 className='font-medium text-foreground mb-2'>
                      What to copy:
                    </h5>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2 text-sm'>
                        <div className='w-2 h-2 bg-primary rounded-full'></div>
                        <span>
                          <strong>Publishable key</strong> (starts with{' '}
                          <code className='bg-muted-foreground/20 px-1 rounded'>
                            pk_
                          </code>
                          )
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-sm'>
                        <div className='w-2 h-2 bg-destructive rounded-full'></div>
                        <span>
                          <strong>Secret key</strong> (starts with{' '}
                          <code className='bg-muted-foreground/20 px-1 rounded'>
                            sk_
                          </code>
                          ) - click "Reveal" first
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button 
                      className='bg-accent hover:bg-accent/90 text-accent-foreground'
                      onClick={openStripeDashboard}
                    >
                      📋 Open Stripe Dashboard
                    </Button>
                    <Button
                      variant='outline'
                      className='text-accent border-accent/30'
                      onClick={() => window.open('https://www.youtube.com/watch?v=UjcSWxPNo18', '_blank')}
                    >
                      🎥 Watch Video Guide
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3: Enter Keys */}
              <div className='flex items-start gap-4 p-5 bg-card rounded-xl border border-chart-3/20 shadow-sm'>
                <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-chart-3 to-chart-3/80 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md'>
                  3
                </div>
                <div className='flex-1'>
                  <h4 className='font-semibold text-foreground mb-2 text-lg'>
                    Enter Your Keys Below
                  </h4>
                  <p className='text-sm text-muted-foreground mb-3'>
                    Paste your keys in the form below and click "Save
                    Settings" - that's it! Your payment system will be ready
                    to go.
                  </p>
                  <div className='flex items-center gap-2 text-sm text-chart-3 bg-chart-3/10 p-3 rounded-lg'>
                    <Shield className='h-4 w-4' />
                    <span>
                      <strong>Security:</strong> Your keys are encrypted and
                      stored securely. We never see or store your actual
                      keys.
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4: Test */}
              <div className='flex items-start gap-4 p-5 bg-card rounded-xl border border-chart-4/20 shadow-sm'>
                <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-chart-4 to-chart-4/80 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md'>
                  4
                </div>
                <div className='flex-1'>
                  <h4 className='font-semibold text-foreground mb-2 text-lg'>
                    Test Your Setup
                  </h4>
                  <p className='text-sm text-muted-foreground mb-3'>
                    Use Stripe's test card numbers to make sure everything
                    works perfectly before going live!
                  </p>
                  <div className='bg-chart-4/10 rounded-lg p-4 mb-4'>
                    <h5 className='font-medium text-chart-4 mb-2'>
                      Test Card Details:
                    </h5>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 text-sm'>
                      <div>
                        <span className='text-chart-4 font-medium'>
                          Card Number:
                        </span>
                        <div className='font-mono bg-card p-2 rounded border mt-1'>
                          4242 4242 4242 4242
                        </div>
                      </div>
                      <div>
                        <span className='text-chart-4 font-medium'>
                          Expiry:
                        </span>
                        <div className='font-mono bg-card p-2 rounded border mt-1'>
                          Any future date
                        </div>
                      </div>
                      <div>
                        <span className='text-chart-4 font-medium'>
                          CVC:
                        </span>
                        <div className='font-mono bg-card p-2 rounded border mt-1'>
                          Any 3 digits
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className='bg-chart-4 hover:bg-chart-4/90 text-white'
                    onClick={openTestPage}
                  >
                    🧪 Test Integration
                  </Button>
                </div>
              </div>

              {/* Success Message */}
              <div className='p-5 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20'>
                <div className='flex items-start gap-4'>
                  <CheckCircle2 className='h-8 w-8 text-accent mt-1' />
                  <div>
                    <h4 className='font-semibold text-accent text-lg mb-2'>
                      🎉 You're All Set!
                    </h4>
                    <p className='text-sm text-accent/80 mb-3'>
                      Once you complete these steps, you'll be ready to
                      accept payments from customers worldwide! Your
                      FleetSync dashboard will automatically process
                      payments and update rental statuses.
                    </p>
                    <div className='flex items-center gap-4 text-xs text-accent'>
                      <div className='flex items-center gap-1'>
                        <CheckCircle2 className='h-3 w-3' />
                        <span>Accept credit cards</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <CheckCircle2 className='h-3 w-3' />
                        <span>Automatic processing</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <CheckCircle2 className='h-3 w-3' />
                        <span>Real-time notifications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simplified Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CreditCard className='h-5 w-5' />
                Stripe API Keys
              </CardTitle>
              <p className='text-sm text-muted-foreground'>
                Just paste your Stripe keys here - we'll handle the rest
                automatically!
              </p>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Environment Toggle */}
              <div className='flex items-center justify-center p-4 bg-muted/50 rounded-lg'>
                <div className='flex items-center gap-4'>
                  <Label className='text-sm font-medium'>
                    Environment:
                  </Label>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant={
                        paymentSettings.testMode ? 'default' : 'outline'
                      }
                      size='sm'
                      onClick={() =>
                        setPaymentSettings({
                          ...paymentSettings,
                          testMode: true,
                        })
                      }
                      className='h-8'
                    >
                      Test Mode
                    </Button>
                    <Button
                      variant={
                        !paymentSettings.testMode ? 'default' : 'outline'
                      }
                      size='sm'
                      onClick={() =>
                        setPaymentSettings({
                          ...paymentSettings,
                          testMode: false,
                        })
                      }
                      className='h-8'
                    >
                      Live Mode
                    </Button>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-6'>
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Label
                      htmlFor='stripePublishableKey'
                      className='text-base font-medium'
                    >
                      Publishable Key
                    </Label>
                    <Badge variant='outline' className='text-xs'>
                      Safe to share
                    </Badge>
                  </div>
                  <div className='relative'>
                    <Input
                      id='stripePublishableKey'
                      value={paymentSettings.stripePublishableKey}
                      onChange={e =>
                        setPaymentSettings({
                          ...paymentSettings,
                          stripePublishableKey: e.target.value,
                        })
                      }
                      placeholder={
                        paymentSettings.testMode
                          ? 'pk_test_...'
                          : 'pk_live_...'
                      }
                      className={`font-mono text-sm pr-10 ${
                        paymentSettings.stripePublishableKey && !paymentSettings.stripePublishableKey.startsWith('pk_')
                          ? 'border-red-300 focus:border-red-500'
                          : paymentSettings.stripePublishableKey && paymentSettings.stripePublishableKey.startsWith('pk_')
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                      }`}
                    />
                    {paymentSettings.stripePublishableKey && (
                      <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                        {paymentSettings.stripePublishableKey.startsWith('pk_') ? (
                          <CheckCircle2 className='h-4 w-4 text-green-500' />
                        ) : (
                          <AlertTriangle className='h-4 w-4 text-red-500' />
                        )}
                      </div>
                    )}
                  </div>
                  <div className='flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20'>
                    <div className='text-primary mt-0.5'>
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <div className='text-xs text-primary/80'>
                      <strong>Where to find:</strong> Stripe Dashboard →
                      Developers → API keys → Publishable key
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Label
                      htmlFor='stripeSecretKey'
                      className='text-base font-medium'
                    >
                      Secret Key
                    </Label>
                    <Badge variant='destructive' className='text-xs'>
                      Keep private
                    </Badge>
                  </div>
                  <div className='relative'>
                    <Input
                      id='stripeSecretKey'
                      type={showStripeSecret ? 'text' : 'password'}
                      value={paymentSettings.stripeSecretKey}
                      onChange={e =>
                        setPaymentSettings({
                          ...paymentSettings,
                          stripeSecretKey: e.target.value,
                        })
                      }
                      placeholder={
                        paymentSettings.testMode
                          ? 'sk_test_...'
                          : 'sk_live_...'
                      }
                      className={`font-mono text-sm pr-20 ${
                        paymentSettings.stripeSecretKey && !paymentSettings.stripeSecretKey.startsWith('sk_')
                          ? 'border-red-300 focus:border-red-500'
                          : paymentSettings.stripeSecretKey && paymentSettings.stripeSecretKey.startsWith('sk_')
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                      }`}
                    />
                    <div className='absolute right-0 top-0 h-full flex items-center'>
                      {paymentSettings.stripeSecretKey && (
                        <div className='mr-2'>
                          {paymentSettings.stripeSecretKey.startsWith('sk_') ? (
                            <CheckCircle2 className='h-4 w-4 text-green-500' />
                          ) : (
                            <AlertTriangle className='h-4 w-4 text-red-500' />
                          )}
                        </div>
                      )}
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowStripeSecret(!showStripeSecret)}
                      >
                        {showStripeSecret ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20'>
                    <div className='text-destructive mt-0.5'>
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <div className='text-xs text-destructive/80'>
                      <strong>Security:</strong> This key gives full access
                      to your Stripe account. Never share it publicly.
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-configuration notice */}
              <div className='p-4 bg-accent/10 rounded-lg border border-accent/20'>
                <div className='flex items-start gap-2'>
                  <CheckCircle2 className='h-4 w-4 text-accent mt-0.5' />
                  <div className='text-sm text-accent/80'>
                    <strong>Auto-Configuration:</strong> Webhooks, payment
                    references, and security settings will be configured
                    automatically when you save.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration Status</CardTitle>
              <p className='text-sm text-muted-foreground'>
                Monitor your Stripe integration and payment processing
              </p>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Stripe Connection</Label>
                  <div className='flex items-center gap-2'>
                    {paymentSettings.stripePublishableKey &&
                    paymentSettings.stripeSecretKey ? (
                      <>
                        <CheckCircle2 className='h-4 w-4 text-accent' />
                        <span className='text-sm'>Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className='h-4 w-4 text-destructive' />
                        <span className='text-sm'>Not Configured</span>
                      </>
                    )}
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>Mode</Label>
                  <div className='flex items-center gap-2'>
                    {paymentSettings.testMode ? (
                      <Badge
                        variant='outline'
                        className='bg-primary/10 text-primary'
                      >
                        Test Mode
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='bg-secondary/10 text-secondary-foreground'
                      >
                        Live Mode
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>Last Payment Received</Label>
                  <p className='text-sm font-mono bg-muted p-2 rounded'>
                    2024-01-15 14:30:25
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label>Total Payments Today</Label>
                  <p className='text-sm font-mono bg-muted p-2 rounded'>
                    $2,450.00
                  </p>
                </div>
              </div>

              <Separator />

              <div className='space-y-2'>
                <Label>Test Integration</Label>
                <p className='text-sm text-muted-foreground mb-2'>
                  Test your Stripe integration with a sample payment
                </p>
                <div className='flex gap-2'>
                  <Button 
                    variant='outline' 
                    className='flex-1 md:flex-none'
                    onClick={handleTestStripe}
                    disabled={isTestingStripe}
                  >
                    {isTestingStripe ? 'Testing...' : 'Test Payment'}
                  </Button>
                  <Button 
                    variant='outline' 
                    className='flex-1 md:flex-none'
                    onClick={openStripeDashboard}
                  >
                    View Stripe Dashboard
                  </Button>
                </div>
                {stripeTestResult && (
                  <div className={`mt-2 p-3 rounded-lg text-sm ${
                    stripeTestResult.startsWith('✅') 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {stripeTestResult}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value='security' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='h-4 w-4 text-accent' />
                      <span className='font-medium'>
                        Two-Factor Authentication
                      </span>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className='bg-accent/10 text-accent'
                  >
                    Enabled
                  </Badge>
                </div>

                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4 text-destructive' />
                      <span className='font-medium'>Session Timeout</span>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Automatically log out after 30 minutes of inactivity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <Shield className='h-4 w-4 text-primary' />
                      <span className='font-medium'>
                        Login Notifications
                      </span>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Get notified when someone logs into your account
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='font-medium'>Recent Login Activity</h4>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>Current Session</p>
                      <p className='text-xs text-muted-foreground'>
                        Sydney, Australia • Chrome on macOS
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-accent/10 text-accent'
                    >
                      Active
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
                    <div>
                      <p className='text-sm font-medium'>
                        Yesterday, 2:30 PM
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Melbourne, Australia • Safari on iPhone
                      </p>
                    </div>
                    <Badge variant='outline'>Ended</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value='system' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Application Version</Label>
                  <p className='text-sm font-mono bg-muted p-2 rounded'>
                    v2.1.0
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label>Last Updated</Label>
                  <p className='text-sm font-mono bg-muted p-2 rounded'>
                    2024-01-15
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label>Database Status</Label>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-600' />
                    <span className='text-sm'>Connected</span>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>API Status</Label>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-600' />
                    <span className='text-sm'>Operational</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-1'>
                    <span className='font-medium'>Export Data</span>
                    <p className='text-sm text-muted-foreground'>
                      Download all your fleet data as CSV or JSON
                    </p>
                  </div>
                  <Button variant='outline'>Export</Button>
                </div>

                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-1'>
                    <span className='font-medium'>Backup Settings</span>
                    <p className='text-sm text-muted-foreground'>
                      Automatically backup your data daily
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className='flex items-center justify-between p-4 border rounded-lg border-red-200'>
                  <div className='space-y-1'>
                    <span className='font-medium text-red-600'>
                      Delete Account
                    </span>
                    <p className='text-sm text-muted-foreground'>
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant='destructive'>Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>

          {/* Save/Reset Actions */}
          <div className='flex items-center justify-between p-6 bg-card border rounded-lg shadow-sm'>
            <div className='flex-1'>
              {saveMessage && (
                <div className={`text-sm font-medium ${
                  saveMessage.includes('Error') || saveMessage.includes('Failed')
                    ? 'text-red-600'
                    : saveMessage.includes('successfully') || saveMessage.includes('reset')
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={handleResetSettings}
                disabled={isSaving}
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className='min-w-[120px]'
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
