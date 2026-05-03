import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Scan, Plus, Search, FileImage, ClipboardList, Trash2, Upload, Printer, CheckCircle2, Clock, Eye, Pencil, User, Activity, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

type XTest = { id: string; code: string | null; name: string; modality: string; body_part: string | null; view_type: string | null; price_usd: number; turnaround_hours: number | null; active: boolean; description?: string | null };
type Patient = { id: string; full_name: string; patient_code: string; phone: string | null; dob: string | null; gender: string | null };

const MODALITIES = ["X-Ray", "CT Scan", "MRI", "Ultrasound", "Mammography", "Fluoroscopy"];
const BODY_PARTS = ["Chest", "Skull", "Spine", "Abdomen", "Pelvis", "Upper Limb", "Lower Limb", "Hand", "Foot", "Knee", "Shoulder", "Other"];
const PRIORITIES = [{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }, { v: "stat", l: "STAT" }];
const STATUSES = [
  { v: "pending", l: "Pending", c: "bg-warning/15 text-warning border-warning/30" },
  { v: "in_progress", l: "In Progress", c: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { v: "completed", l: "Completed", c: "bg-success/15 text-success border-success/30" },
  { v: "cancelled", l: "Cancelled", c: "bg-destructive/15 text-destructive border-destructive/30" },
];

const ageOf = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const statusBadge = (s: string) => {
  const f = STATUSES.find(x => x.v === s) ?? STATUSES[0];
  return <Badge variant="outline" className={f.c}>{f.l}</Badge>;
};

export default function XRay() {
  const { user } = useAuth();
  const [tab, setTab] = useState("orders");

  const [tests, setTests] = useState<XTest[]>([]);
  const [testQ, setTestQ] = useState("");
  const [testMod, setTestMod] = useState("all");
  const [testDlg, setTestDlg] = useState<Partial<XTest> | null>(null);
  const [viewTest, setViewTest] = useState<XTest | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [openOrder, setOpenOrder] = useState<any | null>(null);
  const [openItems, setOpenItems] = useState<any[]>([]);

  const [newDlg, setNewDlg] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [newPid, setNewPid] = useState("");
  const [newDoctor, setNewDoctor] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newClinical, setNewClinical] = useState("");
  const [newSelected, setNewSelected] = useState<XTest[]>([]);

  const loadTests = async () => {
    const { data } = await supabase.from("xray_tests" as any).select("*").order("name");
    setTests((data as any[]) ?? []);
  };
  const loadOrders = async () => {
    const { data } = await supabase.from("xray_orders" as any).select("*").order("created_at", { ascending: false }).limit(300);
    const ords = (data as any[]) ?? [];
    setOrders(ords);
    const ids = Array.from(new Set(ords.map(o => o.patient_id).filter(Boolean)));
    if (ids.length) {
      const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code, phone, dob, gender").in("id", ids as string[]);
      const map: Record<string, Patient> = {};
      (pts ?? []).forEach((p: any) => { map[p.id] = p; });
      setPatients(map);
    }
    if (ords.length) {
      const { data: items } = await supabase.from("xray_order_items" as any).select("*").in("order_id", ords.map(o => o.id));
      const grouped: Record<string, any[]> = {};
      ((items as any[]) ?? []).forEach((it: any) => { (grouped[it.order_id] ||= []).push(it); });
      setOrderItems(grouped);
    }
  };
  const loadPatients = async () => {
    const { data } = await supabase.from("patients").select("id, full_name, patient_code, phone, dob, gender").order("full_name").limit(500);
    setAllPatients((data as any[]) ?? []);
  };

  useEffect(() => { loadTests(); loadOrders(); loadPatients(); }, []);

  // Catalog
  const filteredTests = useMemo(() => tests.filter(t => {
    const q = testQ.toLowerCase();
    const ok = !q || t.name.toLowerCase().includes(q) || (t.code ?? "").toLowerCase().includes(q) || (t.body_part ?? "").toLowerCase().includes(q);
    const okMod = testMod === "all" || t.modality === testMod;
    return ok && okMod;
  }), [tests, testQ, testMod]);

  const saveTest = async () => {
    if (!testDlg?.name) { toast.error("Name required"); return; }
    const payload: any = {
      name: testDlg.name, code: testDlg.code ?? null, modality: testDlg.modality ?? "X-Ray",
      body_part: testDlg.body_part ?? null, view_type: testDlg.view_type ?? null,
      price_usd: Number(testDlg.price_usd ?? 0), turnaround_hours: Number(testDlg.turnaround_hours ?? 4),
      description: testDlg.description ?? null, active: testDlg.active ?? true,
    };
    const q = testDlg.id
      ? supabase.from("xray_tests" as any).update(payload).eq("id", testDlg.id)
      : supabase.from("xray_tests" as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setTestDlg(null); loadTests();
  };
  const delTest = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    const { error } = await supabase.from("xray_tests" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadTests();
  };

  // Orders
  const filteredOrders = useMemo(() => orders.filter(o => {
    const p = patients[o.patient_id];
    const q = orderQ.toLowerCase();
    const ok = !q || o.order_no.toLowerCase().includes(q) || (p?.full_name ?? "").toLowerCase().includes(q) || (p?.patient_code ?? "").toLowerCase().includes(q);
    const okS = orderStatus === "all" || o.status === orderStatus;
    return ok && okS;
  }), [orders, patients, orderQ, orderStatus]);

  const createOrder = async () => {
    if (!newPid) return toast.error("Select patient");
    if (!newSelected.length) return toast.error("Add at least one study");
    const total = newSelected.reduce((s, t) => s + Number(t.price_usd), 0);
    const { data: ord, error } = await supabase.from("xray_orders" as any).insert({
      patient_id: newPid, doctor_name: newDoctor || null, priority: newPriority,
      clinical_notes: newClinical || null, total_usd: total, created_by: user?.id ?? null,
    }).select("*").single();
    if (error || !ord) return toast.error(error?.message ?? "Failed");
    const items = newSelected.map(t => ({
      order_id: (ord as any).id, test_id: t.id, test_name: t.name, modality: t.modality,
      body_part: t.body_part, price_usd: Number(t.price_usd),
    }));
    const { error: e2 } = await supabase.from("xray_order_items" as any).insert(items);
    if (e2) return toast.error(e2.message);
    toast.success("Order created");
    setNewDlg(false); setNewPid(""); setNewDoctor(""); setNewPriority("normal"); setNewClinical(""); setNewSelected([]);
    loadOrders();
  };

  const openOrderDlg = (o: any) => {
    setOpenOrder(o);
    setOpenItems(orderItems[o.id] ?? []);
  };

  const updateItem = (idx: number, patch: any) => {
    setOpenItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const uploadReport = async (idx: number, file: File) => {
    const path = `${openOrder.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("xray-files").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("xray-files").getPublicUrl(path);
    updateItem(idx, { report_file_url: data.publicUrl });
    toast.success("Uploaded");
  };

  const uploadImage = async (idx: number, file: File) => {
    const path = `${openOrder.id}/img_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("xray-files").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("xray-files").getPublicUrl(path);
    const cur = openItems[idx].image_urls ?? [];
    updateItem(idx, { image_urls: [...cur, data.publicUrl] });
    toast.success("Image added");
  };

  const saveItems = async () => {
    for (const it of openItems) {
      const { error } = await supabase.from("xray_order_items" as any).update({
        findings: it.findings, impression: it.impression, radiologist_name: it.radiologist_name,
        report_file_url: it.report_file_url, image_urls: it.image_urls ?? [], status: it.status,
        completed_at: it.status === "completed" ? new Date().toISOString() : it.completed_at,
        completed_by: it.status === "completed" ? user?.id ?? null : it.completed_by,
      }).eq("id", it.id);
      if (error) return toast.error(error.message);
    }
    const allDone = openItems.every(i => i.status === "completed");
    const anyProg = openItems.some(i => i.status === "in_progress" || i.status === "completed");
    const newStatus = allDone ? "completed" : anyProg ? "in_progress" : openOrder.status;
    await supabase.from("xray_orders" as any).update({ status: newStatus }).eq("id", openOrder.id);
    toast.success("Saved"); setOpenOrder(null); loadOrders();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Delete order and all items?")) return;
    await supabase.from("xray_order_items" as any).delete().eq("order_id", id);
    const { error } = await supabase.from("xray_orders" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadOrders();
  };

  const printReport = (o: any) => {
    const p = patients[o.patient_id];
    const items = orderItems[o.id] ?? [];
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`
      <html><head><title>${o.order_no}</title>
      <style>
        body{font-family:Arial;padding:32px;color:#111}
        h1{margin:0;color:#0ea5e9}
        .head{display:flex;justify-content:space-between;border-bottom:2px solid #0ea5e9;padding-bottom:12px;margin-bottom:18px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;font-size:14px}
        .item{border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:14px}
        .item h3{margin:0 0 8px;color:#0369a1}
        .lbl{font-weight:600;color:#475569}
        img{max-width:300px;margin:6px;border:1px solid #ddd;border-radius:4px}
        .sig{margin-top:40px;display:flex;justify-content:space-between}
      </style></head><body>
      <div class="head">
        <div><h1>X-Ray / Imaging Report</h1><div>Order: ${o.order_no}</div></div>
        <div style="text-align:right"><div>Date: ${new Date(o.ordered_on).toLocaleDateString()}</div><div>Priority: ${o.priority}</div></div>
      </div>
      <div class="grid">
        <div><span class="lbl">Patient:</span> ${p?.full_name ?? ""}</div>
        <div><span class="lbl">Patient ID:</span> ${p?.patient_code ?? ""}</div>
        <div><span class="lbl">Age:</span> ${ageOf(p?.dob) ?? "-"}</div>
        <div><span class="lbl">Gender:</span> ${p?.gender ?? "-"}</div>
        <div><span class="lbl">Referring Doctor:</span> ${o.doctor_name ?? "-"}</div>
        <div><span class="lbl">Phone:</span> ${p?.phone ?? "-"}</div>
      </div>
      ${o.clinical_notes ? `<div style="margin-bottom:14px"><span class="lbl">Clinical Notes:</span> ${o.clinical_notes}</div>` : ""}
      ${items.map(it => `
        <div class="item">
          <h3>${it.test_name} ${it.modality ? `(${it.modality})` : ""}</h3>
          <div><span class="lbl">Body Part:</span> ${it.body_part ?? "-"}</div>
          ${it.findings ? `<div style="margin-top:8px"><span class="lbl">Findings:</span><br>${it.findings}</div>` : ""}
          ${it.impression ? `<div style="margin-top:8px"><span class="lbl">Impression:</span><br>${it.impression}</div>` : ""}
          ${(it.image_urls ?? []).length ? `<div style="margin-top:8px">${it.image_urls.map((u: string) => `<img src="${u}"/>`).join("")}</div>` : ""}
        </div>
      `).join("")}
      <div class="sig"><div>_________________<br>Technologist</div><div>_________________<br>Radiologist: ${items[0]?.radiologist_name ?? ""}</div></div>
      </body></html>
    `);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    inprog: orders.filter(o => o.status === "in_progress").length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Scan className="h-8 w-8 text-primary" /> X-Ray & Imaging</h1>
          <p className="text-muted-foreground mt-1">Order, track, and report imaging studies</p>
        </div>
        <Button onClick={() => setNewDlg(true)}><Plus className="h-4 w-4" /> New Order</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total Orders" value={stats.total} color="text-primary" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={stats.pending} color="text-warning" />
        <StatCard icon={<Activity className="h-5 w-5" />} label="In Progress" value={stats.inprog} color="text-blue-600" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={stats.completed} color="text-success" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders"><ClipboardList className="h-4 w-4 mr-2" />Orders</TabsTrigger>
          <TabsTrigger value="catalog"><FileImage className="h-4 w-4 mr-2" />Test Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by order #, patient name or ID..." className="pl-9" value={orderQ} onChange={e => setOrderQ(e.target.value)} />
              </div>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Age / Gender</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(o => {
                    const p = patients[o.patient_id];
                    const its = orderItems[o.id] ?? [];
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                        <TableCell className="font-mono">{p?.patient_code ?? "—"}</TableCell>
                        <TableCell className="font-medium">{p?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{ageOf(p?.dob) ?? "-"} / {p?.gender ?? "-"}</TableCell>
                        <TableCell className="text-sm">{its.length} {its[0] ? `· ${its[0].test_name}${its.length > 1 ? ` +${its.length - 1}` : ""}` : ""}</TableCell>
                        <TableCell><Badge variant={o.priority === "stat" ? "destructive" : o.priority === "urgent" ? "default" : "secondary"}>{o.priority}</Badge></TableCell>
                        <TableCell>{statusBadge(o.status)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtUSD(o.total_usd)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(o.ordered_on).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openOrderDlg(o)} title="Open / Edit"><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => printReport(o)} title="Print"><Printer className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteOrder(o.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredOrders.length && <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No orders</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search test, code, body part..." className="pl-9" value={testQ} onChange={e => setTestQ(e.target.value)} />
              </div>
              <Select value={testMod} onValueChange={setTestMod}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modalities</SelectItem>
                  {MODALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => setTestDlg({ active: true, modality: "X-Ray", price_usd: 0, turnaround_hours: 4 })}><Plus className="h-4 w-4" /> Add Test</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Modality</TableHead>
                    <TableHead>Body Part</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>TAT (hrs)</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.code ?? "—"}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="secondary">{t.modality}</Badge></TableCell>
                      <TableCell>{t.body_part ?? "—"}</TableCell>
                      <TableCell>{t.view_type ?? "—"}</TableCell>
                      <TableCell>{t.turnaround_hours ?? "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtUSD(t.price_usd)}</TableCell>
                      <TableCell>{t.active ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setViewTest(t)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setTestDlg(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delTest(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredTests.length && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No tests in catalog. Click "Add Test" to create one.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={newDlg} onOpenChange={setNewDlg}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Imaging Order</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Patient *</Label>
                <Select value={newPid} onValueChange={setNewPid}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {allPatients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Referring Doctor</Label><Input value={newDoctor} onChange={e => setNewDoctor(e.target.value)} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Clinical Notes</Label>
              <Textarea value={newClinical} onChange={e => setNewClinical(e.target.value)} placeholder="Indication, history..." />
            </div>
            <div>
              <Label>Studies</Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                {tests.filter(t => t.active).map(t => {
                  const sel = newSelected.some(s => s.id === t.id);
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-2 rounded cursor-pointer ${sel ? "bg-primary/10" : "hover:bg-muted"}`}
                      onClick={() => setNewSelected(prev => sel ? prev.filter(s => s.id !== t.id) : [...prev, t])}>
                      <div>
                        <div className="font-medium text-sm">{t.name} <Badge variant="outline" className="ml-1 text-xs">{t.modality}</Badge></div>
                        <div className="text-xs text-muted-foreground">{t.body_part ?? ""}</div>
                      </div>
                      <div className="font-semibold text-sm">{fmtUSD(t.price_usd)}</div>
                    </div>
                  );
                })}
                {!tests.length && <div className="text-sm text-muted-foreground p-4 text-center">No tests in catalog yet</div>}
              </div>
              {newSelected.length > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">{newSelected.length} selected</span>
                  <span className="font-semibold">Total: {fmtUSD(newSelected.reduce((s, t) => s + Number(t.price_usd), 0))}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDlg(false)}>Cancel</Button>
            <Button onClick={createOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Catalog Dialog */}
      <Dialog open={!!testDlg} onOpenChange={(o) => !o && setTestDlg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{testDlg?.id ? "Edit" : "Add"} Imaging Test</DialogTitle></DialogHeader>
          {testDlg && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Code</Label><Input value={testDlg.code ?? ""} onChange={e => setTestDlg({ ...testDlg, code: e.target.value })} /></div>
              <div><Label>Name *</Label><Input value={testDlg.name ?? ""} onChange={e => setTestDlg({ ...testDlg, name: e.target.value })} /></div>
              <div>
                <Label>Modality</Label>
                <Select value={testDlg.modality ?? "X-Ray"} onValueChange={v => setTestDlg({ ...testDlg, modality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body Part</Label>
                <Select value={testDlg.body_part ?? ""} onValueChange={v => setTestDlg({ ...testDlg, body_part: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BODY_PARTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>View / Position</Label><Input value={testDlg.view_type ?? ""} onChange={e => setTestDlg({ ...testDlg, view_type: e.target.value })} placeholder="AP, Lateral, PA..." /></div>
              <div><Label>Price (USD)</Label><Input type="number" value={testDlg.price_usd ?? 0} onChange={e => setTestDlg({ ...testDlg, price_usd: Number(e.target.value) })} /></div>
              <div><Label>TAT (hours)</Label><Input type="number" value={testDlg.turnaround_hours ?? 4} onChange={e => setTestDlg({ ...testDlg, turnaround_hours: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 mt-6"><Switch checked={testDlg.active ?? true} onCheckedChange={c => setTestDlg({ ...testDlg, active: c })} /><Label>Active</Label></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={testDlg.description ?? ""} onChange={e => setTestDlg({ ...testDlg, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDlg(null)}>Cancel</Button>
            <Button onClick={saveTest}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Test */}
      <Dialog open={!!viewTest} onOpenChange={(o) => !o && setViewTest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewTest?.name}</DialogTitle></DialogHeader>
          {viewTest && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-muted-foreground">Code</div><div className="font-mono">{viewTest.code ?? "—"}</div></div>
              <div><div className="text-muted-foreground">Modality</div><div>{viewTest.modality}</div></div>
              <div><div className="text-muted-foreground">Body Part</div><div>{viewTest.body_part ?? "—"}</div></div>
              <div><div className="text-muted-foreground">View</div><div>{viewTest.view_type ?? "—"}</div></div>
              <div><div className="text-muted-foreground">Price</div><div className="font-semibold">{fmtUSD(viewTest.price_usd)}</div></div>
              <div><div className="text-muted-foreground">TAT</div><div>{viewTest.turnaround_hours} hrs</div></div>
              {viewTest.description && <div className="col-span-2"><div className="text-muted-foreground">Description</div><div>{viewTest.description}</div></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Open Order / Report Entry */}
      <Dialog open={!!openOrder} onOpenChange={(o) => !o && setOpenOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Order {openOrder?.order_no}</span>
              {openOrder && statusBadge(openOrder.status)}
            </DialogTitle>
          </DialogHeader>
          {openOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg text-sm">
                <div><div className="text-muted-foreground text-xs">Patient</div><div className="font-medium">{patients[openOrder.patient_id]?.full_name}</div></div>
                <div><div className="text-muted-foreground text-xs">ID</div><div className="font-mono">{patients[openOrder.patient_id]?.patient_code}</div></div>
                <div><div className="text-muted-foreground text-xs">Age / Gender</div><div>{ageOf(patients[openOrder.patient_id]?.dob) ?? "-"} / {patients[openOrder.patient_id]?.gender ?? "-"}</div></div>
                <div><div className="text-muted-foreground text-xs">Doctor</div><div>{openOrder.doctor_name ?? "—"}</div></div>
              </div>
              {openOrder.clinical_notes && <div className="text-sm"><span className="text-muted-foreground">Clinical:</span> {openOrder.clinical_notes}</div>}

              {openItems.map((it, idx) => (
                <Card key={it.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{it.test_name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">{it.modality} · {it.body_part ?? ""} · {fmtUSD(it.price_usd)}</div>
                      </div>
                      <Select value={it.status} onValueChange={v => updateItem(idx, { status: v })}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label>Findings</Label><Textarea rows={3} value={it.findings ?? ""} onChange={e => updateItem(idx, { findings: e.target.value })} /></div>
                    <div><Label>Impression</Label><Textarea rows={2} value={it.impression ?? ""} onChange={e => updateItem(idx, { impression: e.target.value })} /></div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div><Label>Radiologist</Label><Input value={it.radiologist_name ?? ""} onChange={e => updateItem(idx, { radiologist_name: e.target.value })} /></div>
                      <div>
                        <Label>Report File (PDF)</Label>
                        <div className="flex gap-2">
                          <Input type="file" accept="application/pdf,image/*" onChange={e => e.target.files?.[0] && uploadReport(idx, e.target.files[0])} />
                          {it.report_file_url && <Button size="sm" variant="outline" asChild><a href={it.report_file_url} target="_blank" rel="noreferrer">View</a></Button>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Images</Label>
                      <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(idx, e.target.files[0])} />
                      {(it.image_urls ?? []).length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {it.image_urls.map((u: string, i: number) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} className="h-20 w-20 object-cover rounded border" /></a>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => openOrder && printReport(openOrder)}><Printer className="h-4 w-4" /> Print</Button>
            <Button onClick={saveItems}>Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <div className={`p-3 rounded-full bg-muted ${color}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
