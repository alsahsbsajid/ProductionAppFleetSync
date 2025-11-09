"use client";

import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
  return (
      <div className="min-h-screen bg-gradient-surface">
        {/* Modern Loading Header */}
        <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-64 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>

        {/* Modern Loading Sidebar */}
        <div className="flex">
          <div className="hidden lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border/50 bg-sidebar/50 backdrop-blur-sm px-6 py-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modern Loading Content */}
          <div className="flex-1">
            <div className="p-6 lg:p-8 xl:p-12">
              <div className="mx-auto max-w-7xl space-y-8">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-80 rounded-xl" />
                  <Skeleton className="h-6 w-96 rounded-lg" />
                </div>
                
                {/* Stats Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/50 bg-card/50 p-6">
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-5 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-lg" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/50 bg-card/50 p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-32 rounded-lg" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gradient-surface flex w-full">
        {/* Sidebar */}
        <AppSidebar />
        
        {/* Main content area */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header with proper z-index below sidebar */}
          <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-supports-[backdrop-filter]:bg-background/60">
            <DashboardHeader />
          </div>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}