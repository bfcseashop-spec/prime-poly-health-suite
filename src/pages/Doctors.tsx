import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Stethoscope, Plus, Search, Pencil, Trash2, Phone, Mail, Award, Clock,
  Users as UsersIcon, Send, Calendar as CalIcon, Upload, Eye, MapPin,
  GraduationCap, BadgeDollarSign, Building2, X,
} from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Doctor = {
  id: string;
  full_name: string;
  specialization?: string | null;
  qualification?: string | null;
  registration_no?: string | null;
  phone?: string | null;
  telegram_id?: string | null;
  email?: string | null;
  gender?: string | null;
  department?: string | null;
  consultation_fee_usd: number;
  monthly_salary_usd: number;
  experience_years?: number | null;
  joining_date?: string | null;
  available_days?: string | null;
  available_hours?: string | null;
  duty_schedule?: Record<string, string> | null;
  day_off?: string | null;
  leave_from?: string | null;
  leave_to?: string | null;
  leave_reason?: string | null;
  room_no?: string | null;
  photo_url?: string | null;
  address?: string | null;
  bio?: string | null;
  notes?: string | null;
  status: string;
};

const empty: Partial<Doctor> = {
  full_name: "", specialization: "", qualification: "", registration_no: "",
  phone: "", telegram_id: "", email: "", gender: "", department: "",
  consultation_fee_usd: 0, monthly_salary_usd: 0, experience_years: 0, joining_date: "",
  available_days: "", available_hours: "", room_no: "", photo_url: "",
  address: "", bio: "", notes: "", status: "active",
  day_off: "", leave_from: "", leave_to: "", leave_reason: "",
  duty_schedule: {},
};

const DEPT_PALETTE: Record<string, string> = {
  Cardiology: "from-rose-500/15 to-rose-500/5 text-rose-600 border-rose-200",
  Neurology: "from-violet-500/15 to-violet-500/5 text-violet-600 border-violet-200",
  Orthopedics: "from-amber-500/15 to-amber-500/5 text-amber-600 border-amber-200",
  Pediatrics: "from-sky-500/15 to-sky-500/5 text-sky-600 border-sky-200",
  General: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-emerald-200",
};
const deptTone = (d?: string | null) =>
  (d && DEPT_PALETTE[d]) || "from-primary/15 to-primary/5 text-primary border-primary/20";

