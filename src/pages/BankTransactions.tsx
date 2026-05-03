import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Upload, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { fmtUSD } from "@/lib/currency";
import { toast } from "sonner";

type Txn = {
  id: string;
  txn_date: string;
  txn_type: string;
  bank_name: string;
  account_number: string | null;
  amount_usd: number;
  reference_no: string | null;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
};

const TYPES = ["deposit", "withdrawal", "transfer", "fee", "interest"];

const empty = {
  txn_date: new Date().toISOString().slice(0, 10),
  txn_type: "deposit",
  bank_name: "",
  account_number: "",
  amount_usd: "",
  reference_no: "",
  description: "",
  receipt_url: "",
};

export default function BankTransactions() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [filter, setFilter] = useState({ bank: "", type: "all", from: "", to: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bank_transactions").select("*").order("txn_date", { ascending: false }).limit(1000);
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (filter.bank && !r.bank_name.toLowerCase().includes(filter.bank.toLowerCase())) return false;
    if (filter.type !== "all" && r.txn_type !== filter.type) return false;
    if (filter.from && r.txn_date < filter.from) return false;
    if (filter.to && r.txn_date > filter.to) return false;
    return true;
  }), [rows, filter]);

  const totals = useMemo(() => {
    let inflow = 0, outflow = 0;
    filtered.forEach(r => {
      const a = Number(r.amount_usd || 0);
      if (r.txn_type === "deposit" || r.txn_type === "interest") inflow += a;
      else outflow += a;
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const handleImage = async (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("bank-receipts").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("bank-receipts").getPublicUrl(path);
    setForm(f => ({ ...f, receipt_url: data.publicUrl }));
    toast.success("Receipt uploaded");
  };

  const save = async () => {
    if (!form.bank_name.trim() || !form.amount_usd) {
      toast.error("Bank name and amount are required");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      txn_date: form.txn_date,
      txn_type: form.txn_type,
      bank_name: form.bank_name.trim(),
      account_number: form.account_number || null,
      amount_usd: Number(form.amount_usd),
      reference_no: form.reference_no || null,
      description: form.description || null,
      receipt_url: form.receipt_url || null,
      created_by: u.user?.id,
    };
    const { error } = await supabase.from("bank_transactions").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Transaction recorded");
    setOpen(false);
    setForm({ ...empty });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows(rs => rs.filter(r => r.id !== id));
  };

  const typeBadge = (t: string) => {
    const map: Record<string, string> = {
      deposit: "bg-green-500/10 text-green-700 dark:text-green-400",
      interest: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      withdrawal: "bg-red-500/10 text-red-700 dark:text-red-400",
      fee: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      transfer: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };
    return <Badge variant="outline" className={map[t] || ""}>{t}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Wallet className="h-7 w-7 text-primary" />Bank Transactions</h1>
          <p className="text-muted-foreground text-sm">Record and track all bank deposits, withdrawals, transfers and fees.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New Bank Transaction</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.txn_date} onChange={e => setForm({ ...form, txn_date: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.txn_type} onValueChange={v => setForm({ ...form, txn_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Bank Name *</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. ABA Bank" /></div>
                <div><Label>Account Number</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
                <div><Label>Amount (USD) *</Label><Input type="number" step="0.01" value={form.amount_usd} onChange={e => setForm({ ...form, amount_usd: e.target.value })} /></div>
                <div><Label>Reference / Cheque No.</Label><Input value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div>
                <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="col-span-2">
                  <Label>Receipt Image</Label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) await handleImage(f); if (fileRef.current) fileRef.current.value = ""; }} />
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Upload</Button>
                    {form.receipt_url && <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View uploaded</a>}
                  </div>
                  {form.receipt_url && <img src={form.receipt_url} alt="receipt" className="mt-2 max-h-40 rounded border" />}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter><Button onClick={save}>Save Transaction</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-green-600"><ArrowDownCircle className="h-4 w-4" />Total Inflow</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmtUSD(totals.inflow)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-600"><ArrowUpCircle className="h-4 w-4" />Total Outflow</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{fmtUSD(totals.outflow)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" />Net</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtUSD(totals.net)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Bank</Label><Input className="h-9 w-44" placeholder="Search bank" value={filter.bank} onChange={e => setFilter({ ...filter, bank: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={filter.type} onValueChange={v => setFilter({ ...filter, type: v })}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">From</Label><Input type="date" className="h-9" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" className="h-9" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} /></div>
            <Button variant="ghost" size="sm" onClick={() => setFilter({ bank: "", type: "all", from: "", to: "" })}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                  : filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.txn_date}</TableCell>
                      <TableCell>{typeBadge(r.txn_type)}</TableCell>
                      <TableCell className="font-medium">{r.bank_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.account_number || "—"}</TableCell>
                      <TableCell className="text-xs">{r.reference_no || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs">{r.description || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${(r.txn_type === "deposit" || r.txn_type === "interest") ? "text-green-600" : "text-red-600"}`}>
                        {(r.txn_type === "deposit" || r.txn_type === "interest") ? "+" : "-"}{fmtUSD(Number(r.amount_usd))}
                      </TableCell>
                      <TableCell>
                        {r.receipt_url ? <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs"><ImageIcon className="h-3 w-3" />View</a> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
