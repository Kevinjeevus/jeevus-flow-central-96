
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Package,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  FileText,
  Users,
  UserCheck,
  Target,
  Gift,
  UserPlus,
  DollarSign,
  CreditCard,
  Receipt,
  Percent,
  BarChart3,
  TrendingDown,
  UserCog,
  Clock,
  Calculator,
  Settings,
  ChevronDown,
  ChevronRight,
  MapPin,
  Building2,
  Wallet,
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingBag,
  Tag,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Sales",
    icon: TrendingUp,
    children: [
      { title: "Sales Overview", url: "/sales", icon: TrendingUp },
      { title: "Sale Invoices", url: "/sale-invoices", icon: FileText },
      { title: "Estimate/Quotation", url: "/estimate-quotation", icon: Calculator },
      { title: "Proforma Invoice", url: "/proforma-invoice", icon: FileText },
      { title: "Payment In", url: "/payment-in", icon: DollarSign },
      { title: "Sale Order", url: "/sale-order", icon: ShoppingCart },
      { title: "Kevin Sales Center", url: "/kevin-sales", icon: ShoppingBag },
      { title: "Delivery Challan", url: "/delivery-challan", icon: Package },
      { title: "Sale Return/Credit Note", url: "/sale-return", icon: Receipt },
    ],
  },
  {
    title: "Offers",
    icon: Tag,
    children: [
      { title: "Discounts", url: "/offers?tab=discounts", icon: Percent },
      { title: "Gifts", url: "/offers?tab=gifts", icon: Gift },
      { title: "Coupons", url: "/offers?tab=coupons", icon: Tag },
    ],
  },
  {
    title: "Inventory & Products",
    icon: Package,
    children: [
      { title: "Products", url: "/products", icon: Package },
      { title: "Inventory", url: "/inventory", icon: Warehouse },
      { title: "Online Store", url: "/online-store", icon: Store },
      { title: "Routes", url: "/routes", icon: MapPin },
    ],
  },
  {
    title: "Purchase",
    icon: ShoppingCart,
    children: [
      { title: "Purchases", url: "/purchases", icon: ShoppingCart },
      { title: "Purchase Bills", url: "/purchase-bills", icon: FileText },
      { title: "Payment-Out", url: "/payment-out", icon: ArrowUpCircle },
      { title: "Purchase Order", url: "/purchase-order", icon: ShoppingCart },
      { title: "Purchase Return/Dr. Note", url: "/purchase-return", icon: ArrowDownCircle },
      { title: "Suppliers", url: "/suppliers", icon: Users },
    ],
  },
  {
    title: "Customer Management",
    icon: Users,
    children: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Invoices", url: "/invoices", icon: FileText },
    ],
  },
  {
    title: "CRM",
    icon: UserCheck,
    children: [
      { title: "CRM", url: "/crm", icon: UserCheck },
      { title: "Leads", url: "/leads", icon: Target },
      { title: "Opportunities", url: "/opportunities", icon: Gift },
      { title: "Sales Team", url: "/sales-team", icon: UserPlus },
    ],
  },
  {
    title: "Money",
    icon: Wallet,
    children: [
      { title: "Bank Accounts", url: "/money/bank-accounts", icon: Building2 },
      { title: "Cash In Hand", url: "/money/cash-in-hand", icon: Banknote },
      { title: "Cheques", url: "/money/cheques", icon: Receipt },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    children: [
      { title: "Finance", url: "/finance", icon: DollarSign },
      { title: "Accounts", url: "/accounts", icon: CreditCard },
      { title: "Payments", url: "/payments", icon: Receipt },
      { title: "GST", url: "/gst", icon: Percent },
      { title: "Bank Analysis", url: "/bank-analysis", icon: TrendingDown },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "HRM",
    icon: UserCog,
    children: [
      { title: "HRM", url: "/hrm", icon: UserCog },
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Attendance", url: "/attendance", icon: Clock },
      { title: "Attendance History", url: "/attendance-history", icon: Clock },
      { title: "Admin Attendance", url: "/admin-attendance", icon: Clock },
      { title: "Payroll", url: "/payroll", icon: Calculator },
      { title: "Expenses", url: "/expenses", icon: Calculator },
    ],
  },
  {
    title: "Administration",
    icon: Settings,
    children: [
      { title: "Administration", url: "/administration", icon: Settings },
    ],
  },
];

export function ErpSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleLogout = async () => {
    if (isMobile) setOpenMobile(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Auto-close mobile sidebar on navigation
  const handleMobileClose = () => {
    if (isMobile) setOpenMobile(false);
  };
  
  // Initialize open groups - expand groups that contain the current route
  const getInitialOpenGroups = () => {
    const openGroups: string[] = [];
    menuItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.url === currentPath);
        if (hasActiveChild) {
          openGroups.push(item.title);
        }
      }
    });
    return openGroups;
  };
  
  const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups());

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(group => group !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  return (
    <Sidebar className={cn("border-r", collapsed ? "w-14" : "w-60")} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-primary text-white font-bold text-sm shrink-0">
            J
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground">JEEVUS</h1>
              <p className="text-xs text-sidebar-foreground/70">ERP System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            if (item.children) {
              const isGroupOpen = openGroups.includes(item.title);
              
              return (
                <SidebarMenuItem key={item.title}>
                  <Collapsible open={isGroupOpen} onOpenChange={() => toggleGroup(item.title)}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between hover:bg-sidebar-accent/50">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                        {!collapsed && (
                          isGroupOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent className="space-y-1">
                        <div className="ml-6 space-y-1">
                          {item.children.map((child) => (
                            <SidebarMenuButton key={child.title} asChild size="sm">
                              <NavLink to={child.url} className={getNavCls} onClick={handleMobileClose}>
                                <child.icon className="h-4 w-4" />
                                <span>{child.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} className={getNavCls} onClick={handleMobileClose}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 safe-bottom">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
