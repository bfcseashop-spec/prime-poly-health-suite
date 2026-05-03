import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Stethoscope, FileText, FlaskConical, ScanLine, Activity, Receipt, BarChart3, Settings, Wallet, ShieldCheck, CreditCard, History, Layers, PillBottle, BedDouble, UserCog, TrendingUp, Landmark, UserPlus } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader } from "@/components/ui/sidebar";
import { ClinicLogo } from "./ClinicLogo";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: any; roles?: AppRole[]; color?: string };

// Bright colors that pop on the dark teal sidebar bg
const main: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-sky-300" },
  { title: "POS / Billing", url: "/pos", icon: Receipt, color: "text-amber-300", roles: ["admin","pharmacist","receptionist","accountant"] },
  { title: "Patients", url: "/patients", icon: Users, color: "text-violet-300", roles: ["admin","doctor","nurse","receptionist","accountant"] },
  { title: "Doctor Management", url: "/doctors", icon: UserPlus, color: "text-emerald-300", roles: ["admin","receptionist","accountant"] },
  { title: "OPD Queue", url: "/opd", icon: Stethoscope, color: "text-teal-200", roles: ["admin","doctor","nurse","receptionist"] },
  { title: "IPD / Admissions", url: "/ipd", icon: BedDouble, color: "text-indigo-300", roles: ["admin","doctor","nurse","receptionist"] },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, color: "text-blue-300", roles: ["admin","doctor"] },
  { title: "Medicines", url: "/medicines", icon: PillBottle, color: "text-rose-300", roles: ["admin","pharmacist"] },
  { title: "Due Management", url: "/due-management", icon: CreditCard, color: "text-orange-300", roles: ["admin","accountant","receptionist","pharmacist"] },
  { title: "Invoice History", url: "/invoices", icon: History, color: "text-cyan-200", roles: ["admin","accountant","receptionist","pharmacist"] },
];
const future: Item[] = [
  { title: "Laboratory", url: "/lab", icon: FlaskConical, color: "text-fuchsia-300", roles: ["admin","lab_tech"] },
  { title: "X-Ray", url: "/xray", icon: ScanLine, color: "text-cyan-300", roles: ["admin","lab_tech"] },
  { title: "Services & Packages", url: "/services", icon: Layers, color: "text-pink-300", roles: ["admin","accountant","receptionist","pharmacist","nurse"] },
  { title: "Operation Theater", url: "/ot", icon: Activity, color: "text-red-300", roles: ["admin","doctor","nurse"] },
  { title: "Expenses", url: "/expenses", icon: Wallet, color: "text-yellow-300", roles: ["admin","accountant"] },
  { title: "Insurance", url: "/insurance", icon: ShieldCheck, color: "text-green-300", roles: ["admin","accountant","receptionist"] },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "text-purple-300", roles: ["admin","accountant"] },
  { title: "Staff", url: "/staff", icon: UserCog, color: "text-blue-300", roles: ["admin"] },
  { title: "Investment", url: "/investment", icon: TrendingUp, color: "text-emerald-300", roles: ["admin"] },
  { title: "Bank Transactions", url: "/bank-transactions", icon: Landmark, color: "text-indigo-300", roles: ["admin","accountant"] },
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
            "group/item rounded-lg transition-all my-0.5 text-sidebar-foreground/90 hover:bg-white/10 hover:text-white",
            active && "bg-white/15 text-white font-semibold shadow-md border-l-4 border-white hover:bg-white/20"
          )}
        >
          <NavLink to={it.url} className="flex items-center gap-3">
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md shrink-0 transition-all bg-white/10 group-hover/item:bg-white/20",
              active && "bg-white/25"
            )}>
              <it.icon className={cn("h-4 w-4", it.color)} />
            </span>
            {!collapsed && <span className="truncate text-sm">{it.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-white/10 p-4 bg-black/10">
        <ClinicLogo variant="light" showText={!collapsed} size={collapsed ? "sm" : "md"} />
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-white/60 px-2">Main</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{main.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-white/60 px-2 mt-2">Departments</SidebarGroupLabel>}
          <SidebarGroupContent><SidebarMenu>{future.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-white/60 px-2 mt-2">System</SidebarGroupLabel>}
            <SidebarGroupContent><SidebarMenu>{renderItem({ title: "Settings", url: "/settings", icon: Settings, color: "text-slate-200" })}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
