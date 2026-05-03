import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Stethoscope, FileText, Pill, FlaskConical, ScanLine, Activity, Receipt, BarChart3, Settings, Wallet, ShieldCheck, CreditCard, History, Layers, PillBottle, BedDouble, UserCog, TrendingUp, Landmark, UserPlus } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader } from "@/components/ui/sidebar";
import { ClinicLogo } from "./ClinicLogo";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: any; roles?: AppRole[]; color?: string };

const main: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-sky-500" },
  { title: "Patients", url: "/patients", icon: Users, color: "text-violet-500", roles: ["admin","doctor","nurse","receptionist","accountant"] },
  { title: "Doctor Management", url: "/doctors", icon: UserPlus, color: "text-emerald-500", roles: ["admin","receptionist","accountant"] },
  { title: "OPD Queue", url: "/opd", icon: Stethoscope, color: "text-teal-500", roles: ["admin","doctor","nurse","receptionist"] },
  { title: "IPD / Admissions", url: "/ipd", icon: BedDouble, color: "text-indigo-500", roles: ["admin","doctor","nurse","receptionist"] },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "text-blue-500", roles: ["admin","doctor"] },
  { title: "Medicines", url: "/medicines", icon: PillBottle, color: "text-rose-500", roles: ["admin","pharmacist"] },
  { title: "POS / Billing", url: "/pos", icon: Receipt, color: "text-amber-500", roles: ["admin","pharmacist","receptionist","accountant"] },
  { title: "Due Management", url: "/due-management", icon: CreditCard, color: "text-orange-500", roles: ["admin","accountant","receptionist","pharmacist"] },
  { title: "Invoice History", url: "/invoices", icon: History, color: "text-slate-500", roles: ["admin","accountant","receptionist","pharmacist"] },
];
const future: Item[] = [
  { title: "Laboratory", url: "/lab", icon: FlaskConical, color: "text-fuchsia-500", roles: ["admin","lab_tech"] },
  { title: "X-Ray", url: "/xray", icon: ScanLine, color: "text-cyan-500", roles: ["admin","lab_tech"] },
  { title: "Services & Packages", url: "/services", icon: Layers, color: "text-pink-500", roles: ["admin","accountant","receptionist","pharmacist","nurse"] },
  { title: "Operation Theater", url: "/ot", icon: Activity, color: "text-red-500", roles: ["admin","doctor","nurse"] },
  { title: "Expenses", url: "/expenses", icon: Wallet, color: "text-yellow-600", roles: ["admin","accountant"] },
  { title: "Insurance", url: "/insurance", icon: ShieldCheck, color: "text-green-600", roles: ["admin","accountant","receptionist"] },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "text-purple-500", roles: ["admin","accountant"] },
  { title: "Staff", url: "/staff", icon: UserCog, color: "text-blue-600", roles: ["admin"] },
  { title: "Investment", url: "/investment", icon: TrendingUp, color: "text-emerald-600", roles: ["admin"] },
  { title: "Bank Transactions", url: "/bank-transactions", icon: Landmark, color: "text-indigo-600", roles: ["admin","accountant"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { roles: userRoles } = useAuth();
  const isAdmin = userRoles.includes("admin");
  const can = (it: Item) => !it.roles || isAdmin || it.roles.some(r => userRoles.includes(r));

  const renderItem = (it: Item) => {
    const active = pathname === it.url || (it.url !== "/" && pathname.startsWith(it.url));
    return (
      <SidebarMenuItem key={it.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={it.title}
          className={cn(
            "group/item rounded-lg transition-all my-0.5",
            active && "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-sm border-l-2 border-primary"
          )}
        >
          <NavLink to={it.url} className="flex items-center gap-3">
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md shrink-0 transition-all",
              active ? "bg-primary/15" : "bg-muted/50 group-hover/item:bg-muted"
            )}>
              <it.icon className={cn("h-4 w-4", active ? "text-primary" : it.color)} />
            </span>
            {!collapsed && <span className="truncate text-sm">{it.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <ClinicLogo variant="light" showText={!collapsed} size={collapsed ? "sm" : "md"} />
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Main</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{main.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Departments</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{future.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">System</SidebarGroupLabel>}
            <SidebarGroupContent><SidebarMenu>{renderItem({ title: "Settings", url: "/settings", icon: Settings, color: "text-slate-500" })}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
