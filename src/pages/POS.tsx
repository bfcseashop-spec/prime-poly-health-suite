import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Trash2, Receipt, Pill, Stethoscope, ScanLine, FlaskConical, Activity, ScanBarcode, X, Plus, CreditCard, Wallet, Banknote, Clock, Syringe, Layers } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD, fmtBoth } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";

type ItemType = "medicine" | "consultation" | "xray" | "lab" | "service" | "injection" | "package";

type CartItem = {
  key: string;
  item_type: ItemType;
  ref_id?: string | null;
  name: string;
  description?: string | null;
  price_usd: number;
  quantity: number;
  max?: number; // stock for medicines/injections
  package_id?: string | null; // links package child rows to parent
};

type SplitPayment = { id: string; method: string; amount: number; reference?: string };

const PAYMENTS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "aba", label: "ABA Bank" },
  { value: "acleda", label: "ACLEDA Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "visa", label: "Card", icon: CreditCard },
];

const CAT_META: Record<string, { label: string; icon: any; color: string }> = {
  medicine: { label: "Medicines", icon: Pill, color: "text-emerald-600 bg-emerald-50" },
  injection: { label: "Injections", icon: Syringe, color: "text-cyan-600 bg-cyan-50" },
  package: { label: "Packages", icon: Layers, color: "text-indigo-600 bg-indigo-50" },
  consultation: { label: "Consultation", icon: Stethoscope, color: "text-blue-600 bg-blue-50" },
  xray: { label: "X-Ray", icon: ScanLine, color: "text-purple-600 bg-purple-50" },
  lab: { label: "Lab Tests", icon: FlaskConical, color: "text-amber-600 bg-amber-50" },
  service: { label: "Services", icon: Activity, color: "text-rose-600 bg-rose-50" },
};

