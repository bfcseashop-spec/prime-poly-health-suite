import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Search, ShieldCheck, CalendarIcon, CreditCard, LayoutGrid, List, Crown, Gem, Star, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtUSD } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";

type Tier = "normal" | "silver" | "gold" | "vip";
const TIERS: Tier[] = ["normal", "silver", "gold", "vip"];

const TIER_CONFIG: Record<Tier, { label: string; defaultDiscount: number; defaultCoverage: number; gradient: string; icon: any; ring: string }> = {
  normal: { label: "Normal",  defaultDiscount: 5,  defaultCoverage: 500,   gradient: "from-slate-500 to-slate-700",     icon: Shield, ring: "ring-slate-300" },
  silver: { label: "Silver",  defaultDiscount: 10, defaultCoverage: 1500,  gradient: "from-zinc-400 to-zinc-600",       icon: Star,   ring: "ring-zinc-300" },
  gold:   { label: "Gold",    defaultDiscount: 20, defaultCoverage: 5000,  gradient: "from-amber-400 to-yellow-600",    icon: Gem,    ring: "ring-amber-300" },
  vip:    { label: "VIP",     defaultDiscount: 30, defaultCoverage: 15000, gradient: "from-fuchsia-500 via-purple-600 to-indigo-700", icon: Crown, ring: "ring-purple-300" },
};

const STATUSES = ["active", "inactive", "expired"];

