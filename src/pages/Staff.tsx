import { useEffect, useMemo, useState, useRef } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus, Search, Pencil, Trash2, Stethoscope, FlaskConical, Users,
  Wallet, Phone, Mail, Calendar, Briefcase, GraduationCap, Eye, MapPin, FileText,
  Send, Upload, Calendar as CalIcon,
} from "lucide-react";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const POSITIONS = [
  { value: "lab_technician", label: "Lab Technologist", icon: FlaskConical, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "nurse", label: "Nurse", icon: Users, color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "pharmacist", label: "Pharmacist", icon: Briefcase, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "receptionist", label: "Receptionist", icon: Users, color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "accountant", label: "Accountant", icon: Wallet, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "radiologist", label: "Radiologist", icon: Briefcase, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "manager", label: "Manager", icon: Briefcase, color: "bg-stone-100 text-stone-700 border-stone-200" },
  { value: "super_admin", label: "Super Admin", icon: Briefcase, color: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "admin", label: "Admin", icon: Briefcase, color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "cleaner", label: "Cleaner / Support", icon: Users, color: "bg-slate-100 text-slate-600 border-slate-200" },
];

const posMeta = (p: string) => POSITIONS.find(x => x.value === p) ?? { label: p, icon: Users, color: "bg-muted text-foreground border-border" };

// Deterministic colored avatar fallback (like the reference image)
const AVATAR_PALETTE = [
  "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-blue-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
  "bg-orange-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-600",
];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};
const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

const emptyForm = {
  id: "" as string | "",
  full_name: "", age: "" as any, gender: "", position: "nurse",
  department: "", phone: "", telegram_id: "", email: "", address: "",
  joining_date: "", monthly_salary_usd: "" as any,
  status: "active", qualification: "", notes: "", photo_url: "",
  day_off: "", leave_from: "", leave_to: "", leave_reason: "",
  duty_schedule: {} as Record<string, string>,
};

