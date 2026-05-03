import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Receipt, Pill } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD, fmtBoth } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

type CartItem = { medicine_id: string; name: string; price_usd: number; quantity: number; max: number };

const PAYMENTS = [
  { value: "cash", label: "Cash" }, { value: "aba", label: "ABA Bank" },
  { value: "acleda", label: "ACLEDA Bank" }, { value: "paypal", label: "PayPal" }, { value: "visa", label: "Visa/Card" },
];

export default function Pharmacy() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState("cash");
  const [patientId, setPatientId] = useState<string | undefined>();
  const [tab, setTab] = useState("pos");
  const [addOpen, setAddOpen] = useState(false);
  const [newMed, setNewMed] = useState<any>({ name: "", brand: "", category: "", unit: "tablet", price_usd: 0, stock: 0, low_stock_threshold: 10, expiry_date: "" });

  const load = async () => {
    const [m, p] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("patients").select("id, full_name, patient_code").order("created_at", { ascending: false }).limit(200),
    ]);
    setMeds(m.data ?? []); setPatients(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = meds.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.brand?.toLowerCase().includes(q.toLowerCase()) || m.barcode === q);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price_usd * c.quantity, 0), [cart]);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (m: any) => {
    if (m.stock <= 0) return toast.error("Out of stock");
    setCart(prev => {
      const ex = prev.find(c => c.medicine_id === m.id);
      if (ex) {
        if (ex.quantity + 1 > m.stock) { toast.error("Not enough stock"); return prev; }
        return prev.map(c => c.medicine_id === m.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { medicine_id: m.id, name: m.name, price_usd: Number(m.price_usd), quantity: 1, max: m.stock }];
    });
  };

  const updQty = (id: string, q: number) => setCart(cart.map(c => c.medicine_id === id ? { ...c, quantity: Math.min(Math.max(1, q), c.max) } : c));
  const rmCart = (id: string) => setCart(cart.filter(c => c.medicine_id !== id));

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const { data: invData } = await supabase.rpc("generate_invoice_no" as any);
    const invoice = invData ?? `INV-${Date.now()}`;
    const { data: sale, error } = await supabase.from("medicine_sales").insert({
      invoice_no: invoice, patient_id: patientId, subtotal_usd: subtotal, discount_usd: discount,
      total_usd: total, payment_method: payment, cashier_id: user?.id,
    }).select().single();
    if (error || !sale) return toast.error(error?.message ?? "Failed");
    const items = cart.map(c => ({ sale_id: sale.id, medicine_id: c.medicine_id, name: c.name, quantity: c.quantity, price_usd: c.price_usd, total_usd: c.price_usd * c.quantity }));
    await supabase.from("medicine_sale_items").insert(items);
    // decrement stock
    for (const c of cart) {
      const m = meds.find(x => x.id === c.medicine_id);
      if (m) await supabase.from("medicines").update({ stock: m.stock - c.quantity }).eq("id", c.medicine_id);
    }
    toast.success(`Sale completed — ${invoice}`);
    printReceipt({ invoice, items: cart, subtotal, discount, total, payment, patient: patients.find(p => p.id === patientId) });
    setCart([]); setDiscount(0); setPatientId(undefined); load();
  };

  const printReceipt = (r: any) => {
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>${r.invoice}</title><style>
      body{font-family:system-ui;padding:20px;max-width:380px;margin:auto;color:#0f172a}
      .h{text-align:center;border-bottom:2px dashed #0F6E56;padding-bottom:12px;margin-bottom:12px}
      .h h1{color:#0F6E56;margin:6px 0;font-size:18px} .h p{margin:2px 0;font-size:11px;color:#64748b}
      table{width:100%;font-size:12px;border-collapse:collapse} td{padding:4px 0} .r{text-align:right}
      .tot{border-top:1px dashed #94a3b8;margin-top:8px;padding-top:8px} .tot div{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
      .grand{font-weight:bold;font-size:15px;color:#0F6E56;border-top:2px solid #0F6E56;padding-top:6px;margin-top:6px}
      .f{text-align:center;margin-top:16px;font-size:11px;color:#64748b}</style></head><body>
      <div class="h"><div style="font-size:24px;color:#0F6E56;font-weight:bold">+ Prime Poly Clinic</div>
        <p>Pharmacy Receipt</p><p>${new Date().toLocaleString()}</p>
        <p><strong>${r.invoice}</strong></p>${r.patient ? `<p>${r.patient.patient_code} — ${r.patient.full_name}</p>` : ""}</div>
      <table>${r.items.map((i: any) => `<tr><td>${i.name}<br><small>${i.quantity} × ${fmtUSD(i.price_usd)}</small></td><td class="r">${fmtUSD(i.price_usd * i.quantity)}</td></tr>`).join("")}</table>
      <div class="tot">
        <div><span>Subtotal</span><span>${fmtUSD(r.subtotal)}</span></div>
        <div><span>Discount</span><span>−${fmtUSD(r.discount)}</span></div>
        <div class="grand"><span>TOTAL</span><span>${fmtUSD(r.total)}</span></div>
        <div style="font-size:11px;color:#64748b;text-align:right">≈ ៛${Math.round(r.total*4100).toLocaleString()}</div>
        <div style="margin-top:8px"><span>Payment</span><span style="text-transform:uppercase;float:right">${r.payment}</span></div>
      </div>
      <div class="f">Thank you for choosing Prime Poly Clinic</div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  const addMed = async () => {
    if (!newMed.name) return toast.error("Name required");
    const payload: any = { ...newMed, price_usd: Number(newMed.price_usd), stock: Number(newMed.stock), low_stock_threshold: Number(newMed.low_stock_threshold) };
    if (!payload.expiry_date) delete payload.expiry_date;
    const { error } = await supabase.from("medicines").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Medicine added");
    setAddOpen(false);
    setNewMed({ name: "", brand: "", category: "", unit: "tablet", price_usd: 0, stock: 0, low_stock_threshold: 10, expiry_date: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pharmacy POS</h1><p className="text-muted-foreground mt-1">{meds.length} medicines in stock</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Medicine</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Medicine</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-2 col-span-2"><Label>Name *</Label><Input value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Brand</Label><Input value={newMed.brand} onChange={e => setNewMed({ ...newMed, brand: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={newMed.category} onChange={e => setNewMed({ ...newMed, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={newMed.unit} onChange={e => setNewMed({ ...newMed, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" step="0.01" value={newMed.price_usd} onChange={e => setNewMed({ ...newMed, price_usd: e.target.value })} /></div>
              <div className="space-y-2"><Label>Stock</Label><Input type="number" value={newMed.stock} onChange={e => setNewMed({ ...newMed, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Low Stock Alert</Label><Input type="number" value={newMed.low_stock_threshold} onChange={e => setNewMed({ ...newMed, low_stock_threshold: e.target.value })} /></div>
              <div className="space-y-2 col-span-2"><Label>Expiry Date</Label><Input type="date" value={newMed.expiry_date} onChange={e => setNewMed({ ...newMed, expiry_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={addMed}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="pos">POS</TabsTrigger><TabsTrigger value="inventory">Inventory</TabsTrigger></TabsList>

        <TabsContent value="pos" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3 shadow-soft">
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search or scan barcode..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" autoFocus />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
                  {filtered.length === 0 ? <p className="col-span-full text-center text-muted-foreground py-8">No medicines</p> :
                    filtered.map(m => (
                      <button key={m.id} onClick={() => addToCart(m)} disabled={m.stock <= 0}
                        className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <div className="flex items-start justify-between gap-1">
                          <Pill className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <Badge variant={m.stock <= m.low_stock_threshold ? "destructive" : "secondary"} className="text-[10px]">{m.stock}</Badge>
                        </div>
                        <p className="font-medium text-sm mt-1 line-clamp-1">{m.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{m.brand}</p>
                        <p className="text-sm font-semibold text-primary mt-1">{fmtUSD(Number(m.price_usd))}</p>
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Cart ({cart.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 max-h-[35vh] overflow-y-auto">
                  {cart.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Cart empty</p> :
                    cart.map(c => (
                      <div key={c.medicine_id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{fmtUSD(c.price_usd)} ea</p></div>
                        <Input type="number" className="w-16 h-8" value={c.quantity} onChange={e => updQty(c.medicine_id, Number(e.target.value))} min={1} max={c.max} />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rmCart(c.medicine_id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                </div>
                <div className="space-y-2">
                  <div className="space-y-1"><Label className="text-xs">Patient (optional)</Label>
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                      <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Discount (USD)</Label><Input type="number" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} className="h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">Payment</Label>
                    <Select value={payment} onValueChange={setPayment}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1 pt-3 border-t">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtUSD(subtotal)}</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span>−{fmtUSD(discount)}</span></div>
                  <div className="flex justify-between text-base font-bold text-primary pt-1 border-t"><span>TOTAL</span><span>{fmtUSD(total)}</span></div>
                  <p className="text-right text-xs text-muted-foreground">{fmtBoth(total).split(" • ")[1]}</p>
                </div>
                <Button className="w-full" size="lg" onClick={checkout} disabled={cart.length === 0}>Checkout & Print</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card className="shadow-soft">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Expiry</TableHead></TableRow></TableHeader>
              <TableBody>
                {meds.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No medicines</TableCell></TableRow> :
                  meds.map(m => {
                    const low = m.stock <= m.low_stock_threshold;
                    const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.brand ?? "—"}</TableCell>
                        <TableCell>{m.category ?? "—"}</TableCell>
                        <TableCell>{fmtUSD(Number(m.price_usd))}</TableCell>
                        <TableCell><Badge variant={low ? "destructive" : "secondary"}>{m.stock} {m.unit}</Badge></TableCell>
                        <TableCell>{m.expiry_date ? <span className={expired ? "text-destructive font-medium" : ""}>{m.expiry_date}</span> : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
