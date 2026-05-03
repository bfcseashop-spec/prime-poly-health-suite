import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fmtUSD } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  UserPlus, Search, Pencil, Trash2, Stethoscope, FlaskConical, Users,
  Wallet, Phone, Mail, Calendar, Briefcase, GraduationCap,
} from "lucide-react";

const POSITIONS = [
  { value: "doctor", label: "Doctor", icon: Stethoscope, color: "bg-primary/10 text-primary border-primary/30" },
  { value: "lab_technician", label: "Lab Technician", icon: FlaskConical, color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "nurse", label: "Nurse", icon: Users, color: "bg-pink-500/10 text-pink-600 border-pink-500/30" },
  { value: "pharmacist", label: "Pharmacist", icon: Briefcase, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "receptionist", label: "Receptionist", icon: Users, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "accountant", label: "Accountant", icon: Wallet, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "radiologist", label: "Radiologist", icon: Briefcase, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  { value: "cleaner", label: "Cleaner / Support", icon: Users, color: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
];

const posMeta = (p: string) => POSITIONS.find(x => x.value === p) ?? { label: p, icon: Users, color: "bg-muted text-foreground border-border" };

const emptyForm = {
  id: "" as string | "",
  full_name: "", age: "" as any, gender: "", position: "doctor",
  department: "", phone: "", email: "", address: "",
  joining_date: "", monthly_salary_usd: "" as any,
  status: "active", qualification: "", notes: "", photo_url: "",
};

export default function Staff() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await (supabase.from("staff_members" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (tab !== "all" && r.position !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.full_name?.toLowerCase().includes(q) &&
            !r.phone?.toLowerCase().includes(q) &&
            !r.email?.toLowerCase().includes(q) &&
            !r.position?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, tab]);

  const stats = useMemo(() => ({
    total: rows.length,
    doctors: rows.filter(r => r.position === "doctor").length,
    labTechs: rows.filter(r => r.position === "lab_technician").length,
    payroll: rows.filter(r => r.status === "active").reduce((s, r) => s + Number(r.monthly_salary_usd || 0), 0),
  }), [rows]);

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (r: any) => {
    setForm({
      id: r.id, full_name: r.full_name ?? "", age: r.age ?? "", gender: r.gender ?? "",
      position: r.position ?? "doctor", department: r.department ?? "",
      phone: r.phone ?? "", email: r.email ?? "", address: r.address ?? "",
      joining_date: r.joining_date ?? "", monthly_salary_usd: r.monthly_salary_usd ?? "",
      status: r.status ?? "active", qualification: r.qualification ?? "",
      notes: r.notes ?? "", photo_url: r.photo_url ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.position) return toast.error("Position is required");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      full_name: form.full_name.trim(),
      age: form.age === "" ? null : Number(form.age),
      gender: form.gender || null,
      position: form.position,
      department: form.department || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      joining_date: form.joining_date || null,
      monthly_salary_usd: form.monthly_salary_usd === "" ? 0 : Number(form.monthly_salary_usd),
      status: form.status,
      qualification: form.qualification || null,
      notes: form.notes || null,
      photo_url: form.photo_url || null,
    };
    let error;
    if (form.id) {
      ({ error } = await (supabase.from("staff_members" as any) as any).update(payload).eq("id", form.id));
    } else {
      payload.created_by = u.user?.id ?? null;
      ({ error } = await (supabase.from("staff_members" as any) as any).insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Staff updated" : "Staff added");
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from("staff_members" as any) as any).delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Staff removed");
    setDeleteId(null);
    load();
  };

  const KPI = ({ icon: Icon, label, value, hint, tone }: any) => {
    const tones: Record<string, string> = {
      primary: "from-primary/15 to-primary/5 text-primary",
      success: "from-success/15 to-success/5 text-success",
      warning: "from-warning/15 to-warning/5 text-warning",
      purple: "from-purple-500/15 to-purple-500/5 text-purple-600",
    };
    return (
      <Card className="shadow-soft overflow-hidden">
        <CardContent className={cn("p-5 bg-gradient-to-br", tones[tone])}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
              <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
              {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            </div>
            <div className="h-11 w-11 rounded-xl bg-background/80 flex items-center justify-center shadow-soft">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Doctors, lab technicians and clinic team records</p>
        </div>
        <Button onClick={openNew} className="clinic-gradient text-primary-foreground">
          <UserPlus className="h-4 w-4 mr-2" />Add Staff
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users} label="Total Staff" value={stats.total} hint="all positions" tone="primary" />
        <KPI icon={Stethoscope} label="Doctors" value={stats.doctors} tone="success" />
        <KPI icon={FlaskConical} label="Lab Technicians" value={stats.labTechs} tone="purple" />
        <KPI icon={Wallet} label="Monthly Payroll" value={fmtUSD(stats.payroll)} hint="active staff" tone="warning" />
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/60 flex-wrap h-auto">
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          {POSITIONS.map(p => {
            const count = rows.filter(r => r.position === p.value).length;
            if (count === 0 && p.value !== "doctor" && p.value !== "lab_technician") return null;
            return (
              <TabsTrigger key={p.value} value={p.value}>
                <p.icon className="h-3.5 w-3.5 mr-1.5" />{p.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          <Card className="shadow-soft">
            <CardHeader className="pb-2"><CardTitle className="text-base">Staff Records</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Age / Gender</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No staff records</TableCell></TableRow>
                  ) : filtered.map(r => {
                    const m = posMeta(r.position);
                    const Icon = m.icon;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={r.photo_url || undefined} />
                              <AvatarFallback>{r.full_name?.split(" ").map((s: string) => s[0]).slice(0,2).join("").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{r.full_name}</div>
                              {r.qualification && <div className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" />{r.qualification}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", m.color)}>
                            <Icon className="h-3 w-3" />{m.label}
                          </Badge>
                          {r.department && <div className="text-xs text-muted-foreground mt-1">{r.department}</div>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.age ? `${r.age} yrs` : "—"}
                          {r.gender && <div className="text-xs text-muted-foreground capitalize">{r.gender}</div>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{r.phone}</div>}
                          {r.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{r.email}</div>}
                          {!r.phone && !r.email && "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.joining_date ? (
                            <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" />{format(new Date(r.joining_date), "PP")}</div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtUSD(Number(r.monthly_salary_usd || 0))}<div className="text-[10px] text-muted-foreground font-normal">/month</div></TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", r.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground")}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. John Smith" />
            </div>
            <div className="space-y-2">
              <Label>Position *</Label>
              <Select value={form.position} onValueChange={v => setForm({ ...form, position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Cardiology" />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" min={0} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Salary (USD)</Label>
              <Input type="number" min={0} step="0.01" value={form.monthly_salary_usd} onChange={e => setForm({ ...form, monthly_salary_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD, BSc..." />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Photo URL</Label>
              <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="clinic-gradient text-primary-foreground">
              {form.id ? "Save Changes" : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The staff record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
