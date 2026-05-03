import { useEffect, useMemo, useState } from "react";
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
import { Stethoscope, Plus, Search, Pencil, Trash2, Phone, Mail, Award, Clock, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

type Doctor = {
  id: string;
  full_name: string;
  specialization?: string | null;
  qualification?: string | null;
  registration_no?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  department?: string | null;
  consultation_fee_usd: number;
  experience_years?: number | null;
  joining_date?: string | null;
  available_days?: string | null;
  available_hours?: string | null;
  room_no?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  notes?: string | null;
  status: string;
};

const empty: Partial<Doctor> = {
  full_name: "", specialization: "", qualification: "", registration_no: "",
  phone: "", email: "", gender: "", department: "",
  consultation_fee_usd: 0, experience_years: 0, joining_date: "",
  available_days: "", available_hours: "", room_no: "", photo_url: "",
  bio: "", notes: "", status: "active",
};

export default function Doctors() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [list, setList] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Doctor>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

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
    avgFee: list.length ? list.reduce((a, d) => a + Number(d.consultation_fee_usd || 0), 0) / list.length : 0,
    departments: new Set(list.map(d => d.department).filter(Boolean)).size,
  }), [list]);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (d: Doctor) => { setForm(d); setEditId(d.id); setOpen(true); };

  const save = async () => {
    if (!form.full_name) return toast.error("Doctor name required");
    const payload: any = {
      ...form,
      consultation_fee_usd: Number(form.consultation_fee_usd || 0),
      experience_years: Number(form.experience_years || 0) || null,
      joining_date: form.joining_date || null,
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-primary" />Doctor Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage clinic doctors, specializations, schedules and consultation fees.</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Doctor</Button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Doctors</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-success">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Departments</p><p className="text-2xl font-bold">{stats.departments}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Consultation</p><p className="text-2xl font-bold text-primary">{fmtUSD(stats.avgFee)}</p></CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, specialization, dept…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>Grid</Button>
            <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>Table</Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No doctors found.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(d => (
                <div key={d.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border">
                      <AvatarImage src={d.photo_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(d.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{d.full_name}</p>
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{d.status}</Badge>
                      </div>
                      {d.specialization && <p className="text-xs text-primary font-medium">{d.specialization}</p>}
                      {d.qualification && <p className="text-[11px] text-muted-foreground truncate">{d.qualification}</p>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    {d.department && <p className="text-muted-foreground">Dept: <span className="text-foreground">{d.department}</span></p>}
                    {d.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{d.phone}</p>}
                    {d.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{d.email}</p>}
                    {(d.available_days || d.available_hours) && <p className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{[d.available_days, d.available_hours].filter(Boolean).join(" • ")}</p>}
                    {d.experience_years ? <p className="flex items-center gap-1"><Award className="h-3 w-3 text-muted-foreground" />{d.experience_years} yrs experience</p> : null}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Consultation</p>
                      <p className="text-sm font-bold text-primary">{fmtUSD(Number(d.consultation_fee_usd))}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarImage src={d.photo_url ?? undefined} /><AvatarFallback className="text-xs">{initials(d.full_name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium text-sm">{d.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.qualification}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{d.specialization || "—"}</TableCell>
                    <TableCell className="text-sm">{d.department || "—"}</TableCell>
                    <TableCell className="text-sm">{d.phone || "—"}</TableCell>
                    <TableCell className="text-xs">{[d.available_days, d.available_hours].filter(Boolean).join(" • ") || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtUSD(Number(d.consultation_fee_usd))}</TableCell>
                    <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">{d.status}</Badge></TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1"><Label>Full Name *</Label><Input value={form.full_name ?? ""} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Specialization</Label><Input value={form.specialization ?? ""} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiologist" /></div>
            <div className="space-y-1"><Label>Qualification</Label><Input value={form.qualification ?? ""} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD" /></div>
            <div className="space-y-1"><Label>Registration No.</Label><Input value={form.registration_no ?? ""} onChange={e => setForm({ ...form, registration_no: e.target.value })} /></div>
            <div className="space-y-1"><Label>Department</Label><Input value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
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
            <div className="space-y-1"><Label>Consultation Fee (USD)</Label><Input type="number" step="0.01" value={form.consultation_fee_usd ?? 0} onChange={e => setForm({ ...form, consultation_fee_usd: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Experience (years)</Label><Input type="number" value={form.experience_years ?? 0} onChange={e => setForm({ ...form, experience_years: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joining_date ?? ""} onChange={e => setForm({ ...form, joining_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Room No.</Label><Input value={form.room_no ?? ""} onChange={e => setForm({ ...form, room_no: e.target.value })} /></div>
            <div className="space-y-1"><Label>Available Days</Label><Input value={form.available_days ?? ""} onChange={e => setForm({ ...form, available_days: e.target.value })} placeholder="Mon–Fri" /></div>
            <div className="space-y-1"><Label>Available Hours</Label><Input value={form.available_hours ?? ""} onChange={e => setForm({ ...form, available_hours: e.target.value })} placeholder="9:00 AM – 5:00 PM" /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Photo URL</Label><Input value={form.photo_url ?? ""} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://…" /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Bio</Label><Textarea rows={2} value={form.bio ?? ""} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editId ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
