import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pill, Pencil, Trash2, PackagePlus, History, TrendingUp, AlertTriangle, Boxes, Upload, Download, ScanBarcode, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCSV, exportToExcel, parseImportFile } from "@/lib/dataIO";

type Med = any;

const empty = {
  name: "", generic_name: "", brand: "", category: "", supplier: "", barcode: "",
  box_barcode: "", packet_barcode: "", strip_barcode: "",
  unit: "Pcs",
  units_per_box: "", units_per_packet: "", units_per_strip: "",
  cost_price_usd: "", price_usd: "",
  box_cost_usd: "", packet_cost_usd: "", strip_cost_usd: "",
  box_price_usd: "", packet_price_usd: "", strip_price_usd: "",
  stock: "0", low_stock_threshold: "10", expiry_date: "",
};

export default function Medicines() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired">("all");
  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<Med | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [stockDlg, setStockDlg] = useState<Med | null>(null);
  const [stockForm, setStockForm] = useState({ change_type: "purchase", quantity_change: "", cost_price_usd: "", notes: "" });
  const [optDlg, setOptDlg] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [m, h, u, c] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("medicine_stock_history" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("medicine_units" as any).select("*").order("name"),
      supabase.from("medicine_categories" as any).select("*").order("name"),
    ]);
    setMeds(m.data ?? []); setHistory((h.data as any) ?? []);
    setUnits((u.data as any) ?? []); setCats((c.data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => meds.filter(m => {
    const ql = q.toLowerCase();
    const matchQ = !q || [m.name, m.brand, m.generic_name, m.category, m.supplier].some((x: string) => x?.toLowerCase().includes(ql)) ||
      [m.barcode, m.box_barcode, m.packet_barcode, m.strip_barcode].includes(q);
    const isLow = m.stock <= m.low_stock_threshold;
    const isExp = m.expiry_date && new Date(m.expiry_date) < new Date();
    if (filter === "low" && !isLow) return false;
    if (filter === "expired" && !isExp) return false;
    return matchQ;
  }), [meds, q, filter]);

  const stats = useMemo(() => ({
    total: meds.length,
    low: meds.filter(m => m.stock <= m.low_stock_threshold).length,
    expired: meds.filter(m => m.expiry_date && new Date(m.expiry_date) < new Date()).length,
    value: meds.reduce((s, m) => s + Number(m.cost_price_usd ?? 0) * Number(m.stock ?? 0), 0),
  }), [meds]);

  const openAdd = () => { setEditing(null); setForm(empty); setDlg(true); };
  const openEdit = (m: Med) => {
    setEditing(m);
    setForm({ ...empty, ...Object.fromEntries(Object.keys(empty).map(k => [k, m[k] ?? (empty as any)[k]])) });
    setDlg(true);
  };

  // Auto price calculator: change higher pack price -> per-piece auto
  const updatePack = (field: string, value: string, perUnits: number | string, kind: "cost" | "price") => {
    const v = Number(value || 0);
    const u = Number(perUnits || 0);
    const next: any = { ...form, [field]: value };
    if (v && u) {
      const per = v / u;
      if (kind === "price") next.price_usd = per.toFixed(2);
      else next.cost_price_usd = per.toFixed(2);
    }
    setForm(next);
  };
  // Reverse: change per-unit -> recompute pack prices if units defined
  const updatePerUnit = (field: "cost_price_usd" | "price_usd", value: string) => {
    const v = Number(value || 0);
    const next: any = { ...form, [field]: value };
    if (v) {
      const map: Record<string, [string, string]> = {
        units_per_box: field === "price_usd" ? ["box_price_usd", "price"] as any : ["box_cost_usd", "cost"] as any,
      };
      const apply = (uField: string, target: string) => {
        const u = Number(form[uField] || 0);
        if (u) next[target] = (v * u).toFixed(2);
      };
      if (field === "price_usd") {
        apply("units_per_box", "box_price_usd");
        apply("units_per_packet", "packet_price_usd");
        apply("units_per_strip", "strip_price_usd");
      } else {
        apply("units_per_box", "box_cost_usd");
        apply("units_per_packet", "packet_cost_usd");
        apply("units_per_strip", "strip_cost_usd");
      }
    }
    setForm(next);
  };

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const num = (v: any) => v === "" || v == null ? null : Number(v);
    const payload: any = {
      name: form.name, generic_name: form.generic_name || null, brand: form.brand || null,
      category: form.category || null, supplier: form.supplier || null,
      barcode: form.barcode || null, box_barcode: form.box_barcode || null,
      packet_barcode: form.packet_barcode || null, strip_barcode: form.strip_barcode || null,
      unit: form.unit, units_per_box: num(form.units_per_box), units_per_packet: num(form.units_per_packet),
      units_per_strip: num(form.units_per_strip),
      cost_price_usd: Number(form.cost_price_usd || 0), price_usd: Number(form.price_usd || 0),
      box_cost_usd: num(form.box_cost_usd), packet_cost_usd: num(form.packet_cost_usd), strip_cost_usd: num(form.strip_cost_usd),
      box_price_usd: num(form.box_price_usd), packet_price_usd: num(form.packet_price_usd), strip_price_usd: num(form.strip_price_usd),
      stock: Number(form.stock || 0), low_stock_threshold: Number(form.low_stock_threshold || 10),
      expiry_date: form.expiry_date || null,
    };
    if (editing) {
      const { error } = await supabase.from("medicines").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { data, error } = await supabase.from("medicines").insert(payload).select().single();
      if (error) return toast.error(error.message);
      if (data && payload.stock > 0) {
        await supabase.from("medicine_stock_history" as any).insert({
          medicine_id: data.id, change_type: "initial", quantity_change: payload.stock,
          stock_before: 0, stock_after: payload.stock, cost_price_usd: payload.cost_price_usd, created_by: user?.id, notes: "Initial stock",
        });
      }
      toast.success("Medicine added");
    }
    setDlg(false); load();
  };

  const del = async (m: Med) => {
    if (!confirm(`Delete ${m.name}?`)) return;
    const { error } = await supabase.from("medicines").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const openStock = (m: Med) => { setStockDlg(m); setStockForm({ change_type: "purchase", quantity_change: "", cost_price_usd: m.cost_price_usd ?? "", notes: "" }); };

  const saveStock = async () => {
    if (!stockDlg) return;
    const qty = Number(stockForm.quantity_change || 0);
    if (!qty) return toast.error("Quantity required");
    const signed = ["sale", "damage"].includes(stockForm.change_type) ? -Math.abs(qty) : Math.abs(qty);
    const before = Number(stockDlg.stock || 0);
    const after = Math.max(0, before + signed);
    const { error: e1 } = await supabase.from("medicines").update({ stock: after, ...(stockForm.cost_price_usd ? { cost_price_usd: Number(stockForm.cost_price_usd) } : {}) }).eq("id", stockDlg.id);
    if (e1) return toast.error(e1.message);
    await supabase.from("medicine_stock_history" as any).insert({
      medicine_id: stockDlg.id, change_type: stockForm.change_type, quantity_change: signed,
      stock_before: before, stock_after: after,
      cost_price_usd: stockForm.cost_price_usd ? Number(stockForm.cost_price_usd) : null,
      notes: stockForm.notes || null, created_by: user?.id,
    });
    toast.success("Stock updated"); setStockDlg(null); load();
  };

  // Barcode scan: any barcode (single/strip/packet/box) -> add stock by that pack size
  const handleScan = async (code: string) => {
    if (!code) return;
    const m = meds.find(x => [x.barcode, x.strip_barcode, x.packet_barcode, x.box_barcode].includes(code));
    if (!m) {
      // Unknown barcode -> open Add dialog with barcode pre-filled
      setEditing(null); setForm({ ...empty, barcode: code }); setDlg(true);
      toast.info("New barcode — fill medicine details");
      return;
    }
    let addQty = 1;
    let label = "single";
    if (code === m.box_barcode && m.units_per_box) { addQty = Number(m.units_per_box); label = `1 box (${addQty} units)`; }
    else if (code === m.packet_barcode && m.units_per_packet) { addQty = Number(m.units_per_packet); label = `1 packet (${addQty} units)`; }
    else if (code === m.strip_barcode && m.units_per_strip) { addQty = Number(m.units_per_strip); label = `1 strip (${addQty} units)`; }
    const before = Number(m.stock || 0);
    const after = before + addQty;
    await supabase.from("medicines").update({ stock: after }).eq("id", m.id);
    await supabase.from("medicine_stock_history" as any).insert({
      medicine_id: m.id, change_type: "purchase", quantity_change: addQty,
      stock_before: before, stock_after: after, created_by: user?.id, notes: `Barcode scan: ${label}`,
    });
    toast.success(`${m.name} +${addQty}`);
    setScanInput(""); load();
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseImportFile(file);
      if (!rows.length) return toast.error("Empty file");
      const cleaned = rows.map((r: any) => ({
        name: r.name, generic_name: r.generic_name || null, brand: r.brand || null,
        category: r.category || null, supplier: r.supplier || null,
        barcode: r.barcode || null, box_barcode: r.box_barcode || null,
        packet_barcode: r.packet_barcode || null, strip_barcode: r.strip_barcode || null,
        unit: r.unit || "Pcs",
        units_per_box: r.units_per_box || null, units_per_packet: r.units_per_packet || null, units_per_strip: r.units_per_strip || null,
        cost_price_usd: Number(r.cost_price_usd || 0), price_usd: Number(r.price_usd || 0),
        box_cost_usd: r.box_cost_usd || null, packet_cost_usd: r.packet_cost_usd || null, strip_cost_usd: r.strip_cost_usd || null,
        box_price_usd: r.box_price_usd || null, packet_price_usd: r.packet_price_usd || null, strip_price_usd: r.strip_price_usd || null,
        stock: Number(r.stock || 0), low_stock_threshold: Number(r.low_stock_threshold || 10),
        expiry_date: r.expiry_date || null,
      })).filter(r => r.name);
      const { error } = await supabase.from("medicines").insert(cleaned);
      if (error) return toast.error(error.message);
      toast.success(`Imported ${cleaned.length} medicines`); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const margin = (m: Med) => {
    const c = Number(m.cost_price_usd || 0), s = Number(m.price_usd || 0);
    if (!c || !s) return null;
    return (((s - c) / c) * 100).toFixed(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Pill className="h-7 w-7 text-primary" />Medicines</h1>
          <p className="text-muted-foreground mt-1">Inventory, multi-tier pricing, barcodes & stock history</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setOptDlg(true)}><Settings2 className="h-4 w-4 mr-2" />Units / Categories</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Import</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => exportToExcel(meds, "medicines")}><Download className="h-4 w-4 mr-2" />Export XLSX</Button>
          <Button variant="outline" onClick={() => exportToCSV(meds, "medicines")}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={openAdd} size="lg" className="shadow-soft"><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
        </div>
      </div>

      {/* Quick scan bar */}
      <Card className="shadow-soft border-primary/30">
        <CardContent className="p-3 flex items-center gap-3">
          <ScanBarcode className="h-5 w-5 text-primary" />
          <Input
            ref={scanRef}
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleScan(scanInput.trim()); }}
            placeholder="Scan barcode here (single / strip / packet / box) — auto adds to stock"
            className="border-0 focus-visible:ring-0 text-base"
          />
          <Button onClick={() => handleScan(scanInput.trim())}>Add</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><Boxes className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{stats.total}</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-warning" /><div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-2xl font-bold">{stats.low}</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">Expired</p><p className="text-2xl font-bold">{stats.expired}</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-success" /><div><p className="text-xs text-muted-foreground">Stock Value</p><p className="text-2xl font-bold">{fmtUSD(stats.value)}</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><Pill className="h-4 w-4 mr-2" />Medicine List</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, brand, generic, barcode..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1">
              {(["all", "low", "expired"] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
              ))}
            </div>
          </div>

          <Card className="shadow-soft overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Brand / Supplier</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sale (Unit)</TableHead>
                  <TableHead className="text-right">Box / Packet / Strip</TableHead>
                  <TableHead className="text-center">Margin</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No medicines found</TableCell></TableRow>
                ) : filtered.map(m => {
                  const low = m.stock <= m.low_stock_threshold;
                  const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
                  const mg = margin(m);
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        {m.generic_name && <div className="text-xs text-muted-foreground">{m.generic_name}</div>}
                        <div className="text-[10px] text-muted-foreground">{m.unit}{m.barcode ? ` • ${m.barcode}` : ""}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{m.brand ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{m.supplier ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtUSD(Number(m.cost_price_usd ?? 0))}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-primary">{fmtUSD(Number(m.price_usd ?? 0))}</TableCell>
                      <TableCell className="text-right text-xs">
                        {m.box_price_usd ? <div>📦 {fmtUSD(Number(m.box_price_usd))} /{m.units_per_box ?? "?"}</div> : null}
                        {m.packet_price_usd ? <div>🧾 {fmtUSD(Number(m.packet_price_usd))} /{m.units_per_packet ?? "?"}</div> : null}
                        {m.strip_price_usd ? <div>💊 {fmtUSD(Number(m.strip_price_usd))} /{m.units_per_strip ?? "?"}</div> : null}
                        {!m.box_price_usd && !m.packet_price_usd && !m.strip_price_usd && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">{mg ? <Badge variant="secondary">{mg}%</Badge> : "—"}</TableCell>
                      <TableCell className="text-center"><Badge variant={low ? "destructive" : "secondary"}>{m.stock}</Badge></TableCell>
                      <TableCell className="text-xs">{m.expiry_date ? <span className={expired ? "text-destructive font-medium" : ""}>{m.expiry_date}</span> : "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openStock(m)} title="Update stock"><PackagePlus className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(m)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del(m)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-soft">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Medicine</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Change</TableHead><TableHead className="text-right">Before → After</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No stock history</TableCell></TableRow> :
                  history.map(h => {
                    const m = meds.find(x => x.id === h.medicine_id);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{h.change_type}</Badge></TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${h.quantity_change > 0 ? "text-success" : "text-destructive"}`}>{h.quantity_change > 0 ? "+" : ""}{h.quantity_change}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{h.stock_before} → <span className="font-semibold text-foreground">{h.stock_after}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{h.notes ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Medicine */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Medicine" : "Add New Medicine"}</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Basic Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Medicine Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Generic Name</Label><Input value={form.generic_name} onChange={e => setForm({ ...form, generic_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Default Sell Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Packaging + Barcodes */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">📦 Packaging & Barcodes</h3>
              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5"><Label className="text-xs">Pcs Barcode</Label><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Strip (পাতা) Barcode</Label><Input value={form.strip_barcode} onChange={e => setForm({ ...form, strip_barcode: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Packet Barcode</Label><Input value={form.packet_barcode} onChange={e => setForm({ ...form, packet_barcode: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Box Barcode</Label><Input value={form.box_barcode} onChange={e => setForm({ ...form, box_barcode: e.target.value })} /></div>
                <div className="space-y-1.5 col-start-2"><Label className="text-xs">Units / Strip</Label><Input type="number" value={form.units_per_strip} onChange={e => setForm({ ...form, units_per_strip: e.target.value })} placeholder="10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Units / Packet</Label><Input type="number" value={form.units_per_packet} onChange={e => setForm({ ...form, units_per_packet: e.target.value })} placeholder="20" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Units / Box</Label><Input type="number" value={form.units_per_box} onChange={e => setForm({ ...form, units_per_box: e.target.value })} placeholder="100" /></div>
              </div>
            </div>

            {/* Pricing - auto-calc */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-primary">💰 Pricing — auto-calculates per piece</h3>

              {/* Cost row */}
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Purchase / Cost Price</Label>
                <div className="grid grid-cols-4 gap-3 mt-1">
                  <div><Label className="text-xs">Per Pcs *</Label><Input type="number" step="0.01" value={form.cost_price_usd} onChange={e => updatePerUnit("cost_price_usd", e.target.value)} /></div>
                  <div><Label className="text-xs">Strip ({form.units_per_strip || "?"})</Label><Input type="number" step="0.01" value={form.strip_cost_usd} onChange={e => updatePack("strip_cost_usd", e.target.value, form.units_per_strip, "cost")} /></div>
                  <div><Label className="text-xs">Packet ({form.units_per_packet || "?"})</Label><Input type="number" step="0.01" value={form.packet_cost_usd} onChange={e => updatePack("packet_cost_usd", e.target.value, form.units_per_packet, "cost")} /></div>
                  <div><Label className="text-xs">Box ({form.units_per_box || "?"})</Label><Input type="number" step="0.01" value={form.box_cost_usd} onChange={e => updatePack("box_cost_usd", e.target.value, form.units_per_box, "cost")} /></div>
                </div>
              </div>

              {/* Sale row */}
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Sale Price</Label>
                <div className="grid grid-cols-4 gap-3 mt-1">
                  <div><Label className="text-xs">Per Pcs *</Label><Input type="number" step="0.01" value={form.price_usd} onChange={e => updatePerUnit("price_usd", e.target.value)} /></div>
                  <div><Label className="text-xs">Strip</Label><Input type="number" step="0.01" value={form.strip_price_usd} onChange={e => updatePack("strip_price_usd", e.target.value, form.units_per_strip, "price")} /></div>
                  <div><Label className="text-xs">Packet</Label><Input type="number" step="0.01" value={form.packet_price_usd} onChange={e => updatePack("packet_price_usd", e.target.value, form.units_per_packet, "price")} /></div>
                  <div><Label className="text-xs">Box</Label><Input type="number" step="0.01" value={form.box_price_usd} onChange={e => updatePack("box_price_usd", e.target.value, form.units_per_box, "price")} /></div>
                </div>
              </div>

              {form.cost_price_usd && form.price_usd && (
                <p className="text-xs text-success font-medium">
                  Profit / pcs: {fmtUSD(Number(form.price_usd) - Number(form.cost_price_usd))} ({(((Number(form.price_usd) - Number(form.cost_price_usd)) / Number(form.cost_price_usd)) * 100).toFixed(0)}% margin)
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">💡 Tip: enter Box/Strip/Packet price → per-piece auto fills. Or enter per piece → packs auto fill.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Stock & Expiry</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>{editing ? "Current" : "Initial"} Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} disabled={!!editing} /></div>
                <div className="space-y-1.5"><Label>Low Stock Alert</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDlg(false)}>Cancel</Button><Button onClick={save}>{editing ? "Update" : "Add Medicine"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock */}
      <Dialog open={!!stockDlg} onOpenChange={() => setStockDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Stock — {stockDlg?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">Current stock: <span className="font-bold">{stockDlg?.stock} {stockDlg?.unit}</span></p>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={stockForm.change_type} onValueChange={v => setStockForm({ ...stockForm, change_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase (+)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (+)</SelectItem>
                  <SelectItem value="return">Return (+)</SelectItem>
                  <SelectItem value="damage">Damage / Loss (−)</SelectItem>
                  <SelectItem value="sale">Manual Sale (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={stockForm.quantity_change} onChange={e => setStockForm({ ...stockForm, quantity_change: e.target.value })} autoFocus /></div>
            <div className="space-y-1.5"><Label>Cost Price / Unit (optional)</Label><Input type="number" step="0.01" value={stockForm.cost_price_usd} onChange={e => setStockForm({ ...stockForm, cost_price_usd: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="Invoice no, reason..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStockDlg(null)}>Cancel</Button><Button onClick={saveStock}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Units / Categories Manager */}
      <Dialog open={optDlg} onOpenChange={setOptDlg}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Manage Units & Categories</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <OptionList title="Units" table="medicine_units" items={units} onChange={load} />
            <OptionList title="Categories" table="medicine_categories" items={cats} onChange={load} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OptionList({ title, table, items, onChange }: { title: string; table: string; items: any[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table as any).insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); onChange();
  };
  const del = async (id: string) => {
    await supabase.from(table as any).delete().eq("id", id); onChange();
  };
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Add ${title.slice(0, -1)}...`} onKeyDown={e => e.key === "Enter" && add()} />
        <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="border rounded max-h-64 overflow-y-auto">
        {items.map(i => (
          <div key={i.id} className="flex items-center justify-between px-3 py-1.5 border-b last:border-0">
            <span className="text-sm">{i.name}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
