import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtUSD } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, Users, CircleCheck, CircleAlert, Clock,
  Plus, Pencil, Trash2, DollarSign, History,
} from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(190, 80%, 45%)",
  "hsl(25, 85%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(260, 70%, 60%)",
];

const emptyShareholder = {
  id: "" as string,
  full_name: "", photo_url: "", phone: "", email: "",
  share_percent: "" as any, committed_capital_usd: "" as any,
  joined_on: "", notes: "", active: true,
};

export default function Investment() {
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyShareholder>(emptyShareholder);
  const [payOpen, setPayOpen] = useState(false);
  const [payFor, setPayFor] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ amount_usd: "" as any, paid_on: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", reference: "", notes: "" });
  const [historyFor, setHistoryFor] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const [s, c] = await Promise.all([
      (supabase.from("shareholders" as any) as any).select("*").order("created_at"),
      (supabase.from("shareholder_contributions" as any) as any).select("*").order("paid_on", { ascending: false }),
    ]);
    if (s.error) toast.error(s.error.message);
    setShareholders(s.data ?? []);
    setContributions(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const paidByShareholder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contributions) {
      map[c.shareholder_id] = (map[c.shareholder_id] || 0) + Number(c.amount_usd || 0);
    }
    return map;
  }, [contributions]);

  const totals = useMemo(() => {
    const totalCommitted = shareholders.reduce((s, x) => s + Number(x.committed_capital_usd || 0), 0);
    const totalPaid = contributions.reduce((s, x) => s + Number(x.amount_usd || 0), 0);
    const totalShare = shareholders.reduce((s, x) => s + Number(x.share_percent || 0), 0);
    return { totalCommitted, totalPaid, remaining: Math.max(0, totalCommitted - totalPaid), totalShare, count: shareholders.length };
  }, [shareholders, contributions]);

  const pieData = useMemo(
    () => shareholders.map(s => ({ name: s.full_name, value: Number(s.share_percent || 0) })).filter(d => d.value > 0),
    [shareholders],
  );

  const statusOf = (committed: number, paid: number) => {
    if (committed <= 0) return { label: "Pending", tone: "bg-muted text-muted-foreground border-border", icon: Clock };
    if (paid <= 0) return { label: "Pending", tone: "bg-warning/15 text-warning border-warning/30", icon: Clock };
    if (paid >= committed) return { label: "Fully Paid", tone: "bg-success/15 text-success border-success/30", icon: CircleCheck };
    return { label: "Partially Paid", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: CircleAlert };
  };

  const openNew = () => { setForm(emptyShareholder); setOpen(true); };
  const openEdit = (s: any) => {
    setForm({
      id: s.id, full_name: s.full_name ?? "", photo_url: s.photo_url ?? "",
      phone: s.phone ?? "", email: s.email ?? "",
      share_percent: s.share_percent ?? "", committed_capital_usd: s.committed_capital_usd ?? "",
      joined_on: s.joined_on ?? "", notes: s.notes ?? "", active: s.active ?? true,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      full_name: form.full_name.trim(),
      photo_url: form.photo_url || null,
      phone: form.phone || null,
      email: form.email || null,
      share_percent: form.share_percent === "" ? 0 : Number(form.share_percent),
      committed_capital_usd: form.committed_capital_usd === "" ? 0 : Number(form.committed_capital_usd),
      joined_on: form.joined_on || null,
      notes: form.notes || null,
      active: form.active,
    };
    let error;
    if (form.id) {
      ({ error } = await (supabase.from("shareholders" as any) as any).update(payload).eq("id", form.id));
    } else {
      payload.created_by = u.user?.id ?? null;
      ({ error } = await (supabase.from("shareholders" as any) as any).insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Shareholder updated" : "Shareholder added");
    setOpen(false);
    load();
  };

  const openPay = (s: any) => {
    setPayFor(s);
    setPayForm({ amount_usd: "", paid_on: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", reference: "", notes: "" });
    setPayOpen(true);
  };

  const submitPay = async () => {
    if (!payFor) return;
    const amt = Number(payForm.amount_usd);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("shareholder_contributions" as any) as any).insert({
      shareholder_id: payFor.id,
      amount_usd: amt,
      paid_on: payForm.paid_on,
      payment_method: payForm.payment_method,
      reference: payForm.reference || null,
      notes: payForm.notes || null,
      created_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Recorded ${fmtUSD(amt)} from ${payFor.full_name}`);
    setPayOpen(false);
    setPayFor(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await (supabase.from("shareholder_contributions" as any) as any).delete().eq("shareholder_id", deleteId);
    const { error } = await (supabase.from("shareholders" as any) as any).delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Shareholder removed");
    setDeleteId(null);
    load();
  };

  const KPI = ({ icon: Icon, label, value, hint, tone }: any) => {
    const tones: Record<string, string> = {
      primary: "from-primary/15 to-primary/5 text-primary",
      success: "from-success/15 to-success/5 text-success",
      warning: "from-warning/15 to-warning/5 text-warning",
      danger: "from-destructive/15 to-destructive/5 text-destructive",
    };
    return (
      <Card className="shadow-soft overflow-hidden">
        <CardContent className={cn("p-5 bg-gradient-to-br", tones[tone])}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
              <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
              {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            </div>
            <div className="h-11 w-11 rounded-xl bg-background/80 flex items-center justify-center shadow-soft">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const historyRows = useMemo(
    () => historyFor ? contributions.filter(c => c.shareholder_id === historyFor.id) : [],
    [historyFor, contributions],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Investment Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Clinic capital, shareholders & contribution tracking</p>
        </div>
        <Button onClick={openNew} className="clinic-gradient text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />Add Shareholder
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPI icon={Wallet} label="Total Capital" value={fmtUSD(totals.totalCommitted)} hint="committed by all" tone="primary" />
        <KPI icon={CircleCheck} label="Total Paid" value={fmtUSD(totals.totalPaid)} hint={`${totals.totalCommitted ? ((totals.totalPaid/totals.totalCommitted)*100).toFixed(0) : 0}% collected`} tone="success" />
        <KPI icon={CircleAlert} label="Remaining" value={fmtUSD(totals.remaining)} hint="still due" tone="warning" />
        <KPI icon={Users} label="Shareholders" value={totals.count} hint={`${totals.totalShare.toFixed(1)}% allocated`} tone={totals.totalShare > 100 ? "danger" : "primary"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PIE CHART */}
        <Card className="shadow-soft lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Share Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Users className="h-10 w-10 mb-2 opacity-40" />
                Add shareholders to see distribution
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      label={(e: any) => `${e.value.toFixed(1)}%`}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip
                      formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {totals.totalShare !== 100 && totals.count > 0 && (
              <p className={cn("text-xs text-center mt-2", totals.totalShare > 100 ? "text-destructive" : "text-warning")}>
                ⚠ Allocated shares total {totals.totalShare.toFixed(2)}% (should equal 100%)
              </p>
            )}
          </CardContent>
        </Card>

        {/* SHAREHOLDER CARDS */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {shareholders.length === 0 && (
            <Card className="shadow-soft sm:col-span-2">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No shareholders yet. Click "Add Shareholder" to begin.
              </CardContent>
            </Card>
          )}
          {shareholders.map((s, idx) => {
            const committed = Number(s.committed_capital_usd || 0);
            const paid = paidByShareholder[s.id] || 0;
            const remaining = Math.max(0, committed - paid);
            const pct = committed > 0 ? Math.min(100, (paid / committed) * 100) : 0;
            const st = statusOf(committed, paid);
            const SIcon = st.icon;
            const shareAmount = (Number(s.share_percent || 0) / 100) * totals.totalCommitted;
            return (
              <Card key={s.id} className="shadow-soft hover:shadow-card transition-all overflow-hidden">
                <div className="h-1.5" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-soft">
                        <AvatarImage src={s.photo_url || undefined} />
                        <AvatarFallback className="font-semibold">
                          {s.full_name?.split(" ").map((p: string) => p[0]).slice(0,2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.phone || s.email || "No contact info"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap", st.tone)}>
                      <SIcon className="h-3 w-3" />{st.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                      <p className="text-[10px] uppercase font-semibold text-primary">Share</p>
                      <p className="text-lg font-bold">{Number(s.share_percent || 0).toFixed(2)}%</p>
                      <p className="text-[10px] text-muted-foreground">{fmtUSD(shareAmount)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50 border">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Committed</p>
                      <p className="text-lg font-bold">{fmtUSD(committed)}</p>
                      <p className="text-[10px] text-muted-foreground">total capital</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold">{fmtUSD(paid)} <span className="text-muted-foreground font-normal">/ {fmtUSD(committed)}</span></span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{pct.toFixed(0)}% complete</span>
                      <span className={cn("font-semibold", remaining > 0 ? "text-warning" : "text-success")}>
                        {remaining > 0 ? `${fmtUSD(remaining)} remaining` : "Settled"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" className="flex-1 clinic-gradient text-primary-foreground" onClick={() => openPay(s)}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" />Add Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setHistoryFor(s)} title="History">
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ADD/EDIT */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Shareholder" : "Add Shareholder"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Photo URL</Label>
              <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Share % *</Label>
              <Input type="number" min={0} max={100} step="0.01" value={form.share_percent} onChange={e => setForm({ ...form, share_percent: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Committed Capital (USD) *</Label>
              <Input type="number" min={0} step="0.01" value={form.committed_capital_usd} onChange={e => setForm({ ...form, committed_capital_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Joined On</Label>
              <Input type="date" value={form.joined_on} onChange={e => setForm({ ...form, joined_on: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.active ? "active" : "inactive"} onValueChange={v => setForm({ ...form, active: v === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="clinic-gradient text-primary-foreground">{form.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAYMENT */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Contribution</DialogTitle></DialogHeader>
          {payFor && (() => {
            const committed = Number(payFor.committed_capital_usd || 0);
            const paid = paidByShareholder[payFor.id] || 0;
            const remaining = Math.max(0, committed - paid);
            return (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                  <Avatar><AvatarImage src={payFor.photo_url || undefined} /><AvatarFallback>{payFor.full_name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{payFor.full_name}</p>
                    <p className="text-xs text-muted-foreground">Remaining: <span className="font-semibold text-warning">{fmtUSD(remaining)}</span></p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount (USD) *</Label>
                    <Input type="number" min={0} step="0.01" value={payForm.amount_usd} onChange={e => setPayForm({ ...payForm, amount_usd: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid On *</Label>
                    <Input type="date" value={payForm.paid_on} onChange={e => setPayForm({ ...payForm, paid_on: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Txn ID / Cheque #" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={submitPay} className="clinic-gradient text-primary-foreground">Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HISTORY */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />Contribution History
            </DialogTitle>
          </DialogHeader>
          {historyFor && (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{historyFor.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Total paid: <span className="font-semibold text-foreground">{fmtUSD(paidByShareholder[historyFor.id] || 0)}</span> of {fmtUSD(Number(historyFor.committed_capital_usd || 0))}
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No contributions yet</TableCell></TableRow>
                    ) : historyRows.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{format(new Date(c.paid_on), "PP")}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.payment_method.replace("_"," ")}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.reference || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtUSD(Number(c.amount_usd))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryFor(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this shareholder?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the shareholder and all their contribution records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
