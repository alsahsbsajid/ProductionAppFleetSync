"use client";

import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User, 
  Moon, 
  Sun, 
  Menu,
  Truck,
  Users,
  Route,
  BarChart3,
  Calendar,
  MessageSquare,
  X,
  Check,
  Trash2
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const searchSuggestions = [
  { icon: Truck, label: "Vehicle Fleet Overview", category: "Vehicles" },
  { icon: Users, label: "Driver Management", category: "Drivers" },
  { icon: Route, label: "Route Optimization", category: "Routes" },
  { icon: BarChart3, label: "Analytics Dashboard", category: "Reports" },
  { icon: Calendar, label: "Maintenance Schedule", category: "Maintenance" },
  { icon: MessageSquare, label: "Communication Center", category: "Messages" },
];

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const { setTheme, theme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, remove } = useNotifications();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  return (
    <header className="nav-apple sticky top-0 z-50 w-full border-b border-border/20 transition-all duration-300">
      <div className="container flex h-16 items-center px-6">
        {/* Left Section - Sidebar Toggle Only */}
        <div className="flex items-center">
          <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-black/5 transition-all duration-200 hover:scale-105" />
        </div>

        {/* Center Section - Fixed Apple-style Search */}
        <div className="flex-1 flex justify-center px-6">
          <div className="w-full max-w-2xl">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-hover:text-foreground group-hover:scale-110" />
              <Input
                  placeholder="Search vehicles, drivers, routes, analytics..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                className={cn(
                    "pl-12 pr-16 h-11 bg-white/80 border-border/30 rounded-2xl shadow-sm",
                    "transition-all duration-300 ease-out",
                    "hover:bg-white hover:border-border/60 hover:shadow-md",
                    "focus:bg-white focus:border-primary/60 focus:ring-4 focus:ring-primary/10",
                    "placeholder:text-muted-foreground/60 font-medium",
                    "backdrop-blur-sm"
                  )}
              />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs px-2 py-1 rounded-lg bg-muted/80 border-0 font-medium">
                    ⌘K
                  </Badge>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[600px] p-0 rounded-2xl border-border/30 shadow-2xl glass-card" align="center">
              <Command>
                <CommandInput 
                  placeholder="Search across your fleet..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className="border-none focus:ring-0"
                />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Quick Actions">
                    {searchSuggestions.map((item, index) => (
                      <CommandItem key={index} className="flex items-center space-x-3 px-4 py-3 rounded-xl mx-2 my-1 hover:bg-muted/30 transition-all duration-200">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs text-muted-foreground font-medium">{item.category}</div>
            </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          </div>
        </div>

        {/* Right Section - Apple-style Controls */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 rounded-xl hover:bg-black/5 transition-all duration-200 hover:scale-105"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center shadow-lg"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-auto p-1 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-80">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                        !notification.read && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "text-sm font-medium",
                              !notification.read && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => remove(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-xl hover:bg-black/5 transition-all duration-200 hover:scale-105"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-xl hover:bg-black/5 transition-all duration-200 hover:scale-105"
          >
            <Settings className="h-5 w-5" />
              </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 rounded-full hover:bg-black/5 transition-all duration-200 hover:scale-105"
              >
                <Avatar className="h-9 w-9 shadow-md">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-64 rounded-2xl border-border/30 glass-card shadow-2xl" 
              align="end" 
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">
                        {user?.user_metadata?.full_name || "Fleet Manager"}
                  </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs badge-apple badge-info">
                      Admin
                    </Badge>
                    <Badge variant="outline" className="text-xs badge-apple badge-success">
                      Online
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="p-3 cursor-pointer hover:bg-black/5 transition-all duration-200 rounded-xl mx-2 my-1">
                <User className="mr-3 h-4 w-4" />
                <span className="font-medium">Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer hover:bg-black/5 transition-all duration-200 rounded-xl mx-2 my-1">
                <Settings className="mr-3 h-4 w-4" />
                <span className="font-medium">Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="p-3 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl mx-2 my-1"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
