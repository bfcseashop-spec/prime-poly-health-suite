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
  expected_return_usd: "" as any,
  return_date: "",
  allocations: [] as { shareholder_id: string; share_percent: any }[],
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
  const [quickInv, setQuickInv] = useState({ full_name: "", email: "", phone: "", notes: "", photo_url: "" });
  const [quickInvSaving, setQuickInvSaving] = useState(false);
  const [quickPhotoUploading, setQuickPhotoUploading] = useState(false);
  const quickPhotoRef = useRef<HTMLInputElement>(null);
  const investorPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadInvestorPhoto = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("investor-photos").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("investor-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const handleQuickPhoto = async (file: File) => {
    setQuickPhotoUploading(true);
    const url = await uploadInvestorPhoto(file);
    setQuickPhotoUploading(false);
    if (url) {
      setQuickInv(p => ({ ...p, photo_url: url }));
      toast.success("Photo uploaded");
    }
  };

  const handleInvestorPhotoChange = async (investorId: string, file: File) => {
    const url = await uploadInvestorPhoto(file);
    if (!url) return;
    const { error } = await (supabase.from("shareholders" as any) as any)
      .update({ photo_url: url }).eq("id", investorId);
    if (error) return toast.error(error.message);
    toast.success("Photo updated");
    load();
  };

  const addQuickInvestor = async () => {
    if (!quickInv.full_name.trim()) return toast.error("Name is required");
    setQuickInvSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("shareholders" as any) as any).insert({
      full_name: quickInv.full_name.trim(),
      email: quickInv.email || null,
      phone: quickInv.phone || null,
      notes: quickInv.notes || null,
      photo_url: quickInv.photo_url || null,
      share_percent: 0,
      committed_capital_usd: 0,
      active: true,
      created_by: u.user?.id ?? null,
    });
    setQuickInvSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Investor added");
    setQuickInv({ full_name: "", email: "", phone: "", notes: "", photo_url: "" });
    load();
  };

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
  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({
    investment_name: "Capital Amount Investment",
    shareholder_id: "",
    category: "",
    amount_usd: "" as any,
    paid_on: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    images: [] as string[],
  });
  const [recImgUploading, setRecImgUploading] = useState(false);
  const recImgRef = useRef<HTMLInputElement>(null);

  const openRecord = (shareholderId?: string, investmentName?: string) => {
    setRecForm({
      investment_name: investmentName || "Capital Amount Investment",
      shareholder_id: shareholderId || "",
      category: "",
      amount_usd: "",
      paid_on: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      images: [],
    });
    setRecOpen(true);
  };

  const handleRecImage = async (file: File) => {
    setRecImgUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("investment-slips").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("investment-slips").getPublicUrl(path);
      setRecForm(f => ({ ...f, images: [...f.images, data.publicUrl] }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setRecImgUploading(false); }
  };

  const submitRecord = async () => {
    if (!recForm.shareholder_id) return toast.error("Select investor");
    if (!recForm.category) return toast.error("Select category");
    const amt = Number(recForm.amount_usd);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      shareholder_id: recForm.shareholder_id,
      investment_name: recForm.investment_name || "Capital Amount Investment",
      category: recForm.category,
      amount_usd: amt,
      paid_on: recForm.paid_on,
      payment_method: "cash",
      notes: recForm.notes || null,
      slip_url: recForm.images.join("\n") || null,
      created_by: u.user?.id ?? null,
    };
    const { error } = await (supabase.from("shareholder_contributions" as any) as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Contribution recorded");
    setRecOpen(false); load();
  };

  const openNewC = (shareholderId?: string) => {
    setCForm({
      ...emptyContribution,
      shareholder_id: shareholderId || (shareholders[0]?.id ?? ""),
      allocations: shareholderId
        ? [{ shareholder_id: shareholderId, share_percent: 100 }]
        : [],
    });
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
      expected_return_usd: "" as any,
      return_date: "",
      allocations: [{ shareholder_id: c.shareholder_id, share_percent: 100 }],
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
    const amt = Number(cForm.amount_usd);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!cForm.investment_name?.trim()) return toast.error("Investment name is required");

    const { data: u } = await supabase.auth.getUser();
    const finalNotes = cForm.notes || "";
    const categoryValue = cForm.category || "Capital";


    // Edit mode → single update
    if (cForm.id) {
      const payload: any = {
        shareholder_id: cForm.shareholder_id,
        investment_name: cForm.investment_name.trim(),
        category: cForm.category,
        amount_usd: amt,
        paid_on: cForm.paid_on,
        payment_method: cForm.payment_method,
        reference: cForm.reference || null,
        notes: finalNotes || null,
        slip_url: cForm.slip_url || null,
      };
      const { error } = await (supabase.from("shareholder_contributions" as any) as any).update(payload).eq("id", cForm.id);
      if (error) return toast.error(error.message);
      toast.success("Contribution updated");
      setCOpen(false); load();
      return;
    }

    // Create mode: split by allocations. If none provided, auto-split across active shareholders by share_percent (fallback equal)
    let allocs = (cForm.allocations || []).filter(a => a.shareholder_id && Number(a.share_percent) > 0);
    if (allocs.length === 0) {
      const active = shareholders.filter((s: any) => s.active !== false);
      if (active.length === 0) return toast.error("Add at least one investor first");
      const totalShare = active.reduce((s: number, x: any) => s + Number(x.share_percent || 0), 0);
      allocs = totalShare > 0
        ? active.map((s: any) => ({ shareholder_id: s.id, share_percent: Number(s.share_percent || 0) }))
        : active.map((s: any) => ({ shareholder_id: s.id, share_percent: 100 / active.length }));
    }
    const totalPct = allocs.reduce((s, a) => s + Number(a.share_percent || 0), 0);
    if (totalPct <= 0) return toast.error("Share % must be greater than 0");

    const rows = allocs.map(a => ({
      shareholder_id: a.shareholder_id,
      investment_name: cForm.investment_name.trim(),
      category: cForm.category,
      amount_usd: +((amt * Number(a.share_percent)) / totalPct).toFixed(2),
      paid_on: cForm.paid_on,
      payment_method: cForm.payment_method,
      reference: cForm.reference || null,
      notes: finalNotes || null,
      slip_url: cForm.slip_url || null,
      created_by: u.user?.id ?? null,
    }));
    const { error } = await (supabase.from("shareholder_contributions" as any) as any).insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Investment recorded for ${allocs.length} investor${allocs.length > 1 ? "s" : ""}`);
    setCOpen(false); load();
  };
  const confirmDeleteC = async () => {
    if (!deleteCId) return;
    const { error } = await (supabase.from("shareholder_contributions" as any) as any).delete().eq("id", deleteCId);
    if (error) return toast.error(error.message);
    toast.success("Contribution removed"); setDeleteCId(null); load();
  };

  // ===== Category CRUD =====
  const openNewCat = () => { setCatForm({ id: "", name: "", color: COLOR_PRESETS[0].value }); };
  const openEditCat = (c: any) => { setCatForm({ id: c.id, name: c.name, color: c.color || COLOR_PRESETS[0].value }); };
  const saveCat = async () => {
    if (!catForm.name.trim()) return toast.error("Name is required");
    const payload = { name: catForm.name.trim(), color: catForm.color };
    let error;
    if (catForm.id) ({ error } = await (supabase.from("investment_categories" as any) as any).update(payload).eq("id", catForm.id));
    else ({ error } = await (supabase.from("investment_categories" as any) as any).insert(payload));
    if (error) return toast.error(error.message);
    toast.success(catForm.id ? "Category updated" : "Category added");
    openNewCat(); load();
  };
  const confirmDeleteCat = async () => {
    if (!deleteCatId) return;
    const { error } = await (supabase.from("investment_categories" as any) as any).delete().eq("id", deleteCatId);
    if (error) return toast.error(error.message);
    toast.success("Category removed"); setDeleteCatId(null); load();
  };
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setInvestorMgrOpen(true)}>
            <Users className="h-4 w-4 mr-1" />Manage Investors
          </Button>
          <Button variant="outline" onClick={() => setCatMgrOpen(true)}>
            <Tag className="h-4 w-4 mr-1" />Manage Categories
          </Button>
          <Button onClick={() => openNewC()} className="clinic-gradient text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" />Add Investment
          </Button>
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
                      <Button size="sm" className="flex-1 clinic-gradient text-primary-foreground" onClick={() => openRecord(s.id)}>
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
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
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
              <Button size="sm" variant="outline" className="h-9" onClick={() => openRecord()}>
                <Receipt className="h-4 w-4 mr-1" />Record
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
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b bg-muted/30">
            <DialogHeader className="space-y-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </span>
                {shForm.id ? "Edit Capital" : "Add Capital"}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 bg-background">
            {/* Investment selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Investment <span className="text-destructive">*</span>
              </Label>
              <Select
                value={shForm.notes?.startsWith("Investment:") ? shForm.notes.replace(/^Investment:\s*/, "") : "Capital Amount Investment"}
                onValueChange={v => setShForm({ ...shForm, notes: `Investment: ${v}` })}
              >
                <SelectTrigger className="h-11 bg-background border-2 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([
                    "Capital Amount Investment",
                    ...contributions.map((c: any) => c.investment_name).filter(Boolean),
                  ])).map(inv => {
                    const total = contributions
                      .filter((c: any) => (c.investment_name || "Capital Amount Investment") === inv)
                      .reduce((s: number, c: any) => s + Number(c.amount_usd || 0), 0);
                    return (
                      <SelectItem key={inv} value={inv}>
                        {inv} ({fmtUSD(total)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Investor Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Investor Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={shareholders.find(s => s.full_name === shForm.full_name) ? shForm.full_name : ""}
                onValueChange={v => setShForm({ ...shForm, full_name: v })}
              >
                <SelectTrigger className="h-11 bg-background border-2 focus:border-primary">
                  <SelectValue placeholder="Type name..." />
                </SelectTrigger>
                <SelectContent>
                  {shareholders.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No existing investors</div>
                  )}
                  {shareholders.map(s => (
                    <SelectItem key={s.id} value={s.full_name}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter investor name"
                className="h-11 bg-background border-2 focus-visible:border-primary"
                value={shForm.full_name}
                onChange={e => setShForm({ ...shForm, full_name: e.target.value })}
              />
            </div>

            {(() => {
              const selectedInv = shForm.notes?.startsWith("Investment:")
                ? shForm.notes.replace(/^Investment:\s*/, "")
                : "Capital Amount Investment";
              const investmentTotal = contributions
                .filter((c: any) => (c.investment_name || "Capital Amount Investment") === selectedInv)
                .reduce((s: number, c: any) => s + Number(c.amount_usd || 0), 0);
              const baseTotal = investmentTotal > 0
                ? investmentTotal
                : shareholders
                    .filter((s: any) => s.id !== shForm.id)
                    .reduce((sum: number, s: any) => sum + Number(s.committed_capital_usd || 0), 0);
              return (
                <>
                  {/* Share Percentage (drives capital) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Share Percentage (%) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="e.g. 25"
                      className="h-11 bg-background border-2 focus-visible:border-primary"
                      value={shForm.share_percent}
                      onChange={e => {
                        const pct = e.target.value;
                        const n = Number(pct);
                        const auto = baseTotal > 0 && !isNaN(n) && n > 0
                          ? +((baseTotal * n) / 100).toFixed(2)
                          : "";
                        setShForm({ ...shForm, share_percent: pct, committed_capital_usd: auto as any });
                      }}
                    />
                  </div>

                  {/* Capital Amount (auto from %) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center justify-between">
                      <span>Capital Amount ($)</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Auto from share % · base {fmtUSD(baseTotal)}
                      </span>
                    </Label>
                    <Input
                      type="number"
                      readOnly
                      placeholder="Auto-calculated from share %"
                      className="h-11 bg-muted/40 border-2 cursor-not-allowed"
                      value={shForm.committed_capital_usd}
                    />
                  </div>
                </>
              );
            })()}

            <Button
              onClick={submitSh}
              className="w-full h-11 clinic-gradient text-primary-foreground font-semibold text-base shadow-md"
            >
              {shForm.id ? "Save Changes" : "Add Capital"}
            </Button>
          </div>
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
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b bg-muted/30 shrink-0">
            <DialogHeader className="space-y-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </span>
                {cForm.id ? "Edit Investment" : "Add Investment"}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 bg-background overflow-y-auto">
            {/* Investor Allocation Block */}
            {!cForm.id && (
              <div className="rounded-xl border-2 border-dashed bg-muted/20 p-4 space-y-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">
                    Investor Name <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select investors and adjust share %. Amounts calculated from total below.
                  </p>
                </div>
                <div className="space-y-2">
                  {(cForm.allocations || []).map((a, idx) => {
                    const used = (cForm.allocations || []).map(x => x.shareholder_id);
                    const available = shareholders.filter(s => s.id === a.shareholder_id || !used.includes(s.id));
                    const amt = Number(cForm.amount_usd) || 0;
                    const totalPct = (cForm.allocations || []).reduce((s, x) => s + Number(x.share_percent || 0), 0) || 1;
                    const portion = amt > 0 ? (amt * Number(a.share_percent || 0)) / totalPct : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-background rounded-lg border p-2">
                        <Select
                          value={a.shareholder_id}
                          onValueChange={v => {
                            const next = [...cForm.allocations];
                            next[idx] = { ...next[idx], shareholder_id: v };
                            setCForm({ ...cForm, allocations: next });
                          }}
                        >
                          <SelectTrigger className="flex-1 h-10 border-2 focus:border-primary">
                            <SelectValue placeholder="Select investor" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative w-24">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            placeholder="0"
                            className="h-10 pr-7 text-right border-2"
                            value={a.share_percent}
                            onChange={e => {
                              const next = [...cForm.allocations];
                              next[idx] = { ...next[idx], share_percent: e.target.value };
                              setCForm({ ...cForm, allocations: next });
                            }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                        <div className="w-24 text-right text-xs font-medium text-muted-foreground tabular-nums">
                          {fmtUSD(portion)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            const next = cForm.allocations.filter((_, i) => i !== idx);
                            setCForm({ ...cForm, allocations: next });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed"
                    onClick={() => {
                      const used = new Set((cForm.allocations || []).map(x => x.shareholder_id));
                      const next = shareholders.find(s => !used.has(s.id));
                      const remaining = Math.max(
                        0,
                        100 - (cForm.allocations || []).reduce((s, x) => s + Number(x.share_percent || 0), 0)
                      );
                      setCForm({
                        ...cForm,
                        allocations: [
                          ...(cForm.allocations || []),
                          { shareholder_id: next?.id ?? "", share_percent: remaining || 100 },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add investor
                  </Button>
                </div>
                {(cForm.allocations || []).length > 0 && (() => {
                  const totalPct = cForm.allocations.reduce((s, x) => s + Number(x.share_percent || 0), 0);
                  const ok = Math.abs(totalPct - 100) < 0.01;
                  return (
                    <div className={cn(
                      "text-xs flex items-center justify-between px-1",
                      ok ? "text-success" : "text-warning"
                    )}>
                      <span>Total share allocated</span>
                      <span className="font-semibold tabular-nums">{totalPct.toFixed(2)}%</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {cForm.id && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Investor</Label>
                <Select value={cForm.shareholder_id} onValueChange={v => setCForm({ ...cForm, shareholder_id: v })}>
                  <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select investor" /></SelectTrigger>
                  <SelectContent>
                    {shareholders.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount + Expected Return */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Amount ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number" min={0} step="0.01"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={cForm.amount_usd}
                  onChange={e => setCForm({ ...cForm, amount_usd: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Expected Return ($)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={cForm.expected_return_usd}
                  onChange={e => setCForm({ ...cForm, expected_return_usd: e.target.value })}
                />
              </div>
            </div>

            {/* Pay by */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Pay by</Label>
              <Select value={cForm.payment_method} onValueChange={v => setCForm({ ...cForm, payment_method: v })}>
                <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-11 border-2 focus-visible:border-primary"
                value={cForm.investment_name}
                onChange={e => setCForm({ ...cForm, investment_name: e.target.value })}
                placeholder="e.g. Capital Amount Investment"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={cForm.category} onValueChange={v => setCForm({ ...cForm, category: v })}>
                <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Return Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={cForm.paid_on}
                  onChange={e => setCForm({ ...cForm, paid_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Return Date</Label>
                <Input
                  type="date"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={cForm.return_date}
                  onChange={e => setCForm({ ...cForm, return_date: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                rows={3}
                className="border-2 focus-visible:border-primary resize-none"
                value={cForm.notes}
                onChange={e => setCForm({ ...cForm, notes: e.target.value })}
              />
            </div>

            {/* Slip */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Slip / Receipt</Label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={e => e.target.files?.[0] && handleSlipUpload(e.target.files[0])} />
              {cForm.slip_url ? (
                <div className="flex items-center gap-2 p-2.5 border-2 rounded-lg bg-muted/30">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <a href={cForm.slip_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex-1">View uploaded slip</a>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCForm({ ...cForm, slip_url: "" })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading..." : "Upload Slip"}
                </Button>
              )}
            </div>

            <Button
              onClick={submitC}
              className="w-full h-11 clinic-gradient text-primary-foreground font-semibold text-base shadow-md"
            >
              {cForm.id ? "Save Changes" : "Add Investment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* RECORD CONTRIBUTION (simple) */}
      <Dialog open={recOpen} onOpenChange={setRecOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 pt-5 pb-4 border-b bg-muted/30 shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-4 w-4" />
                </span>
                Record Contribution
              </DialogTitle>
              <p className="text-xs text-muted-foreground pl-9">
                Record a payment made by an investor toward an investment
              </p>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4 bg-background overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Investment <span className="text-destructive">*</span>
              </Label>
              <Select value={recForm.investment_name} onValueChange={v => setRecForm({ ...recForm, investment_name: v })}>
                <SelectTrigger className="h-11 border-2 focus:border-primary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([
                    "Capital Amount Investment",
                    ...contributions.map((c: any) => c.investment_name).filter(Boolean),
                  ])).map(inv => {
                    const total = contributions
                      .filter((c: any) => (c.investment_name || "Capital Amount Investment") === inv)
                      .reduce((s: number, c: any) => s + Number(c.amount_usd || 0), 0);
                    return (
                      <SelectItem key={inv} value={inv}>{inv} ({fmtUSD(total)})</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Investor <span className="text-destructive">*</span>
              </Label>
              <Select value={recForm.shareholder_id} onValueChange={v => setRecForm({ ...recForm, shareholder_id: v })}>
                <SelectTrigger className="h-11 border-2 focus:border-primary">
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {shareholders.map(s => (<SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={recForm.category} onValueChange={v => setRecForm({ ...recForm, category: v })}>
                <SelectTrigger className="h-11 border-2 focus:border-primary">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Amount ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number" min={0} step="0.01"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={recForm.amount_usd}
                  onChange={e => setRecForm({ ...recForm, amount_usd: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  className="h-11 border-2 focus-visible:border-primary"
                  value={recForm.paid_on}
                  onChange={e => setRecForm({ ...recForm, paid_on: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Images</Label>
              <input
                ref={recImgRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => e.target.files?.[0] && handleRecImage(e.target.files[0])}
              />
              <div className="flex flex-wrap gap-2">
                {recForm.images.map((url, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border-2 group">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRecForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-dashed"
                  onClick={() => recImgRef.current?.click()}
                  disabled={recImgUploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {recImgUploading ? "Uploading..." : "Add Image"}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Note</Label>
              <Textarea
                rows={3}
                className="border-2 focus-visible:border-primary resize-none"
                value={recForm.notes}
                onChange={e => setRecForm({ ...recForm, notes: e.target.value })}
              />
            </div>

            <Button
              onClick={submitRecord}
              className="w-full h-11 clinic-gradient text-primary-foreground font-semibold text-base shadow-md"
            >
              Record Contribution
            </Button>
          </div>
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

      {/* CATEGORY MANAGER */}
      <Dialog open={catMgrOpen} onOpenChange={(o) => { setCatMgrOpen(o); if (!o) openNewCat(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{catForm.id ? "Edit Category" : "Add New Category"}</p>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Utility Bill" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PRESETS.map(p => (
                    <button key={p.value} type="button" onClick={() => setCatForm({ ...catForm, color: p.value })}
                      className={cn("h-9 rounded-md border-2 flex items-center justify-center transition-all",
                        catForm.color === p.value ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50")}
                      title={p.label}>
                      <span className={cn("h-4 w-4 rounded-full", p.dot)} />
                    </button>
                  ))}
                </div>
                {catForm.name && (
                  <div className="pt-2"><Badge variant="outline" className={cn("text-xs", catForm.color)}>{catForm.name}</Badge></div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                {catForm.id && <Button variant="outline" size="sm" onClick={openNewCat}>Cancel</Button>}
                <Button size="sm" onClick={saveCat} className="clinic-gradient text-primary-foreground flex-1">
                  {catForm.id ? "Save" : "Add Category"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Existing ({categories.length})</p>
              <div className="border rounded-lg max-h-[340px] overflow-y-auto divide-y">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No categories yet</p>
                ) : categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40">
                    <Badge variant="outline" className={cn("text-xs", c.color)}>{c.name}</Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditCat(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCatId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* INVESTOR MANAGER */}
      <Dialog open={investorMgrOpen} onOpenChange={setInvestorMgrOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b bg-muted/30 shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </span>
                Manage Investors
              </DialogTitle>
              <p className="text-xs text-muted-foreground pl-9">
                Add and edit investors to select when creating investments.
              </p>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 bg-background overflow-y-auto">
            {/* Add new investor */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Add new investor</Label>
              <div className="rounded-xl border-2 border-dashed bg-muted/20 p-3 space-y-2">
                <input
                  ref={quickPhotoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => e.target.files?.[0] && handleQuickPhoto(e.target.files[0])}
                />
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => quickPhotoRef.current?.click()}
                    disabled={quickPhotoUploading}
                    className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden border-2 border-dashed bg-background hover:border-primary hover:bg-primary/5 transition group"
                    title="Upload photo"
                  >
                    {quickInv.photo_url ? (
                      <>
                        <img src={quickInv.photo_url} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                          <Upload className="h-4 w-4 text-white" />
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                        {quickPhotoUploading ? (
                          <span className="text-[10px]">...</span>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span className="text-[9px] mt-0.5">Photo</span>
                          </>
                        )}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Name *"
                      className="h-10 border-2 bg-background flex-1"
                      value={quickInv.full_name}
                      onChange={e => setQuickInv({ ...quickInv, full_name: e.target.value })}
                    />
                    <Input
                      placeholder="Email"
                      className="h-10 border-2 bg-background flex-1"
                      value={quickInv.email}
                      onChange={e => setQuickInv({ ...quickInv, email: e.target.value })}
                    />
                    <Input
                      placeholder="Phone"
                      className="h-10 border-2 bg-background flex-1"
                      value={quickInv.phone}
                      onChange={e => setQuickInv({ ...quickInv, phone: e.target.value })}
                    />
                    <Button
                      onClick={addQuickInvestor}
                      disabled={quickInvSaving}
                      className="h-10 px-6 clinic-gradient text-primary-foreground font-semibold shrink-0"
                    >
                      {quickInvSaving ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Notes"
                  className="h-10 border-2 bg-background"
                  value={quickInv.notes}
                  onChange={e => setQuickInv({ ...quickInv, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Investors list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Investors list</Label>
                <span className="text-xs text-muted-foreground">{shareholders.length} total</span>
              </div>
              {shareholders.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
                  No investors yet. Add one above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {shareholders.map((s, idx) => {
                    const committed = Number(s.committed_capital_usd || 0);
                    const paid = paidByShareholder[s.id] || 0;
                    return (
                      <div
                        key={s.id}
                        className="group flex items-center gap-3 rounded-xl border bg-card hover:bg-muted/40 hover:shadow-sm transition px-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => investorPhotoRefs.current[s.id]?.click()}
                          className="relative shrink-0 rounded-full group"
                          title="Change photo"
                        >
                          <input
                            ref={el => { investorPhotoRefs.current[s.id] = el; }}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={e => e.target.files?.[0] && handleInvestorPhotoChange(s.id, e.target.files[0])}
                          />
                          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                            <AvatarImage src={s.photo_url || undefined} />
                            <AvatarFallback
                              className="text-primary-foreground text-sm font-semibold"
                              style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                            >
                              {s.full_name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition">
                            <Upload className="h-3.5 w-3.5 text-white" />
                          </span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {s.email || s.phone || "—"}
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 mr-1">
                          <Badge variant="outline" className="font-normal">
                            {Number(s.share_percent || 0)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {fmtUSD(committed)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-primary"
                          onClick={() => { setInvestorMgrOpen(false); openEditSh(s); }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteShId(s.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCatId} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>Existing contributions using this category will keep the name but lose its styling.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