export default function Doctors() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [list, setList] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [open, setOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Doctor | null>(null);
  const [form, setForm] = useState<Partial<Doctor>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from("doctors" as any).select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setList((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return list.filter(d =>
      !q || d.full_name.toLowerCase().includes(ql) ||
      d.specialization?.toLowerCase().includes(ql) ||
      d.department?.toLowerCase().includes(ql) ||
      d.phone?.includes(q) || d.email?.toLowerCase().includes(ql)
    );
  }, [list, q]);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter(d => d.status === "active").length,
    onLeave: list.filter(d => d.status === "on_leave").length,
    avgFee: list.length ? list.reduce((a, d) => a + Number(d.consultation_fee_usd || 0), 0) / list.length : 0,
    departments: new Set(list.map(d => d.department).filter(Boolean)).size,
    payroll: list.reduce((a, d) => a + Number(d.monthly_salary_usd || 0), 0),
  }), [list]);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (d: Doctor) => {
    setForm({ ...d, duty_schedule: d.duty_schedule ?? {} });
    setEditId(d.id); setOpen(true);
  };

  const onPickPhoto = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `doctors/${user?.id || "anon"}-${Date.now()}.${ext}`;
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
    setForm(f => ({ ...f, duty_schedule: { ...(f.duty_schedule as any || {}), [day]: val } }));
  };

  const save = async () => {
    if (!form.full_name) return toast.error("Doctor name required");
    const payload: any = {
      ...form,
      consultation_fee_usd: Number(form.consultation_fee_usd || 0),
      monthly_salary_usd: Number(form.monthly_salary_usd || 0),
      experience_years: Number(form.experience_years || 0) || null,
      joining_date: form.joining_date || null,
      leave_from: form.leave_from || null,
      leave_to: form.leave_to || null,
      duty_schedule: form.duty_schedule || {},
      created_by: user?.id,
    };
    if (editId) {
      const { error } = await supabase.from("doctors" as any).update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Doctor updated");
    } else {
      const { error } = await supabase.from("doctors" as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Doctor added");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this doctor?")) return;
    const { error } = await supabase.from("doctors" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const initials = (n: string) => n.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const KPI = ({ icon: Icon, label, value, tone }: any) => (
    <Card className="overflow-hidden shadow-soft">
      <CardContent className={cn("p-4 bg-gradient-to-br", tone)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
            <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="rounded-2xl p-5 md:p-6 bg-gradient-to-r from-primary/15 via-primary/5 to-background border shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />Doctor Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Profiles, duty calendar, salary, leave & contact details — all in one place.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openNew} className="clinic-gradient text-primary-foreground shadow-md">
              <Plus className="h-4 w-4 mr-1" />Add Doctor
            </Button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPI icon={UsersIcon} label="Total" value={stats.total} tone="from-primary/15 to-primary/5 text-primary" />
        <KPI icon={Stethoscope} label="Active" value={stats.active} tone="from-emerald-500/15 to-emerald-500/5 text-emerald-600" />
        <KPI icon={CalIcon} label="On Leave" value={stats.onLeave} tone="from-amber-500/15 to-amber-500/5 text-amber-600" />
        <KPI icon={Building2} label="Departments" value={stats.departments} tone="from-violet-500/15 to-violet-500/5 text-violet-600" />
        <KPI icon={Award} label="Avg Consult" value={fmtUSD(stats.avgFee)} tone="from-sky-500/15 to-sky-500/5 text-sky-600" />
        <KPI icon={BadgeDollarSign} label="Payroll" value={fmtUSD(stats.payroll)} tone="from-rose-500/15 to-rose-500/5 text-rose-600" />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, specialization, dept…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No doctors found.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(d => (
                <div
                  key={d.id}
                  className="group relative rounded-2xl border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className={cn("h-20 bg-gradient-to-br", deptTone(d.department))} />
                  <div className="px-4 pb-4 -mt-10">
                    <div className="flex items-end justify-between gap-2">
                      <Avatar className="h-20 w-20 ring-4 ring-background shadow-md">
                        <AvatarImage src={d.photo_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials(d.full_name)}</AvatarFallback>
                      </Avatar>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-[10px] mb-1",
                          d.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          d.status === "on_leave" && "bg-amber-50 text-amber-700 border-amber-200",
                          d.status === "inactive" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {d.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold text-base leading-tight">{d.full_name}</p>
                      {d.specialization && <p className="text-xs text-primary font-medium mt-0.5">{d.specialization}</p>}
                      {d.qualification && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />{d.qualification}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      {d.department && (
                        <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground" /><span>{d.department}</span></div>
                      )}
                      {d.phone && (
                        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" /><span>{d.phone}</span></div>
                      )}
                      {d.telegram_id && (
                        <div className="flex items-center gap-1.5"><Send className="h-3 w-3 text-sky-500" /><span>{d.telegram_id}</span></div>
                      )}
                      {(d.day_off || d.available_hours) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{d.available_hours || "—"}{d.day_off && <span className="text-rose-500"> · Off: {d.day_off}</span>}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Consultation</p>
                        <p className="text-sm font-bold text-primary">{fmtUSD(Number(d.consultation_fee_usd))}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewRow(d)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        {isAdmin && <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(d.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-primary font-semibold">Doctor</TableHead>
                    <TableHead className="text-primary font-semibold">Specialization</TableHead>
                    <TableHead className="text-primary font-semibold">Department</TableHead>
                    <TableHead className="text-primary font-semibold">Phone / Telegram</TableHead>
                    <TableHead className="text-primary font-semibold">Day Off</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Fee</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Salary</TableHead>
                    <TableHead className="text-primary font-semibold">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9"><AvatarImage src={d.photo_url ?? undefined} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(d.full_name)}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium text-sm">{d.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{d.qualification}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{d.specialization || "—"}</TableCell>
                      <TableCell className="text-sm">{d.department || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{d.phone || "—"}</div>
                        {d.telegram_id && <div className="text-[11px] text-sky-600 flex items-center gap-1"><Send className="h-3 w-3" />{d.telegram_id}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{d.day_off || "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{fmtUSD(Number(d.consultation_fee_usd))}</TableCell>
                      <TableCell className="text-right text-sm">{fmtUSD(Number(d.monthly_salary_usd))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize text-[10px]",
                          d.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          d.status === "on_leave" && "bg-amber-50 text-amber-700 border-amber-200",
                        )}>{d.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewRow(d)}><Eye className="h-3.5 w-3.5" /></Button>
                        {isAdmin && <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {viewRow && (
            <>
              <div className={cn("h-28 bg-gradient-to-br relative", deptTone(viewRow.department))}>
                <Button size="icon" variant="ghost" className="absolute right-2 top-2 h-8 w-8" onClick={() => setViewRow(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="px-6 pb-6 -mt-12 space-y-4">
                <div className="flex items-end gap-4">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                    <AvatarImage src={viewRow.photo_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{initials(viewRow.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pb-1">
                    <h2 className="text-xl font-bold leading-tight">{viewRow.full_name}</h2>
                    {viewRow.specialization && <p className="text-sm text-primary font-medium">{viewRow.specialization}</p>}
                    {viewRow.qualification && <p className="text-xs text-muted-foreground">{viewRow.qualification}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    ["Department", viewRow.department, Building2],
                    ["Gender", viewRow.gender, UsersIcon],
                    ["Room", viewRow.room_no, MapPin],
                    ["Phone", viewRow.phone, Phone],
                    ["Telegram", viewRow.telegram_id, Send],
                    ["Email", viewRow.email, Mail],
                    ["Joining", viewRow.joining_date && format(new Date(viewRow.joining_date), "PP"), CalIcon],
                    ["Experience", viewRow.experience_years ? `${viewRow.experience_years} yrs` : null, Award],
                    ["Day Off", viewRow.day_off, CalIcon],
                  ].map(([label, val, Icon]: any) => (
                    <div key={label} className="rounded-lg border bg-muted/20 p-2.5">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
                      <p className="flex items-center gap-1.5 mt-0.5 text-foreground/90">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />{val || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 bg-gradient-to-br from-primary/10 to-primary/5 border">
                    <p className="text-[10px] uppercase text-muted-foreground">Consultation Fee</p>
                    <p className="text-lg font-bold text-primary">{fmtUSD(Number(viewRow.consultation_fee_usd))}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border">
                    <p className="text-[10px] uppercase text-muted-foreground">Monthly Salary</p>
                    <p className="text-lg font-bold text-emerald-600">{fmtUSD(Number(viewRow.monthly_salary_usd))}</p>
                  </div>
                </div>

                {/* Duty calendar */}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1"><CalIcon className="h-3.5 w-3.5" />Duty Calendar</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(day => {
                      const slot = (viewRow.duty_schedule as any)?.[day];
                      const isOff = viewRow.day_off?.toLowerCase().includes(day.toLowerCase());
                      return (
                        <div key={day} className={cn(
                          "rounded-lg border p-2 text-center text-[11px]",
                          isOff ? "bg-rose-50 border-rose-200 text-rose-600" :
                            slot ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-muted/30 text-muted-foreground"
                        )}>
                          <div className="font-semibold">{day}</div>
                          <div className="mt-0.5 truncate">{isOff ? "Off" : slot || "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(viewRow.leave_from || viewRow.leave_to) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-semibold text-amber-700 flex items-center gap-1"><CalIcon className="h-4 w-4" />Leave</p>
                    <p className="text-amber-700/90 text-xs mt-0.5">
                      {viewRow.leave_from && format(new Date(viewRow.leave_from), "PP")}
                      {viewRow.leave_to && ` → ${format(new Date(viewRow.leave_to), "PP")}`}
                      {viewRow.leave_reason && ` · ${viewRow.leave_reason}`}
                    </p>
                  </div>
                )}

                {viewRow.address && (
                  <div className="text-sm"><p className="text-[10px] uppercase text-muted-foreground">Address</p><p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />{viewRow.address}</p></div>
                )}
                {viewRow.bio && <p className="text-sm text-muted-foreground italic">{viewRow.bio}</p>}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewRow(null)}>Close</Button>
                  {isAdmin && <Button onClick={() => { const r = viewRow; setViewRow(null); openEdit(r); }}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>}
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>

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
                    <AvatarImage src={form.photo_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials(form.full_name || "?")}</AvatarFallback>
                  </Avatar>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onPickPhoto(e.target.files[0])} />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading…" : "Upload Photo"}
                  </Button>
                </div>
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2"><Label>Full Name *</Label><Input value={form.full_name ?? ""} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. John Smith" /></div>
                  <div className="space-y-1"><Label>Specialization</Label><Input value={form.specialization ?? ""} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiologist" /></div>
                  <div className="space-y-1"><Label>Department</Label><Input value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Cardiology" /></div>
                  <div className="space-y-1"><Label>Qualification</Label><Input value={form.qualification ?? ""} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD" /></div>
                  <div className="space-y-1"><Label>Registration No.</Label><Input value={form.registration_no ?? ""} onChange={e => setForm({ ...form, registration_no: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Gender</Label>
                    <Select value={form.gender ?? ""} onValueChange={v => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Status</Label>
                    <Select value={form.status ?? "active"} onValueChange={v => setForm({ ...form, status: v })}>
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
              <div className="space-y-1"><Label>Bio</Label><Textarea rows={2} value={form.bio ?? ""} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-3 pt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label className="flex items-center gap-1"><Send className="h-3 w-3 text-sky-500" />Telegram ID</Label><Input value={form.telegram_id ?? ""} onChange={e => setForm({ ...form, telegram_id: e.target.value })} placeholder="@username" /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-1"><Label>Room No.</Label><Input value={form.room_no ?? ""} onChange={e => setForm({ ...form, room_no: e.target.value })} /></div>
                <div className="space-y-1"><Label>Experience (years)</Label><Input type="number" value={form.experience_years ?? 0} onChange={e => setForm({ ...form, experience_years: Number(e.target.value) })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="duty" className="space-y-4 pt-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Consultation Fee (USD)</Label><Input type="number" step="0.01" value={form.consultation_fee_usd ?? 0} onChange={e => setForm({ ...form, consultation_fee_usd: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Monthly Salary (USD)</Label><Input type="number" step="0.01" value={form.monthly_salary_usd ?? 0} onChange={e => setForm({ ...form, monthly_salary_usd: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joining_date ?? ""} onChange={e => setForm({ ...form, joining_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Available Days (summary)</Label><Input value={form.available_days ?? ""} onChange={e => setForm({ ...form, available_days: e.target.value })} placeholder="Mon–Fri" /></div>
                <div className="space-y-1"><Label>Available Hours</Label><Input value={form.available_hours ?? ""} onChange={e => setForm({ ...form, available_hours: e.target.value })} placeholder="9:00 AM – 5:00 PM" /></div>
                <div className="space-y-1"><Label>Day Off</Label><Input value={form.day_off ?? ""} onChange={e => setForm({ ...form, day_off: e.target.value })} placeholder="Friday" /></div>
              </div>

              <div>
                <Label className="flex items-center gap-1 mb-2"><CalIcon className="h-3.5 w-3.5" />Weekly Duty Calendar</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map(day => {
                    const v = (form.duty_schedule as any)?.[day] || "";
                    return (
                      <div key={day} className="rounded-lg border bg-muted/20 p-2">
                        <div className="text-[11px] font-semibold text-center mb-1">{day}</div>
                        <Input
                          className="h-7 text-[11px] text-center px-1"
                          value={v}
                          onChange={e => setDuty(day, e.target.value)}
                          placeholder="9-5"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Tip: leave blank for off-duty days, or use day-off field above.</p>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-3 pt-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Leave From</Label><Input type="date" value={form.leave_from ?? ""} onChange={e => setForm({ ...form, leave_from: e.target.value })} /></div>
                <div className="space-y-1"><Label>Leave To</Label><Input type="date" value={form.leave_to ?? ""} onChange={e => setForm({ ...form, leave_to: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Leave Reason</Label><Textarea rows={2} value={form.leave_reason ?? ""} onChange={e => setForm({ ...form, leave_reason: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="clinic-gradient text-primary-foreground">{editId ? "Update Doctor" : "Save Doctor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
