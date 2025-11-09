"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  BarChart3,
  Settings,
  Calendar,
  DollarSign,
  Receipt,
  Car,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Fleet",
    url: "/fleet",
    icon: Truck,
  },
  {
    title: "Rentals",
    url: "/rentals",
    icon: Calendar,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Tolls",
    url: "/tolls",
    icon: Receipt,
  },
  {
    title: "Payments",
    url: "/fleet/payments",
    icon: DollarSign,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/20 sidebar-apple"
      {...props}
    >
      <SidebarHeader className="border-b border-border/20 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold text-foreground font-display tracking-tight">FleetSync</span>
            <span className="truncate text-xs text-muted-foreground font-medium">Fleet Management</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link 
                    href={item.url} 
                    className={cn(
                      "menu-item-apple flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium",
                      "text-foreground/80",
                      "hover:bg-black/5 hover:text-foreground",
                      "transition-all duration-200 ease-out",
                      "hover:scale-[1.02] hover:shadow-sm",
                      isActive && [
                        "bg-primary text-primary-foreground shadow-md",
                        "hover:bg-primary/90"
                      ],
                      "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}