export default function POS() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [injections, setInjections] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [packageItems, setPackageItems] = useState<Record<string, any[]>>({});
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("medicine");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [patientId, setPatientId] = useState<string | undefined>();
  const [insuranceCard, setInsuranceCard] = useState<any | null>(null);
  const [cardInput, setCardInput] = useState("");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"none" | "flat" | "percent">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [splitMode, setSplitMode] = useState(false);
  const [autoMethod, setAutoMethod] = useState("cash");
  const [splits, setSplits] = useState<SplitPayment[]>([{ id: crypto.randomUUID(), method: "cash", amount: 0 }]);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ name: "", price_usd: 0, item_type: "service" as CartItem["item_type"] });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  const load = async () => {
    const [m, s, p, inj, pkg, pkgI] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("service_catalog" as any).select("*").eq("active", true).order("name"),
      supabase.from("patients").select("id, full_name, patient_code, gender").order("created_at", { ascending: false }).limit(200),
      supabase.from("injections" as any).select("*").eq("active", true).order("name"),
      supabase.from("health_packages" as any).select("*").eq("active", true).order("name"),
      supabase.from("health_package_items" as any).select("*"),
    ]);
    setMeds(m.data ?? []);
    setServices((s.data as any[]) ?? []);
    setPatients(p.data ?? []);
    setInjections((inj.data as any[]) ?? []);
    setPackages((pkg.data as any[]) ?? []);
    const grouped: Record<string, any[]> = {};
    ((pkgI.data as any[]) ?? []).forEach((it: any) => {
      grouped[it.package_id] = grouped[it.package_id] || [];
      grouped[it.package_id].push(it);
    });
    setPackageItems(grouped);
  };
  useEffect(() => { load(); }, []);

  const catalogItems = useMemo(() => {
    const ql = q.toLowerCase();
    if (activeCat === "medicine") {
      return meds
        .filter(m => !q || m.name.toLowerCase().includes(ql) || m.brand?.toLowerCase().includes(ql) || m.barcode === q)
        .map(m => ({ id: m.id, name: m.name, sub: m.brand, price: Number(m.price_usd), stock: m.stock, low: m.stock <= m.low_stock_threshold, item_type: "medicine" as const, raw: m }));
    }
    if (activeCat === "injection") {
      return injections
        .filter(i => !q || i.name.toLowerCase().includes(ql) || i.brand?.toLowerCase().includes(ql))
        .map(i => ({ id: i.id, name: i.name, sub: [i.brand, i.dose, i.route].filter(Boolean).join(" • "), price: Number(i.price_usd), stock: i.stock, low: i.stock <= 5, item_type: "injection" as const, raw: i }));
    }
    if (activeCat === "package") {
      return packages
        .filter(p => !q || p.name.toLowerCase().includes(ql))
        .map(p => ({ id: p.id, name: p.name, sub: p.description, price: Number(p.final_price_usd), item_type: "package" as const, raw: p }));
    }
    return services
      .filter(s => s.category === activeCat && (!q || s.name.toLowerCase().includes(ql)))
      .map(s => ({ id: s.id, name: s.name, sub: s.description, price: Number(s.price_usd), item_type: s.category as CartItem["item_type"], raw: s }));
  }, [activeCat, meds, services, injections, packages, q]);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price_usd * c.quantity, 0), [cart]);
  const insuranceDiscount = insuranceCard ? +(subtotal * (Number(insuranceCard.discount_percent) / 100)).toFixed(2) : 0;
  const discount = useMemo(() => {
    if (discountType === "flat") return Math.max(0, Number(discountValue) || 0);
    if (discountType === "percent") return +(subtotal * (Math.max(0, Math.min(100, Number(discountValue) || 0)) / 100)).toFixed(2);
    return 0;
  }, [discountType, discountValue, subtotal]);
  const total = Math.max(0, +(subtotal - discount - insuranceDiscount).toFixed(2));
  const effectiveSplits = useMemo<SplitPayment[]>(() => splitMode ? splits : [{ id: "auto", method: autoMethod, amount: total }], [splitMode, splits, autoMethod, total]);
  const totalPaid = useMemo(() => effectiveSplits.reduce((s, p) => s + (Number(p.amount) || 0), 0), [effectiveSplits]);
  const due = Math.max(0, +(total - totalPaid).toFixed(2));

  const addCatalogToCart = (it: any) => {
    if ((it.item_type === "medicine" || it.item_type === "injection") && it.stock <= 0) return toast.error("Out of stock");

    // Packages: add as a single line at the discounted package price.
    if (it.item_type === "package") {
      setCart(prev => {
        if (prev.find(c => c.ref_id === it.id && c.item_type === "package")) {
          return prev.map(c => c.ref_id === it.id && c.item_type === "package" ? { ...c, quantity: c.quantity + 1 } : c);
        }
        const children = (packageItems[it.id] ?? []).map((ch: any) => `${ch.name}${ch.quantity > 1 ? ` ×${ch.quantity}` : ""}`).join(", ");
        return [...prev, {
          key: crypto.randomUUID(),
          item_type: "package",
          ref_id: it.id,
          name: it.name,
          description: children || it.sub,
          price_usd: it.price,
          quantity: 1,
        }];
      });
      toast.success(`Added package: ${it.name}`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.ref_id === it.id && c.item_type === it.item_type);
      if (existing) {
        if ((it.item_type === "medicine" || it.item_type === "injection") && existing.quantity + 1 > (existing.max ?? 0)) return (toast.error("Not enough stock"), prev);
        return prev.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        key: crypto.randomUUID(),
        item_type: it.item_type,
        ref_id: it.id,
        name: it.name,
        description: it.sub,
        price_usd: it.price,
        quantity: 1,
        max: (it.item_type === "medicine" || it.item_type === "injection") ? it.stock : undefined,
      }];
    });
  };

  const addCustom = () => {
    if (!custom.name || custom.price_usd <= 0) return toast.error("Name & price required");
    setCart(prev => [...prev, { key: crypto.randomUUID(), item_type: custom.item_type, ref_id: null, name: custom.name, price_usd: Number(custom.price_usd), quantity: 1 }]);
    setCustom({ name: "", price_usd: 0, item_type: "service" });
    setCustomOpen(false);
  };

  const updQty = (key: string, q: number) => setCart(cart.map(c => c.key === key ? { ...c, quantity: c.max ? Math.min(Math.max(1, q), c.max) : Math.max(1, q) } : c));
  const updPrice = (key: string, p: number) => setCart(cart.map(c => c.key === key ? { ...c, price_usd: Math.max(0, p) } : c));
  const rmCart = (key: string) => setCart(cart.filter(c => c.key !== key));

  const lookupCard = async () => {
    const code = cardInput.trim();
    if (!code) return;
    const { data, error } = await supabase.from("insurance_cards" as any).select("*").ilike("card_no", code).maybeSingle();
    if (error || !data) return toast.error("Card not found");
    const c: any = data;
    if (c.status !== "active") return toast.error(`Card is ${c.status}`);
    setInsuranceCard(c);
    if (c.patient_id) setPatientId(c.patient_id);
    setCardInput("");
    toast.success(`${c.tier.toUpperCase()} • ${Number(c.discount_percent)}% off`);
  };

  const addSplit = () => setSplits([...splits, { id: crypto.randomUUID(), method: "cash", amount: 0 }]);
  const updSplit = (id: string, patch: Partial<SplitPayment>) => setSplits(splits.map(s => s.id === id ? { ...s, ...patch } : s));
  const rmSplit = (id: string) => setSplits(splits.length === 1 ? splits : splits.filter(s => s.id !== id));
  const fillRemaining = (id: string) => {
    const otherSum = splits.filter(s => s.id !== id).reduce((a, s) => a + (Number(s.amount) || 0), 0);
    updSplit(id, { amount: Math.max(0, +(total - otherSum).toFixed(2)) });
  };

  const checkout = async (markAsDue = false) => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const validSplits = effectiveSplits.filter(s => Number(s.amount) > 0);
    const paid = validSplits.reduce((a, s) => a + Number(s.amount), 0);
    const remaining = +(total - paid).toFixed(2);

    if (!markAsDue && remaining > 0.01) return toast.error("Add a payment for the remaining amount, or mark as Due");
    if (paid > total + 0.01) return toast.error("Paid amount exceeds total");

    const { data: invData } = await supabase.rpc("generate_invoice_no" as any);
    const invoice = invData ?? `INV-${Date.now()}`;
    const totalDiscount = discount + insuranceDiscount;
    const status = remaining < 0.01 ? "paid" : paid > 0 ? "partial" : "due";
    const primaryMethod = validSplits[0]?.method ?? "cash";

    const { data: sale, error } = await supabase.from("medicine_sales").insert({
      invoice_no: invoice,
      patient_id: patientId,
      subtotal_usd: subtotal,
      discount_usd: totalDiscount,
      total_usd: total,
      payment_method: primaryMethod,
      cashier_id: user?.id,
      amount_paid_usd: paid,
      due_usd: remaining,
      status,
      notes,
      sale_type: "pos",
      insurance_card_id: insuranceCard?.id ?? null,
      insurance_discount_usd: insuranceDiscount,
    } as any).select().single();
    if (error || !sale) return toast.error(error?.message ?? "Failed");

    const items = cart.map(c => ({
      sale_id: sale.id,
      medicine_id: c.item_type === "medicine" ? c.ref_id : null,
      item_type: c.item_type,
      ref_id: c.ref_id,
      description: c.description,
      name: c.name,
      quantity: c.quantity,
      price_usd: c.price_usd,
      total_usd: c.price_usd * c.quantity,
    }));
    await supabase.from("medicine_sale_items").insert(items as any);

    if (validSplits.length > 0) {
      await supabase.from("invoice_payments" as any).insert(
        validSplits.map(s => ({
          sale_id: sale.id,
          amount_usd: Number(s.amount),
          payment_method: s.method,
          reference: s.reference || null,
          created_by: user?.id,
        }))
      );
    }

    // decrement medicine stock
    for (const c of cart.filter(x => x.item_type === "medicine" && x.ref_id)) {
      const m = meds.find(x => x.id === c.ref_id);
      if (m) await supabase.from("medicines").update({ stock: m.stock - c.quantity }).eq("id", c.ref_id!);
    }
    // decrement injection stock
    for (const c of cart.filter(x => x.item_type === "injection" && x.ref_id)) {
      const inj = injections.find(x => x.id === c.ref_id);
      if (inj) await supabase.from("injections" as any).update({ stock: Math.max(0, inj.stock - c.quantity) }).eq("id", c.ref_id!);
    }

    if (insuranceCard && insuranceDiscount > 0) {
      await supabase.from("insurance_cards" as any).update({
        used_amount_usd: Number(insuranceCard.used_amount_usd ?? 0) + insuranceDiscount,
      }).eq("id", insuranceCard.id);
    }

    toast.success(`${invoice} — ${status === "paid" ? "Paid" : status === "partial" ? `Partial • ${fmtUSD(remaining)} due` : `Due ${fmtUSD(remaining)}`}`);
    const inv = {
      invoice, items: cart, subtotal, discount: totalDiscount, total, paid, due: remaining, status,
      splits: validSplits, patient: patients.find(p => p.id === patientId), notes,
      created_at: new Date(),
    };
    setLastInvoice(inv);
    setPreviewOpen(true);
    setCart([]); setDiscountType("none"); setDiscountValue(0); setPatientId(undefined); setInsuranceCard(null); setNotes("");
    setSplits([{ id: crypto.randomUUID(), method: "cash", amount: 0 }]); setSplitMode(false); setAutoMethod("cash");
    load();
  };

  const KHR = (n: number) => `៛${Math.round((n || 0) * 4100).toLocaleString()}`;

  const buildInvoiceHTML = (r: any, compact = false) => {
    const dateStr = new Date(r.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const primaryMethod = (r.splits && r.splits[0]?.method) || "—";
    const rows = r.items.map((i: any, idx: number) => `
      <tr>
        <td class="c sl">${String(idx + 1).padStart(2, "0")}</td>
        <td><div class="iname">${i.name}</div>${i.description ? `<div class="isub">${i.description}</div>` : ""}</td>
        <td class="r">${fmtUSD(i.price_usd)}</td>
        <td class="c">${i.quantity}</td>
        <td class="r b">${fmtUSD(i.price_usd * i.quantity)}</td>
      </tr>`).join("");
    return `<html><head><title>${r.invoice}</title><style>
      *{box-sizing:border-box;margin:0;padding:0} body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;background:#fff;padding:${compact ? "12px" : "32px"};max-width:${compact ? "380px" : "780px"};margin:auto;font-size:${compact ? "11px" : "13px"}}
      .head{background:#f1f5f9;padding:${compact ? "16px" : "28px"} 20px;text-align:center;border-radius:6px 6px 0 0}
      .logo{width:${compact ? "36px" : "48px"};height:${compact ? "36px" : "48px"};margin:0 auto 8px;color:#0F6E56}
      .clinic{font-size:${compact ? "16px" : "22px"};font-weight:800;color:#0F6E56;letter-spacing:1px}
      .addr{font-size:${compact ? "9px" : "11px"};color:#64748b;margin-top:6px;line-height:1.5}
      .meta{display:flex;justify-content:space-between;padding:${compact ? "12px 4px" : "20px 4px"};border-bottom:1px solid #e2e8f0;flex-wrap:wrap;gap:8px}
      .meta .lbl{font-size:${compact ? "9px" : "10px"};color:#0F6E56;font-weight:700;letter-spacing:1px;text-transform:uppercase}
      .meta .val{font-weight:700;color:#0f172a;margin-top:2px;font-size:${compact ? "11px" : "13px"}}
      .barcode{font-family:'Libre Barcode 39',monospace;font-size:${compact ? "20px" : "28px"};letter-spacing:1px;color:#0f172a;line-height:1}
      .pinfo{display:flex;justify-content:space-between;padding:${compact ? "12px 4px" : "18px 4px"};gap:16px;flex-wrap:wrap}
      .pinfo h3{color:#0F6E56;font-size:${compact ? "12px" : "14px"};margin-bottom:6px}
      .pinfo .pname{font-weight:700;color:#0f172a;font-size:${compact ? "12px" : "14px"}}
      .pinfo .psub{font-size:${compact ? "10px" : "11px"};color:#64748b;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      thead th{background:#0F6E56;color:#fff;padding:${compact ? "6px 8px" : "10px 12px"};text-align:left;font-size:${compact ? "9px" : "11px"};text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
      thead th.r{text-align:right} thead th.c{text-align:center}
      tbody td{padding:${compact ? "8px" : "12px"};border-bottom:1px solid #e2e8f0;vertical-align:top}
      td.c{text-align:center} td.r{text-align:right} td.b{font-weight:700} td.sl{color:#64748b;font-weight:700}
      .iname{font-weight:600;color:#0f172a} .isub{font-size:${compact ? "9px" : "10px"};color:#64748b;margin-top:2px;text-transform:capitalize}
      .totbox{margin-left:auto;width:${compact ? "100%" : "55%"};padding:${compact ? "12px 0" : "16px 0"}}
      .totline{display:flex;justify-content:space-between;padding:${compact ? "5px 8px" : "8px 12px"};font-size:${compact ? "11px" : "13px"}}
      .totline.div{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:8px}
      .grand{color:#0F6E56;font-weight:800;font-size:${compact ? "14px" : "17px"};padding:${compact ? "6px 8px" : "10px 12px"}}
      .paid{color:#0F6E56;font-weight:700}
      .due{color:#dc2626;font-weight:700}
      .foot{text-align:center;margin-top:${compact ? "16px" : "28px"};padding-top:${compact ? "12px" : "20px"};border-top:1px dashed #cbd5e1}
      .foot h4{color:#0F6E56;font-size:${compact ? "11px" : "13px"};letter-spacing:1px;margin-bottom:4px}
      .foot p{font-size:${compact ? "9px" : "10px"};color:#64748b}
      @media print{@page{margin:${compact ? "8mm" : "14mm"};size:${compact ? "80mm auto" : "A4"}} body{padding:0}}
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
      </head><body>
      <div class="head">
        <svg class="logo" viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="14" r="6"/><circle cx="14" cy="28" r="6"/><circle cx="34" cy="28" r="6"/><circle cx="24" cy="38" r="6"/></svg>
        <div class="clinic">PRIME POLY CLINIC</div>
        <div class="addr">Mittapheap Kampuchea Soviet, Street 705, Preah Sihanouk, Cambodia.<br/>+855 78 514 425 • primeclinic.centre@gmail.com</div>
      </div>
      <div class="meta">
        <div>
          <div class="lbl">Invoice No #</div><div class="val">${r.invoice}</div>
          <div class="lbl" style="margin-top:8px">Date</div><div class="val">${dateStr}</div>
          <div style="margin-top:6px;font-size:${compact ? "10px" : "12px"}">Paid By: <b style="text-transform:capitalize">${primaryMethod}</b></div>
        </div>
        <div style="text-align:right">
          <div class="lbl">Invoice Code:</div>
          <div class="barcode">*${r.invoice}*</div>
        </div>
      </div>
      <div class="pinfo">
        <div>
          <h3>Patient :</h3>
          <div class="pname">${r.patient?.full_name || "Walking In"}</div>
          <div class="psub">ID : ${r.patient?.patient_code || "—"}</div>
          ${r.patient?.gender ? `<div class="psub">Gender: ${r.patient.gender}</div>` : ""}
        </div>
        <div style="text-align:right">
          <h3>Referrer Name:</h3>
          <div class="psub">${r.referrer || "—"}</div>
        </div>
      </div>
      <table>
        <thead><tr><th class="c" style="width:50px">Item</th><th>Description</th><th class="r" style="width:80px">Price</th><th class="c" style="width:50px">Qty</th><th class="r" style="width:100px">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totbox">
        <div class="totline div"><span>Subtotal:</span><span>${fmtUSD(r.subtotal)} / ${KHR(r.subtotal)}</span></div>
        ${r.discount > 0 ? `<div class="totline"><span>Discount:</span><span class="paid">−${fmtUSD(r.discount)}</span></div>` : ""}
        <div class="totline grand"><span>Grand Total:</span><span>${fmtUSD(r.total)}</span></div>
        <div class="totline grand" style="padding-top:0"><span>Grand Total:</span><span>${KHR(r.total)}</span></div>
        <div class="totline"><span>Amount Paid</span><span class="paid">${fmtUSD(r.paid)}</span></div>
        ${r.due > 0 ? `<div class="totline"><span>Balance Due</span><span class="due">${fmtUSD(r.due)}</span></div>` : ""}
      </div>
      <div class="foot">
        <h4>THANK YOU FOR CHOOSING PRIME POLY CLINIC!</h4>
        <p>FOR QUESTIONS, CONTACT PRIMECLINIC.CENTRE@GMAIL.COM</p>
      </div>
      </body></html>`;
  };

  const printReceipt = (r: any, compact = false) => {
    const w = window.open("", "_blank", compact ? "width=420,height=700" : "width=820,height=900");
    if (!w) return;
    w.document.write(buildInvoiceHTML(r, compact));
    w.document.write(`<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  };



  const CatBtn = ({ k }: { k: string }) => {
    const m = CAT_META[k]; const Icon = m.icon; const active = activeCat === k;
    return (
      <button onClick={() => setActiveCat(k)}
        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all min-w-[100px] ${active ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40"}`}>
        <div className={`p-2 rounded-lg ${m.color}`}><Icon className="h-5 w-5" /></div>
        <span className="text-xs font-medium">{m.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Receipt className="h-7 w-7 text-primary" />Point of Sale</h1>
          <p className="text-muted-foreground mt-1 text-sm">Central billing for medicines, consultation, lab, x-ray & services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCustomOpen(true)}><Plus className="h-4 w-4 mr-1" />Custom Item</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* CATALOG */}
        <Card className="lg:col-span-3 shadow-soft">
          <CardHeader className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Object.keys(CAT_META).map(k => <CatBtn key={k} k={k} />)}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${CAT_META[activeCat].label.toLowerCase()}...`} value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[58vh] overflow-y-auto">
              {catalogItems.length === 0 ? <p className="col-span-full text-center text-muted-foreground py-8 text-sm">No items found</p> :
                catalogItems.map(it => {
                  const Icon = CAT_META[it.item_type]?.icon ?? Activity;
                  const oos = it.item_type === "medicine" && (it as any).stock <= 0;
                  return (
                    <button key={it.id} onClick={() => addCatalogToCart(it)} disabled={oos}
                      className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-all disabled:opacity-50">
                      <div className="flex items-start justify-between gap-1">
                        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {it.item_type === "medicine" && (
                          <Badge variant={(it as any).low ? "destructive" : "secondary"} className="text-[10px]">{(it as any).stock}</Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1 line-clamp-2">{it.name}</p>
                      {it.sub && <p className="text-xs text-muted-foreground line-clamp-1">{it.sub}</p>}
                      <p className="text-sm font-semibold text-primary mt-1">{fmtUSD(it.price)}</p>
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* CART */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-5 w-5" />Cart ({cart.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-[28vh] overflow-y-auto">
              {cart.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Cart is empty — pick items from the catalog</p> :
                cart.map(c => {
                  const Icon = CAT_META[c.item_type]?.icon ?? Activity;
                  return (
                    <div key={c.key} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-border/50">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.item_type}</p>
                      </div>
                      <Input type="number" className="w-14 h-8 text-xs" value={c.price_usd} onChange={e => updPrice(c.key, Number(e.target.value))} step="0.01" />
                      <Input type="number" className="w-12 h-8 text-xs" value={c.quantity} onChange={e => updQty(c.key, Number(e.target.value))} min={1} max={c.max} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rmCart(c.key)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  );
                })}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Patient (optional)</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Insurance Card</Label>
                {insuranceCard ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-success/10 border border-success/30 text-xs">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold truncate">{insuranceCard.card_no}</p>
                      <p className="text-muted-foreground capitalize">{insuranceCard.tier} • {Number(insuranceCard.discount_percent)}% off</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setInsuranceCard(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Input value={cardInput} onChange={e => setCardInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), lookupCard())}
                      placeholder="Scan card no…" className="h-8 font-mono uppercase" />
                    <Button type="button" size="sm" variant="outline" onClick={lookupCard} className="h-8 px-2"><ScanBarcode className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Discount</Label>
                <div className="flex gap-1">
                  <Select value={discountType} onValueChange={(v: any) => { setDiscountType(v); if (v === "none") setDiscountValue(0); }}>
                    <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      <SelectItem value="flat">Flat (USD)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  {discountType !== "none" && (
                    <Input type="number" step="0.01" className="h-8 w-24" placeholder={discountType === "percent" ? "%" : "USD"}
                      value={discountValue || ""} onChange={e => setDiscountValue(Number(e.target.value) || 0)} />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…" className="h-8" />
              </div>
            </div>

            {/* TOTALS */}
            <div className="space-y-1 pt-2 border-t">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtUSD(subtotal)}</span></div>
              {insuranceDiscount > 0 && <div className="flex justify-between text-sm text-success"><span>Insurance ({Number(insuranceCard?.discount_percent)}%)</span><span>−{fmtUSD(insuranceDiscount)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount{discountType === "percent" ? ` (${discountValue}%)` : ""}</span><span>−{fmtUSD(discount)}</span></div>}
              <div className="flex justify-between text-base font-bold text-primary pt-1 border-t"><span>TOTAL</span><span>{fmtUSD(total)}</span></div>
              <p className="text-right text-[10px] text-muted-foreground">{fmtBoth(total).split(" • ")[1]}</p>
            </div>

            {/* PAYMENT */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1"><Wallet className="h-3 w-3" />Payment</Label>
                <button type="button" onClick={() => setSplitMode(m => !m)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${splitMode ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                  {splitMode ? "Split: ON" : "Split Bill"}
                </button>
              </div>

              {!splitMode ? (
                <Select value={autoMethod} onValueChange={setAutoMethod}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <>
                  {splits.map(s => (
                    <div key={s.id} className="flex gap-1 items-center">
                      <Select value={s.method} onValueChange={v => updSplit(s.id, { method: v })}>
                        <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" step="0.01" className="h-8 w-24" placeholder="0.00" value={s.amount || ""} onChange={e => updSplit(s.id, { amount: Number(e.target.value) || 0 })} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Fill remaining" onClick={() => fillRemaining(s.id)}><span className="text-xs">=</span></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rmSplit(s.id)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="h-7 text-xs w-full" onClick={addSplit}><Plus className="h-3 w-3 mr-1" />Add payment row</Button>
                </>
              )}

              <div className="flex justify-between text-xs pt-1">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium">{fmtUSD(totalPaid)}</span>
              </div>
              <div className={`flex justify-between text-sm font-semibold ${due > 0 ? "text-destructive" : "text-success"}`}>
                <span>{due > 0 ? "Balance Due" : "Fully Paid"}</span>
                <span>{fmtUSD(due)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={() => checkout(true)} disabled={cart.length === 0}>
                <Clock className="h-4 w-4 mr-1" />Save as Due
              </Button>
              <Button onClick={() => checkout(false)} disabled={cart.length === 0 || due > 0.01}>
                Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Item</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={custom.item_type} onValueChange={v => setCustom({ ...custom, item_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CAT_META).filter(([k]) => k !== "medicine").map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" step="0.01" value={custom.price_usd} onChange={e => setCustom({ ...custom, price_usd: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={addCustom}>Add to Cart</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INVOICE PREVIEW */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Invoice Preview</DialogTitle>
          </DialogHeader>
          {lastInvoice && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-start border-b-2 border-primary pb-3">
                <div>
                  <div className="text-xl font-bold text-primary">+ Prime Poly Clinic</div>
                  <p className="text-xs text-muted-foreground">Invoice / Receipt</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{lastInvoice.invoice}</p>
                  <p className="text-xs text-muted-foreground">{new Date(lastInvoice.created_at).toLocaleString()}</p>
                  <Badge variant={lastInvoice.status === "paid" ? "default" : lastInvoice.status === "partial" ? "secondary" : "destructive"} className="mt-1 uppercase">{lastInvoice.status}</Badge>
                </div>
              </div>
              <div className="bg-muted/50 p-2 rounded text-xs">
                {lastInvoice.patient ? <><b>{lastInvoice.patient.full_name}</b> — {lastInvoice.patient.patient_code}</> : <b>Walk-in customer</b>}
              </div>
              <table className="w-full text-xs border-collapse">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="p-2 text-center w-10">SL</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center w-12">Qty</th>
                    <th className="p-2 text-right w-24">Unit Price</th>
                    <th className="p-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastInvoice.items.map((i: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-medium">{i.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{i.item_type}{i.description ? ` — ${i.description}` : ""}</div>
                      </td>
                      <td className="p-2 text-center">{i.quantity}</td>
                      <td className="p-2 text-right">{fmtUSD(i.price_usd)}<div className="text-[10px] text-muted-foreground">{KHR(i.price_usd)}</div></td>
                      <td className="p-2 text-right font-semibold">{fmtUSD(i.price_usd * i.quantity)}<div className="text-[10px] text-muted-foreground font-normal">{KHR(i.price_usd * i.quantity)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ml-auto w-full sm:w-2/3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtUSD(lastInvoice.subtotal)} • {KHR(lastInvoice.subtotal)}</span></div>
                {lastInvoice.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>−{fmtUSD(lastInvoice.discount)}</span></div>}
                <div className="flex justify-between font-bold text-base text-primary border-y-2 border-primary py-2">
                  <span>TOTAL</span>
                  <span className="text-right">{fmtUSD(lastInvoice.total)}<div className="text-xs">{KHR(lastInvoice.total)}</div></span>
                </div>
                <div className="flex justify-between"><span>Paid</span><span>{fmtUSD(lastInvoice.paid)}</span></div>
                {lastInvoice.due > 0 && <div className="flex justify-between text-destructive font-bold"><span>BALANCE DUE</span><span>{fmtUSD(lastInvoice.due)}</span></div>}
              </div>
              {lastInvoice.splits?.length > 0 && (
                <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                  <p className="font-semibold">Payment Breakdown</p>
                  {lastInvoice.splits.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between"><span className="uppercase">{s.method}</span><span>{fmtUSD(Number(s.amount))}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={() => lastInvoice && printReceipt(lastInvoice)}><Receipt className="h-4 w-4 mr-1" />Print Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
