import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlaskConical, Plus, Pencil, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TEST_TYPES = ["Blood", "Urine", "Stool", "X-Ray", "Ultrasound", "MRI", "CT Scan", "ECG", "Biopsy", "Other"];
const STATUSES = ["pending", "in_progress", "completed", "reviewed"];

const empty = {
  test_name: "", test_type: "Blood",
  test_date: new Date().toISOString().slice(0, 10),
  report_date: "", lab_name: "", results: "", reference_range: "",
  status: "pending", notes: "", ordered_by_name: "", file_url: "",
};

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  in_progress: "bg-blue-500/10 text-blue-600",
  completed: "bg-success/10 text-success",
  reviewed: "bg-primary/10 text-primary",
};

export default function LabReportsTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("lab_reports" as any)
      .select("*").eq("patient_id", patientId).order("test_date", { ascending: false });
    setList((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [patientId]);

  const openNew = () => { setEditing(null); setForm(empty); setFile(null); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...empty, ...r, report_date: r.report_date ?? "" });
    setFile(null); setOpen(true);
  };

  const upload = async (id: string) => {
    if (!file) return null;
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${patientId}/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lab-reports").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("lab-reports").getPublicUrl(path).data.publicUrl;
  };

  const submit = async () => {
    if (!form.test_name) return toast.error("Test name is required");
    setSaving(true);
    try {
      const payload: any = { ...form, patient_id: patientId };
      Object.keys(payload).forEach(k => payload[k] === "" && (payload[k] = null));
      if (editing) {
        if (file) { const url = await upload(editing.id); if (url) payload.file_url = url; }
        const { error } = await supabase.from("lab_reports" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Lab report updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        payload.created_by = u.user?.id ?? null;
        const { data: ins, error } = await supabase.from("lab_reports" as any).insert(payload).select().single();
        if (error) throw error;
        if (file && ins) {
          const url = await upload((ins as any).id);
          if (url) await supabase.from("lab_reports" as any).update({ file_url: url }).eq("id", (ins as any).id);
        }
        toast.success("Lab report added");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    const { error } = await supabase.from("lab_reports" as any).delete().eq("id", del.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); setDel(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Lab tests, imaging & diagnostic reports</div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-2" />Add Lab Report</Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground shadow-soft">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No lab reports yet for this patient.
        </Card>
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Test Date</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Report</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.test_name}</div>
                    {r.results && <div className="text-xs text-muted-foreground line-clamp-1">{r.results}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.test_type ?? "—"}</Badge></TableCell>
                  <TableCell>{new Date(r.test_date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.lab_name ?? "—"}</TableCell>
                  <TableCell><Badge className={`capitalize ${statusColor[r.status] ?? ""}`}>{r.status?.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    {r.file_url ? (
                      <a href={r.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                        <FileText className="h-3.5 w-3.5" />View<ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDel(r)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Lab Report" : "New Lab Report"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 md:col-span-2"><Label>Test Name *</Label><Input value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} placeholder="e.g. Complete Blood Count" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.test_type} onValueChange={v => setForm({ ...form, test_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Test Date</Label><Input type="date" value={form.test_date} onChange={e => setForm({ ...form, test_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Lab Name</Label><Input value={form.lab_name} onChange={e => setForm({ ...form, lab_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Ordered By (Doctor)</Label><Input value={form.ordered_by_name} onChange={e => setForm({ ...form, ordered_by_name: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Results</Label><Textarea rows={3} value={form.results} onChange={e => setForm({ ...form, results: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Reference Range</Label><Input value={form.reference_range} onChange={e => setForm({ ...form, reference_range: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label>Report File (PDF/Image)</Label>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Choose File</Button>
                <span className="text-sm text-muted-foreground">{file?.name ?? (form.file_url ? "Existing file attached" : "No file selected")}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : editing ? "Save" : "Add Report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={() => setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete lab report?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
