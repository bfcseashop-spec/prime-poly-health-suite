import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, Search, Pencil, Trash2, CalendarClock, Stethoscope, ClipboardList, PlayCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

const emptyProc = { name: "", code: "", category: "general", description: "", duration_minutes: "60", price_usd: "0", active: true };
const emptyBooking = {
  patient_id: "", patient_name: "", procedure_id: "", procedure_name: "",
  surgeon_name: "", anesthetist_name: "", anesthesia_type: "",
  theater_room: "OT-1", scheduled_at: "", duration_minutes: "60",
  status: "scheduled", priority: "normal", pre_op_notes: "", post_op_notes: "",
  complications: "", charges_usd: "0",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info/15 text-info",
  in_progress: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export default function OperationTheater() {
  const { user } = useAuth();
  const [procs, setProcs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bDlg, setBDlg] = useState(false);
  const [bForm, setBForm] = useState<any>(emptyBooking);
  const [editingB, setEditingB] = useState<any>(null);
  const [pDlg, setPDlg] = useState(false);
  const [pForm, setPForm] = useState<any>(emptyProc);
  const [editingP, setEditingP] = useState<any>(null);

  const load = async () => {
    const [p, b, pt] = await Promise.all([
      supabase.from("ot_procedures" as any).select("*").order("name"),
      supabase.from("ot_bookings" as any).select("*").order("scheduled_at", { ascending: false }),
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
    ]);
    setProcs((p.data as any) ?? []);
    setBookings((b.data as any) ?? []);
    setPatients(pt.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filteredBookings = useMemo(() => bookings.filter(b => {
    const ql = q.toLowerCase();
    const matchQ = !q || [b.patient_name, b.procedure_name, b.surgeon_name, b.theater_room].some((x: string) => x?.toLowerCase().includes(ql));
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return matchQ;
  }), [bookings, q, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: bookings.length,
      today: bookings.filter(b => new Date(b.scheduled_at).toDateString() === today).length,
      scheduled: bookings.filter(b => b.status === "scheduled").length,
      inProgress: bookings.filter(b => b.status === "in_progress").length,
      completed: bookings.filter(b => b.status === "completed").length,
      revenue: bookings.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.charges_usd || 0), 0),
    };
  }, [bookings]);

  // Booking handlers
  const openAddBooking = () => { setEditingB(null); setBForm(emptyBooking); setBDlg(true); };
  const openEditBooking = (b: any) => {
    setEditingB(b);
    setBForm({
      ...emptyBooking,
      ...Object.fromEntries(Object.keys(emptyBooking).map(k => [k, b[k] ?? (emptyBooking as any)[k]])),
      scheduled_at: b.scheduled_at ? new Date(b.scheduled_at).toISOString().slice(0, 16) : "",
    });
    setBDlg(true);
  };

  const saveBooking = async () => {
    if (!bForm.patient_name) return toast.error("Patient required");
    if (!bForm.procedure_name) return toast.error("Procedure required");
    if (!bForm.scheduled_at) return toast.error("Scheduled time required");
    const payload: any = {
      patient_id: bForm.patient_id || null, patient_name: bForm.patient_name,
      procedure_id: bForm.procedure_id || null, procedure_name: bForm.procedure_name,
      surgeon_name: bForm.surgeon_name || null, anesthetist_name: bForm.anesthetist_name || null,
      anesthesia_type: bForm.anesthesia_type || null, theater_room: bForm.theater_room || null,
      scheduled_at: new Date(bForm.scheduled_at).toISOString(),
      duration_minutes: Number(bForm.duration_minutes || 60),
      status: bForm.status, priority: bForm.priority,
      pre_op_notes: bForm.pre_op_notes || null, post_op_notes: bForm.post_op_notes || null,
      complications: bForm.complications || null,
      charges_usd: Number(bForm.charges_usd || 0),
    };
    if (editingB) {
      const { error } = await supabase.from("ot_bookings" as any).update(payload).eq("id", editingB.id);
      if (error) return toast.error(error.message);
      toast.success("Booking updated");
    } else {
      const { error } = await supabase.from("ot_bookings" as any).insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("Surgery scheduled");
    }
    setBDlg(false); load();
  };

  const updateStatus = async (b: any, status: string) => {
    const patch: any = { status };
    if (status === "in_progress" && !b.started_at) patch.started_at = new Date().toISOString();
    if (status === "completed" && !b.completed_at) patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("ot_bookings" as any).update(patch).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status.replace("_", " ")}`); load();
  };

  const delBooking = async (b: any) => {
    if (!confirm(`Delete booking for ${b.patient_name}?`)) return;
    await supabase.from("ot_bookings" as any).delete().eq("id", b.id);
    toast.success("Deleted"); load();
  };

  // Procedure handlers
  const openAddProc = () => { setEditingP(null); setPForm(emptyProc); setPDlg(true); };
  const openEditProc = (p: any) => { setEditingP(p); setPForm({ ...emptyProc, ...p, duration_minutes: String(p.duration_minutes ?? 60), price_usd: String(p.price_usd ?? 0) }); setPDlg(true); };

  const saveProc = async () => {
    if (!pForm.name) return toast.error("Name required");
    const payload = {
      name: pForm.name, code: pForm.code || null, category: pForm.category || "general",
      description: pForm.description || null,
      duration_minutes: Number(pForm.duration_minutes || 60),
      price_usd: Number(pForm.price_usd || 0), active: pForm.active,
    };
    if (editingP) {
      const { error } = await supabase.from("ot_procedures" as any).update(payload).eq("id", editingP.id);
      if (error) return toast.error(error.message);
      toast.success("Procedure updated");
    } else {
      const { error } = await supabase.from("ot_procedures" as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Procedure added");
    }
    setPDlg(false); load();
  };

  const delProc = async (p: any) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await supabase.from("ot_procedures" as any).delete().eq("id", p.id);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />Operation Theater
          </h1>
          <p className="text-muted-foreground mt-1">Surgery scheduling, procedure catalog & OT management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /><span className="text-xs text-muted-foreground">Total</span></div><p className="text-2xl font-bold mt-1">{stats.total}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-info" /><span className="text-xs text-muted-foreground">Today</span></div><p className="text-2xl font-bold mt-1">{stats.today}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-info" /><span className="text-xs text-muted-foreground">Scheduled</span></div><p className="text-2xl font-bold mt-1">{stats.scheduled}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><PlayCircle className="h-5 w-5 text-warning" /><span className="text-xs text-muted-foreground">In Progress</span></div><p className="text-2xl font-bold mt-1">{stats.inProgress}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><span className="text-xs text-muted-foreground">Completed</span></div><p className="text-2xl font-bold mt-1">{stats.completed}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><div className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-success" /><span className="text-xs text-muted-foreground">Revenue</span></div><p className="text-xl font-bold mt-1">{fmtUSD(stats.revenue)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings"><CalendarClock className="h-4 w-4 mr-2" />Surgery Schedule</TabsTrigger>
          <TabsTrigger value="procedures"><ClipboardList className="h-4 w-4 mr-2" />Procedure Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by patient, procedure, surgeon..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAddBooking}><Plus className="h-4 w-4 mr-2" />Schedule Surgery</Button>
          </div>

          <Card className="shadow-soft overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Surgeon</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No surgeries scheduled</TableCell></TableRow>
                ) : filteredBookings.map(b => (
                  <TableRow key={b.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs">
                      <div className="font-medium">{new Date(b.scheduled_at).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{new Date(b.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </TableCell>
                    <TableCell className="font-medium">{b.patient_name}</TableCell>
                    <TableCell>
                      <div>{b.procedure_name}</div>
                      {b.anesthesia_type && <div className="text-xs text-muted-foreground">{b.anesthesia_type}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{b.surgeon_name ?? "—"}</TableCell>
                    <TableCell className="text-sm"><Badge variant="outline">{b.theater_room ?? "—"}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge variant={b.priority === "emergency" ? "destructive" : b.priority === "urgent" ? "default" : "secondary"} className="capitalize">{b.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmtUSD(Number(b.charges_usd ?? 0))}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`capitalize ${STATUS_COLORS[b.status] ?? ""}`}>{b.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {b.status === "scheduled" && <Button size="icon" variant="ghost" className="h-8 w-8" title="Start" onClick={() => updateStatus(b, "in_progress")}><PlayCircle className="h-4 w-4 text-warning" /></Button>}
                        {b.status === "in_progress" && <Button size="icon" variant="ghost" className="h-8 w-8" title="Complete" onClick={() => updateStatus(b, "completed")}><CheckCircle2 className="h-4 w-4 text-success" /></Button>}
                        {!["completed", "cancelled"].includes(b.status) && <Button size="icon" variant="ghost" className="h-8 w-8" title="Cancel" onClick={() => updateStatus(b, "cancelled")}><XCircle className="h-4 w-4 text-muted-foreground" /></Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditBooking(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => delBooking(b)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="mt-4 space-y-3">
          <div className="flex justify-end"><Button onClick={openAddProc}><Plus className="h-4 w-4 mr-2" />Add Procedure</Button></div>
          <Card className="shadow-soft overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-center">Duration</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-center">Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {procs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No procedures yet</TableCell></TableRow>
                ) : procs.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code ?? "—"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{p.category}</Badge></TableCell>
                    <TableCell className="text-center text-sm">{p.duration_minutes} min</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">{fmtUSD(Number(p.price_usd ?? 0))}</TableCell>
                    <TableCell className="text-center">{p.active ? <Badge className="bg-success/15 text-success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditProc(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => delProc(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <Dialog open={bDlg} onOpenChange={setBDlg}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingB ? "Edit Surgery Booking" : "Schedule Surgery"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <Select value={bForm.patient_id} onValueChange={v => {
                  const p = patients.find(x => x.id === v);
                  setBForm({ ...bForm, patient_id: v, patient_name: p?.full_name ?? "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Procedure *</Label>
                <Select value={bForm.procedure_id} onValueChange={v => {
                  const p = procs.find(x => x.id === v);
                  setBForm({ ...bForm, procedure_id: v, procedure_name: p?.name ?? "", duration_minutes: String(p?.duration_minutes ?? 60), charges_usd: String(p?.price_usd ?? 0) });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select procedure..." /></SelectTrigger>
                  <SelectContent>{procs.filter(p => p.active).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {fmtUSD(Number(p.price_usd))}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Scheduled Date & Time *</Label><Input type="datetime-local" value={bForm.scheduled_at} onChange={e => setBForm({ ...bForm, scheduled_at: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Duration (minutes)</Label><Input type="number" value={bForm.duration_minutes} onChange={e => setBForm({ ...bForm, duration_minutes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Surgeon</Label><Input value={bForm.surgeon_name} onChange={e => setBForm({ ...bForm, surgeon_name: e.target.value })} placeholder="Dr. Name" /></div>
              <div className="space-y-1.5"><Label>Anesthetist</Label><Input value={bForm.anesthetist_name} onChange={e => setBForm({ ...bForm, anesthetist_name: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Anesthesia Type</Label>
                <Select value={bForm.anesthesia_type} onValueChange={v => setBForm({ ...bForm, anesthesia_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                    <SelectItem value="Spinal">Spinal</SelectItem>
                    <SelectItem value="Sedation">Sedation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Theater Room</Label>
                <Select value={bForm.theater_room} onValueChange={v => setBForm({ ...bForm, theater_room: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OT-1">OT-1</SelectItem>
                    <SelectItem value="OT-2">OT-2</SelectItem>
                    <SelectItem value="OT-3">OT-3</SelectItem>
                    <SelectItem value="Minor OT">Minor OT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={bForm.priority} onValueChange={v => setBForm({ ...bForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={bForm.status} onValueChange={v => setBForm({ ...bForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Charges (USD)</Label><Input type="number" step="0.01" value={bForm.charges_usd} onChange={e => setBForm({ ...bForm, charges_usd: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Pre-op Notes</Label><Textarea value={bForm.pre_op_notes} onChange={e => setBForm({ ...bForm, pre_op_notes: e.target.value })} placeholder="Patient prep, allergies, etc." /></div>
            <div className="space-y-1.5"><Label>Post-op Notes</Label><Textarea value={bForm.post_op_notes} onChange={e => setBForm({ ...bForm, post_op_notes: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Complications</Label><Textarea value={bForm.complications} onChange={e => setBForm({ ...bForm, complications: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBDlg(false)}>Cancel</Button><Button onClick={saveBooking}>{editingB ? "Update" : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procedure Dialog */}
      <Dialog open={pDlg} onOpenChange={setPDlg}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingP ? "Edit Procedure" : "Add Procedure"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Procedure Name *</Label><Input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="e.g. Appendectomy" /></div>
              <div className="space-y-1.5"><Label>Code</Label><Input value={pForm.code} onChange={e => setPForm({ ...pForm, code: e.target.value })} placeholder="e.g. APP-001" /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={pForm.category} onValueChange={v => setPForm({ ...pForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Surgery</SelectItem>
                    <SelectItem value="orthopedic">Orthopedic</SelectItem>
                    <SelectItem value="cardiac">Cardiac</SelectItem>
                    <SelectItem value="neuro">Neurosurgery</SelectItem>
                    <SelectItem value="plastic">Plastic</SelectItem>
                    <SelectItem value="ent">ENT</SelectItem>
                    <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
                    <SelectItem value="gyne">Gynecology</SelectItem>
                    <SelectItem value="urology">Urology</SelectItem>
                    <SelectItem value="minor">Minor Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={pForm.duration_minutes} onChange={e => setPForm({ ...pForm, duration_minutes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Price (USD) *</Label><Input type="number" step="0.01" value={pForm.price_usd} onChange={e => setPForm({ ...pForm, price_usd: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPDlg(false)}>Cancel</Button><Button onClick={saveProc}>{editingP ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
