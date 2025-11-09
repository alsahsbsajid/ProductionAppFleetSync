'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerProvider } from '@/components/service-worker-provider';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorHandler } from '@/components/error-handler';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AuthProvider } from '@/hooks/use-auth';

const PUBLIC_ROUTES = ['/login', '/signup'];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  return (
    <ErrorBoundary>
      <GlobalErrorHandler />
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange
      >
        <ServiceWorkerProvider>
          <AuthProvider>
            {isPublicRoute ? (
              children
            ) : (
              <DashboardLayout>{children}</DashboardLayout>
            )}
          </AuthProvider>
          <Toaster />
        </ServiceWorkerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}