import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  User as UserIcon, Building2, Palette, Shield, Bell, Database, KeyRound,
  Save, Moon, Sun, Monitor, Download, Upload, LogOut, Loader2, Trash2,
} from "lucide-react";

type ClinicInfo = {
  name: string; phone: string; email: string; address: string;
  website: string; logo_url: string; tax_id: string; currency: string;
  exchange_rate: number;
};

const defaultClinic: ClinicInfo = {
  name: "Prime Poly Clinic",
  phone: "+855 78 514 425",
  email: "primeclinic.centre@gmail.com",
  address: "Mittapheap Kampuchea Soviet, Street 705, Preah Sihanouk, Cambodia.",
  website: "",
  logo_url: "",
  tax_id: "",
  currency: "USD",
  exchange_rate: 4100,
};

const ROLE_OPTIONS = ["admin", "doctor", "nurse", "pharmacist", "lab_tech", "accountant", "receptionist"];

export default function Settings() {
  const { user, roles, signOut, hasRole } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  // Password
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  // Clinic
  const [clinic, setClinic] = useState<ClinicInfo>(defaultClinic);
  // Notifications
  const [notif, setNotif] = useState({
    low_stock: true, new_invoice: true, daily_summary: false, sound: true,
  });
  // Users (admin)
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load
  useEffect(() => {
    const c = localStorage.getItem("clinic_info");
    if (c) try { setClinic({ ...defaultClinic, ...JSON.parse(c) }); } catch {}
    const n = localStorage.getItem("notif_prefs");
    if (n) try { setNotif({ ...notif, ...JSON.parse(n) }); } catch {}
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }: any) => {
        if (data) setProfile({ full_name: data.full_name || "", phone: data.phone || "" });
      });
    }
    if (hasRole("admin")) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const [{ data: profs }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.user_id] = { ...p, roles: [] }; });
    (rolesData ?? []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = { user_id: r.user_id, roles: [] };
      map[r.user_id].roles.push(r.role);
    });
    setUsers(Object.values(map));
    setLoadingUsers(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert(
      { id: user.id, full_name: profile.full_name, phone: profile.phone },
      { onConflict: "id" } as any,
    );
    setSavingProfile(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  const savePassword = async () => {
    if (!pw.next || pw.next.length < 6) return toast.error("Password must be at least 6 chars");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSavingPw(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPw({ next: "", confirm: "" }); }
  };

  const saveClinic = () => {
    localStorage.setItem("clinic_info", JSON.stringify(clinic));
    toast.success("Clinic information saved");
  };

  const saveNotif = (next: typeof notif) => {
    setNotif(next);
    localStorage.setItem("notif_prefs", JSON.stringify(next));
  };

  const toggleRole = async (uid: string, role: string, has: boolean) => {
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role as any);
    } else {
      await supabase.from("user_roles").insert({ user_id: uid, role: role as any });
    }
    toast.success(`Role ${has ? "removed" : "added"}`);
    loadUsers();
  };

  const exportData = async () => {
    toast.info("Preparing export...");
    const tables = ["patients", "medicines", "medicine_sales", "expenses", "opd_visits"];
    const out: any = {};
    for (const t of tables) {
      const { data } = await (supabase.from(t as any).select("*") as any);
      out[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clinic_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const initials = (profile.full_name || user?.email || "U").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account, clinic information, and system preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted/60 flex-wrap h-auto">
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="security"><KeyRound className="h-4 w-4 mr-1.5" />Security</TabsTrigger>
          <TabsTrigger value="clinic"><Building2 className="h-4 w-4 mr-1.5" />Clinic</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1.5" />Appearance</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" />Notifications</TabsTrigger>
          {hasRole("admin") && <TabsTrigger value="team"><Shield className="h-4 w-4 mr-1.5" />Team & Roles</TabsTrigger>}
          {hasRole("admin") && <TabsTrigger value="data"><Database className="h-4 w-4 mr-1.5" />Data</TabsTrigger>}
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Update your personal information visible across the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">{profile.full_name || "Unnamed User"}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {roles.length === 0 ? <Badge variant="outline">No roles</Badge> :
                      roles.map(r => <Badge key={r} variant="secondary" className="capitalize">{r.replace("_", " ")}</Badge>)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+855 12 345 678" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
                <Button onClick={saveProfile} disabled={savingProfile} className="clinic-gradient text-primary-foreground">
                  {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Use a strong password — minimum 6 characters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button onClick={savePassword} disabled={savingPw} className="clinic-gradient text-primary-foreground">
                {savingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Active Session</CardTitle>
              <CardDescription>Sign out of your account on this device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div>
                  <p className="font-medium text-sm">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Signed in via this browser</p>
                </div>
                <Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLINIC */}
        <TabsContent value="clinic" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>This information appears on invoices and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Clinic Name</Label>
                  <Input value={clinic.name} onChange={e => setClinic({ ...clinic, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={clinic.phone} onChange={e => setClinic({ ...clinic, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={clinic.email} onChange={e => setClinic({ ...clinic, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={clinic.website} onChange={e => setClinic({ ...clinic, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Textarea value={clinic.address} onChange={e => setClinic({ ...clinic, address: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / VAT</Label>
                  <Input value={clinic.tax_id} onChange={e => setClinic({ ...clinic, tax_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={clinic.logo_url} onChange={e => setClinic({ ...clinic, logo_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Currency</Label>
                  <Select value={clinic.currency} onValueChange={v => setClinic({ ...clinic, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="KHR">KHR — Cambodian Riel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>USD → KHR Exchange Rate</Label>
                  <Input type="number" value={clinic.exchange_rate} onChange={e => setClinic({ ...clinic, exchange_rate: Number(e.target.value) })} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveClinic} className="clinic-gradient text-primary-foreground"><Save className="h-4 w-4 mr-2" />Save Clinic Info</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Choose how the interface looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-w-2xl">
                {[
                  { v: "light", icon: Sun, label: "Light" },
                  { v: "dark", icon: Moon, label: "Dark" },
                  { v: "system", icon: Monitor, label: "System" },
                ].map(({ v, icon: Icon, label }) => (
                  <button key={v} onClick={() => setTheme(v)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      theme === v ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40"
                    }`}>
                    <Icon className={`h-6 w-6 ${theme === v ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium text-sm">{label}</span>
                    {theme === v && <Badge variant="default" className="text-[10px] mt-1">Active</Badge>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Brand Color</CardTitle>
              <CardDescription>The clinic's signature accent color</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40">
                <div className="h-16 w-16 rounded-xl clinic-gradient shadow-card" />
                <div>
                  <p className="font-semibold">Prime Teal</p>
                  <p className="text-xs text-muted-foreground font-mono">hsl(168 76% 25%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what alerts you want to see</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {[
                { k: "low_stock", title: "Low Stock Alerts", desc: "Notify when medicines fall below threshold" },
                { k: "new_invoice", title: "New Invoice Notifications", desc: "Show toast when an invoice is created" },
                { k: "daily_summary", title: "Daily Summary", desc: "Receive a daily activity summary" },
                { k: "sound", title: "Notification Sound", desc: "Play a sound for important alerts" },
              ].map(({ k, title, desc }) => (
                <div key={k} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={(notif as any)[k]} onCheckedChange={v => saveNotif({ ...notif, [k]: v })} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM */}
        {hasRole("admin") && (
          <TabsContent value="team" className="space-y-4 mt-0">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Team & Roles</CardTitle>
                <CardDescription>Assign roles to team members. Click a role chip to toggle it.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingUsers ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No team members yet</TableCell></TableRow>
                      ) : users.map(u => (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(u.full_name || "U").split(" ").map((s: string) => s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                              <span className="font-medium">{u.full_name || "Unnamed"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {ROLE_OPTIONS.map(r => {
                                const has = u.roles.includes(r);
                                return (
                                  <button key={r} onClick={() => toggleRole(u.user_id, r, has)}
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                                      has ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-accent"
                                    }`}>
                                    {r.replace("_", " ")}
                                  </button>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* DATA */}
        {hasRole("admin") && (
          <TabsContent value="data" className="space-y-4 mt-0">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Backup & Export</CardTitle>
                <CardDescription>Download a JSON backup of your clinic's core data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Full Data Export</p>
                    <p className="text-sm text-muted-foreground">Patients, medicines, sales, expenses, OPD visits</p>
                  </div>
                  <Button onClick={exportData} variant="outline"><Download className="h-4 w-4 mr-2" />Download JSON</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border opacity-60">
                  <div>
                    <p className="font-medium">Import Data</p>
                    <p className="text-sm text-muted-foreground">Restore from a backup file (coming soon)</p>
                  </div>
                  <Button variant="outline" disabled><Upload className="h-4 w-4 mr-2" />Import</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible operations — proceed with caution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium">Clear Local Cache</p>
                    <p className="text-sm text-muted-foreground">Reset clinic info & notification prefs stored on this device</p>
                  </div>
                  <Button variant="destructive" onClick={() => {
                    localStorage.removeItem("clinic_info");
                    localStorage.removeItem("notif_prefs");
                    setClinic(defaultClinic);
                    toast.success("Local cache cleared");
                  }}><Trash2 className="h-4 w-4 mr-2" />Clear</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
