import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  gender: z.string().optional(),
  dob: z.string().optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  blood_group: z.string().max(5).optional().or(z.literal("")),
  insurance_provider: z.string().max(120).optional().or(z.literal("")),
  insurance_policy: z.string().max(120).optional().or(z.literal("")),
});

export default function Patients() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ full_name: "", phone: "", gender: "", dob: "", address: "", blood_group: "", insurance_provider: "", insurance_policy: "" });

  const load = async () => {
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(500);
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setSaving(true);
    const { data: codeData } = await supabase.rpc("generate_patient_code" as any);
    const code = codeData ?? `PPC-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,"0")}`;
    const payload: any = { ...parsed.data, patient_code: code };
    if (!payload.dob) delete payload.dob;
    Object.keys(payload).forEach(k => payload[k] === "" && delete payload[k]);
    const { error } = await supabase.from("patients").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Patient ${code} registered`);
    setOpen(false);
    setForm({ full_name: "", phone: "", gender: "", dob: "", address: "", blood_group: "", insurance_provider: "", insurance_policy: "" });
    load();
  };

  const filtered = list.filter(p =>
    !q || p.full_name?.toLowerCase().includes(q.toLowerCase()) || p.patient_code?.toLowerCase().includes(q.toLowerCase()) || p.phone?.includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground mt-1">{list.length} registered patients</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />New Patient</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Register New Patient</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2 md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="space-y-2"><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={e => setForm({ ...form, insurance_provider: e.target.value })} /></div>
              <div className="space-y-2"><Label>Policy Number</Label><Input value={form.insurance_policy} onChange={e => setForm({ ...form, insurance_policy: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Register Patient"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, ID, phone..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead><TableHead>Name</TableHead><TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead><TableHead>Blood</TableHead><TableHead>Insurance</TableHead><TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No patients found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell><Badge variant="outline" className="font-mono">{p.patient_code}</Badge></TableCell>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell className="capitalize">{p.gender ?? "—"}</TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>{p.blood_group ?? "—"}</TableCell>
                <TableCell>{p.insurance_provider ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
