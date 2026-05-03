import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Wallet, CheckCircle2, AlertCircle, Clock, Receipt } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENTS = [
  { value: "cash", label: "Cash" }, { value: "aba", label: "ABA Bank" },
  { value: "acleda", label: "ACLEDA Bank" }, { value: "paypal", label: "PayPal" }, { value: "visa", label: "Card" },
];

export default function DueManagement() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("due");
  const [q, setQ] = useState("");
  const [openSale, setOpenSale] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");

  const load = async () => {
    const { data } = await supabase.from("medicine_sales").select("*").order("created_at", { ascending: false }).limit(500);
    setSales(data ?? []);
    const ids = Array.from(new Set((data ?? []).map(s => s.patient_id).filter(Boolean)));
    if (ids.length) {
      const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code, phone").in("id", ids as string[]);
      const map: Record<string, any> = {};
      (pts ?? []).forEach(p => { map[p.id] = p; });
      setPatients(map);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return sales.filter(s => {
      if (tab === "due" && s.status === "paid") return false;
      if (tab === "paid" && s.status !== "paid") return false;
      if (!q) return true;
      const p = s.patient_id ? patients[s.patient_id] : null;
      const text = `${s.invoice_no} ${p?.full_name ?? ""} ${p?.patient_code ?? ""} ${p?.phone ?? ""}`.toLowerCase();
      return text.includes(q.toLowerCase());
    });
  }, [sales, tab, q, patients]);

  const totals = useMemo(() => {
    const dueList = sales.filter(s => s.status !== "paid");
    return {
      outstanding: dueList.reduce((a, s) => a + Number(s.due_usd ?? 0), 0),
      count: dueList.length,
      collected: sales.reduce((a, s) => a + Number(s.amount_paid_usd ?? 0), 0),
    };
  }, [sales]);

  const openInvoice = async (sale: any) => {
    setOpenSale(sale);
    setPayAmount(Number(sale.due_usd ?? 0));
    setPayMethod("cash");
    setPayRef("");
    const [p, i] = await Promise.all([
      supabase.from("invoice_payments" as any).select("*").eq("sale_id", sale.id).order("created_at"),
      supabase.from("medicine_sale_items").select("*").eq("sale_id", sale.id),
    ]);
    setPayments((p.data as any[]) ?? []);
    setItems(i.data ?? []);
  };

  const recordPayment = async () => {
    if (!openSale) return;
    const amt = Number(payAmount);
    const due = Number(openSale.due_usd ?? 0);
    if (amt <= 0) return toast.error("Amount must be greater than 0");
    if (amt > due + 0.01) return toast.error(`Cannot exceed due ${fmtUSD(due)}`);

    const { error: pErr } = await supabase.from("invoice_payments" as any).insert({
      sale_id: openSale.id, amount_usd: amt, payment_method: payMethod, reference: payRef || null, created_by: user?.id,
    });
    if (pErr) return toast.error(pErr.message);

    const newPaid = Number(openSale.amount_paid_usd ?? 0) + amt;
    const newDue = +(Number(openSale.total_usd) - newPaid).toFixed(2);
    const newStatus = newDue < 0.01 ? "paid" : "partial";
    const { error: uErr } = await supabase.from("medicine_sales").update({
      amount_paid_usd: newPaid, due_usd: Math.max(0, newDue), status: newStatus,
    } as any).eq("id", openSale.id);
    if (uErr) return toast.error(uErr.message);

    toast.success(newStatus === "paid" ? "Invoice fully paid ✓" : `Partial payment recorded — ${fmtUSD(newDue)} remaining`);
    setOpenSale(null);
    load();
  };

  const StatusBadge = ({ s }: { s: string }) => {
    const map: any = {
      paid: { v: "default", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
      partial: { v: "secondary", icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" },
      due: { v: "destructive", icon: AlertCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    };
    const m = map[s] ?? map.due; const Icon = m.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.cls}`}><Icon className="h-3 w-3" />{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Wallet className="h-7 w-7 text-primary" />Due Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">Track outstanding balances and record payments</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-soft"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-destructive mt-1">{fmtUSD(totals.outstanding)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.count} unpaid invoice(s)</p>
        </CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-success mt-1">{fmtUSD(totals.collected)}</p>
        </CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-bold mt-1">{sales.length}</p>
        </CardContent></Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="due">Outstanding</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoice / patient…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No invoices</TableCell></TableRow> :
                filtered.map(s => {
                  const p = s.patient_id ? patients[s.patient_id] : null;
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-accent/40" onClick={() => openInvoice(s)}>
                      <TableCell className="font-mono text-sm">{s.invoice_no}</TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{p ? `${p.patient_code} — ${p.full_name}` : <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(s.total_usd))}</TableCell>
                      <TableCell className="text-right text-success">{fmtUSD(Number(s.amount_paid_usd ?? 0))}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{Number(s.due_usd) > 0 ? fmtUSD(Number(s.due_usd)) : "—"}</TableCell>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{openSale?.invoice_no}</DialogTitle>
          </DialogHeader>
          {openSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{fmtUSD(Number(openSale.total_usd))}</p></div>
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-success">{fmtUSD(Number(openSale.amount_paid_usd ?? 0))}</p></div>
                <div><p className="text-xs text-muted-foreground">Due</p><p className="font-semibold text-destructive">{fmtUSD(Number(openSale.due_usd ?? 0))}</p></div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Items</h3>
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {items.map(i => (
                    <div key={i.id} className="flex justify-between p-2 text-sm">
                      <div><p>{i.name}</p><p className="text-xs text-muted-foreground capitalize">{i.item_type ?? "medicine"} • {i.quantity} × {fmtUSD(Number(i.price_usd))}</p></div>
                      <p className="font-medium">{fmtUSD(Number(i.total_usd))}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Payment History</h3>
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {payments.length === 0 ? <p className="p-3 text-xs text-muted-foreground text-center">No payments yet</p> :
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

              {Number(openSale.due_usd ?? 0) > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-semibold">Record Payment</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Method</Label>
                      <Select value={payMethod} onValueChange={setPayMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Reference</Label><Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Txn / cheque #" /></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSale(null)}>Close</Button>
            {openSale && Number(openSale.due_usd ?? 0) > 0 && <Button onClick={recordPayment}>Record Payment</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
