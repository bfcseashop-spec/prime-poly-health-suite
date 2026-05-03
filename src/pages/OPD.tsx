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
import { Plus, ClipboardList, Activity } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-warning/15 text-warning border-warning/30",
  in_consult: "bg-primary/15 text-primary border-primary/30",
  done: "bg-success/15 text-success border-success/30",
};

export default function OPD() {
  const [visits, setVisits] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [vitalsFor, setVitalsFor] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ patient_id: "", chief_complaint: "" });
  const [vitals, setVitals] = useState<any>({});

  const today = new Date().toISOString().slice(0, 10);
  const load = async () => {
    const [v, p] = await Promise.all([
      supabase.from("opd_visits").select("*, patients(full_name, patient_code)").eq("visit_date", today).order("token_number"),
      supabase.from("patients").select("id, full_name, patient_code").order("created_at", { ascending: false }).limit(200),
    ]);
    setVisits(v.data ?? []);
    setPatients(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addVisit = async () => {
    if (!form.patient_id) return toast.error("Select a patient");
    const nextToken = (visits[visits.length - 1]?.token_number ?? 0) + 1;
    const { error } = await supabase.from("opd_visits").insert({
      patient_id: form.patient_id, chief_complaint: form.chief_complaint, token_number: nextToken, visit_date: today, status: "waiting",
    });
    if (error) return toast.error(error.message);
    toast.success(`Token #${nextToken} added to queue`);
    setOpen(false); setForm({ patient_id: "", chief_complaint: "" }); load();
  };

  const saveVitals = async () => {
    const payload: any = {};
    ["bp","temperature","weight","height","spo2","pulse","notes"].forEach(k => { if (vitals[k] !== undefined && vitals[k] !== "") payload[k] = vitals[k]; });
    payload.status = vitals.status || vitalsFor.status;
    const { error } = await supabase.from("opd_visits").update(payload).eq("id", vitalsFor.id);
    if (error) return toast.error(error.message);
    toast.success("Visit updated");
    setVitalsFor(null); setVitals({}); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">OPD Queue</h1>
          <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add to Queue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Patient to OPD Queue</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Patient</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.patient_code} — {p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Chief Complaint</Label><Textarea value={form.chief_complaint} onChange={e => setForm({ ...form, chief_complaint: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={addVisit}>Add to Queue</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft">
        <Table>
          <TableHeader><TableRow><TableHead>Token</TableHead><TableHead>Patient</TableHead><TableHead>Complaint</TableHead><TableHead>Vitals</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {visits.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No visits today</TableCell></TableRow> :
              visits.map(v => (
                <TableRow key={v.id}>
                  <TableCell><Badge className="bg-primary text-primary-foreground">#{v.token_number}</Badge></TableCell>
                  <TableCell><div className="font-medium">{v.patients?.full_name}</div><div className="text-xs text-muted-foreground">{v.patients?.patient_code}</div></TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{v.chief_complaint || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.bp ? `BP ${v.bp} • T ${v.temperature}° • SpO₂ ${v.spo2}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize ${STATUS_COLORS[v.status] || ""}`}>{v.status?.replace("_"," ")}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => { setVitalsFor(v); setVitals({}); }}><Activity className="h-3 w-3 mr-1" />Vitals</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!vitalsFor} onOpenChange={(o) => !o && setVitalsFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vitals — Token #{vitalsFor?.token_number}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-2"><Label>BP</Label><Input placeholder="120/80" value={vitals.bp ?? vitalsFor?.bp ?? ""} onChange={e => setVitals({ ...vitals, bp: e.target.value })} /></div>
            <div className="space-y-2"><Label>Temperature (°C)</Label><Input type="number" step="0.1" value={vitals.temperature ?? vitalsFor?.temperature ?? ""} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} /></div>
            <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={vitals.weight ?? vitalsFor?.weight ?? ""} onChange={e => setVitals({ ...vitals, weight: e.target.value })} /></div>
            <div className="space-y-2"><Label>Height (cm)</Label><Input type="number" step="0.1" value={vitals.height ?? vitalsFor?.height ?? ""} onChange={e => setVitals({ ...vitals, height: e.target.value })} /></div>
            <div className="space-y-2"><Label>SpO₂ (%)</Label><Input type="number" value={vitals.spo2 ?? vitalsFor?.spo2 ?? ""} onChange={e => setVitals({ ...vitals, spo2: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pulse (bpm)</Label><Input type="number" value={vitals.pulse ?? vitalsFor?.pulse ?? ""} onChange={e => setVitals({ ...vitals, pulse: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Status</Label>
              <Select value={vitals.status ?? vitalsFor?.status} onValueChange={v => setVitals({ ...vitals, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="waiting">Waiting</SelectItem><SelectItem value="in_consult">In Consult</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2"><Label>Notes</Label><Textarea value={vitals.notes ?? vitalsFor?.notes ?? ""} onChange={e => setVitals({ ...vitals, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveVitals}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
