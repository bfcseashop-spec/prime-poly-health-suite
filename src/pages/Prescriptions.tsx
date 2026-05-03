import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { ClinicLogo } from "@/components/ClinicLogo";

type Item = { item_type: "medicine" | "injection" | "lab" | "xray"; name: string; dose?: string; frequency?: string; duration?: string; route?: string; instructions?: string };

export default function Prescriptions() {
  const [list, setList] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ patient_id: "", diagnosis: "", advice: "" });
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => {
    const [r, p] = await Promise.all([
      supabase.from("prescriptions").select("*, patients(full_name, patient_code), prescription_items(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("patients").select("id, full_name, patient_code").order("created_at", { ascending: false }).limit(200),
    ]);
    setList(r.data ?? []);
    setPatients(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addItem = (type: Item["item_type"]) => setItems([...items, { item_type: type, name: "" }]);
  const updItem = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const rmItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.patient_id) return toast.error("Select a patient");
    if (items.length === 0) return toast.error("Add at least one item");
    const { data: rx, error } = await supabase.from("prescriptions").insert({ patient_id: form.patient_id, diagnosis: form.diagnosis, advice: form.advice }).select().single();
    if (error || !rx) return toast.error(error?.message ?? "Failed");
    const payload = items.filter(i => i.name).map(i => ({ ...i, prescription_id: rx.id }));
    const { error: e2 } = await supabase.from("prescription_items").insert(payload);
    if (e2) return toast.error(e2.message);
    toast.success("Prescription created");
    setOpen(false); setForm({ patient_id: "", diagnosis: "", advice: "" }); setItems([]); load();
  };

  const printRx = (rx: any) => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const items = rx.prescription_items ?? [];
    const grouped: Record<string, any[]> = {};
    items.forEach((i: any) => { (grouped[i.item_type] ||= []).push(i); });
    const sectionTitle: any = { medicine: "Medications", injection: "Injections", lab: "Lab Tests", xray: "X-Ray Orders" };
    const sections = Object.keys(grouped).map(type => `
      <h3>${sectionTitle[type]}</h3>
      <ul>${grouped[type].map((i: any) => `<li><strong>${i.name}</strong>${i.dose ? ` — ${i.dose}` : ""}${i.frequency ? `, ${i.frequency}` : ""}${i.duration ? ` × ${i.duration}` : ""}${i.route ? ` (${i.route})` : ""}${i.instructions ? `<br><em>${i.instructions}</em>` : ""}</li>`).join("")}</ul>`).join("");
    w.document.write(`<html><head><title>Prescription</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:auto;color:#0f172a}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #0F6E56;padding-bottom:16px;margin-bottom:24px}
      .logo{width:60px;height:60px;background:#0F6E56;color:white;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:32px;font-weight:bold}
      h1{margin:0;color:#0F6E56;font-size:24px} .sub{color:#64748b;font-size:13px}
      h3{color:#0F6E56;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
      .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0;font-size:14px}
      .meta div{padding:6px 0} .meta strong{color:#475569}
      ul{padding-left:20px} li{margin:8px 0;font-size:14px}
      .footer{margin-top:60px;border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;color:#64748b;font-size:12px}</style></head><body>
      <div class="header"><div class="logo">+</div><div><h1>Prime Poly Clinic</h1><div class="sub">Healthcare Management • Prescription</div></div></div>
      <div class="meta">
        <div><strong>Patient:</strong> ${rx.patients?.full_name ?? ""}</div>
        <div><strong>ID:</strong> ${rx.patients?.patient_code ?? ""}</div>
        <div><strong>Date:</strong> ${new Date(rx.created_at).toLocaleString()}</div>
        <div><strong>Rx #:</strong> ${rx.id.slice(0, 8).toUpperCase()}</div>
      </div>
      ${rx.diagnosis ? `<h3>Diagnosis</h3><p>${rx.diagnosis}</p>` : ""}
      ${sections}
      ${rx.advice ? `<h3>Advice</h3><p>${rx.advice}</p>` : ""}
      <div class="footer">Thank you for choosing Prime Poly Clinic</div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Prescriptions</h1><p className="text-muted-foreground mt-1">{list.length} prescriptions</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Prescription</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Patient *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Items</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" type="button" variant="outline" onClick={() => addItem("medicine")}><Plus className="h-3 w-3 mr-1" />Medicine</Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => addItem("injection")}><Plus className="h-3 w-3 mr-1" />Injection</Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => addItem("lab")}><Plus className="h-3 w-3 mr-1" />Lab</Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => addItem("xray")}><Plus className="h-3 w-3 mr-1" />X-Ray</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 p-2 border rounded-md items-start">
                      <Badge variant="outline" className="col-span-2 capitalize justify-center">{it.item_type}</Badge>
                      <Input className="col-span-3" placeholder="Name" value={it.name} onChange={e => updItem(i, { name: e.target.value })} />
                      {(it.item_type === "medicine" || it.item_type === "injection") && <>
                        <Input className="col-span-2" placeholder="Dose" value={it.dose ?? ""} onChange={e => updItem(i, { dose: e.target.value })} />
                        <Input className="col-span-2" placeholder="Freq" value={it.frequency ?? ""} onChange={e => updItem(i, { frequency: e.target.value })} />
                        <Input className="col-span-2" placeholder="Duration" value={it.duration ?? ""} onChange={e => updItem(i, { duration: e.target.value })} />
                      </>}
                      {it.item_type === "injection" && <Input className="col-span-2 col-start-3 mt-1" placeholder="Route (IV/IM/SC)" value={it.route ?? ""} onChange={e => updItem(i, { route: e.target.value })} />}
                      <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>}
                </div>
              </div>
              <div className="space-y-2"><Label>Advice / Instructions</Label><Textarea value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save Prescription</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Diagnosis</TableHead><TableHead>Items</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No prescriptions yet</TableCell></TableRow> :
              list.map(rx => (
                <TableRow key={rx.id}>
                  <TableCell className="text-sm">{new Date(rx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><div className="font-medium">{rx.patients?.full_name}</div><div className="text-xs text-muted-foreground">{rx.patients?.patient_code}</div></TableCell>
                  <TableCell className="text-sm">{rx.diagnosis || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{rx.prescription_items?.length ?? 0} items</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => printRx(rx)}><Printer className="h-3 w-3 mr-1" />Print</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
