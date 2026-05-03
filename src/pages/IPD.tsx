import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmtUSD } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BedDouble, UserPlus, LogOut, Users, Activity, Stethoscope, Search,
  CircleCheck, CircleX, Wrench, Crown, Heart,
} from "lucide-react";

const ROOM_TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  general: { label: "General", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: BedDouble },
  private: { label: "Private", color: "bg-primary/10 text-primary border-primary/30", icon: BedDouble },
  vip: { label: "VIP", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Crown },
  icu: { label: "ICU", color: "bg-destructive/10 text-destructive border-destructive/30", icon: Heart },
  cabin: { label: "Cabin", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: BedDouble },
};

const STATUS_META: Record<string, { color: string; icon: any }> = {
  available: { color: "bg-success/10 text-success border-success/30", icon: CircleCheck },
  occupied: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: CircleX },
  maintenance: { color: "bg-warning/10 text-warning border-warning/30", icon: Wrench },
};

export default function IPD() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");
  const [admitOpen, setAdmitOpen] = useState(false);
  const [dischargeFor, setDischargeFor] = useState<any | null>(null);
  const [preselectRoom, setPreselectRoom] = useState<string>("");

  const [form, setForm] = useState<any>({
    patient_id: "", room_id: "", doctor_name: "", admission_type: "general",
    diagnosis: "", reason: "", expected_discharge: "", bed_no: "",
  });

  const load = async () => {
    const [r, a, p, d] = await Promise.all([
      supabase.from("rooms" as any).select("*").order("room_no"),
      supabase.from("admissions" as any).select("*, patients(full_name, patient_code, phone, gender), rooms(room_no, room_type, daily_rate_usd)").order("admitted_at", { ascending: false }),
      supabase.from("patients").select("id, full_name, patient_code, phone, gender").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("id, full_name").not("full_name", "is", null),
    ]);
    setRooms((r as any).data ?? []);
    setAdmissions((a as any).data ?? []);
    setPatients(p.data ?? []);
    setDoctors(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.status === "occupied").length;
    const available = rooms.filter(r => r.status === "available").length;
    const maintenance = rooms.filter(r => r.status === "maintenance").length;
    const currentAdmissions = admissions.filter(a => a.status === "admitted").length;
    return { total, occupied, available, maintenance, currentAdmissions, occupancy: total ? (occupied / total) * 100 : 0 };
  }, [rooms, admissions]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search && !r.room_no.toLowerCase().includes(search.toLowerCase()) && !r.room_type.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rooms, filter, search]);

  const activeAdmissions = useMemo(() => admissions.filter(a => a.status === "admitted"), [admissions]);
  const dischargedAdmissions = useMemo(() => admissions.filter(a => a.status === "discharged").slice(0, 30), [admissions]);

  const findActiveByRoom = (roomId: string) => activeAdmissions.find(a => a.room_id === roomId);

  const openAdmit = (roomId?: string) => {
    setForm({ patient_id: "", room_id: roomId || "", doctor_name: "", admission_type: "general", diagnosis: "", reason: "", expected_discharge: "", bed_no: "" });
    setPreselectRoom(roomId || "");
    setAdmitOpen(true);
  };

  const submitAdmit = async () => {
    if (!form.patient_id) return toast.error("Select a patient");
    if (!form.room_id) return toast.error("Select a room");
    const room = rooms.find(r => r.id === form.room_id);
    const { error } = await (supabase.from("admissions" as any) as any).insert({
      patient_id: form.patient_id,
      room_id: form.room_id,
      bed_no: form.bed_no || null,
      doctor_name: form.doctor_name || null,
      admission_type: form.admission_type,
      diagnosis: form.diagnosis || null,
      reason: form.reason || null,
      expected_discharge: form.expected_discharge || null,
      daily_rate_usd: room?.daily_rate_usd ?? 0,
      status: "admitted",
    });
    if (error) return toast.error(error.message);
    toast.success("Patient admitted successfully");
    setAdmitOpen(false);
    load();
  };

  const submitDischarge = async () => {
    if (!dischargeFor) return;
    const days = Math.max(1, Math.ceil((Date.now() - new Date(dischargeFor.admitted_at).getTime()) / 86400000));
    const total = days * Number(dischargeFor.daily_rate_usd || 0);
    const { error } = await (supabase.from("admissions" as any) as any)
      .update({
        status: "discharged",
        discharged_at: new Date().toISOString(),
        discharge_notes: dischargeFor.discharge_notes || null,
        total_charges_usd: total,
      })
      .eq("id", dischargeFor.id);
    if (error) return toast.error(error.message);
    toast.success(`Discharged. Total charges: ${fmtUSD(total)}`);
    setDischargeFor(null);
    load();
  };

  const setRoomStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("rooms" as any) as any).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Room updated");
    load();
  };

  const KPI = ({ icon: Icon, label, value, hint, tone }: any) => {
    const tones: Record<string, string> = {
      success: "from-success/15 to-success/5 text-success",
      danger: "from-destructive/15 to-destructive/5 text-destructive",
      warning: "from-warning/15 to-warning/5 text-warning",
      primary: "from-primary/15 to-primary/5 text-primary",
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">In-Patient Department</h1>
          <p className="text-muted-foreground mt-1 text-sm">Admissions, room availability, and bed management</p>
        </div>
        <Button onClick={() => openAdmit()} className="clinic-gradient text-primary-foreground">
          <UserPlus className="h-4 w-4 mr-2" />Admit Patient
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KPI icon={Users} label="Currently Admitted" value={stats.currentAdmissions} hint="active in-patients" tone="primary" />
        <KPI icon={CircleCheck} label="Available Rooms" value={stats.available} hint={`of ${stats.total} rooms`} tone="success" />
        <KPI icon={CircleX} label="Occupied" value={stats.occupied} hint={`${stats.occupancy.toFixed(0)}% full`} tone="danger" />
        <KPI icon={Wrench} label="Maintenance" value={stats.maintenance} tone="warning" />
        <KPI icon={Activity} label="Occupancy Rate" value={`${stats.occupancy.toFixed(0)}%`} hint="real-time" tone="primary" />
      </div>

      <Tabs defaultValue="rooms" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="rooms"><BedDouble className="h-4 w-4 mr-1.5" />Room Map</TabsTrigger>
          <TabsTrigger value="admitted"><Users className="h-4 w-4 mr-1.5" />Admitted ({activeAdmissions.length})</TabsTrigger>
          <TabsTrigger value="history">Discharge History</TabsTrigger>
        </TabsList>

        {/* ROOM MAP */}
        <TabsContent value="rooms" className="space-y-4 mt-0">
          <Card className="shadow-soft">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search room number or type..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["all","available","occupied","maintenance"] as const).map(s => (
                  <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="capitalize">
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredRooms.map(room => {
              const meta = ROOM_TYPE_META[room.room_type] || ROOM_TYPE_META.general;
              const sm = STATUS_META[room.status];
              const Icon = meta.icon;
              const SIcon = sm.icon;
              const adm = findActiveByRoom(room.id);
              return (
                <Card key={room.id} className={cn("shadow-soft hover:shadow-card transition-all border-2", sm.color.split(" ").find(c => c.startsWith("border")))}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold">{room.room_no}</p>
                        <Badge variant="outline" className={cn("text-[10px] mt-0.5", meta.color)}>
                          <Icon className="h-3 w-3 mr-1" />{meta.label}
                        </Badge>
                      </div>
                      <Badge className={cn("capitalize text-[10px] gap-1", sm.color)}>
                        <SIcon className="h-3 w-3" />{room.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Floor: <span className="text-foreground font-medium">{room.floor || "—"}</span></p>
                      <p>Rate: <span className="text-foreground font-semibold">{fmtUSD(Number(room.daily_rate_usd))}/day</span></p>
                    </div>

                    {adm && (
                      <div className="p-2 rounded-md bg-muted/50 text-xs space-y-0.5">
                        <p className="font-semibold truncate">{adm.patients?.full_name}</p>
                        <p className="text-muted-foreground truncate">Dr. {adm.doctor_name || "—"}</p>
                        <p className="text-muted-foreground">Since {format(new Date(adm.admitted_at), "MMM d")}</p>
                      </div>
                    )}

                    <div className="flex gap-1.5 pt-1">
                      {room.status === "available" && (
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => openAdmit(room.id)}>
                          <UserPlus className="h-3 w-3 mr-1" />Admit
                        </Button>
                      )}
                      {room.status === "occupied" && adm && (
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setDischargeFor(adm)}>
                          <LogOut className="h-3 w-3 mr-1" />Discharge
                        </Button>
                      )}
                      <Select value={room.status} onValueChange={(v) => setRoomStatus(room.id, v)}>
                        <SelectTrigger className="h-7 w-7 px-0 justify-center" />
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied" disabled>Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredRooms.length === 0 && (
              <Card className="col-span-full shadow-soft">
                <CardContent className="p-12 text-center text-muted-foreground">No rooms match your filter</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ADMITTED LIST */}
        <TabsContent value="admitted" className="mt-0">
          <Card className="shadow-soft">
            <CardHeader className="pb-2"><CardTitle className="text-base">Currently Admitted Patients</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Admitted</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="text-right">Charges</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAdmissions.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No active admissions</TableCell></TableRow>
                  ) : activeAdmissions.map(a => {
                    const days = Math.max(1, Math.ceil((Date.now() - new Date(a.admitted_at).getTime()) / 86400000));
                    const charges = days * Number(a.daily_rate_usd || 0);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.admission_no}</TableCell>
                        <TableCell>
                          <div className="font-medium">{a.patients?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{a.patients?.patient_code} • {a.patients?.phone || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{a.rooms?.room_no || "—"}</div>
                          <div className="text-xs text-muted-foreground capitalize">{a.rooms?.room_type}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.doctor_name ? <><Stethoscope className="h-3 w-3 inline mr-1" />Dr. {a.doctor_name}</> : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{a.admission_type}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(a.admitted_at), "PP")}</TableCell>
                        <TableCell><Badge>{days}d</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{fmtUSD(charges)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setDischargeFor(a)}>
                            <LogOut className="h-3 w-3 mr-1" />Discharge
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-0">
          <Card className="shadow-soft">
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Discharges</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Admitted</TableHead>
                    <TableHead>Discharged</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dischargedAdmissions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No discharge records</TableCell></TableRow>
                  ) : dischargedAdmissions.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.admission_no}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.patients?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.patients?.patient_code}</div>
                      </TableCell>
                      <TableCell>{a.rooms?.room_no || "—"}</TableCell>
                      <TableCell className="text-sm">{a.doctor_name ? `Dr. ${a.doctor_name}` : "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(a.admitted_at), "PP")}</TableCell>
                      <TableCell className="text-sm">{a.discharged_at ? format(new Date(a.discharged_at), "PP") : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtUSD(Number(a.total_charges_usd || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADMIT DIALOG */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Admit Patient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Patient *</Label>
              <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name} {p.phone && `(${p.phone})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={form.room_id} onValueChange={v => setForm({ ...form, room_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.filter(r => r.status === "available" || r.id === preselectRoom).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.room_no} — {ROOM_TYPE_META[r.room_type]?.label} ({fmtUSD(Number(r.daily_rate_usd))}/day)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bed No</Label>
              <Input value={form.bed_no} onChange={e => setForm({ ...form, bed_no: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Assigned Doctor</Label>
              <Input list="doctors-list" value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} placeholder="Dr. Name" />
              <datalist id="doctors-list">
                {doctors.map(d => <option key={d.id} value={d.full_name} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Admission Type</Label>
              <Select value={form.admission_type} onValueChange={v => setForm({ ...form, admission_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="observation">Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Expected Discharge</Label>
              <Input type="date" value={form.expected_discharge} onChange={e => setForm({ ...form, expected_discharge: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason / Notes</Label>
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitOpen(false)}>Cancel</Button>
            <Button onClick={submitAdmit} className="clinic-gradient text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-2" />Admit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISCHARGE DIALOG */}
      <Dialog open={!!dischargeFor} onOpenChange={(o) => !o && setDischargeFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Discharge Patient</DialogTitle></DialogHeader>
          {dischargeFor && (() => {
            const days = Math.max(1, Math.ceil((Date.now() - new Date(dischargeFor.admitted_at).getTime()) / 86400000));
            const total = days * Number(dischargeFor.daily_rate_usd || 0);
            return (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="font-semibold">{dischargeFor.patients?.full_name}</p>
                  <p className="text-sm text-muted-foreground">Room {dischargeFor.rooms?.room_no} • Admitted {format(new Date(dischargeFor.admitted_at), "PP")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Days</p><p className="text-xl font-bold">{days}</p></div>
                  <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Rate/day</p><p className="text-xl font-bold">{fmtUSD(Number(dischargeFor.daily_rate_usd || 0))}</p></div>
                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/30"><p className="text-xs text-primary">Total</p><p className="text-xl font-bold text-primary">{fmtUSD(total)}</p></div>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Notes</Label>
                  <Textarea value={dischargeFor.discharge_notes || ""} onChange={e => setDischargeFor({ ...dischargeFor, discharge_notes: e.target.value })} rows={3} placeholder="Condition, follow-up advice..." />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeFor(null)}>Cancel</Button>
            <Button onClick={submitDischarge} className="clinic-gradient text-primary-foreground">
              <LogOut className="h-4 w-4 mr-2" />Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
