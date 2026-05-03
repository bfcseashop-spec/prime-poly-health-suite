import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b bg-card/80 backdrop-blur px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium">{user?.email}</span>
                <div className="flex gap-1">
                  {roles.map(r => <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{r.replace("_"," ")}</Badge>)}
                </div>
              </div>
              <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback></Avatar>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out"><LogOut className="h-4 w-4" /></Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};