export default function Staff() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    nurses: rows.filter(r => r.position === "nurse").length,
    labTechs: rows.filter(r => r.position === "lab_technician").length,
    payroll: rows.filter(r => r.status === "active").reduce((s, r) => s + Number(r.monthly_salary_usd || 0), 0),
  }), [rows]);

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (r: any) => {
    setForm({
      id: r.id, full_name: r.full_name ?? "", age: r.age ?? "", gender: r.gender ?? "",
      position: r.position ?? "nurse", department: r.department ?? "",
      phone: r.phone ?? "", telegram_id: r.telegram_id ?? "", email: r.email ?? "", address: r.address ?? "",
      joining_date: r.joining_date ?? "", monthly_salary_usd: r.monthly_salary_usd ?? "",
      status: r.status ?? "active", qualification: r.qualification ?? "",
      notes: r.notes ?? "", photo_url: r.photo_url ?? "",
      day_off: r.day_off ?? "", leave_from: r.leave_from ?? "", leave_to: r.leave_to ?? "",
      leave_reason: r.leave_reason ?? "", duty_schedule: r.duty_schedule ?? {},
    });
    setOpen(true);
  };

  const onPickPhoto = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `staff/${user?.id || "anon"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("staff-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setDuty = (day: string, val: string) => {
    setForm(f => ({ ...f, duty_schedule: { ...(f.duty_schedule || {}), [day]: val } }));
  };

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.position) return toast.error("Position is required");
    const payload: any = {
      full_name: form.full_name.trim(),
      age: form.age === "" ? null : Number(form.age),
      gender: form.gender || null,
      position: form.position,
      department: form.department || null,
      phone: form.phone || null,
      telegram_id: form.telegram_id || null,
      email: form.email || null,
      address: form.address || null,
      joining_date: form.joining_date || null,
      monthly_salary_usd: form.monthly_salary_usd === "" ? 0 : Number(form.monthly_salary_usd),
      status: form.status,
      qualification: form.qualification || null,
      notes: form.notes || null,
      photo_url: form.photo_url || null,
      day_off: form.day_off || null,
      leave_from: form.leave_from || null,
      leave_to: form.leave_to || null,
      leave_reason: form.leave_reason || null,
      duty_schedule: form.duty_schedule || {},
    };
    let error;
    if (form.id) {
      ({ error } = await (supabase.from("staff_members" as any) as any).update(payload).eq("id", form.id));
    } else {
      payload.created_by = user?.id ?? null;
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
          <p className="text-muted-foreground mt-1 text-sm">Nurses, lab technicians and clinic team records</p>
        </div>
        <Button onClick={openNew} className="clinic-gradient text-primary-foreground">
          <UserPlus className="h-4 w-4 mr-2" />Add Staff
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users} label="Total Staff" value={stats.total} hint="all positions" tone="primary" />
        <KPI icon={Users} label="Nurses" value={stats.nurses} tone="success" />
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
            if (count === 0 && p.value !== "nurse" && p.value !== "lab_technician") return null;
            return (
              <TabsTrigger key={p.value} value={p.value}>
                <p.icon className="h-3.5 w-3.5 mr-1.5" />{p.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          <Card className="shadow-soft border-border/60">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Staff Records</CardTitle>
              <p className="text-xs text-muted-foreground">Manage system users and access</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-primary font-semibold">Email</TableHead>
                    <TableHead className="text-primary font-semibold">Full Name</TableHead>
                    <TableHead className="text-primary font-semibold">Role</TableHead>
                    <TableHead className="text-primary font-semibold">Phone</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Salary</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No staff records</TableCell></TableRow>
                  ) : filtered.map(r => {
                    const m = posMeta(r.position);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-sm",
                              r.photo_url ? "bg-transparent" : avatarColor(r.full_name || r.email || "?")
                            )}>
                              {r.photo_url ? (
                                <Avatar className="h-9 w-9"><AvatarImage src={r.photo_url} /><AvatarFallback>{initials(r.full_name)}</AvatarFallback></Avatar>
                              ) : initials(r.full_name || r.email || "?")}
                            </div>
                            <span className="text-sm text-foreground/80">{r.email || <span className="text-muted-foreground italic">no email</span>}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{r.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-full px-3 py-0.5 text-[11px] font-medium border", m.color)}>
                            {m.label}
                          </Badge>
                          {r.department && <div className="text-[11px] text-muted-foreground mt-1">{r.department}</div>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.phone || "—"}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {fmtUSD(Number(r.monthly_salary_usd || 0))}
                          <div className="text-[10px] text-muted-foreground font-normal">/month</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setViewRow(r)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(r)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleteId(r.id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
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

      {/* VIEW DIALOG */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Staff Details</DialogTitle></DialogHeader>
          {viewRow && (() => {
            const m = posMeta(viewRow.position);
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0",
                    avatarColor(viewRow.full_name || viewRow.email || "?")
                  )}>
                    {viewRow.photo_url ? (
                      <Avatar className="h-16 w-16"><AvatarImage src={viewRow.photo_url} /><AvatarFallback>{initials(viewRow.full_name)}</AvatarFallback></Avatar>
                    ) : initials(viewRow.full_name || viewRow.email || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold truncate">{viewRow.full_name}</p>
                    <Badge variant="outline" className={cn("rounded-full mt-1 px-3 py-0.5 text-[11px]", m.color)}>{m.label}</Badge>
                    {viewRow.qualification && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />{viewRow.qualification}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Email</p>
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{viewRow.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Phone</p>
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{viewRow.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Department</p>
                    <p>{viewRow.department || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Age / Gender</p>
                    <p>{viewRow.age ? `${viewRow.age} yrs` : "—"}{viewRow.gender ? ` · ${viewRow.gender}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Joining Date</p>
                    <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{viewRow.joining_date ? format(new Date(viewRow.joining_date), "PP") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Status</p>
                    <Badge className={cn("capitalize", viewRow.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground")}>{viewRow.status}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Monthly Salary</p>
                    <p className="text-lg font-bold text-primary">{fmtUSD(Number(viewRow.monthly_salary_usd || 0))}</p>
                  </div>
                  {viewRow.address && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Address</p>
                      <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />{viewRow.address}</p>
                    </div>
                  )}
                  {viewRow.notes && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Notes</p>
                      <p className="flex items-start gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />{viewRow.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>Close</Button>
            <Button onClick={() => { const r = viewRow; setViewRow(null); openEdit(r); }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Profile</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="duty">Duty & Salary</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-3">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarImage src={form.photo_url || undefined} />
                    <AvatarFallback className={cn("text-xl text-white", avatarColor(form.full_name || "?"))}>
                      {initials(form.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onPickPhoto(e.target.files[0])} />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading…" : "Upload"}
                  </Button>
                </div>
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Position *</Label>
                    <Select value={form.position} onValueChange={v => setForm({ ...form, position: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Department</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Cardiology" /></div>
                  <div className="space-y-1"><Label>Qualification</Label><Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, BSc..." /></div>
                  <div className="space-y-1"><Label>Age</Label><Input type="number" min={0} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-3 pt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label className="flex items-center gap-1"><Send className="h-3 w-3 text-sky-500" />Telegram ID</Label><Input value={form.telegram_id} onChange={e => setForm({ ...form, telegram_id: e.target.value })} placeholder="@username" /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="duty" className="space-y-4 pt-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Monthly Salary (USD)</Label><Input type="number" min={0} step="0.01" value={form.monthly_salary_usd} onChange={e => setForm({ ...form, monthly_salary_usd: e.target.value })} /></div>
                <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Day Off</Label><Input value={form.day_off} onChange={e => setForm({ ...form, day_off: e.target.value })} placeholder="Friday" /></div>
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-2"><CalIcon className="h-3.5 w-3.5" />Weekly Duty Calendar</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map(day => (
                    <div key={day} className="rounded-lg border bg-muted/20 p-2">
                      <div className="text-[11px] font-semibold text-center mb-1">{day}</div>
                      <Input
                        className="h-7 text-[11px] text-center px-1"
                        value={(form.duty_schedule || {})[day] || ""}
                        onChange={e => setDuty(day, e.target.value)}
                        placeholder="9-5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-3 pt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Leave From</Label><Input type="date" value={form.leave_from} onChange={e => setForm({ ...form, leave_from: e.target.value })} /></div>
                <div className="space-y-1"><Label>Leave To</Label><Input type="date" value={form.leave_to} onChange={e => setForm({ ...form, leave_to: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Leave Reason</Label><Textarea rows={2} value={form.leave_reason} onChange={e => setForm({ ...form, leave_reason: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
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
