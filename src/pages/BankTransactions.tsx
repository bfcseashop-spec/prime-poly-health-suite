import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { fmtUSD, fmtKHR } from "@/lib/currency";
import { toast } from "sonner";

type Pay = { id: string; sale_id: string; amount_usd: number; payment_method: string; reference: string | null; paid_on: string };
type Manual = { id: string; txn_date: string; txn_type: string; bank_name: string; amount_usd: number; reference_no: string | null; description: string | null };

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

function getRange(r: string, from?: string, to?: string): { from: string; to: string } {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const today = d.toISOString().slice(0, 10);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  if (r === "today") return { from: today, to: today };
  if (r === "yesterday") { const y = new Date(d); y.setDate(d.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
  if (r === "7d") { const s = new Date(d); s.setDate(d.getDate() - 6); return { from: fmt(s), to: today }; }
  if (r === "30d") { const s = new Date(d); s.setDate(d.getDate() - 29); return { from: fmt(s), to: today }; }
  if (r === "month") { const s = new Date(d.getFullYear(), d.getMonth(), 1); return { from: fmt(s), to: today }; }
  if (r === "custom") return { from: from || today, to: to || today };
  return { from: "1970-01-01", to: today };
}

const palette: Record<string, { border: string; text: string; bg: string }> = {
  aba:        { border: "border-blue-300",    text: "text-blue-600",    bg: "bg-blue-50/60 dark:bg-blue-950/20" },
  acleda:     { border: "border-green-300",   text: "text-green-600",   bg: "bg-green-50/60 dark:bg-green-950/20" },
  cash:       { border: "border-yellow-300",  text: "text-yellow-600",  bg: "bg-yellow-50/60 dark:bg-yellow-950/20" },
  due:        { border: "border-orange-300",  text: "text-orange-600",  bg: "bg-orange-50/60 dark:bg-orange-950/20" },
  card:       { border: "border-purple-300",  text: "text-purple-600",  bg: "bg-purple-50/60 dark:bg-purple-950/20" },
  cash_aba:   { border: "border-indigo-300",  text: "text-indigo-600",  bg: "bg-indigo-50/60 dark:bg-indigo-950/20" },
  cash_acleda:{ border: "border-teal-300",    text: "text-teal-600",    bg: "bg-teal-50/60 dark:bg-teal-950/20" },
  default:    { border: "border-slate-300",   text: "text-slate-600",   bg: "bg-slate-50/60 dark:bg-slate-950/20" },
};

const prettyMethod = (m: string) => m.split(/[\s_]+/).map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
const colorKey = (m: string) => {
  const k = m.toLowerCase().replace(/\s+/g, "_");
  return palette[k] ? k : "default";
};

const FIXED_METHODS = ["aba", "acleda", "cash", "due", "card", "cash_and_aba", "cash_and_acleda"];

export default function BankTransactions() {
  const [range, setRange] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [pays, setPays] = useState<Pay[]>([]);
  const [sales, setSales] = useState<{ id: string; due_usd: number; created_at: string }[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ txn_date: new Date().toISOString().slice(0, 10), txn_type: "deposit", bank_name: "Cash", amount_usd: "", reference_no: "", description: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: m }] = await Promise.all([
      supabase.from("invoice_payments" as any).select("id, sale_id, amount_usd, payment_method, reference, paid_on").limit(5000),
      supabase.from("medicine_sales").select("id, due_usd, created_at, payment_method").limit(5000),
      supabase.from("bank_transactions").select("*").limit(2000),
    ]);
    setPays((p as any) || []);
    setSales((s as any) || []);
    setManuals((m as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const { from, to } = useMemo(() => getRange(range, customFrom, customTo), [range, customFrom, customTo]);

  const inRange = (date: string) => {
    const d = date.slice(0, 10);
    return d >= from && d <= to;
  };

  const filteredPays = useMemo(() => pays.filter(p => inRange(p.paid_on)), [pays, from, to]);
  const filteredSales = useMemo(() => sales.filter(s => inRange(s.created_at)), [sales, from, to]);
  const filteredManuals = useMemo(() => manuals.filter(m => inRange(m.txn_date)), [manuals, from, to]);

  const breakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    FIXED_METHODS.forEach(k => { map[k] = { amount: 0, count: 0 }; });
    filteredPays.forEach(p => {
      const k = (p.payment_method || "cash").toLowerCase().replace(/\s+/g, "_");
      if (!map[k]) map[k] = { amount: 0, count: 0 };
      map[k].amount += Number(p.amount_usd || 0);
      map[k].count += 1;
    });
    // due bucket: outstanding due across sales in range
    const dueAmt = filteredSales.reduce((a, s) => a + Number(s.due_usd || 0), 0);
    const dueCnt = filteredSales.filter(s => Number(s.due_usd || 0) > 0).length;
    map["due"] = { amount: dueAmt, count: dueCnt };
    // include manual entries as their own pseudo-method bucket
    filteredManuals.forEach(m => {
      const k = (m.bank_name || "manual").toLowerCase().replace(/\s+/g, "_");
      if (!map[k]) map[k] = { amount: 0, count: 0 };
      const sign = (m.txn_type === "withdrawal" || m.txn_type === "fee") ? -1 : 1;
      map[k].amount += sign * Number(m.amount_usd || 0);
      map[k].count += 1;
    });
    return map;
  }, [filteredPays, filteredSales, filteredManuals]);

  const totalRevenue = useMemo(() => filteredPays.reduce((a, p) => a + Number(p.amount_usd || 0), 0)
    + filteredManuals.reduce((a, m) => a + ((m.txn_type === "withdrawal" || m.txn_type === "fee") ? -1 : 1) * Number(m.amount_usd || 0), 0), [filteredPays, filteredManuals]);

  const totalTxn = filteredPays.length + filteredManuals.length;
  const avgTxn = totalTxn > 0 ? totalRevenue / totalTxn : 0;

  const save = async () => {
    if (!form.bank_name.trim() || !form.amount_usd) { toast.error("Bank/source and amount are required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("bank_transactions").insert({
      txn_date: form.txn_date,
      txn_type: form.txn_type,
      bank_name: form.bank_name.trim(),
      amount_usd: Number(form.amount_usd),
      reference_no: form.reference_no || null,
      description: form.description || null,
      created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Manual amount added");
    setOpen(false);
    setForm({ txn_date: new Date().toISOString().slice(0, 10), txn_type: "deposit", bank_name: "Cash", amount_usd: "", reference_no: "", description: "" });
    load();
  };

  const exportCSV = () => {
    const rows = [["Date", "Method/Bank", "Type", "Amount USD", "Reference", "Source"]];
    filteredPays.forEach(p => rows.push([p.paid_on, p.payment_method, "payment", String(p.amount_usd), p.reference || "", "invoice"]));
    filteredManuals.forEach(m => rows.push([m.txn_date, m.bank_name, m.txn_type, String(m.amount_usd), m.reference_no || "", "manual"]));
    const csv = rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bank-statement-${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cards = useMemo(() => {
    const keys = Object.keys(breakdown);
    // ensure consistent ordering: fixed first, then extras
    const order = [...FIXED_METHODS, ...keys.filter(k => !FIXED_METHODS.includes(k))];
    return order.filter(k => breakdown[k]).map(k => ({ key: k, ...breakdown[k] }));
  }, [breakdown]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bank Statement</h1>
          <p className="text-muted-foreground text-sm">Payment dashboard and sales breakdown by payment method</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white"><Plus className="h-4 w-4 mr-1" />Add Manual Amount</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Manual Amount</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.txn_date} onChange={e => setForm({ ...form, txn_date: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.txn_type} onValueChange={v => setForm({ ...form, txn_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["deposit", "withdrawal", "transfer", "fee", "interest"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Bank / Method</Label>
                  <Input list="bank-options" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="ABA, Acleda, Cash..." />
                  <datalist id="bank-options">
                    <option value="ABA" /><option value="Acleda" /><option value="Cash" /><option value="Card" /><option value="Cash and ABA" /><option value="Cash and Acleda" />
                  </datalist>
                </div>
                <div><Label>Amount (USD)</Label><Input type="number" step="0.01" value={form.amount_usd} onChange={e => setForm({ ...form, amount_usd: e.target.value })} /></div>
                <div><Label>Reference</Label><Input value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div>
                <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export Statement</Button>
        </div>
      </div>

      <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-100">
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter by Date Range</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label className="text-xs text-muted-foreground">Date Range</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {range === "custom" && (
              <>
                <div><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div>
                <div><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/40 dark:from-green-950/20 dark:to-emerald-950/10">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Revenue</div>
              <div className="text-3xl font-bold text-green-600 mt-1">{fmtUSD(totalRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{fmtKHR(totalRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-2">{filteredPays.length + filteredManuals.length} completed transactions</div>
            </div>
            <DollarSign className="h-6 w-6 text-green-500" />
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50/40 dark:from-blue-950/20 dark:to-cyan-950/10">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Transactions</div>
              <div className="text-3xl font-bold text-blue-600 mt-1">{totalTxn}</div>
              <div className="text-xs text-muted-foreground mt-1">Completed orders</div>
              <div className="text-xs text-muted-foreground mt-2">Avg: {fmtUSD(avgTxn)} per transaction</div>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-slate-50 to-rose-50/30 dark:from-slate-950/20 dark:to-rose-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Payment Dashboard</CardTitle>
          <p className="text-xs text-muted-foreground">Sales breakdown by payment method</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cards.map(c => {
                const col = palette[colorKey(c.key)];
                return (
                  <Card key={c.key} className={`border-2 ${col.border} ${col.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background/60">{prettyMethod(c.key)}</span>
                        <CreditCard className={`h-4 w-4 ${col.text}`} />
                      </div>
                      <div className={`text-2xl font-bold mt-3 ${col.text}`}>{fmtUSD(c.amount)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{fmtKHR(c.amount)}</div>
                      <div className="text-xs text-muted-foreground mt-2">{c.count} transaction{c.count === 1 ? "" : "s"}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
