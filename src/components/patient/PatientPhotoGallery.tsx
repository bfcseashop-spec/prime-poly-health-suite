import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, ImagePlus, Trash2, X, Download, Pencil, Check, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Photo = {
  id: string;
  patient_id: string;
  file_url: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function PatientPhotoGallery({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_photos" as any)
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPhotos(((data as any) ?? []) as Photo[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const upload = async (files: File[]) => {
    const valid = files.filter(f => {
      if (!ACCEPT.includes(f.type)) { toast.error(`${f.name}: unsupported format`); return false; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: exceeds 5MB`); return false; }
      return true;
    });
    if (valid.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: valid.length });

    let success = 0;
    for (const file of valid) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${patientId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("patient-photos").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) { toast.error(`${file.name}: ${upErr.message}`); setProgress(p => ({ ...p, done: p.done + 1 })); continue; }
      const url = supabase.storage.from("patient-photos").getPublicUrl(path).data.publicUrl;
      const { error: insErr } = await supabase.from("patient_photos" as any).insert({
        patient_id: patientId, file_url: url, storage_path: path, caption: null, uploaded_by: user?.id ?? null,
      });
      if (insErr) { toast.error(insErr.message); }
      else success++;
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setUploading(false);
    if (success > 0) toast.success(`${success} photo${success > 1 ? "s" : ""} uploaded`);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length) upload(files);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const photo = photos.find(p => p.id === deleteId);
    if (!photo) { setDeleteId(null); return; }
    await supabase.storage.from("patient-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("patient_photos" as any).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Photo deleted");
    if (viewer !== null && photos[viewer]?.id === photo.id) setViewer(null);
    load();
  };

  const saveCaption = async (id: string) => {
    const { error } = await supabase.from("patient_photos" as any).update({ caption: captionDraft || null }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingCaption(null);
    setPhotos(ps => ps.map(p => p.id === id ? { ...p, caption: captionDraft || null } : p));
    toast.success("Caption updated");
  };

  return (
    <div className="space-y-4">
      <Card
        className={`p-6 border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"} shadow-soft`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Images className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Photo Gallery</p>
              <p className="text-xs text-muted-foreground">Drag & drop images here, or click upload. PNG / JPG / WEBP / GIF — max 5MB each.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" multiple accept={ACCEPT.join(",")} className="hidden" onChange={(e) => e.target.files && upload(Array.from(e.target.files))} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Upload className="h-4 w-4 animate-pulse" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? `Uploading ${progress.done}/${progress.total}` : "Upload Photos"}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground shadow-soft">
          <Images className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No photos uploaded yet</p>
          <p className="text-xs mt-1">Add wound progress, prescriptions, ID copies or any clinical reference image.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo, idx) => (
            <Card key={photo.id} className="group relative overflow-hidden shadow-soft hover:shadow-elevated transition-all">
              <button
                type="button"
                onClick={() => setViewer(idx)}
                className="block w-full aspect-square overflow-hidden bg-muted"
              >
                <img
                  src={photo.file_url}
                  alt={photo.caption || "Patient photo"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white shadow" asChild>
                  <a href={photo.file_url} download target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5" /></a>
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-destructive hover:text-white shadow" onClick={() => setDeleteId(photo.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="p-2 bg-card">
                {editingCaption === photo.id ? (
                  <div className="flex items-center gap-1">
                    <Input value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} maxLength={120} className="h-7 text-xs" autoFocus />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveCaption(photo.id)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCaption(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingCaption(photo.id); setCaptionDraft(photo.caption || ""); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full text-left truncate"
                  >
                    <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                    <span className="truncate">{photo.caption || "Add caption…"}</span>
                  </button>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(photo.created_at).toLocaleDateString()}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox viewer */}
      <Dialog open={viewer !== null} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="sr-only"><DialogTitle>Photo viewer</DialogTitle></DialogHeader>
          {viewer !== null && photos[viewer] && (
            <div className="relative">
              <img src={photos[viewer].file_url} alt={photos[viewer].caption || ""} className="w-full max-h-[80vh] object-contain" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Badge variant="secondary" className="bg-black/60 text-white border-0">{viewer + 1} / {photos.length}</Badge>
              </div>
              {viewer > 0 && (
                <Button size="icon" variant="secondary" className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => setViewer(viewer - 1)}><ChevronLeft className="h-5 w-5" /></Button>
              )}
              {viewer < photos.length - 1 && (
                <Button size="icon" variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={() => setViewer(viewer + 1)}><ChevronRight className="h-5 w-5" /></Button>
              )}
              <div className="bg-black/80 text-white p-3 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{photos[viewer].caption || "Untitled"}</span>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-0" asChild>
                    <a href={photos[viewer].file_url} download target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5 mr-1" />Download</a>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(photos[viewer].id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>The image will be permanently removed from storage. This cannot be undone.</AlertDialogDescription>
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
