import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { FilePlus, Pencil, Trash2, Calendar, Stethoscope, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const empty = {
  doctor_name: "", record_date: new Date().toISOString().slice(0, 10),
  chief_complaint: "", symptoms: "", examination: "", diagnosis: "",
  treatment_plan: "", advice: "", follow_up_date: "",
};

export default function MedicalRecordsTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("medical_records" as any)
      .select("*").eq("patient_id", patientId).order("record_date", { ascending: false });
    setList((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [patientId]);

  const openNew = async () => {
    const { data: u } = await supabase.auth.getUser();
    let name = "";
    if (u.user) {
      const { data: pr } = await supabase.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
      name = pr?.full_name ?? "";
    }
    setEditing(null); setForm({ ...empty, doctor_name: name }); setOpen(true);
  };
  const openEdit = (r: any) => { setEditing(r); setForm({ ...empty, ...r, follow_up_date: r.follow_up_date ?? "" }); setOpen(true); };

  const submit = async () => {
    if (!form.chief_complaint && !form.diagnosis && !form.symptoms) {
      return toast.error("Please enter at least a complaint, symptom, or diagnosis");
    }
    setSaving(true);
    try {
      const payload: any = { ...form, patient_id: patientId };
      Object.keys(payload).forEach(k => payload[k] === "" && (payload[k] = null));
      if (editing) {
        const { error } = await supabase.from("medical_records" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Record updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        payload.created_by = u.user?.id ?? null;
        const { error } = await supabase.from("medical_records" as any).insert(payload);
        if (error) throw error;
        toast.success("Medical record added");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    const { error } = await supabase.from("medical_records" as any).delete().eq("id", del.id);
    if (error) return toast.error(error.message);
    toast.success("Record deleted"); setDel(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Doctor's clinical notes & consultation history</div>
        <Button onClick={openNew} size="sm"><FilePlus className="h-4 w-4 mr-2" />Add Record</Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground shadow-soft">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No medical records yet. Add the first consultation note.
        </Card>
      ) : (
        <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {list.map(r => (
            <div key={r.id} className="relative pl-12">
              <div className="absolute left-0 top-3 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-4 ring-background">
                <Stethoscope className="h-4 w-4" />
              </div>
              <Card className="p-4 shadow-soft hover:shadow-card transition-all">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{new Date(r.record_date).toLocaleDateString()}</Badge>
                      {r.doctor_name && <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Dr. {r.doctor_name}</Badge>}
                      {r.follow_up_date && <Badge variant="outline" className="text-warning border-warning/40">Follow-up: {new Date(r.follow_up_date).toLocaleDateString()}</Badge>}
                    </div>
                    {r.diagnosis && <div className="mt-2 font-semibold">{r.diagnosis}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDel(r)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {r.chief_complaint && <Field label="Chief Complaint" value={r.chief_complaint} />}
                  {r.symptoms && <Field label="Symptoms" value={r.symptoms} />}
                  {r.examination && <Field label="Examination" value={r.examination} />}
                  {r.treatment_plan && <Field label="Treatment Plan" value={r.treatment_plan} />}
                  {r.advice && <div className="md:col-span-2"><Field label="Advice" value={r.advice} /></div>}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Medical Record" : "New Medical Record"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2"><Label>Doctor Name</Label><Input value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Record Date</Label><Input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Chief Complaint</Label><Textarea rows={2} value={form.chief_complaint} onChange={e => setForm({ ...form, chief_complaint: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Symptoms</Label><Textarea rows={2} value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Examination Findings</Label><Textarea rows={2} value={form.examination} onChange={e => setForm({ ...form, examination: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Diagnosis</Label><Textarea rows={2} value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Treatment Plan</Label><Textarea rows={2} value={form.treatment_plan} onChange={e => setForm({ ...form, treatment_plan: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Advice</Label><Textarea rows={2} value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })} /></div>
            <div className="space-y-2"><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : editing ? "Save" : "Add Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={() => setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete record?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}
