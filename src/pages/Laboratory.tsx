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
import { FlaskConical, Plus, Search, TestTube, ClipboardList, Beaker, FileText, Trash2, Upload, Printer, CheckCircle2, AlertCircle, Clock, Eye, Pencil, Barcode as BarcodeIcon, User, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import Barcode from "react-barcode";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { printBarcodes } from "@/lib/dataIO";

export type ReportParameter = { name: string; category: string; unit: string; reference_range: string; result_type: string };
type Test = { id: string; code: string; name: string; category: string; sample_type: string | null; unit: string | null; reference_range: string | null; price_usd: number; turnaround_hours: number | null; active: boolean; description?: string | null; parameters?: ReportParameter[] | null };

const RESULT_TYPES = ["Numeric", "Text", "Positive/Negative", "Reactive/Non-Reactive", "Present/Absent", "Dropdown"];
const emptyParam = (): ReportParameter => ({ name: "", category: "", unit: "", reference_range: "", result_type: "Numeric" });
type Patient = { id: string; full_name: string; patient_code: string; phone: string | null; dob: string | null; gender: string | null };

const CATS = ["hematology", "biochemistry", "endocrinology", "urinalysis", "microbiology", "serology", "immunology", "general"];
const PRIORITIES = [{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }, { v: "stat", l: "STAT" }];
const FLAGS = [{ v: "normal", l: "Normal", c: "bg-success/15 text-success border-success/30" }, { v: "low", l: "Low", c: "bg-blue-500/15 text-blue-600 border-blue-500/30" }, { v: "high", l: "High", c: "bg-warning/15 text-warning border-warning/30" }, { v: "critical", l: "Critical", c: "bg-destructive/15 text-destructive border-destructive/30" }];

const ageOf = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

export default function Laboratory() {
  const { user } = useAuth();
  const [tab, setTab] = useState("orders");
  const [viewTest, setViewTest] = useState<Test | null>(null);
  const [barcodeTest, setBarcodeTest] = useState<Test | null>(null);

  // Catalog
  const [tests, setTests] = useState<Test[]>([]);
  const [testQ, setTestQ] = useState("");
  const [testCat, setTestCat] = useState<string>("all");
  const [testDlg, setTestDlg] = useState<Partial<Test> | null>(null);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [openOrder, setOpenOrder] = useState<any | null>(null);
  const [openItems, setOpenItems] = useState<any[]>([]);

  // New order
  const [newDlg, setNewDlg] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [newPid, setNewPid] = useState<string>("");
  const [newDoctor, setNewDoctor] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newNotes, setNewNotes] = useState("");
  const [newSelected, setNewSelected] = useState<Test[]>([]);

  // Sample collection tab
  const [sampleQ, setSampleQ] = useState("");
  const [sampleStatus, setSampleStatus] = useState("all");
  const [samplePage, setSamplePage] = useState(1);
  const [samplePerPage, setSamplePerPage] = useState(10);
  const [sampleSelected, setSampleSelected] = useState<Set<string>>(new Set());
  const [sampleEdit, setSampleEdit] = useState<any | null>(null);

  // Param lookups
  type LookupKind = "unit" | "category" | "name" | "sample";
  const LOOKUP_TBL: Record<LookupKind, string> = {
    unit: "lab_param_units",
    category: "lab_param_categories",
    name: "lab_param_names",
    sample: "lab_sample_types",
  };
  const [paramUnits, setParamUnits] = useState<{id:string;name:string}[]>([]);
  const [paramCats, setParamCats] = useState<{id:string;name:string}[]>([]);
  const [paramNames, setParamNames] = useState<{id:string;name:string}[]>([]);
  const [sampleTypes, setSampleTypes] = useState<{id:string;name:string}[]>([]);
  const [lookupDlg, setLookupDlg] = useState<LookupKind | null>(null);
  const [lookupName, setLookupName] = useState("");
  const loadLookups = async () => {
    const [u, c, n, s] = await Promise.all([
      supabase.from("lab_param_units" as any).select("id,name").order("name"),
      supabase.from("lab_param_categories" as any).select("id,name").order("name"),
      supabase.from("lab_param_names" as any).select("id,name").order("name"),
      supabase.from("lab_sample_types" as any).select("id,name").order("name"),
    ]);
    setParamUnits((u.data as any) ?? []);
    setParamCats((c.data as any) ?? []);
    setParamNames((n.data as any) ?? []);
    setSampleTypes((s.data as any) ?? []);
  };
  const addLookup = async () => {
    const n = lookupName.trim();
    if (!n || !lookupDlg) return toast.error("Name required");
    const { error } = await supabase.from(LOOKUP_TBL[lookupDlg] as any).insert({ name: n });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setLookupName(""); loadLookups();
  };
  const removeLookup = async (kind: LookupKind, id: string) => {
    const { error } = await supabase.from(LOOKUP_TBL[kind] as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadLookups();
  };
  const lookupList = lookupDlg === "unit" ? paramUnits : lookupDlg === "category" ? paramCats : lookupDlg === "sample" ? sampleTypes : paramNames;
  const lookupTitle = lookupDlg === "unit" ? "Manage Units" : lookupDlg === "category" ? "Manage Categories" : lookupDlg === "sample" ? "Manage Sample Types" : "Manage Parameter Names";
  const lookupPlaceholder = lookupDlg === "unit" ? "e.g. mg/dL" : lookupDlg === "category" ? "e.g. CBC" : lookupDlg === "sample" ? "e.g. Blood / Urine" : "e.g. Hemoglobin";

  const loadTests = async () => {
    const { data } = await supabase.from("lab_tests" as any).select("*").order("name");
    setTests((data as any[]) ?? []);
  };
  const loadOrders = async () => {
    const { data } = await supabase.from("lab_orders" as any).select("*").order("created_at", { ascending: false }).limit(300);
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
      const { data: items } = await supabase.from("lab_order_items" as any).select("*").in("order_id", ords.map(o => o.id));
      const grp: Record<string, any[]> = {};
      ((items as any[]) ?? []).forEach(it => { (grp[it.order_id] ||= []).push(it); });
      setOrderItems(grp);
    }
  };
  const loadAllPatients = async () => {
    const { data } = await supabase.from("patients").select("id, full_name, patient_code, phone, dob, gender").order("created_at", { ascending: false }).limit(500);
    setAllPatients((data as any[]) ?? []);
  };

  useEffect(() => { loadTests(); loadOrders(); loadAllPatients(); loadLookups(); }, []);

  // ---- Catalog ----
  const filteredTests = useMemo(() => tests.filter(t => {
    if (testCat !== "all" && t.category !== testCat) return false;
    if (testQ && !`${t.name} ${t.code} ${t.category}`.toLowerCase().includes(testQ.toLowerCase())) return false;
    return true;
  }), [tests, testQ, testCat]);

  const saveTest = async () => {
    if (!testDlg?.name) return toast.error("Name required");
    const payload = {
      code: testDlg.code || null, name: testDlg.name, category: testDlg.category || "general",
      sample_type: testDlg.sample_type || null, unit: testDlg.unit || null,
      reference_range: testDlg.reference_range || null,
      price_usd: Number(testDlg.price_usd ?? 0), turnaround_hours: Number(testDlg.turnaround_hours ?? 24),
      active: testDlg.active ?? true,
      parameters: (testDlg.parameters ?? []).filter(p => p.name?.trim()),
    };
    const q: any = testDlg.id
      ? supabase.from("lab_tests" as any).update(payload).eq("id", testDlg.id)
      : supabase.from("lab_tests" as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Test saved");
    setTestDlg(null);
    loadTests();
  };
  const deleteTest = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    const { error } = await supabase.from("lab_tests" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadTests();
  };

  // ---- New Order ----
  const toggleSelected = (t: Test) => {
    setNewSelected(s => s.find(x => x.id === t.id) ? s.filter(x => x.id !== t.id) : [...s, t]);
  };
  const newTotal = useMemo(() => newSelected.reduce((a, t) => a + Number(t.price_usd), 0), [newSelected]);

  const createOrder = async () => {
    if (!newPid) return toast.error("Select patient");
    if (newSelected.length === 0) return toast.error("Select at least one test");
    const { data: ord, error } = await supabase.from("lab_orders" as any).insert({
      patient_id: newPid, doctor_name: newDoctor || null, priority: newPriority,
      notes: newNotes || null, total_usd: newTotal, created_by: user?.id,
    }).select().single();
    if (error || !ord) return toast.error(error?.message || "Failed");
    const items = newSelected.map(t => ({
      order_id: (ord as any).id, test_id: t.id, test_name: t.name, category: t.category,
      sample_type: t.sample_type, price_usd: Number(t.price_usd),
      reference_range: t.reference_range, result_unit: t.unit,
    }));
    const { error: ie } = await supabase.from("lab_order_items" as any).insert(items);
    if (ie) return toast.error(ie.message);
    toast.success(`Order ${(ord as any).order_no} created`);
    setNewDlg(false); setNewPid(""); setNewDoctor(""); setNewPriority("normal"); setNewNotes(""); setNewSelected([]);
    loadOrders();
  };

  // ---- Open Order detail ----
  const openOrderDetail = async (o: any) => {
    setOpenOrder(o);
    const { data } = await supabase.from("lab_order_items" as any).select("*").eq("order_id", o.id);
    setOpenItems((data as any[]) ?? []);
  };
  const updateItem = (idx: number, patch: any) => {
    setOpenItems(items => items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const saveResults = async () => {
    if (!openOrder) return;
    for (const it of openItems) {
      const updates: any = {
        result_value: it.result_value, result_unit: it.result_unit, reference_range: it.reference_range,
        flag: it.flag || null, result_notes: it.result_notes, status: it.status,
        completed_at: it.status === "completed" ? new Date().toISOString() : null,
        completed_by: it.status === "completed" ? user?.id : null,
      };
      await supabase.from("lab_order_items" as any).update(updates).eq("id", it.id);
    }
    const allDone = openItems.every(i => i.status === "completed");
    const anyProg = openItems.some(i => i.status !== "pending");
    const newStatus = allDone ? "completed" : anyProg ? "in_progress" : "pending";
    await supabase.from("lab_orders" as any).update({ status: newStatus }).eq("id", openOrder.id);
    toast.success("Results saved");
    setOpenOrder(null);
    loadOrders();
  };

  const updateSample = async (status: string) => {
    if (!openOrder) return;
    const patch: any = { sample_status: status };
    if (status === "collected" || status === "received") {
      patch.sample_collected_at = new Date().toISOString();
      patch.sample_collected_by = user?.id;
      if (openOrder.status === "pending") patch.status = "in_progress";
    }
    const { error } = await supabase.from("lab_orders" as any).update(patch).eq("id", openOrder.id);
    if (error) return toast.error(error.message);
    toast.success(`Sample ${status}`);
    setOpenOrder({ ...openOrder, ...patch });
    loadOrders();
  };

  const uploadResultFile = async (idx: number, file: File) => {
    if (!openOrder) return;
    const ext = file.name.split(".").pop();
    const path = `${openOrder.patient_id}/${openOrder.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lab-files").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: { publicUrl } } = supabase.storage.from("lab-files").getPublicUrl(path);
    updateItem(idx, { result_file_url: publicUrl });
    toast.success("File uploaded");
  };

  const printOrder = () => {
    if (!openOrder) return;
    const p = patients[openOrder.patient_id];
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const rows = openItems.map(it => `
      <tr>
        <td>${it.test_name}</td><td>${it.result_value ?? ""}</td>
        <td>${it.result_unit ?? ""}</td><td>${it.reference_range ?? ""}</td>
        <td><b>${it.flag ?? ""}</b></td>
      </tr>`).join("");
    w.document.write(`<html><head><title>${openOrder.order_no}</title>
      <style>body{font-family:Arial;padding:24px;color:#111}h1{margin:0 0 6px}h2{margin:0;color:#666;font-weight:400;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}.box{border:1px solid #eee;padding:12px;border-radius:6px;margin-top:12px;font-size:12px}</style>
      </head><body>
      <h1>Laboratory Report</h1><h2>${openOrder.order_no} · ${new Date(openOrder.created_at).toLocaleString()}</h2>
      <div class="box"><b>Patient:</b> ${p ? `${p.patient_code} — ${p.full_name}` : "Walk-in"}<br/>
      <b>Doctor:</b> ${openOrder.doctor_name ?? "—"} &nbsp;·&nbsp; <b>Priority:</b> ${openOrder.priority}</div>
      <table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${openOrder.notes ? `<div class="box"><b>Notes:</b> ${openOrder.notes}</div>` : ""}
      <p style="margin-top:40px;font-size:12px">_______________________<br/>Authorized signature</p>
      <script>window.print();</script></body></html>`);
    w.document.close();
  };

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (orderStatus !== "all" && o.status !== orderStatus) return false;
    if (!orderQ) return true;
    const p = patients[o.patient_id];
    return `${o.order_no} ${p?.full_name ?? ""} ${p?.patient_code ?? ""} ${p?.phone ?? ""}`.toLowerCase().includes(orderQ.toLowerCase());
  }), [orders, orderStatus, orderQ, patients]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    inProgress: orders.filter(o => o.status === "in_progress").length,
    awaitingSample: orders.filter(o => o.sample_status === "pending").length,
  }), [orders]);

  const StatusBadge = ({ s }: { s: string }) => {
    const map: any = {
      pending: { c: "bg-muted text-muted-foreground border-border", I: Clock },
      in_progress: { c: "bg-warning/15 text-warning border-warning/30", I: Clock },
      completed: { c: "bg-success/15 text-success border-success/30", I: CheckCircle2 },
      cancelled: { c: "bg-destructive/15 text-destructive border-destructive/30", I: AlertCircle },
    };
    const m = map[s] ?? map.pending; const I = m.I;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.c}`}><I className="h-3 w-3" />{s.replace("_", " ")}</span>;
  };
  const SampleBadge = ({ s }: { s: string }) => {
    const map: any = {
      pending: "bg-muted text-muted-foreground border-border",
      collected: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      received: "bg-success/15 text-success border-success/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
    };
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${map[s] ?? map.pending}`}>{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><FlaskConical className="h-7 w-7 text-primary" />Laboratory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage tests, orders, sample collection and results</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { setLookupName(""); setLookupDlg("unit"); }}>
            <Plus className="h-4 w-4 mr-1" />Add Unit
          </Button>
          <Button variant="outline" onClick={() => { setLookupName(""); setLookupDlg("sample"); }}>
            <Plus className="h-4 w-4 mr-1" />Add Sample
          </Button>
          <Button variant="outline" onClick={() => { setLookupName(""); setLookupDlg("name"); }}>
            <Plus className="h-4 w-4 mr-1" />Add Parameter
          </Button>
          <Button variant="outline" onClick={() => { setLookupName(""); setLookupDlg("category"); }}>
            <Plus className="h-4 w-4 mr-1" />Add Category
          </Button>
          <Button onClick={() => setNewDlg(true)}><Plus className="h-4 w-4 mr-2" />New Lab Order</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-2xl font-bold mt-1">{stats.total}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting Sample</p><p className="text-2xl font-bold text-warning mt-1">{stats.awaitingSample}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold mt-1">{stats.inProgress}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold mt-1">{stats.pending}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders"><ClipboardList className="h-4 w-4 mr-2" />Orders</TabsTrigger>
          <TabsTrigger value="samples"><Beaker className="h-4 w-4 mr-2" />Sample Collection</TabsTrigger>
          <TabsTrigger value="catalog"><TestTube className="h-4 w-4 mr-2" />Test Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-9" placeholder="Search order / patient…" value={orderQ} onChange={e => setOrderQ(e.target.value)} />
                </div>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead>Order</TableHead><TableHead>Date</TableHead>
                  <TableHead>Patient ID</TableHead><TableHead>Patient Name</TableHead>
                  <TableHead className="text-center">Age</TableHead><TableHead>Gender</TableHead>
                  <TableHead className="text-center">Tests</TableHead>
                  <TableHead>Sample</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-12">No orders</TableCell></TableRow> :
                    filteredOrders.map(o => {
                      const p = patients[o.patient_id];
                      const its = orderItems[o.id] ?? [];
                      const age = ageOf(p?.dob);
                      return (
                        <TableRow key={o.id} className="cursor-pointer hover:bg-accent/30" onClick={() => openOrderDetail(o)}>
                          <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                          <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline" className="font-mono text-xs">{p?.patient_code ?? "—"}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{p?.full_name ?? <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                          <TableCell className="text-center text-sm">{age ?? "—"}</TableCell>
                          <TableCell className="text-sm capitalize">{p?.gender ?? "—"}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{its.length}</Badge></TableCell>
                          <TableCell><SampleBadge s={o.sample_status} /></TableCell>
                          <TableCell><StatusBadge s={o.status} /></TableCell>
                          <TableCell className="text-right font-semibold text-primary">{fmtUSD(Number(o.total_usd))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" title="View" onClick={e => { e.stopPropagation(); openOrderDetail(o); }}><Eye className="h-4 w-4" /></Button>
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

        <TabsContent value="samples" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4" />Pending Sample Collection</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Patient</TableHead><TableHead>Priority</TableHead>
                  <TableHead>Tests</TableHead><TableHead>Sample Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {orders.filter(o => o.sample_status !== "received").length === 0 ?
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">All samples collected ✓</TableCell></TableRow> :
                    orders.filter(o => o.sample_status !== "received").map(o => {
                      const p = patients[o.patient_id];
                      const its = orderItems[o.id] ?? [];
                      const samples = Array.from(new Set(its.map(i => i.sample_type).filter(Boolean)));
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">{o.order_no}</TableCell>
                          <TableCell className="text-sm">{p ? `${p.patient_code} — ${p.full_name}` : "—"}{p?.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}</TableCell>
                          <TableCell><Badge variant={o.priority === "stat" ? "destructive" : o.priority === "urgent" ? "default" : "secondary"}>{o.priority}</Badge></TableCell>
                          <TableCell className="text-xs">{samples.join(", ") || "—"}</TableCell>
                          <TableCell><SampleBadge s={o.sample_status} /></TableCell>
                          <TableCell><Button size="sm" variant="outline" onClick={() => openOrderDetail(o)}>Manage</Button></TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          {/* Catalog summary cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="shadow-soft border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tests</p><p className="text-2xl font-bold mt-1">{tests.length}</p></CardContent></Card>
            <Card className="shadow-soft border-l-4 border-l-success"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-success mt-1">{tests.filter(t => t.active).length}</p></CardContent></Card>
            <Card className="shadow-soft border-l-4 border-l-warning"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-warning mt-1">{tests.filter(t => !t.active).length}</p></CardContent></Card>
            <Card className="shadow-soft border-l-4 border-l-accent"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Price</p><p className="text-2xl font-bold mt-1">{fmtUSD(tests.length ? tests.reduce((a, t) => a + Number(t.price_usd), 0) / tests.length : 0)}</p></CardContent></Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" />Test Catalog</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Manage all available laboratory tests, prices and barcodes</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9" placeholder="Search test / code…" value={testQ} onChange={e => setTestQ(e.target.value)} />
                  </div>
                  <Select value={testCat} onValueChange={setTestCat}>
                    <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setTestDlg({ active: true, category: "general", price_usd: 0, turnaround_hours: 24 })}><Plus className="h-4 w-4 mr-2" />Add Test</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-center">TAT</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <TestTube className="h-10 w-10 mx-auto opacity-30 mb-2" />No tests found
                    </TableCell></TableRow>
                  ) : filteredTests.map(t => (
                    <TableRow key={t.id} className="hover:bg-accent/30">
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{t.code ?? "—"}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{t.name}</div>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{t.category}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.sample_type ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.reference_range ?? "—"}{t.unit ? <span className="ml-1 text-foreground/70">({t.unit})</span> : null}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{t.turnaround_hours ?? 24}h</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{fmtUSD(Number(t.price_usd))}</TableCell>
                      <TableCell className="text-center">
                        {t.active
                          ? <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">Active</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => setViewTest(t)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => setTestDlg(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Print Barcode" onClick={() => setBarcodeTest(t)}><BarcodeIcon className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Delete" className="text-destructive hover:text-destructive" onClick={() => deleteTest(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Test */}
      <Dialog open={!!viewTest} onOpenChange={o => !o && setViewTest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" />{viewTest?.name}</DialogTitle>
          </DialogHeader>
          {viewTest && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{viewTest.code ?? "—"}</Badge>
                <Badge variant="secondary" className="capitalize">{viewTest.category}</Badge>
                {viewTest.active ? <Badge className="bg-success/15 text-success border-success/30">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border rounded-md p-3"><p className="text-xs text-muted-foreground">Price</p><p className="text-xl font-bold text-primary mt-1">{fmtUSD(Number(viewTest.price_usd))}</p></div>
                <div className="border rounded-md p-3"><p className="text-xs text-muted-foreground">Turnaround</p><p className="text-xl font-bold mt-1">{viewTest.turnaround_hours ?? 24}h</p></div>
                <div className="border rounded-md p-3"><p className="text-xs text-muted-foreground">Sample Type</p><p className="font-medium mt-1">{viewTest.sample_type ?? "—"}</p></div>
                <div className="border rounded-md p-3"><p className="text-xs text-muted-foreground">Unit</p><p className="font-medium mt-1">{viewTest.unit ?? "—"}</p></div>
                <div className="col-span-2 border rounded-md p-3"><p className="text-xs text-muted-foreground">Reference Range</p><p className="font-medium mt-1">{viewTest.reference_range ?? "—"}</p></div>
              </div>
              {viewTest.code && (
                <div className="border rounded-md p-3 flex justify-center bg-white">
                  <Barcode value={viewTest.code} height={50} fontSize={12} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTest(null)}>Close</Button>
            <Button onClick={() => { setBarcodeTest(viewTest); setViewTest(null); }}><BarcodeIcon className="h-4 w-4 mr-2" />Print Barcode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Barcode */}
      <Dialog open={!!barcodeTest} onOpenChange={o => !o && setBarcodeTest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Print Barcode</DialogTitle></DialogHeader>
          {barcodeTest && (
            <div id="barcode-print" className="border rounded-md p-4 bg-white text-center space-y-2">
              <p className="text-sm font-bold">{barcodeTest.name}</p>
              <div className="flex justify-center"><Barcode value={barcodeTest.code || barcodeTest.id.slice(0, 12)} height={60} fontSize={14} /></div>
              <p className="text-xs text-muted-foreground capitalize">{barcodeTest.category} · {fmtUSD(Number(barcodeTest.price_usd))}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBarcodeTest(null)}>Close</Button>
            <Button onClick={() => {
              const html = document.getElementById("barcode-print")?.outerHTML;
              const w = window.open("", "_blank", "width=400,height=300");
              if (w && html) {
                w.document.write(`<html><head><title>Barcode</title><style>body{font-family:Arial;padding:20px;text-align:center}</style></head><body>${html}<script>window.print();</script></body></html>`);
                w.document.close();
              }
            }}><Printer className="h-4 w-4 mr-2" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Test */}
      <Dialog open={!!testDlg} onOpenChange={o => !o && setTestDlg(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{testDlg?.id ? "Edit Test" : "Add Lab Test"}</DialogTitle></DialogHeader>
          {testDlg && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Code</Label><Input value={testDlg.code ?? ""} onChange={e => setTestDlg({ ...testDlg, code: e.target.value })} /></div>
                <div className="space-y-1 col-span-2"><Label className="text-xs">Test Name *</Label><Input value={testDlg.name ?? ""} onChange={e => setTestDlg({ ...testDlg, name: e.target.value })} /></div>
                <div className="space-y-1 col-span-2"><Label className="text-xs">Sample Type</Label><Input list="sample-type-list" placeholder="Blood / Urine…" value={testDlg.sample_type ?? ""} onChange={e => setTestDlg({ ...testDlg, sample_type: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Price (USD)</Label><Input type="number" step="0.01" value={testDlg.price_usd ?? 0} onChange={e => setTestDlg({ ...testDlg, price_usd: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label className="text-xs">Turnaround (hrs)</Label><Input type="number" value={testDlg.turnaround_hours ?? 24} onChange={e => setTestDlg({ ...testDlg, turnaround_hours: Number(e.target.value) })} /></div>
                <div className="col-span-2 flex items-center gap-2"><Switch checked={testDlg.active ?? true} onCheckedChange={v => setTestDlg({ ...testDlg, active: v })} /><Label className="text-sm">Active</Label></div>
              </div>

              {/* Report Parameters */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Report Parameters</h3>
                    <p className="text-xs text-muted-foreground">Add multiple parameters that appear on the test report</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTestDlg({ ...testDlg, parameters: [...(testDlg.parameters ?? []), emptyParam()] })}>
                    <Plus className="h-4 w-4 mr-1" />Add Parameter
                  </Button>
                </div>

                {(!testDlg.parameters || testDlg.parameters.length === 0) ? (
                  <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded">
                    No parameters added yet. Click "Add Parameter" to start.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-[11px] font-medium text-muted-foreground uppercase">
                      <div className="col-span-3">Parameter Name</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-2">Unit</div>
                      <div className="col-span-3">Normal / Reference Range</div>
                      <div className="col-span-2">Result Type</div>
                    </div>
                    {testDlg.parameters.map((p, idx) => {
                      const updateP = (patch: Partial<ReportParameter>) => {
                        const arr = [...(testDlg.parameters ?? [])];
                        arr[idx] = { ...arr[idx], ...patch };
                        setTestDlg({ ...testDlg, parameters: arr });
                      };
                      const removeP = () => {
                        const arr = [...(testDlg.parameters ?? [])];
                        arr.splice(idx, 1);
                        setTestDlg({ ...testDlg, parameters: arr });
                      };
                      return (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-background p-2 rounded-md border">
                          <Input list="param-name-list" className="md:col-span-3 h-9" placeholder="e.g. Hemoglobin" value={p.name} onChange={e => updateP({ name: e.target.value })} />
                          <Input list="param-cat-list" className="md:col-span-2 h-9" placeholder="e.g. CBC" value={p.category} onChange={e => updateP({ category: e.target.value })} />
                          <Input list="param-unit-list" className="md:col-span-2 h-9" placeholder="g/dL" value={p.unit} onChange={e => updateP({ unit: e.target.value })} />
                          <Input className="md:col-span-3 h-9" placeholder="13-17" value={p.reference_range} onChange={e => updateP({ reference_range: e.target.value })} />
                          <div className="md:col-span-2 flex gap-1">
                            <Select value={p.result_type || "Numeric"} onValueChange={v => updateP({ result_type: v })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>{RESULT_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive shrink-0" onClick={removeP}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTestDlg(null)}>Cancel</Button><Button onClick={saveTest}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Order */}
      <Dialog open={newDlg} onOpenChange={setNewDlg}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Lab Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2"><Label className="text-xs">Patient *</Label>
              <Select value={newPid} onValueChange={setNewPid}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {allPatients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-3"><Label className="text-xs">Referring Doctor</Label><Input value={newDoctor} onChange={e => setNewDoctor(e.target.value)} /></div>
            <div className="space-y-1 col-span-3"><Label className="text-xs">Notes</Label><Textarea rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} /></div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Select Tests ({newSelected.length})</Label>
              <span className="text-sm font-bold text-primary">{fmtUSD(newTotal)}</span>
            </div>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {tests.filter(t => t.active).map(t => {
                const sel = !!newSelected.find(x => x.id === t.id);
                return (
                  <div key={t.id} onClick={() => toggleSelected(t)} className={`flex items-center justify-between p-2 border-b cursor-pointer hover:bg-accent/40 ${sel ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={sel} readOnly className="h-4 w-4" />
                      <div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground capitalize">{t.category} · {t.sample_type ?? "—"}</p></div>
                    </div>
                    <span className="text-sm font-medium">{fmtUSD(Number(t.price_usd))}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter><Button variant="outline" onClick={() => setNewDlg(false)}>Cancel</Button><Button onClick={createOrder}>Create Order</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order detail */}
      <Dialog open={!!openOrder} onOpenChange={o => !o && setOpenOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{openOrder?.order_no}</DialogTitle>
          </DialogHeader>
          {openOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-medium">{patients[openOrder.patient_id]?.full_name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Doctor</p><p className="font-medium">{openOrder.doctor_name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><p className="font-medium capitalize">{openOrder.priority}</p></div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">{fmtUSD(Number(openOrder.total_usd))}</p></div>
              </div>

              <Card className="bg-accent/30 border-accent">
                <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Beaker className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sample status</p>
                      <SampleBadge s={openOrder.sample_status} />
                      {openOrder.sample_collected_at && <p className="text-xs text-muted-foreground mt-1">Collected: {new Date(openOrder.sample_collected_at).toLocaleString()}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {openOrder.sample_status === "pending" && <Button size="sm" onClick={() => updateSample("collected")}>Mark Collected</Button>}
                    {openOrder.sample_status === "collected" && <Button size="sm" onClick={() => updateSample("received")}>Mark Received</Button>}
                    {openOrder.sample_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => updateSample("rejected")}>Reject</Button>}
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-semibold mb-2">Test Results</h3>
                <div className="space-y-2">
                  {openItems.map((it, idx) => (
                    <Card key={it.id} className="border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div><p className="font-medium text-sm">{it.test_name}</p><p className="text-xs text-muted-foreground capitalize">{it.category} · {it.sample_type ?? "—"}</p></div>
                          <Select value={it.status} onValueChange={v => updateItem(idx, { status: v })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4 space-y-1"><Label className="text-xs">Result</Label><Input value={it.result_value ?? ""} onChange={e => updateItem(idx, { result_value: e.target.value })} /></div>
                          <div className="col-span-2 space-y-1"><Label className="text-xs">Unit</Label><Input value={it.result_unit ?? ""} onChange={e => updateItem(idx, { result_unit: e.target.value })} /></div>
                          <div className="col-span-3 space-y-1"><Label className="text-xs">Reference</Label><Input value={it.reference_range ?? ""} onChange={e => updateItem(idx, { reference_range: e.target.value })} /></div>
                          <div className="col-span-3 space-y-1"><Label className="text-xs">Flag</Label>
                            <Select value={it.flag ?? ""} onValueChange={v => updateItem(idx, { flag: v })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{FLAGS.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 space-y-1"><Label className="text-xs">Notes</Label><Textarea rows={1} value={it.result_notes ?? ""} onChange={e => updateItem(idx, { result_notes: e.target.value })} /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs cursor-pointer flex items-center gap-1 text-primary hover:underline">
                            <Upload className="h-3 w-3" /> Attach file
                            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadResultFile(idx, e.target.files[0])} />
                          </label>
                          {it.result_file_url && <a href={it.result_file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View attachment</a>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={printOrder}><Printer className="h-4 w-4 mr-2" />Print Report</Button>
            <Button variant="outline" onClick={() => setOpenOrder(null)}>Close</Button>
            <Button onClick={saveResults}>Save Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Datalists for parameter row autocomplete */}
      <datalist id="sample-type-list">
        {sampleTypes.map(s => <option key={s.id} value={s.name} />)}
      </datalist>
      <datalist id="param-unit-list">
        {paramUnits.map(u => <option key={u.id} value={u.name} />)}
      </datalist>
      <datalist id="param-cat-list">
        {paramCats.map(c => <option key={c.id} value={c.name} />)}
      </datalist>

      <datalist id="param-name-list">
        {paramNames.map(n => <option key={n.id} value={n.name} />)}
      </datalist>

      {/* Add Unit / Category / Parameter dialog */}
      <Dialog open={!!lookupDlg} onOpenChange={o => !o && setLookupDlg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lookupTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={lookupPlaceholder}
                value={lookupName}
                onChange={e => setLookupName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addLookup()}
              />
              <Button onClick={addLookup}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
            <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
              {lookupList.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No items yet</div>
              ) : lookupList.map(it => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{it.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLookup(lookupDlg!, it.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLookupDlg(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
