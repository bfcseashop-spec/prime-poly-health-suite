import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pill, Pencil, Trash2, PackagePlus, History, TrendingUp, AlertTriangle, Boxes } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

type Med = any;

const empty = {
  name: "", generic_name: "", brand: "", category: "", supplier: "", barcode: "",
  unit: "tablet", units_per_box: "", units_per_packet: "", units_per_strip: "",
  cost_price_usd: "", price_usd: "", box_price_usd: "", packet_price_usd: "", strip_price_usd: "",
  stock: "0", low_stock_threshold: "10", expiry_date: "",
};

export default function Medicines() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired">("all");
  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<Med | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [stockDlg, setStockDlg] = useState<Med | null>(null);
  const [stockForm, setStockForm] = useState({ change_type: "purchase", quantity_change: "", cost_price_usd: "", notes: "" });

  const load = async () => {
    const [m, h] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("medicine_stock_history" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setMeds(m.data ?? []); setHistory((h.data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => meds.filter(m => {
    const matchQ = !q || m.name?.toLowerCase().includes(q.toLowerCase()) || m.brand?.toLowerCase().includes(q.toLowerCase()) || m.generic_name?.toLowerCase().includes(q.toLowerCase()) || m.barcode === q;
    const isLow = m.stock <= m.low_stock_threshold;
    const isExp = m.expiry_date && new Date(m.expiry_date) < new Date();
    if (filter === "low" && !isLow) return false;
    if (filter === "expired" && !isExp) return false;
    return matchQ;
  }), [meds, q, filter]);

  const stats = useMemo(() => {
    const total = meds.length;
    const low = meds.filter(m => m.stock <= m.low_stock_threshold).length;
    const expired = meds.filter(m => m.expiry_date && new Date(m.expiry_date) < new Date()).length;
    const value = meds.reduce((s, m) => s + Number(m.cost_price_usd ?? 0) * Number(m.stock ?? 0), 0);
    return { total, low, expired, value };
  }, [meds]);

  const openAdd = () => { setEditing(null); setForm(empty); setDlg(true); };
  const openEdit = (m: Med) => {
    setEditing(m);
    setForm({
      name: m.name ?? "", generic_name: m.generic_name ?? "", brand: m.brand ?? "", category: m.category ?? "",
      supplier: m.supplier ?? "", barcode: m.barcode ?? "", unit: m.unit ?? "tablet",
      units_per_box: m.units_per_box ?? "", units_per_packet: m.units_per_packet ?? "", units_per_strip: m.units_per_strip ?? "",
      cost_price_usd: m.cost_price_usd ?? "", price_usd: m.price_usd ?? "",
      box_price_usd: m.box_price_usd ?? "", packet_price_usd: m.packet_price_usd ?? "", strip_price_usd: m.strip_price_usd ?? "",
      stock: m.stock ?? 0, low_stock_threshold: m.low_stock_threshold ?? 10, expiry_date: m.expiry_date ?? "",
    });
    setDlg(true);
  };

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const num = (v: any) => v === "" || v == null ? null : Number(v);
    const payload: any = {
      name: form.name, generic_name: form.generic_name || null, brand: form.brand || null,
      category: form.category || null, supplier: form.supplier || null, barcode: form.barcode || null,
      unit: form.unit, units_per_box: num(form.units_per_box), units_per_packet: num(form.units_per_packet),
      units_per_strip: num(form.units_per_strip),
      cost_price_usd: Number(form.cost_price_usd || 0), price_usd: Number(form.price_usd || 0),
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
    const signed = stockForm.change_type === "sale" || stockForm.change_type === "damage" ? -Math.abs(qty) : Math.abs(qty);
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
    toast.success("Stock updated");
    setStockDlg(null); load();
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
          <p className="text-muted-foreground mt-1">Inventory, pricing & stock history</p>
        </div>
        <Button onClick={openAdd} size="lg" className="shadow-soft"><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
      </div>

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
                        {m.box_price_usd ? <div>📦 {fmtUSD(Number(m.box_price_usd))} {m.units_per_box ? `/${m.units_per_box}` : ""}</div> : null}
                        {m.packet_price_usd ? <div>🧾 {fmtUSD(Number(m.packet_price_usd))} {m.units_per_packet ? `/${m.units_per_packet}` : ""}</div> : null}
                        {m.strip_price_usd ? <div>💊 {fmtUSD(Number(m.strip_price_usd))} {m.units_per_strip ? `/${m.units_per_strip}` : ""}</div> : null}
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

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Medicine" : "Add New Medicine"}</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Basic Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Medicine Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Generic Name</Label><Input value={form.generic_name} onChange={e => setForm({ ...form, generic_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Antibiotic, Painkiller..." /></div>
                <div className="space-y-1.5"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="tablet, ml, vial" /></div>
                <div className="space-y-1.5"><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">📦 Packaging — units per pack</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Units / Box</Label><Input type="number" value={form.units_per_box} onChange={e => setForm({ ...form, units_per_box: e.target.value })} placeholder="100" /></div>
                <div className="space-y-1.5"><Label>Units / Packet</Label><Input type="number" value={form.units_per_packet} onChange={e => setForm({ ...form, units_per_packet: e.target.value })} placeholder="20" /></div>
                <div className="space-y-1.5"><Label>Units / Strip (পাতা)</Label><Input type="number" value={form.units_per_strip} onChange={e => setForm({ ...form, units_per_strip: e.target.value })} placeholder="10" /></div>
              </div>
            </div>

            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">💰 Pricing</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5"><Label>Cost / Purchase Price (per unit) *</Label><Input type="number" step="0.01" value={form.cost_price_usd} onChange={e => setForm({ ...form, cost_price_usd: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Sale Price (per single unit) *</Label><Input type="number" step="0.01" value={form.price_usd} onChange={e => setForm({ ...form, price_usd: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Box Sale Price</Label><Input type="number" step="0.01" value={form.box_price_usd} onChange={e => setForm({ ...form, box_price_usd: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Packet Sale Price</Label><Input type="number" step="0.01" value={form.packet_price_usd} onChange={e => setForm({ ...form, packet_price_usd: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Strip (পাতা) Sale Price</Label><Input type="number" step="0.01" value={form.strip_price_usd} onChange={e => setForm({ ...form, strip_price_usd: e.target.value })} /></div>
              </div>
              {form.cost_price_usd && form.price_usd && (
                <p className="text-xs text-success mt-3 font-medium">
                  Profit per unit: {fmtUSD(Number(form.price_usd) - Number(form.cost_price_usd))} ({(((Number(form.price_usd) - Number(form.cost_price_usd)) / Number(form.cost_price_usd)) * 100).toFixed(0)}% margin)
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Stock & Expiry</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>{editing ? "Current" : "Initial"} Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} disabled={!!editing} /></div>
                <div className="space-y-1.5"><Label>Low Stock Alert</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              </div>
              {editing && <p className="text-xs text-muted-foreground mt-2">To change stock, use the 📦 Update Stock button on the row.</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDlg(false)}>Cancel</Button><Button onClick={save}>{editing ? "Update" : "Add Medicine"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockDlg} onOpenChange={() => setStockDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Stock — {stockDlg?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">Current stock: <span className="font-bold">{stockDlg?.stock} {stockDlg?.unit}</span></p>
            <div className="space-y-1.5"><Label>Type</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3" value={stockForm.change_type} onChange={e => setStockForm({ ...stockForm, change_type: e.target.value })}>
                <option value="purchase">Purchase (+)</option>
                <option value="adjustment">Adjustment (+)</option>
                <option value="return">Return (+)</option>
                <option value="damage">Damage / Loss (−)</option>
                <option value="sale">Manual Sale (−)</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={stockForm.quantity_change} onChange={e => setStockForm({ ...stockForm, quantity_change: e.target.value })} autoFocus /></div>
            <div className="space-y-1.5"><Label>Cost Price / Unit (optional, updates med record)</Label><Input type="number" step="0.01" value={stockForm.cost_price_usd} onChange={e => setStockForm({ ...stockForm, cost_price_usd: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="Invoice no, reason..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStockDlg(null)}>Cancel</Button><Button onClick={saveStock}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
