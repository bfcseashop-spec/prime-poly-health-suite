import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Stethoscope, FileText, Pill, FlaskConical, ScanLine, Activity, Receipt, BarChart3, Settings, Wallet, ShieldCheck, CreditCard, History, Layers, PillBottle, BedDouble } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader } from "@/components/ui/sidebar";
import { ClinicLogo } from "./ClinicLogo";
import { useAuth, AppRole } from "@/contexts/AuthContext";

type Item = { title: string; url: string; icon: any; roles?: AppRole[] };

const main: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users, roles: ["admin","doctor","nurse","receptionist","accountant"] },
  { title: "OPD Queue", url: "/opd", icon: Stethoscope, roles: ["admin","doctor","nurse","receptionist"] },
  { title: "IPD / Admissions", url: "/ipd", icon: BedDouble, roles: ["admin","doctor","nurse","receptionist"] },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, roles: ["admin","doctor"] },
  { title: "Medicines", url: "/medicines", icon: PillBottle, roles: ["admin","pharmacist"] },
  { title: "POS / Billing", url: "/pos", icon: Receipt, roles: ["admin","pharmacist","receptionist","accountant"] },
  { title: "Due Management", url: "/due-management", icon: CreditCard, roles: ["admin","accountant","receptionist","pharmacist"] },
  { title: "Invoice History", url: "/invoices", icon: History, roles: ["admin","accountant","receptionist","pharmacist"] },
];
const future: Item[] = [
  { title: "Laboratory", url: "/lab", icon: FlaskConical, roles: ["admin","lab_tech"] },
  { title: "X-Ray", url: "/xray", icon: ScanLine, roles: ["admin","lab_tech"] },
  { title: "Services & Packages", url: "/services", icon: Layers, roles: ["admin","accountant","receptionist","pharmacist","nurse"] },
  { title: "Operation Theater", url: "/ot", icon: Activity, roles: ["admin","doctor","nurse"] },
  { title: "Expenses", url: "/expenses", icon: Wallet, roles: ["admin","accountant"] },
  { title: "Insurance", url: "/insurance", icon: ShieldCheck, roles: ["admin","accountant","receptionist"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin","accountant"] },
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
        <SidebarMenuButton asChild isActive={active} tooltip={it.title}>
          <NavLink to={it.url} className="flex items-center gap-3">
            <it.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{it.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <ClinicLogo variant="light" showText={!collapsed} size={collapsed ? "sm" : "md"} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{main.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Departments</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{future.filter(can).map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{renderItem({ title: "Settings", url: "/settings", icon: Settings })}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
