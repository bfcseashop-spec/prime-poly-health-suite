import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, UserPlus, LayoutGrid, List, MoreHorizontal, Eye, Pencil, Trash2, Phone, MapPin, Camera, Users, Heart, ShieldCheck, Cake } from "lucide-react";
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
  notes: z.string().max(1000).optional().or(z.literal("")),
});

type Patient = any;
const empty = { full_name: "", phone: "", gender: "", dob: "", address: "", blood_group: "", insurance_provider: "", insurance_policy: "", notes: "", photo_url: "" };

function ageFromDob(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function initials(name?: string) {
  return (name ?? "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function Patients() {
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [nextCode, setNextCode] = useState<string>("");

  const previewNextCode = async () => {
    const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
    const n = (count ?? 0) + 1;
    setNextCode(`PD-${String(n).padStart(2, "0")}`);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(1000);
    setList(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = async () => {
    setEditing(null); setForm(empty); setPhotoFile(null); setPhotoPreview(""); setOpen(true);
    await previewNextCode();
  };
  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({ ...empty, ...p, dob: p.dob ?? "" });
    setPhotoFile(null); setPhotoPreview(p.photo_url ?? "");
    setOpen(true);
  };

  const onPickPhoto = (file: File | null) => {
    setPhotoFile(file);
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (patientId: string) => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `${patientId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("patient-photos").upload(path, photoFile, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("patient-photos").getPublicUrl(path).data.publicUrl;
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setSaving(true);
    try {
      const payload: any = { ...parsed.data };
      Object.keys(payload).forEach(k => payload[k] === "" && delete payload[k]);

      if (editing) {
        if (photoFile) {
          const url = await uploadPhoto(editing.id);
          if (url) payload.photo_url = url;
        }
        const { error } = await supabase.from("patients").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Patient updated");
      } else {
        const { data: codeData } = await supabase.rpc("generate_patient_code" as any);
        const code = codeData ?? `PPC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
        payload.patient_code = code;
        const { data: inserted, error } = await supabase.from("patients").insert(payload).select().single();
        if (error) throw error;
        if (photoFile && inserted) {
          const url = await uploadPhoto(inserted.id);
          if (url) await supabase.from("patients").update({ photo_url: url }).eq("id", inserted.id);
        }
        toast.success(`Patient ${code} registered`);
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const removePatient = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("patients").delete().eq("id", confirmDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Patient deleted");
    setConfirmDelete(null);
    load();
  };

  const filtered = useMemo(() => list.filter(p => {
    const matchQ = !q || [p.full_name, p.patient_code, p.phone].some((v: string) => v?.toLowerCase().includes(q.toLowerCase()));
    const matchG = gender === "all" || p.gender === gender;
    return matchQ && matchG;
  }), [list, q, gender]);

  const stats = useMemo(() => ({
    total: list.length,
    male: list.filter(p => p.gender === "male").length,
    female: list.filter(p => p.gender === "female").length,
    insured: list.filter(p => !!p.insurance_provider).length,
  }), [list]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground mt-1">Manage patient records, history & profiles</p>
        </div>
        <Button onClick={openNew} className="shadow-soft"><UserPlus className="h-4 w-4 mr-2" />New Patient</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Patients", v: stats.total, Icon: Users, tone: "bg-primary/10 text-primary" },
          { label: "Male", v: stats.male, Icon: Users, tone: "bg-blue-500/10 text-blue-600" },
          { label: "Female", v: stats.female, Icon: Heart, tone: "bg-pink-500/10 text-pink-600" },
          { label: "Insured", v: stats.insured, Icon: ShieldCheck, tone: "bg-success/10 text-success" },
        ].map(({ label, v, Icon, tone }) => (
          <Card key={label} className="p-4 shadow-soft hover:shadow-card transition-all">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold leading-tight">{v}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="p-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, ID, phone..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={v => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4 mr-1" />Grid</TabsTrigger>
              <TabsTrigger value="list"><List className="h-4 w-4 mr-1" />List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="p-4 h-48 animate-pulse bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground shadow-soft">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No patients found. Try a different search or add a new patient.
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const age = ageFromDob(p.dob);
            return (
              <Card key={p.id} className="group overflow-hidden shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5">
                <div className="h-20 clinic-gradient relative">
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/patients/${p.id}`}><Eye className="h-4 w-4 mr-2" />View Profile</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(p)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="px-4 pb-4 -mt-10">
                  <Avatar className="h-20 w-20 border-4 border-card shadow-card">
                    <AvatarImage src={p.photo_url} alt={p.full_name} />
                    <AvatarFallback className="text-lg bg-accent text-accent-foreground">{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="mt-3">
                    <Link to={`/patients/${p.id}`} className="font-semibold text-base hover:text-primary transition-colors line-clamp-1">{p.full_name}</Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono text-xs">{p.patient_code}</Badge>
                      {p.blood_group && <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs">{p.blood_group}</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {p.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{p.phone}</div>}
                    {age !== null && <div className="flex items-center gap-2"><Cake className="h-3.5 w-3.5" />{age} yrs • <span className="capitalize">{p.gender ?? "—"}</span></div>}
                    {p.address && <div className="flex items-center gap-2 line-clamp-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.address}</div>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1"><Link to={`/patients/${p.id}`}><Eye className="h-3.5 w-3.5 mr-1" />View</Link></Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(p)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Gender / Age</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const age = ageFromDob(p.dob);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarImage src={p.photo_url} /><AvatarFallback className="bg-accent text-accent-foreground text-xs">{initials(p.full_name)}</AvatarFallback></Avatar>
                        <Link to={`/patients/${p.id}`} className="font-medium hover:text-primary">{p.full_name}</Link>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{p.patient_code}</Badge></TableCell>
                    <TableCell className="capitalize">{p.gender ?? "—"}{age !== null ? ` • ${age}y` : ""}</TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell>{p.blood_group ?? "—"}</TableCell>
                    <TableCell>{p.insurance_provider ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button asChild size="icon" variant="ghost"><Link to={`/patients/${p.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(p)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Patient" : "Register New Patient"}</DialogTitle>
            {!editing && nextCode && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground">Patient ID:</span>
                <Badge variant="outline" className="font-mono">{nextCode}</Badge>
                <span className="text-xs text-muted-foreground">(auto-generated)</span>
              </div>
            )}
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2 flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
              <Avatar className="h-24 w-24 border-2 border-card shadow-card ring-2 ring-primary/20">
                <AvatarImage src={photoPreview} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-lg">{initials(form.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => onPickPhoto(e.target.files?.[0] ?? null)} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" />{photoPreview ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {photoPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(""); setForm({ ...form, photo_url: "" }); if (fileRef.current) fileRef.current.value = ""; }}>
                      <Trash2 className="h-4 w-4 mr-2" />Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG / PNG / WEBP — square image works best (max 5MB)</p>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dob ?? ""} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
            <div className="space-y-2"><Label>Gender</Label>
              <Select value={form.gender ?? ""} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Blood Group</Label>
              <Select value={form.blood_group ?? ""} onValueChange={v => setForm({ ...form, blood_group: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Insurance Provider</Label><Input value={form.insurance_provider ?? ""} onChange={e => setForm({ ...form, insurance_provider: e.target.value })} /></div>
            <div className="space-y-2"><Label>Policy Number</Label><Input value={form.insurance_policy ?? ""} onChange={e => setForm({ ...form, insurance_policy: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Register Patient"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <span className="font-semibold">{confirmDelete?.full_name}</span> ({confirmDelete?.patient_code}). This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removePatient} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
