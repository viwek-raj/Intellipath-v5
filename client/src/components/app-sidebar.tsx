"use client"

import * as React from "react"
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  User,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    
    // Add active state logic
    const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Intellipath </span>
                  <span className="truncate text-xs">Learning Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-2 px-2">
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard')} tooltip="Dashboard">
                    <Link href="/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/courses/create')} tooltip="Create Course">
                    <Link href="/courses/create">
                        <PlusCircle />
                        <span>Create Course</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/my-learning')} tooltip="My Learning">
                     <Link href="/dashboard">
                        <BookOpen />
                        <span>My Learning</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Settings">
                    <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <div className="p-2">
            <div className="flex items-center justify-between mb-4 px-2">
                 <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Theme</span>
                 <ModeToggle />
            </div>
            {user && (
                <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                            <User className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{user.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={logout} 
                        className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            )}
         </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
