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
import { Plus, Search, Pill, Pencil, Trash2, PackagePlus, History, TrendingUp, AlertTriangle, Boxes, Upload, Download, ScanBarcode, Settings2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCSV, exportToExcel, parseImportFile, downloadTemplate } from "@/lib/dataIO";

type Med = any;

const empty = {
  name: "", generic_name: "", brand: "", category: "", supplier: "", barcode: "",
  box_barcode: "", packet_barcode: "", strip_barcode: "",
  unit: "Pcs",
  purchase_unit: "Pcs",
  units_per_box: "", units_per_packet: "", units_per_strip: "",
  purchase_pack_price: "",
  cost_price_usd: "", price_usd: "",
  box_cost_usd: "", packet_cost_usd: "", strip_cost_usd: "",
  box_price_usd: "", packet_price_usd: "", strip_price_usd: "",
  stock: "0", low_stock_threshold: "10", expiry_date: "",
  image_url: "",
};

function OptionList({ title, table, items, onChange }: { title: string; table: string; items: any[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const add = async () => { if (!name.trim()) return; const { error } = await supabase.from(table as any).insert({ name: name.trim() }); if (error) return toast.error(error.message); setName(""); onChange(); };
  const del = async (id: string) => { await supabase.from(table as any).delete().eq("id", id); onChange(); };
  return (
    <div>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="flex gap-2 mb-2"><Input value={name} onChange={e => setName(e.target.value)} placeholder={`New ${title.slice(0, -1)}`} onKeyDown={e => e.key === "Enter" && add()} /><Button size="sm" onClick={add}>Add</Button></div>
      <div className="space-y-1 max-h-64 overflow-y-auto">{items.map(it => (<div key={it.id} className="flex justify-between items-center bg-muted/40 rounded px-2 py-1 text-sm"><span>{it.name}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => del(it.id)}><X className="h-3 w-3" /></Button></div>))}</div>
    </div>
  );
}

export default function Medicines() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [units, setUnits] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired" | "out">("all");
  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<Med | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [stockDlg, setStockDlg] = useState<Med | null>(null);
  const [stockForm, setStockForm] = useState({ change_type: "purchase", quantity_change: "", unit: "Pcs", cost_price_usd: "", notes: "" });
  const [optDlg, setOptDlg] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [m, h, sales, u, c] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("medicine_stock_history" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("medicine_stock_history" as any).select("medicine_id, quantity_change, change_type"),
      supabase.from("medicine_units" as any).select("*").order("name"),
      supabase.from("medicine_categories" as any).select("*").order("name"),
    ]);
    setMeds(m.data ?? []); setHistory((h.data as any) ?? []);
    const sm: Record<string, number> = {};
    ((sales.data as any[]) ?? []).forEach(r => { if (r.change_type === "sale") sm[r.medicine_id] = (sm[r.medicine_id] ?? 0) + Math.abs(Number(r.quantity_change || 0)); });
    setSoldMap(sm);
    setUnits((u.data as any) ?? []); setCats((c.data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => meds.filter(m => {
    const ql = q.toLowerCase();
    const matchQ = !q || [m.name, m.brand, m.generic_name, m.category, m.supplier].some((x: string) => x?.toLowerCase().includes(ql)) ||
      [m.barcode, m.box_barcode, m.packet_barcode, m.strip_barcode].includes(q);
    const isLow = m.stock > 0 && m.stock <= m.low_stock_threshold;
    const isOut = Number(m.stock) === 0;
    const isExp = m.expiry_date && new Date(m.expiry_date) < new Date();
    if (filter === "low" && !isLow) return false;
    if (filter === "out" && !isOut) return false;
    if (filter === "expired" && !isExp) return false;
    return matchQ;
  }), [meds, q, filter]);

  const stats = useMemo(() => ({
    total: meds.length,
    low: meds.filter(m => m.stock > 0 && m.stock <= m.low_stock_threshold).length,
    out: meds.filter(m => Number(m.stock) === 0).length,
    expired: meds.filter(m => m.expiry_date && new Date(m.expiry_date) < new Date()).length,
    value: meds.reduce((s, m) => s + Number(m.cost_price_usd ?? 0) * Number(m.stock ?? 0), 0),
  }), [meds]);

  const openAdd = () => { setEditing(null); setForm(empty); setDlg(true); };
  const openEdit = (m: Med) => {
    setEditing(m);
    setForm({ ...empty, ...Object.fromEntries(Object.keys(empty).map(k => [k, m[k] ?? (empty as any)[k]])) });
    setDlg(true);
  };

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

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("medicine-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("medicine-images").getPublicUrl(path);
      setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
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
      image_url: form.image_url || null,
    };
    if (editing) {
      const before = Number(editing.stock || 0);
      const after = Number(payload.stock || 0);
      const { error } = await supabase.from("medicines").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      if (before !== after) {
        await supabase.from("medicine_stock_history" as any).insert({
          medicine_id: editing.id, change_type: "adjustment", quantity_change: after - before,
          stock_before: before, stock_after: after, cost_price_usd: payload.cost_price_usd, created_by: user?.id,
          notes: "Stock adjusted via Edit",
        });
      }
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

  const openStock = (m: Med) => { setStockDlg(m); setStockForm({ change_type: "purchase", quantity_change: "", unit: "Pcs", cost_price_usd: m.cost_price_usd ?? "", notes: "" }); };

  const unitMultiplier = (m: Med, unit: string): number => {
    if (unit === "Box") return Number(m.units_per_box || 0) || 1;
    if (unit === "Packet") return Number(m.units_per_packet || 0) || 1;
    if (unit === "Strip") return Number(m.units_per_strip || 0) || 1;
    return 1;
  };

  const saveStock = async () => {
    if (!stockDlg) return;
    const qty = Number(stockForm.quantity_change || 0);
    if (!qty) return toast.error("Quantity required");
    const mult = unitMultiplier(stockDlg, stockForm.unit);
    const pcsQty = qty * mult;
    const signed = ["sale", "damage"].includes(stockForm.change_type) ? -Math.abs(pcsQty) : Math.abs(pcsQty);
    const before = Number(stockDlg.stock || 0);
    const after = Math.max(0, before + signed);
    const { error: e1 } = await supabase.from("medicines").update({ stock: after, ...(stockForm.cost_price_usd ? { cost_price_usd: Number(stockForm.cost_price_usd) } : {}) }).eq("id", stockDlg.id);
    if (e1) return toast.error(e1.message);
    const unitNote = stockForm.unit !== "Pcs" ? `${qty} ${stockForm.unit} × ${mult} = ${pcsQty} pcs` : "";
    await supabase.from("medicine_stock_history" as any).insert({
      medicine_id: stockDlg.id, change_type: stockForm.change_type, quantity_change: signed,
      stock_before: before, stock_after: after,
      cost_price_usd: stockForm.cost_price_usd ? Number(stockForm.cost_price_usd) : null,
      notes: [unitNote, stockForm.notes].filter(Boolean).join(" • ") || null, created_by: user?.id,
    });
    toast.success(`Stock updated (${signed > 0 ? "+" : ""}${signed} pcs)`); setStockDlg(null); load();
  };

  const handleScan = async (code: string) => {
    if (!code) return;
    const m = meds.find(x => [x.barcode, x.strip_barcode, x.packet_barcode, x.box_barcode].includes(code));
    if (!m) {
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

  const TEMPLATE_HEADERS = [
    "name","generic_name","brand","category","supplier",
    "barcode","strip_barcode","packet_barcode","box_barcode",
    "unit","units_per_strip","units_per_packet","units_per_box",
    "cost_price_usd","strip_cost_usd","packet_cost_usd","box_cost_usd",
    "price_usd","strip_price_usd","packet_price_usd","box_price_usd",
    "stock","low_stock_threshold","expiry_date","image_url",
  ];

  const handleImport = async (file: File) => {
    try {
      const rows = await parseImportFile(file);
      if (!rows.length) return toast.error("Empty file");

      const num = (v: any) => (v === "" || v == null || isNaN(Number(v))) ? null : Number(v);
      const numOr0 = (v: any) => Number(v || 0) || 0;

      // derive per-pcs cost/price if not provided but pack price + units exist
      const derivePerPcs = (price: any, units: any) => {
        const p = Number(price || 0), u = Number(units || 0);
        return (p && u) ? p / u : 0;
      };

      const prepared = rows.map((r: any) => {
        const upb = num(r.units_per_box), upp = num(r.units_per_packet), ups = num(r.units_per_strip);
        let cost = numOr0(r.cost_price_usd);
        if (!cost) cost = derivePerPcs(r.box_cost_usd, upb) || derivePerPcs(r.packet_cost_usd, upp) || derivePerPcs(r.strip_cost_usd, ups);
        let price = numOr0(r.price_usd);
        if (!price) price = derivePerPcs(r.box_price_usd, upb) || derivePerPcs(r.packet_price_usd, upp) || derivePerPcs(r.strip_price_usd, ups);
        return {
          name: (r.name || "").toString().trim(),
          generic_name: r.generic_name || null, brand: r.brand || null,
          category: r.category || null, supplier: r.supplier || null,
          barcode: r.barcode ? String(r.barcode) : null,
          box_barcode: r.box_barcode ? String(r.box_barcode) : null,
          packet_barcode: r.packet_barcode ? String(r.packet_barcode) : null,
          strip_barcode: r.strip_barcode ? String(r.strip_barcode) : null,
          unit: r.unit || "Pcs",
          units_per_box: upb, units_per_packet: upp, units_per_strip: ups,
          cost_price_usd: Number(cost.toFixed(4)), price_usd: Number(price.toFixed(2)),
          box_cost_usd: num(r.box_cost_usd), packet_cost_usd: num(r.packet_cost_usd), strip_cost_usd: num(r.strip_cost_usd),
          box_price_usd: num(r.box_price_usd), packet_price_usd: num(r.packet_price_usd), strip_price_usd: num(r.strip_price_usd),
          stock: Number(r.stock || 0),
          low_stock_threshold: Number(r.low_stock_threshold || 10),
          expiry_date: r.expiry_date || null,
          image_url: r.image_url || null,
        };
      }).filter(r => r.name);

      if (!prepared.length) return toast.error("No valid rows (name required)");

      // Match existing by barcode or by name (case-insensitive)
      const byBarcode = new Map<string, any>();
      const byName = new Map<string, any>();
      meds.forEach(m => {
        if (m.barcode) byBarcode.set(String(m.barcode), m);
        byName.set(String(m.name || "").toLowerCase().trim(), m);
      });

      let inserted = 0, updated = 0, historyRows: any[] = [];

      for (const r of prepared) {
        const existing = (r.barcode && byBarcode.get(r.barcode)) || byName.get(r.name.toLowerCase());
        if (existing) {
          const before = Number(existing.stock || 0);
          const addStock = r.stock; // treat imported stock as INCOMING quantity for existing
          const after = before + addStock;
          const { error } = await supabase.from("medicines").update({ ...r, stock: after }).eq("id", existing.id);
          if (error) { toast.error(`${r.name}: ${error.message}`); continue; }
          updated++;
          if (addStock > 0) {
            historyRows.push({
              medicine_id: existing.id, change_type: "purchase", quantity_change: addStock,
              stock_before: before, stock_after: after, cost_price_usd: r.cost_price_usd,
              created_by: user?.id, notes: "Bulk import (stock added)",
            });
          }
        } else {
          const { data, error } = await supabase.from("medicines").insert(r).select().single();
          if (error) { toast.error(`${r.name}: ${error.message}`); continue; }
          inserted++;
          if (data && r.stock > 0) {
            historyRows.push({
              medicine_id: data.id, change_type: "initial", quantity_change: r.stock,
              stock_before: 0, stock_after: r.stock, cost_price_usd: r.cost_price_usd,
              created_by: user?.id, notes: "Bulk import (initial stock)",
            });
          }
        }
      }

      if (historyRows.length) {
        await supabase.from("medicine_stock_history" as any).insert(historyRows);
      }

      toast.success(`Imported: ${inserted} new, ${updated} updated, ${historyRows.length} stock entries logged`);
      load();
    } catch (e: any) { toast.error(e.message); }
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
          <Button variant="outline" onClick={() => downloadTemplate(TEMPLATE_HEADERS, "medicines_import_template", { name: "Paracetamol 500mg", generic_name: "Paracetamol", brand: "Square", category: "Tablet", supplier: "ABC Pharma", barcode: "1000001", strip_barcode: "1000002", packet_barcode: "", box_barcode: "1000003", unit: "Pcs", units_per_strip: 10, units_per_packet: "", units_per_box: 100, cost_price_usd: 0.05, price_usd: 0.10, strip_price_usd: 1.00, box_price_usd: 10.00, stock: 100, low_stock_threshold: 20, expiry_date: "2026-12-31", image_url: "" })}><Download className="h-4 w-4 mr-2" />Template</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Import</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => exportToExcel(meds, "medicines")}><Download className="h-4 w-4 mr-2" />Export XLSX</Button>
          <Button variant="outline" onClick={() => exportToCSV(meds, "medicines")}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={openAdd} size="lg" className="shadow-soft"><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><Boxes className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{stats.total}</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-warning" /><div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-2xl font-bold">{stats.low}</p></div></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-2xl font-bold">{stats.out}</p></div></CardContent></Card>
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
              {(["all", "low", "out", "expired"] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f === "out" ? "Out of Stock" : f}</Button>
              ))}
            </div>
          </div>

          <Card className="shadow-soft overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Purchase / Pcs</TableHead>
                  <TableHead className="text-right">Selling / Pcs</TableHead>
                  <TableHead className="text-center">Total Pcs</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-center">Sold</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-12">No medicines found</TableCell></TableRow>
                ) : filtered.map(m => {
                  const sold = soldMap[m.id] ?? 0;
                  const avail = Number(m.stock ?? 0);
                  const total = avail + sold;
                  const out = avail === 0;
                  const low = !out && avail <= m.low_stock_threshold;
                  const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/40">
                      <TableCell>
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Pill className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        {m.generic_name && <div className="text-xs text-muted-foreground">{m.generic_name}</div>}
                        {m.brand && <div className="text-[10px] text-muted-foreground">{m.brand}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{m.category ? <Badge variant="outline">{m.category}</Badge> : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtUSD(Number(m.cost_price_usd ?? 0))}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-primary">{fmtUSD(Number(m.price_usd ?? 0))}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{total}</TableCell>
                      <TableCell className="text-center text-xs">{m.unit}</TableCell>
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">{sold}</TableCell>
                      <TableCell className="text-center"><span className={`font-mono font-bold ${out ? "text-destructive" : low ? "text-warning" : "text-success"}`}>{avail}</span></TableCell>
                      <TableCell className="text-center">
                        {expired ? <Badge variant="destructive">Expired</Badge>
                          : out ? <Badge variant="destructive">Out</Badge>
                          : low ? <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">Low</Badge>
                          : <Badge variant="secondary" className="bg-success/15 text-success">In Stock</Badge>}
                      </TableCell>
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
                        <TableCell className="font-medium flex items-center gap-2">
                          {m?.image_url && <img src={m.image_url} alt="" className="h-6 w-6 rounded object-cover" />}
                          {m?.name ?? "—"}
                        </TableCell>
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
            {/* Image + Basic */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Basic Info</h3>
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Label className="text-xs">Image</Label>
                  <div className="mt-1.5 h-28 w-28 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/30 relative group">
                    {form.image_url ? (
                      <>
                        <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                      </>
                    ) : (
                      <button type="button" onClick={() => imgRef.current?.click()} className="flex flex-col items-center text-muted-foreground hover:text-primary text-xs">
                        <ImagePlus className="h-6 w-6 mb-1" />{uploading ? "Uploading..." : "Upload"}
                      </button>
                    )}
                    <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
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

            {/* Pricing */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-primary">💰 Purchase — pick a unit, enter price, per-piece auto-calculates</h3>

              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Purchase Unit</Label>
                  <Select value={form.purchase_unit} onValueChange={v => setForm({ ...form, purchase_unit: v, ...(v === "Pcs" ? {} : { purchase_pack_price: "", cost_price_usd: "" }) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pcs">Pcs (single)</SelectItem>
                      <SelectItem value="Strip">Strip / পাতা</SelectItem>
                      <SelectItem value="Packet">Packet</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.purchase_unit !== "Pcs" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pcs in 1 {form.purchase_unit} *</Label>
                    <Input
                      type="number"
                      value={
                        form.purchase_unit === "Box" ? form.units_per_box :
                        form.purchase_unit === "Packet" ? form.units_per_packet :
                        form.units_per_strip
                      }
                      onChange={e => {
                        const v = e.target.value;
                        const key = form.purchase_unit === "Box" ? "units_per_box" : form.purchase_unit === "Packet" ? "units_per_packet" : "units_per_strip";
                        const next: any = { ...form, [key]: v };
                        const price = Number(form.purchase_pack_price || 0);
                        const u = Number(v || 0);
                        if (price && u) next.cost_price_usd = (price / u).toFixed(4);
                        setForm(next);
                      }}
                      placeholder={form.purchase_unit === "Box" ? "100" : form.purchase_unit === "Packet" ? "20" : "10"}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {form.purchase_unit === "Pcs" ? "Cost / Pcs *" : `Total Cost per ${form.purchase_unit} *`}
                  </Label>
                  <Input
                    type="number" step="0.01"
                    value={form.purchase_unit === "Pcs" ? form.cost_price_usd : form.purchase_pack_price}
                    onChange={e => {
                      const v = e.target.value;
                      if (form.purchase_unit === "Pcs") {
                        setForm({ ...form, cost_price_usd: v, purchase_pack_price: v });
                      } else {
                        const u = Number(
                          form.purchase_unit === "Box" ? form.units_per_box :
                          form.purchase_unit === "Packet" ? form.units_per_packet :
                          form.units_per_strip || 0
                        );
                        const next: any = { ...form, purchase_pack_price: v };
                        if (u && Number(v)) next.cost_price_usd = (Number(v) / u).toFixed(4);
                        setForm(next);
                      }
                    }}
                    placeholder="20.00"
                  />
                </div>
              </div>

              {form.purchase_unit !== "Pcs" && form.cost_price_usd && Number(form.cost_price_usd) > 0 && (
                <div className="rounded-md bg-background border border-primary/30 p-3 text-sm">
                  <span className="text-muted-foreground">✨ Auto cost per piece: </span>
                  <span className="font-bold text-primary text-base">{fmtUSD(Number(form.cost_price_usd))}</span>
                  {form.purchase_pack_price && (
                    <span className="text-muted-foreground ml-2">
                      ({fmtUSD(Number(form.purchase_pack_price))} ÷ {
                        form.purchase_unit === "Box" ? form.units_per_box :
                        form.purchase_unit === "Packet" ? form.units_per_packet :
                        form.units_per_strip
                      } pcs)
                    </span>
                  )}
                </div>
              )}

              {/* Sale price - simplified */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-primary">💵 Sale Price (set manually based on cost)</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Set per-piece sell price. Pack prices auto-calculate from per-pcs price.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Per Pcs *</Label>
                    <Input
                      type="number" step="0.01"
                      value={form.price_usd}
                      onChange={e => {
                        const v = e.target.value;
                        const n = Number(v || 0);
                        const next: any = { ...form, price_usd: v };
                        if (n) {
                          if (form.units_per_strip) next.strip_price_usd = (n * Number(form.units_per_strip)).toFixed(2);
                          if (form.units_per_packet) next.packet_price_usd = (n * Number(form.units_per_packet)).toFixed(2);
                          if (form.units_per_box) next.box_price_usd = (n * Number(form.units_per_box)).toFixed(2);
                        }
                        setForm(next);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Strip {form.units_per_strip ? `(${form.units_per_strip} pcs)` : ""}</Label><Input type="number" step="0.01" value={form.strip_price_usd} onChange={e => updatePack("strip_price_usd", e.target.value, form.units_per_strip, "price")} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Packet {form.units_per_packet ? `(${form.units_per_packet} pcs)` : ""}</Label><Input type="number" step="0.01" value={form.packet_price_usd} onChange={e => updatePack("packet_price_usd", e.target.value, form.units_per_packet, "price")} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Box {form.units_per_box ? `(${form.units_per_box} pcs)` : ""}</Label><Input type="number" step="0.01" value={form.box_price_usd} onChange={e => updatePack("box_price_usd", e.target.value, form.units_per_box, "price")} /></div>
                </div>
                {form.cost_price_usd && form.price_usd && Number(form.cost_price_usd) > 0 && (
                  <div className="mt-3 rounded-md bg-success/10 border border-success/30 p-2 text-sm">
                    <span className="text-muted-foreground">Profit / pcs: </span>
                    <span className="font-bold text-success">{fmtUSD(Number(form.price_usd) - Number(form.cost_price_usd))}</span>
                    <span className="text-muted-foreground ml-2">({(((Number(form.price_usd) - Number(form.cost_price_usd)) / Number(form.cost_price_usd)) * 100).toFixed(0)}% margin)</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Stock & Expiry</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{editing ? "Current Stock (edit logs to history)" : "Initial Stock"}</Label>
                  <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={stockForm.quantity_change} onChange={e => setStockForm({ ...stockForm, quantity_change: e.target.value })} autoFocus /></div>
              <div className="space-y-1.5"><Label>Unit</Label>
                <Select value={stockForm.unit} onValueChange={v => setStockForm({ ...stockForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs">Pcs (single)</SelectItem>
                    {stockDlg?.units_per_strip ? <SelectItem value="Strip">Strip ({stockDlg.units_per_strip} pcs)</SelectItem> : null}
                    {stockDlg?.units_per_packet ? <SelectItem value="Packet">Packet ({stockDlg.units_per_packet} pcs)</SelectItem> : null}
                    {stockDlg?.units_per_box ? <SelectItem value="Box">Box ({stockDlg.units_per_box} pcs)</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {stockDlg && stockForm.quantity_change && stockForm.unit !== "Pcs" && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-2 text-sm">
                ✨ {stockForm.quantity_change} {stockForm.unit} × {unitMultiplier(stockDlg, stockForm.unit)} = <span className="font-bold text-primary">{Number(stockForm.quantity_change) * unitMultiplier(stockDlg, stockForm.unit)} pcs</span>
              </div>
            )}
            <div className="space-y-1.5"><Label>Cost Price / Unit (optional)</Label><Input type="number" step="0.01" value={stockForm.cost_price_usd} onChange={e => setStockForm({ ...stockForm, cost_price_usd: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="Invoice no, reason..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStockDlg(null)}>Cancel</Button><Button onClick={saveStock}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
