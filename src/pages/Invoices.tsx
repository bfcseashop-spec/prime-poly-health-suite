import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, Calendar as CalIcon, FileDown, X } from "lucide-react";
import { fmtUSD } from "@/lib/currency";

const PAYMENTS = [
  { value: "all", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "aba", label: "ABA Bank" },
  { value: "acleda", label: "ACLEDA Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "visa", label: "Card" },
  { value: "mixed", label: "Split / Mixed" },
];

export default function Invoices() {
  const [sales, setSales] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [openSale, setOpenSale] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("medicine_sales").select("*").order("created_at", { ascending: false }).limit(1000);
    setSales(data ?? []);
    const ids = Array.from(new Set((data ?? []).map(s => s.patient_id).filter(Boolean)));
    if (ids.length) {
      const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code, phone").in("id", ids as string[]);
      const map: Record<string, any> = {};
      (pts ?? []).forEach(p => { map[p.id] = p; });
      setPatients(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : null;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : null;
    return sales.filter(s => {
      const t = new Date(s.created_at).getTime();
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      if (method !== "all" && s.payment_method !== method) return false;
      if (status !== "all" && (s.status ?? "paid") !== status) return false;
      if (q) {
        const p = s.patient_id ? patients[s.patient_id] : null;
        const text = `${s.invoice_no} ${p?.full_name ?? ""} ${p?.patient_code ?? ""} ${p?.phone ?? ""}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [sales, q, from, to, method, status, patients]);

  const totals = useMemo(() => ({
    count: filtered.length,
    gross: filtered.reduce((a, s) => a + Number(s.total_usd ?? 0), 0),
    paid: filtered.reduce((a, s) => a + Number(s.amount_paid_usd ?? 0), 0),
    due: filtered.reduce((a, s) => a + Number(s.due_usd ?? 0), 0),
  }), [filtered]);

  const openInvoice = async (sale: any) => {
    setOpenSale(sale);
    const [i, p] = await Promise.all([
      supabase.from("medicine_sale_items").select("*").eq("sale_id", sale.id),
      supabase.from("invoice_payments" as any).select("*").eq("sale_id", sale.id).order("created_at"),
    ]);
    setItems(i.data ?? []);
    setPayments((p.data as any[]) ?? []);
  };

  const exportCSV = () => {
    const rows = [
      ["Invoice", "Date", "Patient Code", "Patient", "Phone", "Subtotal", "Discount", "Insurance Disc.", "Total", "Paid", "Due", "Method", "Status"],
      ...filtered.map(s => {
        const p = s.patient_id ? patients[s.patient_id] : null;
        return [
          s.invoice_no,
          new Date(s.created_at).toLocaleString(),
          p?.patient_code ?? "",
          p?.full_name ?? "Walk-in",
          p?.phone ?? "",
          s.subtotal_usd, s.discount_usd, s.insurance_discount_usd ?? 0,
          s.total_usd, s.amount_paid_usd ?? 0, s.due_usd ?? 0,
          s.payment_method, s.status ?? "paid",
        ];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoices-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => { setQ(""); setFrom(""); setTo(""); setMethod("all"); setStatus("all"); };

  const StatusBadge = ({ s }: { s: string }) => {
    const cls = s === "paid" ? "bg-success/15 text-success border-success/30"
      : s === "partial" ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />Invoice History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Search and review past sales by patient, date or payment method</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Invoices</p><p className="text-2xl font-bold mt-1">{totals.count}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gross</p><p className="text-2xl font-bold mt-1">{fmtUSD(totals.gross)}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Collected</p><p className="text-2xl font-bold text-success mt-1">{fmtUSD(totals.paid)}</p></CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive mt-1">{fmtUSD(totals.due)}</p></CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Invoice / patient / phone…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><CalIcon className="h-3 w-3" />From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><CalIcon className="h-3 w-3" />To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(q || from || to || method !== "all" || status !== "all") && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">Loading…</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No invoices match your filters</TableCell></TableRow>
                : filtered.map(s => {
                  const p = s.patient_id ? patients[s.patient_id] : null;
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-accent/40" onClick={() => openInvoice(s)}>
                      <TableCell className="font-mono text-sm">{s.invoice_no}</TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{p ? `${p.patient_code} — ${p.full_name}` : <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                      <TableCell className="text-sm capitalize">{s.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(s.total_usd))}</TableCell>
                      <TableCell className="text-right text-success">{fmtUSD(Number(s.amount_paid_usd ?? 0))}</TableCell>
                      <TableCell className="text-right text-destructive">{Number(s.due_usd) > 0 ? fmtUSD(Number(s.due_usd)) : "—"}</TableCell>
                      <TableCell><StatusBadge s={s.status ?? "paid"} /></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openInvoice(s); }}>View</Button></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!openSale} onOpenChange={o => !o && setOpenSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{openSale?.invoice_no}</DialogTitle></DialogHeader>
          {openSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{new Date(openSale.created_at).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{fmtUSD(Number(openSale.total_usd))}</p></div>
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-success">{fmtUSD(Number(openSale.amount_paid_usd ?? 0))}</p></div>
                <div><p className="text-xs text-muted-foreground">Due</p><p className="font-semibold text-destructive">{fmtUSD(Number(openSale.due_usd ?? 0))}</p></div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Items</h3>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {items.map(i => (
                    <div key={i.id} className="flex justify-between p-2 text-sm">
                      <div><p>{i.name}</p><p className="text-xs text-muted-foreground capitalize">{i.item_type ?? "medicine"} • {i.quantity} × {fmtUSD(Number(i.price_usd))}</p></div>
                      <p className="font-medium">{fmtUSD(Number(i.total_usd))}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Payments</h3>
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {payments.length === 0 ? <p className="p-3 text-xs text-muted-foreground text-center">No payment records</p> :
                    payments.map(p => (
                      <div key={p.id} className="flex justify-between p-2 text-sm">
                        <div>
                          <p className="capitalize font-medium">{p.payment_method}{p.reference ? ` • ${p.reference}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                        </div>
                        <p className="font-semibold text-success">+{fmtUSD(Number(p.amount_usd))}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
