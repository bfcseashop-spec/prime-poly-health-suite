import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  PiggyBank, Receipt, CircleCheck, CircleAlert, Pencil, Trash2,
  Plus, Search, Calendar, Download, List, LayoutGrid, Eye, ImageIcon, X, Upload,
  Users, Tag, Settings2,
} from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))","hsl(217,91%,60%)","hsl(142,71%,45%)","hsl(38,92%,50%)",
  "hsl(280,65%,60%)","hsl(340,75%,55%)","hsl(190,80%,45%)","hsl(25,85%,55%)",
];

const COLOR_PRESETS = [
  { label: "Blue",    value: "bg-blue-500/10 text-blue-600 border-blue-500/20",       dot: "bg-blue-500" },
  { label: "Green",   value: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  { label: "Amber",   value: "bg-amber-500/10 text-amber-600 border-amber-500/20",     dot: "bg-amber-500" },
  { label: "Orange",  value: "bg-orange-500/10 text-orange-600 border-orange-500/20",  dot: "bg-orange-500" },
  { label: "Red",     value: "bg-red-500/10 text-red-600 border-red-500/20",           dot: "bg-red-500" },
  { label: "Pink",    value: "bg-pink-500/10 text-pink-600 border-pink-500/20",        dot: "bg-pink-500" },
  { label: "Purple",  value: "bg-purple-500/10 text-purple-600 border-purple-500/20",  dot: "bg-purple-500" },
  { label: "Indigo",  value: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",  dot: "bg-indigo-500" },
  { label: "Cyan",    value: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",        dot: "bg-cyan-500" },
  { label: "Primary", value: "bg-primary/10 text-primary border-primary/20",            dot: "bg-primary" },
  { label: "Neutral", value: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
];

const emptyShareholder = {
  id: "" as string,
  full_name: "", photo_url: "", phone: "", email: "",
  share_percent: "" as any, committed_capital_usd: "" as any,
  joined_on: "", notes: "", active: true,
};

const emptyContribution = {
  id: "" as string,
  shareholder_id: "",
  investment_name: "Capital Amount Investment",
  category: "Capital",
  amount_usd: "" as any,
  paid_on: format(new Date(), "yyyy-MM-dd"),
  payment_method: "cash",
  reference: "",
  notes: "",
  slip_url: "",
};

export default function Investment() {
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);

  const [shOpen, setShOpen] = useState(false);
  const [shForm, setShForm] = useState<typeof emptyShareholder>(emptyShareholder);

  const [capitalEditOpen, setCapitalEditOpen] = useState(false);
  const [capitalEdit, setCapitalEdit] = useState<{ id: string; name: string; amount: any }>({ id: "", name: "", amount: "" });

  const [cOpen, setCOpen] = useState(false);
  const [cForm, setCForm] = useState<typeof emptyContribution>(emptyContribution);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewSlip, setViewSlip] = useState<string | null>(null);
  const [deleteShId, setDeleteShId] = useState<string | null>(null);
  const [deleteCId, setDeleteCId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterInvestor, setFilterInvestor] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [view, setView] = useState<"list" | "grid">("list");

  const [categories, setCategories] = useState<any[]>([]);
  const [catMgrOpen, setCatMgrOpen] = useState(false);
  const [catForm, setCatForm] = useState<{ id: string; name: string; color: string }>({ id: "", name: "", color: COLOR_PRESETS[0].value });
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [investorMgrOpen, setInvestorMgrOpen] = useState(false);

  const CATEGORY_TONE = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach(c => { m[c.name] = c.color || "bg-muted text-muted-foreground border-border"; });
    return m;
  }, [categories]);
  const CATEGORIES = useMemo(() => categories.map(c => c.name), [categories]);

  const load = async () => {
    const [s, c, cat] = await Promise.all([
      (supabase.from("shareholders" as any) as any).select("*").order("created_at"),
      (supabase.from("shareholder_contributions" as any) as any).select("*").order("paid_on", { ascending: false }),
      (supabase.from("investment_categories" as any) as any).select("*").order("name"),
    ]);
    if (s.error) toast.error(s.error.message);
    setShareholders(s.data ?? []);
    setContributions(c.data ?? []);
    setCategories(cat.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const paidByShareholder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contributions) map[c.shareholder_id] = (map[c.shareholder_id] || 0) + Number(c.amount_usd || 0);
    return map;
  }, [contributions]);

  const totals = useMemo(() => {
    const totalCommitted = shareholders.reduce((s, x) => s + Number(x.committed_capital_usd || 0), 0);
    const totalPaid = contributions.reduce((s, x) => s + Number(x.amount_usd || 0), 0);
    return {
      totalCommitted,
      totalPaid,
      remaining: Math.max(0, totalCommitted - totalPaid),
      contribCount: contributions.length,
      count: shareholders.length,
    };
  }, [shareholders, contributions]);

  const months = useMemo(() => {
    const set = new Set<string>();
    contributions.forEach(c => set.add(format(new Date(c.paid_on), "yyyy-MM")));
    return Array.from(set).sort().reverse();
  }, [contributions]);

  const filteredContrib = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contributions.filter(c => {
      if (filterInvestor !== "all" && c.shareholder_id !== filterInvestor) return false;
      if (filterCategory !== "all" && (c.category || "Capital") !== filterCategory) return false;
      if (filterMonth !== "all" && format(new Date(c.paid_on), "yyyy-MM") !== filterMonth) return false;
      if (q) {
        const sh = shareholders.find(s => s.id === c.shareholder_id);
        const blob = `${sh?.full_name ?? ""} ${c.investment_name ?? ""} ${c.category ?? ""} ${c.notes ?? ""} ${c.reference ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [contributions, search, filterMonth, filterInvestor, filterCategory, shareholders]);

  const statusOf = (committed: number, paid: number) => {
    if (committed <= 0) return { label: "Pending", tone: "bg-muted text-muted-foreground border-border" };
    if (paid >= committed) return { label: "Paid", tone: "bg-success/15 text-success border-success/30" };
    if (paid <= 0) return { label: "Due", tone: "bg-warning/15 text-warning border-warning/30" };
    return { label: "Due", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  };

  // ===== Shareholder CRUD =====
  const openNewSh = () => { setShForm(emptyShareholder); setShOpen(true); };
  const openEditSh = (s: any) => {
    setShForm({
      id: s.id, full_name: s.full_name ?? "", photo_url: s.photo_url ?? "",
      phone: s.phone ?? "", email: s.email ?? "",
      share_percent: s.share_percent ?? "", committed_capital_usd: s.committed_capital_usd ?? "",
      joined_on: s.joined_on ?? "", notes: s.notes ?? "", active: s.active ?? true,
    });
    setShOpen(true);
  };
  const submitSh = async () => {
    if (!shForm.full_name.trim()) return toast.error("Name is required");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      full_name: shForm.full_name.trim(),
      photo_url: shForm.photo_url || null,
      phone: shForm.phone || null,
      email: shForm.email || null,
      share_percent: shForm.share_percent === "" ? 0 : Number(shForm.share_percent),
      committed_capital_usd: shForm.committed_capital_usd === "" ? 0 : Number(shForm.committed_capital_usd),
      joined_on: shForm.joined_on || null,
      notes: shForm.notes || null,
      active: shForm.active,
    };
    let error;
    if (shForm.id) ({ error } = await (supabase.from("shareholders" as any) as any).update(payload).eq("id", shForm.id));
    else { payload.created_by = u.user?.id ?? null; ({ error } = await (supabase.from("shareholders" as any) as any).insert(payload)); }
    if (error) return toast.error(error.message);
    toast.success(shForm.id ? "Shareholder updated" : "Shareholder added");
    setShOpen(false); load();
  };
  const confirmDeleteSh = async () => {
    if (!deleteShId) return;
    await (supabase.from("shareholder_contributions" as any) as any).delete().eq("shareholder_id", deleteShId);
    const { error } = await (supabase.from("shareholders" as any) as any).delete().eq("id", deleteShId);
    if (error) return toast.error(error.message);
    toast.success("Shareholder removed"); setDeleteShId(null); load();
  };

  // ===== Capital quick edit =====
  const openCapitalEdit = (s: any) => {
    setCapitalEdit({ id: s.id, name: s.full_name, amount: s.committed_capital_usd ?? "" });
    setCapitalEditOpen(true);
  };
  const saveCapital = async () => {
    const amt = capitalEdit.amount === "" ? 0 : Number(capitalEdit.amount);
    if (isNaN(amt) || amt < 0) return toast.error("Enter a valid amount");
    const { error } = await (supabase.from("shareholders" as any) as any)
      .update({ committed_capital_usd: amt }).eq("id", capitalEdit.id);
    if (error) return toast.error(error.message);
    toast.success("Capital updated");
    setCapitalEditOpen(false); load();
  };

  // ===== Contribution CRUD =====
  const openNewC = (shareholderId?: string) => {
    setCForm({ ...emptyContribution, shareholder_id: shareholderId || (shareholders[0]?.id ?? "") });
    setCOpen(true);
  };
  const openEditC = (c: any) => {
    setCForm({
      id: c.id,
      shareholder_id: c.shareholder_id,
      investment_name: c.investment_name || "Capital Amount Investment",
      category: c.category || "Capital",
      amount_usd: c.amount_usd ?? "",
      paid_on: c.paid_on,
      payment_method: c.payment_method || "cash",
      reference: c.reference ?? "",
      notes: c.notes ?? "",
      slip_url: c.slip_url ?? "",
    });
    setCOpen(true);
  };
  const handleSlipUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("investment-slips").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("investment-slips").getPublicUrl(path);
      setCForm(f => ({ ...f, slip_url: data.publicUrl }));
      toast.success("Slip uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };
  const submitC = async () => {
    if (!cForm.shareholder_id) return toast.error("Select investor");
    const amt = Number(cForm.amount_usd);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      shareholder_id: cForm.shareholder_id,
      investment_name: cForm.investment_name || "Capital Amount Investment",
      category: cForm.category || "Capital",
      amount_usd: amt,
      paid_on: cForm.paid_on,
      payment_method: cForm.payment_method,
      reference: cForm.reference || null,
      notes: cForm.notes || null,
      slip_url: cForm.slip_url || null,
    };
    let error;
    if (cForm.id) ({ error } = await (supabase.from("shareholder_contributions" as any) as any).update(payload).eq("id", cForm.id));
    else { payload.created_by = u.user?.id ?? null; ({ error } = await (supabase.from("shareholder_contributions" as any) as any).insert(payload)); }
    if (error) return toast.error(error.message);
    toast.success(cForm.id ? "Contribution updated" : "Contribution recorded");
    setCOpen(false); load();
  };
  const confirmDeleteC = async () => {
    if (!deleteCId) return;
    const { error } = await (supabase.from("shareholder_contributions" as any) as any).delete().eq("id", deleteCId);
    if (error) return toast.error(error.message);
    toast.success("Contribution removed"); setDeleteCId(null); load();
  };

  // ===== Export CSV =====
  const exportCSV = () => {
    const rows = [["Date","Investment","Investor","Category","Amount","Method","Reference","Note"]];
    filteredContrib.forEach(c => {
      const sh = shareholders.find(s => s.id === c.shareholder_id);
      rows.push([
        format(new Date(c.paid_on), "yyyy-MM-dd"),
        c.investment_name || "",
        sh?.full_name || "",
        c.category || "",
        String(c.amount_usd || 0),
        c.payment_method || "",
        c.reference || "",
        (c.notes || "").replace(/[\n,]/g, " "),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `contributions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Investment Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Capital, shares & contribution tracking</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Capital</p>
                <p className="text-2xl font-bold mt-1">{fmtUSD(totals.totalCommitted)}</p>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-primary p-1" title="Edit (use cards below)">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contributions</p>
                <p className="text-2xl font-bold mt-1">{fmtUSD(totals.totalPaid)}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{totals.contribCount} records</span>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CircleCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold mt-1 text-success">{fmtUSD(totals.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <CircleAlert className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold mt-1 text-warning">{fmtUSD(totals.remaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAPITAL & SHARE */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Capital & Share</h2>
            <p className="text-xs text-muted-foreground">Investor shares per investment — create, edit, or remove below</p>
          </div>
          <Button onClick={openNewSh} className="clinic-gradient text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" />Add Capital
          </Button>
        </div>

        {shareholders.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No shareholders yet. Click "Add Capital" to begin.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {shareholders.map((s, idx) => {
              const committed = Number(s.committed_capital_usd || 0);
              const paid = paidByShareholder[s.id] || 0;
              const remaining = Math.max(0, committed - paid);
              const pct = committed > 0 ? Math.min(100, (paid / committed) * 100) : 0;
              const st = statusOf(committed, paid);
              return (
                <Card key={s.id} className="shadow-soft hover:shadow-card transition-all">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}>
                          <AvatarImage src={s.photo_url || undefined} />
                          <AvatarFallback className="text-primary-foreground font-semibold" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}>
                            {s.full_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{Number(s.share_percent || 0)}% share</Badge>
                            <span className="text-[11px] text-muted-foreground truncate">Capital Amount Investm…</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={cn("text-[10px]", st.tone)}>{st.label}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditSh(s)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteShId(s.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Payment Progress</span>
                        <span className="font-semibold">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Capital Amount</p>
                        <p className="font-bold mt-0.5">{fmtUSD(committed)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Paid</p>
                        <p className="font-bold mt-0.5 text-success">{fmtUSD(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Due Investment</p>
                        <p className="font-bold mt-0.5 text-warning">{fmtUSD(remaining)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Payable Amount</p>
                        <p className="font-bold mt-0.5 text-destructive">{fmtUSD(remaining)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openCapitalEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit Capital
                      </Button>
                      <Button size="sm" className="flex-1 clinic-gradient text-primary-foreground" onClick={() => openNewC(s.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />Add Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTRIBUTIONS */}
      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-bold">Contributions</p>
                <p className="text-xs text-muted-foreground">Payment history for all investments</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Filter by Month</div>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m+"-01"), "MMM yyyy")}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by investor, inves…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-[220px]" />
              </div>
              <Select value={filterInvestor} onValueChange={setFilterInvestor}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investors</SelectItem>
                  {shareholders.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-md">
                <Button size="icon" variant={view === "list" ? "secondary" : "ghost"} className="h-9 w-9 rounded-r-none" onClick={() => setView("list")}>
                  <List className="h-4 w-4" />
                </Button>
                <Button size="icon" variant={view === "grid" ? "secondary" : "ghost"} className="h-9 w-9 rounded-l-none" onClick={() => setView("grid")}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" />Export
              </Button>
              <Button size="sm" className="h-9 clinic-gradient text-primary-foreground" onClick={() => openNewC()}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </div>

          {view === "list" ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Investment</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContrib.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No contributions</TableCell></TableRow>
                  ) : filteredContrib.map(c => {
                    const sh = shareholders.find(s => s.id === c.shareholder_id);
                    const cat = c.category || "Capital";
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{format(new Date(c.paid_on), "yyyy-MM-dd")}</TableCell>
                        <TableCell className="text-sm">{c.investment_name || "Capital Amount Investment"}</TableCell>
                        <TableCell className="text-sm font-medium">{sh?.full_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[11px]", CATEGORY_TONE[cat] || CATEGORY_TONE.Other)}>{cat}</Badge></TableCell>
                        <TableCell className="text-right font-semibold text-success">{fmtUSD(Number(c.amount_usd))}</TableCell>
                        <TableCell>
                          {c.slip_url ? (
                            <button onClick={() => setViewSlip(c.slip_url)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <ImageIcon className="h-3.5 w-3.5" />1
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{c.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {c.slip_url && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewSlip(c.slip_url)} title="View slip">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditC(c)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCId(c.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContrib.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground text-sm">No contributions</div>
              ) : filteredContrib.map(c => {
                const sh = shareholders.find(s => s.id === c.shareholder_id);
                const cat = c.category || "Capital";
                return (
                  <Card key={c.id} className="shadow-soft">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn("text-[10px]", CATEGORY_TONE[cat] || CATEGORY_TONE.Other)}>{cat}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(c.paid_on), "MMM dd, yyyy")}</span>
                      </div>
                      <p className="font-semibold text-lg text-success">{fmtUSD(Number(c.amount_usd))}</p>
                      <p className="text-sm font-medium">{sh?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.investment_name}</p>
                      {c.notes && <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                      <div className="flex items-center justify-between pt-2">
                        {c.slip_url ? (
                          <button onClick={() => setViewSlip(c.slip_url)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ImageIcon className="h-3.5 w-3.5" />Slip
                          </button>
                        ) : <span />}
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditC(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SHAREHOLDER ADD/EDIT */}
      <Dialog open={shOpen} onOpenChange={setShOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{shForm.id ? "Edit Shareholder" : "Add Capital / Shareholder"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div className="space-y-2 md:col-span-2"><Label>Full Name *</Label><Input value={shForm.full_name} onChange={e => setShForm({ ...shForm, full_name: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Photo URL</Label><Input value={shForm.photo_url} onChange={e => setShForm({ ...shForm, photo_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={shForm.phone} onChange={e => setShForm({ ...shForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={shForm.email} onChange={e => setShForm({ ...shForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Share % *</Label><Input type="number" min={0} max={100} step="0.01" value={shForm.share_percent} onChange={e => setShForm({ ...shForm, share_percent: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capital Amount (USD) *</Label><Input type="number" min={0} step="0.01" value={shForm.committed_capital_usd} onChange={e => setShForm({ ...shForm, committed_capital_usd: e.target.value })} /></div>
            <div className="space-y-2"><Label>Joined On</Label><Input type="date" value={shForm.joined_on} onChange={e => setShForm({ ...shForm, joined_on: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={shForm.active ? "active" : "inactive"} onValueChange={v => setShForm({ ...shForm, active: v === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={shForm.notes} onChange={e => setShForm({ ...shForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShOpen(false)}>Cancel</Button>
            <Button onClick={submitSh} className="clinic-gradient text-primary-foreground">{shForm.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CAPITAL QUICK EDIT */}
      <Dialog open={capitalEditOpen} onOpenChange={setCapitalEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Capital — {capitalEdit.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Capital Amount (USD)</Label>
            <Input type="number" min={0} step="0.01" value={capitalEdit.amount}
              onChange={e => setCapitalEdit({ ...capitalEdit, amount: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapitalEditOpen(false)}>Cancel</Button>
            <Button onClick={saveCapital} className="clinic-gradient text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONTRIBUTION ADD/EDIT */}
      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{cForm.id ? "Edit Contribution" : "Add Contribution"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2 py-2">
            <div className="space-y-2">
              <Label>Investor *</Label>
              <Select value={cForm.shareholder_id} onValueChange={v => setCForm({ ...cForm, shareholder_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>
                  {shareholders.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Investment Name</Label>
              <Input value={cForm.investment_name} onChange={e => setCForm({ ...cForm, investment_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={cForm.category} onValueChange={v => setCForm({ ...cForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (USD) *</Label>
              <Input type="number" min={0} step="0.01" value={cForm.amount_usd} onChange={e => setCForm({ ...cForm, amount_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={cForm.paid_on} onChange={e => setCForm({ ...cForm, paid_on: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={cForm.payment_method} onValueChange={v => setCForm({ ...cForm, payment_method: v })}>
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
            <div className="space-y-2 md:col-span-2">
              <Label>Reference</Label>
              <Input value={cForm.reference} onChange={e => setCForm({ ...cForm, reference: e.target.value })} placeholder="Txn ID / Cheque #" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Note</Label>
              <Textarea rows={2} value={cForm.notes} onChange={e => setCForm({ ...cForm, notes: e.target.value })} placeholder="e.g. Salary of March 2026" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Slip / Receipt</Label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={e => e.target.files?.[0] && handleSlipUpload(e.target.files[0])} />
              {cForm.slip_url ? (
                <div className="flex items-center gap-2 p-2 border rounded-md">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <a href={cForm.slip_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex-1">View uploaded slip</a>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCForm({ ...cForm, slip_url: "" })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading..." : "Upload Slip"}
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCOpen(false)}>Cancel</Button>
            <Button onClick={submitC} className="clinic-gradient text-primary-foreground">{cForm.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLIP VIEWER */}
      <Dialog open={!!viewSlip} onOpenChange={o => !o && setViewSlip(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Slip / Receipt</DialogTitle></DialogHeader>
          {viewSlip && (
            viewSlip.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewSlip} className="w-full h-[70vh]" />
            ) : (
              <img src={viewSlip} alt="Slip" className="w-full max-h-[70vh] object-contain rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteShId} onOpenChange={(o) => !o && setDeleteShId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this shareholder?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the shareholder and all their contribution records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSh} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCId} onOpenChange={(o) => !o && setDeleteCId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contribution?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteC} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