const schema = z.object({
  patient_id: z.string().uuid().nullable().optional(),
  patient_name: z.string().trim().min(1, "Patient name required").max(120),
  tier: z.enum(["normal", "silver", "gold", "vip"]),
  discount_percent: z.coerce.number().min(0).max(100),
  coverage_amount_usd: z.coerce.number().min(0).max(10_000_000),
  used_amount_usd: z.coerce.number().min(0).max(10_000_000),
  provider: z.string().trim().max(120).optional().or(z.literal("")),
  valid_from: z.string().min(1),
  valid_to: z.string().optional().or(z.literal("")),
  status: z.string().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

type Row = {
  id: string;
  card_no: string;
  patient_id: string | null;
  patient_name: string | null;
  tier: Tier;
  discount_percent: number;
  coverage_amount_usd: number;
  used_amount_usd: number;
  provider: string | null;
  valid_from: string;
  valid_to: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type PatientLite = { id: string; full_name: string; patient_code: string };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Insurance() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);

  const blank = {
    patient_id: null as string | null,
    patient_name: "",
    tier: "normal" as Tier,
    discount_percent: 5 as number | string,
    coverage_amount_usd: 500 as number | string,
    used_amount_usd: 0 as number | string,
    provider: "",
    valid_from: todayStr(),
    valid_to: "",
    status: "active",
    notes: "",
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: pdata }] = await Promise.all([
      supabase.from("insurance_cards" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
    ]);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setItems((data ?? []) as any as Row[]);
    setPatients((pdata ?? []) as PatientLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      patient_id: r.patient_id,
      patient_name: r.patient_name ?? "",
      tier: r.tier,
      discount_percent: r.discount_percent,
      coverage_amount_usd: r.coverage_amount_usd,
      used_amount_usd: r.used_amount_usd,
      provider: r.provider ?? "",
      valid_from: r.valid_from,
      valid_to: r.valid_to ?? "",
      status: r.status,
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const applyTierDefaults = (t: Tier) => {
    const cfg = TIER_CONFIG[t];
    setForm((f) => ({ ...f, tier: t, discount_percent: cfg.defaultDiscount, coverage_amount_usd: cfg.defaultCoverage }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Validation error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      patient_id: parsed.data.patient_id || null,
      patient_name: parsed.data.patient_name,
      tier: parsed.data.tier,
      discount_percent: parsed.data.discount_percent,
      coverage_amount_usd: parsed.data.coverage_amount_usd,
      used_amount_usd: parsed.data.used_amount_usd,
      provider: parsed.data.provider || null,
      valid_from: parsed.data.valid_from,
      valid_to: parsed.data.valid_to || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    };

    let error: any;
    if (editing) {
      ({ error } = await supabase.from("insurance_cards" as any).update(payload).eq("id", editing.id));
    } else {
      // Generate card no via RPC
      const { data: cardNo, error: rpcErr } = await supabase.rpc("generate_insurance_card_no" as any, { _tier: parsed.data.tier });
      if (rpcErr) {
        setSaving(false);
        toast({ title: "Card no generation failed", description: rpcErr.message, variant: "destructive" });
        return;
      }
      ({ error } = await supabase.from("insurance_cards" as any).insert({ ...payload, card_no: cardNo, created_by: user?.id ?? null }));
    }
    setSaving(false);
    if (error) {
      toast({ title: editing ? "Update failed" : "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Card updated" : "Insurance card issued" });
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("insurance_cards" as any).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Card deleted" });
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (filterTier !== "all" && r.tier !== filterTier) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (!q) return true;
      return (
        r.card_no.toLowerCase().includes(q) ||
        (r.patient_name ?? "").toLowerCase().includes(q) ||
        (r.provider ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filterTier, filterStatus]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.status === "active").length;
    const coverage = items.reduce((s, i) => s + Number(i.coverage_amount_usd || 0), 0);
    const used = items.reduce((s, i) => s + Number(i.used_amount_usd || 0), 0);
    return { total, active, coverage, used };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Insurance Cards</h1>
          <p className="text-muted-foreground mt-1">Issue and manage patient insurance cards with tier-based discounts</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Issue New Card</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="shadow-soft"><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cards</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-success/10 text-success"><ShieldCheck className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold">{stats.active}</p></div>
        </CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Coverage</p><p className="text-2xl font-bold">{fmtUSD(stats.coverage)}</p>
        </CardContent></Card>
        <Card className="shadow-soft"><CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Used</p><p className="text-2xl font-bold">{fmtUSD(stats.used)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">All Cards</CardTitle>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="grid" className="gap-1"><LayoutGrid className="h-4 w-4" /> Grid</TabsTrigger>
                <TabsTrigger value="table" className="gap-1"><List className="h-4 w-4" /> List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-col md:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search card, patient or provider…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{TIER_CONFIG[t].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No insurance cards found</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => {
                const cfg = TIER_CONFIG[r.tier];
                const Icon = cfg.icon;
                const usedPct = r.coverage_amount_usd > 0 ? Math.min(100, (Number(r.used_amount_usd) / Number(r.coverage_amount_usd)) * 100) : 0;
                return (
                  <div key={r.id} className={cn("group relative rounded-2xl p-5 text-white shadow-elegant overflow-hidden bg-gradient-to-br", cfg.gradient)}>
                    <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-white/90">
                          <Icon className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-[0.2em] font-semibold">{cfg.label} Plan</span>
                        </div>
                        <p className="mt-3 text-lg font-semibold leading-tight">{r.patient_name || "—"}</p>
                        <p className="text-xs text-white/70">{r.provider || "Clinic Insurance"}</p>
                      </div>
                      <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur capitalize">{r.status}</Badge>
                    </div>

                    <p className="relative mt-6 text-xl font-mono tracking-widest">{r.card_no}</p>

                    <div className="relative mt-4 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-wider text-white/70">
                      <div>
                        <p>Discount</p>
                        <p className="text-base font-bold text-white normal-case tracking-normal">{Number(r.discount_percent)}%</p>
                      </div>
                      <div>
                        <p>Coverage</p>
                        <p className="text-base font-bold text-white normal-case tracking-normal">{fmtUSD(Number(r.coverage_amount_usd))}</p>
                      </div>
                      <div>
                        <p>Valid</p>
                        <p className="text-sm font-semibold text-white normal-case tracking-normal">{r.valid_to ? format(new Date(r.valid_to), "MM/yy") : "—"}</p>
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <div className="flex justify-between text-[11px] text-white/80 mb-1">
                        <span>Used {fmtUSD(Number(r.used_amount_usd))}</span>
                        <span>{usedPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${usedPct}%` }} />
                      </div>
                    </div>

                    <div className="relative mt-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/15 hover:bg-white/25 text-white border-0" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/15 hover:bg-destructive text-white border-0" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.card_no}</TableCell>
                      <TableCell>{r.patient_name || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{TIER_CONFIG[r.tier].label}</Badge></TableCell>
                      <TableCell className="text-right">{Number(r.discount_percent)}%</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(r.coverage_amount_usd))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtUSD(Number(r.used_amount_usd))}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.valid_to ? format(new Date(r.valid_to), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          {isAdmin && (
                            <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Insurance Card" : "Issue New Insurance Card"}</DialogTitle>
            <DialogDescription>
              {editing ? `Card ${editing.card_no}` : "Card number is auto-generated based on the selected tier."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-5">
            {/* Tier picker */}
            <div className="space-y-2">
              <Label>Card Tier *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TIERS.map((t) => {
                  const cfg = TIER_CONFIG[t];
                  const Icon = cfg.icon;
                  const active = form.tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyTierDefaults(t)}
                      className={cn(
                        "relative rounded-xl p-3 text-left text-white bg-gradient-to-br transition-all",
                        cfg.gradient,
                        active ? "ring-2 ring-offset-2 ring-primary scale-[1.02]" : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <p className="text-sm font-bold">{cfg.label}</p>
                      <p className="text-[10px] text-white/80">{cfg.defaultDiscount}% • {fmtUSD(cfg.defaultCoverage)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient */}
              <div className="space-y-2 md:col-span-2">
                <Label>Patient *</Label>
                <Popover open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start font-normal">
                      {form.patient_name || "Select or type a patient"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search patient…" />
                      <CommandList>
                        <CommandEmpty>No patient found.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.full_name} ${p.patient_code}`}
                              onSelect={() => {
                                setForm((f) => ({ ...f, patient_id: p.id, patient_name: p.full_name }));
                                setPatientPickerOpen(false);
                              }}
                            >
                              <span className="font-medium">{p.full_name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{p.patient_code}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder="Or type patient name manually"
                  value={form.patient_name}
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value, patient_id: null })}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label>Discount (%) *</Label>
                <Input type="number" min="0" max="100" step="0.5"
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Coverage Amount (USD) *</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.coverage_amount_usd}
                  onChange={(e) => setForm({ ...form, coverage_amount_usd: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label>Used Amount (USD)</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.used_amount_usd}
                  onChange={(e) => setForm({ ...form, used_amount_usd: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valid From *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full justify-start font-normal", !form.valid_from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.valid_from ? format(new Date(form.valid_from), "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single"
                      selected={form.valid_from ? new Date(form.valid_from) : undefined}
                      onSelect={(d) => d && setForm({ ...form, valid_from: d.toISOString().slice(0, 10) })}
                      initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full justify-start font-normal", !form.valid_to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.valid_to ? format(new Date(form.valid_to), "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single"
                      selected={form.valid_to ? new Date(form.valid_to) : undefined}
                      onSelect={(d) => setForm({ ...form, valid_to: d ? d.toISOString().slice(0, 10) : "" })}
                      initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Provider</Label>
                <Input value={form.provider} maxLength={120}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  placeholder="Insurance provider / company" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} maxLength={500} rows={3}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes about this card" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Update Card" : "Issue Card"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this insurance card?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
