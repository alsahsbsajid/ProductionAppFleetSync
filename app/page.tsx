"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  Users, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  Fuel,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Navigation,
  Shield,
  Zap,
  Bell
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { notificationService } from "@/lib/notification-service";

// Dynamically import the dashboard overview to avoid SSR issues
const DashboardOverview = dynamic(
  () => import("@/components/dashboard-overview").then(mod => ({ default: mod.DashboardOverview })),
  {
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
    ssr: false,
  }
);

function getCurrentDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

// Mock data for demonstration
const fleetStats = [
  {
    title: "Total Vehicles",
    value: "247",
    change: "+12%",
    trend: "up",
    icon: Truck,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Active Drivers",
    value: "189",
    change: "+5%",
    trend: "up",
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Revenue Today",
    value: "$24,580",
    change: "+18%",
    trend: "up",
    icon: DollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Fuel Efficiency",
    value: "8.2L/100km",
    change: "-3%",
    trend: "down",
    icon: Fuel,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

const quickActions = [
  {
    title: "Add New Vehicle",
    description: "Register a new vehicle to your fleet",
    icon: Plus,
    variant: "default" as const,
    color: "bg-gradient-primary",
  },
  {
    title: "Manage Drivers",
    description: "View and manage driver profiles",
    icon: Users,
    variant: "outline" as const,
    color: "bg-gradient-accent",
  },
  {
    title: "Route Planning",
    description: "Optimize routes for efficiency",
    icon: Navigation,
    variant: "outline" as const,
    color: "bg-gradient-surface",
  },
  {
    title: "Fleet Analytics",
    description: "View detailed performance metrics",
    icon: BarChart3,
    variant: "outline" as const,
    color: "bg-gradient-surface",
  },
];

const alerts = [
  {
    type: "warning",
    title: "Maintenance Due",
    message: "3 vehicles require scheduled maintenance",
    time: "2 hours ago",
    icon: AlertTriangle,
  },
  {
    type: "info",
    title: "Route Optimization",
    message: "New efficient route suggested for Zone A",
    time: "4 hours ago",
    icon: MapPin,
  },
  {
    type: "success",
    title: "Fuel Savings",
    message: "15% fuel cost reduction this month",
    time: "1 day ago",
    icon: Fuel,
  },
];

export default function DashboardPage() {
  const { date, time } = getCurrentDateTime();

  return (
    <div className="w-full">
      {/* Hero Section with Apple-inspired Design */}
      <div className="bg-gradient-to-br from-background via-background/95 to-muted/20 border-b border-border/20">
        <div className="px-6 lg:px-8 xl:px-12 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-8 lg:space-y-0">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-display">
                      Fleet Dashboard
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium mt-2">
                      Real-time insights and fleet management
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">{time}</span>
                  </div>
                  <Badge variant="outline" className="flex items-center space-x-2 badge-apple badge-success">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live Data</span>
                  </Badge>
                </div>
              </div>
              
              {/* Apple-style Quick Actions */}
              <div className="flex flex-wrap gap-3">
                {quickActions.map((action, index) => (
                  <Button 
                    key={index}
                    variant={action.variant}
                    className={cn(
                      "flex items-center space-x-3 h-12 px-6 rounded-2xl transition-all duration-300 ease-out font-medium",
                      "hover:scale-105 hover:shadow-lg",
                      action.variant === "default" && "bg-gradient-primary hover:shadow-primary/25 shadow-md",
                      action.variant === "outline" && "hover:bg-white/80 hover:shadow-md border-border/30 backdrop-blur-sm"
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{action.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-8 xl:px-12 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Apple-style Metrics Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fleetStats.map((stat, index) => (
              <Card key={index} className="card-apple group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-out border-border/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold tracking-tight font-display">
                        {stat.value}
                      </p>
                      <div className="flex items-center space-x-2">
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className={cn(
                          "text-sm font-semibold",
                          stat.trend === "up" ? "text-green-600" : "text-red-600"
                        )}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">vs last month</span>
                      </div>
                    </div>
                    <div className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm",
                      stat.bgColor
                    )}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Apple-style Alerts */}
          <Card className="card-apple border-border/20">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3 font-display">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Fleet Alerts</span>
                </CardTitle>
                <Badge variant="secondary" className="badge-apple badge-info">{alerts.length} active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-all duration-200 hover:scale-[1.01]">
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl shadow-sm",
                      alert.type === "warning" && "bg-orange-100 text-orange-600",
                      alert.type === "info" && "bg-blue-100 text-blue-600",
                      alert.type === "success" && "bg-green-100 text-green-600"
                    )}>
                      <alert.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{alert.title}</h4>
                        <span className="text-xs text-muted-foreground font-medium">{alert.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border/20">
                <Button 
                  variant="outline" 
                  className="w-full justify-center border-border/50 hover:bg-muted/50 transition-all duration-200"
                  onClick={() => {
                    notificationService.success('Test Notification', 'This is a test notification to demonstrate the notification system!');
                    notificationService.warning('Maintenance Due', 'Vehicle ABC-123 is due for maintenance in 2 days.');
                    notificationService.info('New Driver Added', 'John Doe has been added to your fleet.');
                  }}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Notifications
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Charts and Analytics */}
          <Suspense fallback={
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="card-apple border-border/20">
                  <CardHeader>
                    <div className="h-6 bg-muted/30 rounded-xl w-1/3 animate-shimmer"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted/30 rounded-2xl animate-shimmer"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }>
            <DashboardOverview />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
