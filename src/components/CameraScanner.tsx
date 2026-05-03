import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDetected: (code: string) => void;
  continuous?: boolean;
}

export function CameraScanner({ open, onOpenChange, onDetected, continuous = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const lastRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        // Prompt for permission so labels populate
        const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        tmp.getTracks().forEach(t => t.stop());
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(list);
        const back = list.find(d => /back|rear|environment/i.test(d.label));
        setDeviceId(back?.deviceId || list[0]?.deviceId || "");
      } catch (e: any) {
        toast.error("Camera access denied: " + (e?.message || e));
        onOpenChange(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || !deviceId || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, _err, controls) => {
      if (stopped) return;
      controlsRef.current = controls;
      if (result) {
        const code = result.getText();
        const now = Date.now();
        if (code === lastRef.current.code && now - lastRef.current.t < 1500) return;
        lastRef.current = { code, t: now };
        onDetected(code);
        if (!continuous) {
          controls.stop();
          onOpenChange(false);
        }
      }
    }).then(c => { controlsRef.current = c; }).catch(e => toast.error("Scanner error: " + e?.message));
    return () => {
      stopped = true;
      try { controlsRef.current?.stop(); } catch {}
    };
  }, [open, deviceId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) try { controlsRef.current?.stop(); } catch {} onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Camera Barcode Scanner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {devices.length > 1 && (
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger><SelectValue placeholder="Select camera" /></SelectTrigger>
              <SelectContent>
                {devices.map(d => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-1/3 border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {continuous ? "Point camera at barcode — scans automatically. Keep open to scan multiple." : "Point camera at barcode — closes after first scan."}
          </p>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
