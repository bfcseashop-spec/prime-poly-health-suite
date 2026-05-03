import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, Calendar as CalIcon, FileDown, X, Eye, Printer, Trash2, Pencil, Plus } from "lucide-react";
import { fmtUSD } from "@/lib/currency";
import { buildInvoiceHTML, printInvoice, type InvoiceData } from "@/lib/invoice";
import { toast } from "sonner";

const PAYMENTS = [
  { value: "all", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "aba", label: "ABA Bank" },
  { value: "acleda", label: "ACLEDA Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "visa", label: "Card" },
  { value: "mixed", label: "Split / Mixed" },
];

const PAY_METHODS = ["cash", "aba", "acleda", "paypal", "visa"];

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
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editPayments, setEditPayments] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("medicine_sales").select("*").order("created_at", { ascending: false }).limit(1000);
    setSales(data ?? []);
    const ids = Array.from(new Set((data ?? []).map(s => s.patient_id).filter(Boolean)));
    if (ids.length) {
      const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code, phone, gender").in("id", ids as string[]);
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

  const fetchInvoiceData = async (sale: any) => {
    const [i, p] = await Promise.all([
      supabase.from("medicine_sale_items").select("*").eq("sale_id", sale.id),
      supabase.from("invoice_payments" as any).select("*").eq("sale_id", sale.id).order("created_at"),
    ]);
    return { items: (i.data ?? []) as any[], payments: ((p.data as any[]) ?? []) };
  };

  const openInvoice = async (sale: any) => {
    setOpenSale(sale);
    const r = await fetchInvoiceData(sale);
    setItems(r.items); setPayments(r.payments);
  };

  const openEdit = async (sale: any) => {
    const r = await fetchInvoiceData(sale);
    setOpenSale(sale);
    setEditItems(r.items.map(it => ({ ...it })));
    setEditPayments(r.payments.length ? r.payments.map(p => ({ ...p })) : [{ id: null, payment_method: sale.payment_method ?? "cash", amount_usd: Number(sale.amount_paid_usd ?? 0), reference: "" }]);
    setEditDiscount(Number(sale.discount_usd ?? 0));
    setEditNotes(sale.notes ?? "");
    setEditOpen(true);
  };

  const buildInvoicePayload = (sale: any): InvoiceData => ({
    invoice: sale.invoice_no,
    created_at: sale.created_at,
    status: sale.status ?? "paid",
    patient: sale.patient_id ? patients[sale.patient_id] : null,
    items: items.map(i => ({ name: i.name, description: i.description, item_type: i.item_type ?? "medicine", quantity: Number(i.quantity), price_usd: Number(i.price_usd) })),
    subtotal: Number(sale.subtotal_usd ?? 0),
    discount: Number(sale.discount_usd ?? 0) + Number(sale.insurance_discount_usd ?? 0),
    total: Number(sale.total_usd ?? 0),
    paid: Number(sale.amount_paid_usd ?? 0),
    due: Number(sale.due_usd ?? 0),
    splits: payments.map(p => ({ method: p.payment_method, amount: Number(p.amount_usd) })),
    notes: sale.notes,
  });

  const printOne = async (sale: any) => {
    const r = await fetchInvoiceData(sale);
    setItems(r.items); setPayments(r.payments);
    // need fresh data, build directly
    const data: InvoiceData = {
      invoice: sale.invoice_no,
      created_at: sale.created_at,
      status: sale.status ?? "paid",
      patient: sale.patient_id ? patients[sale.patient_id] : null,
      items: r.items.map(i => ({ name: i.name, description: i.description, item_type: i.item_type ?? "medicine", quantity: Number(i.quantity), price_usd: Number(i.price_usd) })),
      subtotal: Number(sale.subtotal_usd ?? 0),
      discount: Number(sale.discount_usd ?? 0) + Number(sale.insurance_discount_usd ?? 0),
      total: Number(sale.total_usd ?? 0),
      paid: Number(sale.amount_paid_usd ?? 0),
      due: Number(sale.due_usd ?? 0),
      splits: r.payments.map(p => ({ method: p.payment_method, amount: Number(p.amount_usd) })),
      notes: sale.notes,
    };
    printInvoice(data, false);
  };

  const deleteInvoice = async (sale: any) => {
    // restore stock for medicines / injections
    const { data: its } = await supabase.from("medicine_sale_items").select("*").eq("sale_id", sale.id);
    for (const it of its ?? []) {
      if ((it.item_type === "medicine" || !it.item_type) && it.medicine_id) {
        const { data: m } = await supabase.from("medicines").select("stock").eq("id", it.medicine_id).maybeSingle();
        if (m) await supabase.from("medicines").update({ stock: Number(m.stock) + Number(it.quantity) }).eq("id", it.medicine_id);
      } else if (it.item_type === "injection" && it.ref_id) {
        const { data: inj } = await supabase.from("injections" as any).select("stock").eq("id", it.ref_id).maybeSingle();
        if (inj) await supabase.from("injections" as any).update({ stock: Number((inj as any).stock) + Number(it.quantity) }).eq("id", it.ref_id);
      }
    }
    await supabase.from("invoice_payments" as any).delete().eq("sale_id", sale.id);
    await supabase.from("medicine_sale_items").delete().eq("sale_id", sale.id);
    const { error } = await supabase.from("medicine_sales").delete().eq("id", sale.id);
    if (error) return toast.error(error.message);
    toast.success(`Invoice ${sale.invoice_no} deleted`);
    setConfirmDelete(null);
    setOpenSale(null);
    load();
  };

  const editSubtotal = useMemo(() => editItems.reduce((s, i) => s + Number(i.price_usd) * Number(i.quantity), 0), [editItems]);
  const editTotal = Math.max(0, +(editSubtotal - Number(editDiscount || 0)).toFixed(2));
  const editPaid = useMemo(() => editPayments.reduce((s, p) => s + (Number(p.amount_usd) || 0), 0), [editPayments]);
  const editDue = Math.max(0, +(editTotal - editPaid).toFixed(2));

  const updEditItem = (idx: number, patch: any) => setEditItems(editItems.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const rmEditItem = (idx: number) => setEditItems(editItems.filter((_, i) => i !== idx));
  const updEditPay = (idx: number, patch: any) => setEditPayments(editPayments.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const rmEditPay = (idx: number) => setEditPayments(editPayments.filter((_, i) => i !== idx));
  const addEditPay = () => setEditPayments([...editPayments, { id: null, payment_method: "cash", amount_usd: editDue, reference: "" }]);

  const saveEdit = async () => {
    if (!openSale) return;
    const status = editDue < 0.01 ? "paid" : editPaid > 0 ? "partial" : "due";
    const primary = editPayments[0]?.payment_method ?? "cash";
    const { error } = await supabase.from("medicine_sales").update({
      subtotal_usd: editSubtotal,
      discount_usd: Number(editDiscount) || 0,
      total_usd: editTotal,
      amount_paid_usd: editPaid,
      due_usd: editDue,
      status,
      payment_method: primary,
      notes: editNotes,
    } as any).eq("id", openSale.id);
    if (error) return toast.error(error.message);

    // sync items: delete + reinsert (simpler)
    await supabase.from("medicine_sale_items").delete().eq("sale_id", openSale.id);
    if (editItems.length) {
      await supabase.from("medicine_sale_items").insert(
        editItems.map(it => ({
          sale_id: openSale.id,
          medicine_id: it.medicine_id ?? null,
          item_type: it.item_type ?? "medicine",
          ref_id: it.ref_id ?? null,
          name: it.name,
          description: it.description ?? null,
          quantity: Number(it.quantity),
          price_usd: Number(it.price_usd),
          total_usd: Number(it.price_usd) * Number(it.quantity),
        })) as any
      );
    }

    // sync payments
    await supabase.from("invoice_payments" as any).delete().eq("sale_id", openSale.id);
    const validPays = editPayments.filter(p => Number(p.amount_usd) > 0);
    if (validPays.length) {
      await supabase.from("invoice_payments" as any).insert(
        validPays.map(p => ({
          sale_id: openSale.id,
          amount_usd: Number(p.amount_usd),
          payment_method: p.payment_method,
          reference: p.reference || null,
        }))
      );
    }
    toast.success("Invoice updated");
    setEditOpen(false);
    setOpenSale(null);
    load();
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

  const previewData: InvoiceData | null = openSale ? buildInvoicePayload(openSale) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />Invoice History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Search, view, edit, print or delete past invoices</p>
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
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
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
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">Loading…</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">No invoices match your filters</TableCell></TableRow>
                : filtered.map(s => {
                  const p = s.patient_id ? patients[s.patient_id] : null;
                  return (
                    <TableRow key={s.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-sm">{s.invoice_no}</TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{p ? `${p.patient_code} — ${p.full_name}` : <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                      <TableCell className="text-sm capitalize">{s.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(s.total_usd))}</TableCell>
                      <TableCell className="text-right text-success">{fmtUSD(Number(s.amount_paid_usd ?? 0))}</TableCell>
                      <TableCell className="text-right text-destructive">{Number(s.due_usd) > 0 ? fmtUSD(Number(s.due_usd)) : "—"}</TableCell>
                      <TableCell><StatusBadge s={s.status ?? "paid"} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="View" onClick={() => openInvoice(s)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Print" onClick={() => printOne(s)}><Printer className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setConfirmDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW DIALOG — full invoice preview */}
      <Dialog open={!!openSale && !editOpen} onOpenChange={o => !o && setOpenSale(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />{openSale?.invoice_no}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="bg-muted/30 rounded-md overflow-hidden border">
              <iframe
                title="Invoice preview"
                srcDoc={buildInvoiceHTML(previewData, false)}
                className="w-full bg-white"
                style={{ height: "70vh", border: 0 }}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openSale && openEdit(openSale)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
              <Button variant="outline" className="text-destructive" onClick={() => openSale && setConfirmDelete(openSale)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => previewData && printInvoice(previewData, true)}><Printer className="h-4 w-4 mr-1" />Print (Compact)</Button>
              <Button onClick={() => previewData && printInvoice(previewData, false)}><Printer className="h-4 w-4 mr-1" />Print (Full size)</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" />Edit Invoice {openSale?.invoice_no}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Items</Label>
              </div>
              <div className="border rounded-md divide-y">
                {editItems.length === 0 && <p className="p-3 text-xs text-center text-muted-foreground">No items</p>}
                {editItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center">
                    <Input className="col-span-5 h-8 text-xs" value={it.name} onChange={e => updEditItem(idx, { name: e.target.value })} placeholder="Name" />
                    <Input className="col-span-3 h-8 text-xs" value={it.description ?? ""} onChange={e => updEditItem(idx, { description: e.target.value })} placeholder="Description" />
                    <Input type="number" className="col-span-1 h-8 text-xs" value={it.quantity} onChange={e => updEditItem(idx, { quantity: Number(e.target.value) || 0 })} />
                    <Input type="number" step="0.01" className="col-span-2 h-8 text-xs" value={it.price_usd} onChange={e => updEditItem(idx, { price_usd: Number(e.target.value) || 0 })} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 col-span-1" onClick={() => rmEditItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditItems([...editItems, { name: "", description: "", item_type: "service", quantity: 1, price_usd: 0 }])}><Plus className="h-3 w-3 mr-1" />Add item</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discount (USD)</Label>
                <Input type="number" step="0.01" value={editDiscount} onChange={e => setEditDiscount(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Payments</Label>
                <Button variant="ghost" size="sm" onClick={addEditPay}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              <div className="border rounded-md divide-y">
                {editPayments.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center">
                    <Select value={p.payment_method} onValueChange={v => updEditPay(idx, { payment_method: v })}>
                      <SelectTrigger className="col-span-4 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" className="col-span-3 h-8 text-xs" value={p.amount_usd} onChange={e => updEditPay(idx, { amount_usd: Number(e.target.value) || 0 })} />
                    <Input className="col-span-4 h-8 text-xs" placeholder="Reference (optional)" value={p.reference ?? ""} onChange={e => updEditPay(idx, { reference: e.target.value })} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 col-span-1" onClick={() => rmEditPay(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-sm bg-muted/40 p-3 rounded-md">
              <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{fmtUSD(editSubtotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-primary">{fmtUSD(editTotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-success">{fmtUSD(editPaid)}</p></div>
              <div><p className="text-xs text-muted-foreground">Due</p><p className={`font-semibold ${editDue > 0 ? "text-destructive" : "text-success"}`}>{fmtUSD(editDue)}</p></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {confirmDelete?.invoice_no}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the invoice, its items and payment records. Stock for medicines/injections will be restored. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteInvoice(confirmDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
