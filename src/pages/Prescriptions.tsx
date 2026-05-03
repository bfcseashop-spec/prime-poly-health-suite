import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Printer, Trash2, FileText, Filter, Search, Eye, MoreVertical, Stethoscope, ScanBarcode } from "lucide-react";
import { toast } from "sonner";

type Item = { item_type: "medicine" | "injection" | "lab" | "xray"; name: string; dose?: string; frequency?: string; duration?: string; route?: string; instructions?: string };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export default function Prescriptions() {
  const [list, setList] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ patient_id: "", doctor_id: "", diagnosis: "", advice: "" });
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // filters
  const [fromDate, setFromDate] = useState(addDays(today(), -30));
  const [toDate, setToDate] = useState(today());
  const [docFilter, setDocFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [perPage, setPerPage] = useState(10);

  const load = async () => {
    const [r, p, d] = await Promise.all([
      supabase.from("prescriptions").select("*, patients(full_name, patient_code), prescription_items(*)").order("created_at", { ascending: false }).limit(500),
      supabase.from("patients").select("id, full_name, patient_code").order("created_at", { ascending: false }).limit(500),
      supabase.from("doctors").select("id, full_name, specialization, qualification").order("full_name"),
    ]);
    setList(r.data ?? []);
    setPatients(p.data ?? []);
    setDoctors((d.data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const docMap = useMemo(() => Object.fromEntries(doctors.map(d => [d.id, d])), [doctors]);

  const filtered = useMemo(() => {
    return list.filter(rx => {
      const dt = (rx.created_at || "").slice(0, 10);
      if (dt < fromDate || dt > toDate) return false;
      if (docFilter !== "all" && rx.doctor_id !== docFilter) return false;
      if (q) {
        const ql = q.toLowerCase();
        const hay = [rx.patients?.full_name, rx.patients?.patient_code, rx.diagnosis, rx.id?.slice(0, 8)].join(" ").toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [list, fromDate, toDate, docFilter, q]);

  const byDoctorCounts = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(rx => { const id = rx.doctor_id || "unknown"; m[id] = (m[id] || 0) + 1; });
    return m;
  }, [filtered]);

  const visiblePage = filtered.slice(0, perPage);
  const allSelected = visiblePage.length > 0 && visiblePage.every(r => selected.has(r.id));
  const toggleAll = () => {
    const s = new Set(selected);
    if (allSelected) visiblePage.forEach(r => s.delete(r.id));
    else visiblePage.forEach(r => s.add(r.id));
    setSelected(s);
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const addItem = (type: Item["item_type"]) => setItems([...items, { item_type: type, name: "" }]);
  const updItem = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const rmItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.patient_id) return toast.error("Select a patient");
    if (items.length === 0) return toast.error("Add at least one item");
    const { data: rx, error } = await supabase.from("prescriptions").insert({
      patient_id: form.patient_id,
      doctor_id: form.doctor_id || null,
      diagnosis: form.diagnosis,
      advice: form.advice,
    }).select().single();
    if (error || !rx) return toast.error(error?.message ?? "Failed");
    const payload = items.filter(i => i.name).map(i => ({ ...i, prescription_id: rx.id }));
    const { error: e2 } = await supabase.from("prescription_items").insert(payload);
    if (e2) return toast.error(e2.message);
    toast.success("Prescription created");
    setOpen(false); setForm({ patient_id: "", doctor_id: "", diagnosis: "", advice: "" }); setItems([]); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this prescription?")) return;
    await supabase.from("prescription_items").delete().eq("prescription_id", id);
    const { error } = await supabase.from("prescriptions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const printRx = (rx: any) => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const its = rx.prescription_items ?? [];
    const grouped: Record<string, any[]> = {};
    its.forEach((i: any) => { (grouped[i.item_type] ||= []).push(i); });
    const sectionTitle: any = { medicine: "Medications", injection: "Injections", lab: "Lab Tests", xray: "X-Ray Orders" };
    const sections = Object.keys(grouped).map(type => `
      <h3>${sectionTitle[type]}</h3>
      <ul>${grouped[type].map((i: any) => `<li><strong>${i.name}</strong>${i.dose ? ` — ${i.dose}` : ""}${i.frequency ? `, ${i.frequency}` : ""}${i.duration ? ` × ${i.duration}` : ""}${i.route ? ` (${i.route})` : ""}${i.instructions ? `<br><em>${i.instructions}</em>` : ""}</li>`).join("")}</ul>`).join("");
    const doc = docMap[rx.doctor_id];
    w.document.write(`<html><head><title>Prescription</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:auto;color:#0f172a}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #0F6E56;padding-bottom:16px;margin-bottom:24px}
      .logo{width:60px;height:60px;background:#0F6E56;color:white;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:32px;font-weight:bold}
      h1{margin:0;color:#0F6E56;font-size:24px} .sub{color:#64748b;font-size:13px}
      h3{color:#0F6E56;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
      .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0;font-size:14px}
      .meta div{padding:6px 0} .meta strong{color:#475569}
      ul{padding-left:20px} li{margin:8px 0;font-size:14px}
      .footer{margin-top:60px;border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;color:#64748b;font-size:12px}</style></head><body>
      <div class="header"><div class="logo">+</div><div><h1>Prime Poly Clinic</h1><div class="sub">Healthcare Management • Prescription</div></div></div>
      <div class="meta">
        <div><strong>Patient:</strong> ${rx.patients?.full_name ?? ""}</div>
        <div><strong>ID:</strong> ${rx.patients?.patient_code ?? ""}</div>
        <div><strong>Doctor:</strong> ${doc?.full_name ?? "—"}</div>
        <div><strong>Date:</strong> ${new Date(rx.created_at).toLocaleString()}</div>
        <div><strong>Rx #:</strong> ${rx.id.slice(0, 8).toUpperCase()}</div>
      </div>
      ${rx.diagnosis ? `<h3>Diagnosis</h3><p>${rx.diagnosis}</p>` : ""}
      ${sections}
      ${rx.advice ? `<h3>Advice</h3><p>${rx.advice}</p>` : ""}
      <div class="footer">Thank you for choosing Prime Poly Clinic</div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-soft">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Prescriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">View and print prescriptions. Use filters for date range and doctor.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm"><FileText className="h-4 w-4 mr-2" />New prescription (OPD)</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Patient *</Label>
                    <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Doctor</Label>
                    <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Items</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" type="button" variant="outline" onClick={() => addItem("medicine")}><Plus className="h-3 w-3 mr-1" />Medicine</Button>
                      <Button size="sm" type="button" variant="outline" onClick={() => addItem("injection")}><Plus className="h-3 w-3 mr-1" />Injection</Button>
                      <Button size="sm" type="button" variant="outline" onClick={() => addItem("lab")}><Plus className="h-3 w-3 mr-1" />Lab</Button>
                      <Button size="sm" type="button" variant="outline" onClick={() => addItem("xray")}><Plus className="h-3 w-3 mr-1" />X-Ray</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 p-2 border rounded-md items-start">
                        <Badge variant="outline" className="col-span-2 capitalize justify-center">{it.item_type}</Badge>
                        <Input className="col-span-3" placeholder="Name" value={it.name} onChange={e => updItem(i, { name: e.target.value })} />
                        {(it.item_type === "medicine" || it.item_type === "injection") && <>
                          <Input className="col-span-2" placeholder="Dose" value={it.dose ?? ""} onChange={e => updItem(i, { dose: e.target.value })} />
                          <Input className="col-span-2" placeholder="Freq" value={it.frequency ?? ""} onChange={e => updItem(i, { frequency: e.target.value })} />
                          <Input className="col-span-2" placeholder="Duration" value={it.duration ?? ""} onChange={e => updItem(i, { duration: e.target.value })} />
                        </>}
                        {it.item_type === "injection" && <Input className="col-span-2 col-start-3 mt-1" placeholder="Route (IV/IM/SC)" value={it.route ?? ""} onChange={e => updItem(i, { route: e.target.value })} />}
                        <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>}
                  </div>
                </div>
                <div className="space-y-2"><Label>Advice / Instructions</Label><Textarea value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save Prescription</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Filter className="h-4 w-4" />Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">From date</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">To date</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <Select value={docFilter} onValueChange={setDocFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="shadow-soft">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-emerald-500/15 flex items-center justify-center"><FileText className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Prescriptions (filtered)</p>
              <p className="text-2xl font-bold text-emerald-600">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-violet-500/15 flex items-center justify-center"><Stethoscope className="h-5 w-5 text-violet-600" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">By doctor</p>
              <p className="text-2xl font-bold text-violet-600">{Object.keys(byDoctorCounts).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By doctor chips */}
      {Object.keys(byDoctorCounts).length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">By doctor</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byDoctorCounts).map(([id, count]) => (
                <Badge key={id} variant="outline" className="bg-muted/50 text-xs px-2.5 py-1">
                  {docMap[id]?.full_name ?? "Unknown"}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions table */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          <div className="p-4 flex items-center justify-between flex-wrap gap-3 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Prescriptions</span>
              <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
            </div>
            <div className="relative w-full sm:w-72">
              <ScanBarcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search / Scan visit or patient" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Visit ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePage.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No prescriptions found</TableCell></TableRow>
              ) : visiblePage.map(rx => {
                const doc = docMap[rx.doctor_id];
                return (
                  <TableRow key={rx.id} className="hover:bg-muted/30">
                    <TableCell><Checkbox checked={selected.has(rx.id)} onCheckedChange={() => toggleOne(rx.id)} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">VIS-{rx.id.slice(0, 3).toUpperCase()}</TableCell>
                    <TableCell className="text-sm">{new Date(rx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{rx.patients?.full_name ?? "—"}</div>
                      {rx.patients?.patient_code && <div className="text-xs text-muted-foreground">{rx.patients.patient_code}</div>}
                    </TableCell>
                    <TableCell>
                      {doc ? (
                        <>
                          <div className="font-medium text-primary">{doc.full_name}</div>
                          <div className="text-xs text-muted-foreground">{doc.specialization || doc.qualification || "—"}</div>
                        </>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{rx.diagnosis || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="text-primary" onClick={() => setViewing(rx)}>
                          <Eye className="h-4 w-4 mr-1" />View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => printRx(rx)}><Printer className="h-4 w-4 mr-2" />Print</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => del(rx.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="p-4 flex items-center justify-between text-xs text-muted-foreground border-t">
            <span>Showing {Math.min(visiblePage.length, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <span>Per page</span>
              <Select value={String(perPage)} onValueChange={v => setPerPage(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Prescription Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-medium">{viewing.patients?.full_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Patient Code</div><div className="font-medium">{viewing.patients?.patient_code}</div></div>
                <div><div className="text-xs text-muted-foreground">Doctor</div><div className="font-medium">{docMap[viewing.doctor_id]?.full_name ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Date</div><div className="font-medium">{new Date(viewing.created_at).toLocaleString()}</div></div>
                <div className="col-span-2"><div className="text-xs text-muted-foreground">Diagnosis</div><div className="font-medium">{viewing.diagnosis || "—"}</div></div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Items ({viewing.prescription_items?.length ?? 0})</div>
                <div className="space-y-1.5">
                  {(viewing.prescription_items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-start gap-2 p-2 rounded border bg-muted/20 text-sm">
                      <Badge variant="outline" className="capitalize shrink-0">{it.item_type}</Badge>
                      <div className="flex-1">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[it.dose, it.frequency, it.duration, it.route].filter(Boolean).join(" • ")}
                          {it.instructions && <div className="italic">{it.instructions}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {viewing.advice && (
                <div><div className="text-xs text-muted-foreground">Advice</div><div className="text-sm">{viewing.advice}</div></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            {viewing && <Button onClick={() => printRx(viewing)}><Printer className="h-4 w-4 mr-2" />Print</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
