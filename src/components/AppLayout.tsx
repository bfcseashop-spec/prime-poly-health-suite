import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, Receipt, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b bg-card/80 backdrop-blur px-4 sticky top-0 z-30">
            <SidebarTrigger />

            <div className="hidden md:flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 px-3 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">{dateStr}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-mono font-semibold tabular-nums">{timeStr}</span>
              </div>
            </div>

            <div className="flex-1" />

            <Button
              onClick={() => navigate("/pos")}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">POS</span>
            </Button>

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
