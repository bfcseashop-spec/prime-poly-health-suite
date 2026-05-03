import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, Syringe, Package, Plus, Search, Trash2, Pencil, Eye, Layers, X, Download, Upload, FileSpreadsheet, Barcode as BarcodeIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { fmtUSD } from "@/lib/currency";
import { exportToExcel, exportToCSV, parseImportFile, downloadTemplate, printBarcodes } from "@/lib/dataIO";

type Service = { id: string; name: string; category: string; price_usd: number; description: string | null; active: boolean };
type Injection = { id: string; name: string; brand: string | null; dose: string | null; route: string | null; category: string | null; price_usd: number; stock: number; description: string | null; active: boolean };
type LabTest = { id: string; name: string; price_usd: number };
type XrayTest = { id: string; name: string; price_usd: number; modality: string };
type HPackage = { id: string; code: string | null; name: string; category: string; description: string | null; total_price_usd: number; discount_percent: number; final_price_usd: number; active: boolean };
type PItem = { id?: string; package_id?: string; item_type: string; ref_id: string | null; name: string; price_usd: number; quantity: number };

const SERVICE_CATS = ["consultation", "dressing", "iv_drip", "procedure", "vaccination", "nursing", "service"];
const INJ_ROUTES = ["IM", "IV", "SC", "ID", "Oral"];
const PKG_CATS = ["general", "executive", "antenatal", "diabetes", "cardiac", "fitness", "preventive"];

export default function Services() {
  const [tab, setTab] = useState("services");

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [svcQ, setSvcQ] = useState("");
  const [svcDlg, setSvcDlg] = useState<Partial<Service> | null>(null);

  // Injections
  const [injs, setInjs] = useState<Injection[]>([]);
  const [injQ, setInjQ] = useState("");
  const [injDlg, setInjDlg] = useState<Partial<Injection> | null>(null);

  // Packages
  const [packages, setPackages] = useState<HPackage[]>([]);
  const [pkgItems, setPkgItems] = useState<Record<string, PItem[]>>({});
  const [pkgQ, setPkgQ] = useState("");
  const [pkgDlg, setPkgDlg] = useState<Partial<HPackage> | null>(null);
  const [pkgDlgItems, setPkgDlgItems] = useState<PItem[]>([]);
  const [viewPkg, setViewPkg] = useState<HPackage | null>(null);

  // For package builder
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [xrayTests, setXrayTests] = useState<XrayTest[]>([]);

  const loadAll = async () => {
    const [s, i, p, pi, lt, xt] = await Promise.all([
      supabase.from("service_catalog").select("*").order("name"),
      supabase.from("injections" as any).select("*").order("name"),
      supabase.from("health_packages" as any).select("*").order("name"),
      supabase.from("health_package_items" as any).select("*"),
      supabase.from("lab_tests" as any).select("id, name, price_usd").order("name"),
      supabase.from("xray_tests" as any).select("id, name, price_usd, modality").order("name"),
    ]);
    setServices((s.data as any[]) ?? []);
    setInjs((i.data as any[]) ?? []);
    setPackages((p.data as any[]) ?? []);
    const grouped: Record<string, PItem[]> = {};
    ((pi.data as any[]) ?? []).forEach(it => { (grouped[it.package_id] ||= []).push(it); });
    setPkgItems(grouped);
    setLabTests((lt.data as any[]) ?? []);
    setXrayTests((xt.data as any[]) ?? []);
  };
  useEffect(() => { loadAll(); }, []);

  // Service ops
  const fServices = useMemo(() => services.filter(s => !svcQ || s.name.toLowerCase().includes(svcQ.toLowerCase()) || s.category.toLowerCase().includes(svcQ.toLowerCase())), [services, svcQ]);
  const saveService = async () => {
    if (!svcDlg?.name) return toast.error("Name required");
    const payload: any = { name: svcDlg.name, category: svcDlg.category ?? "service", price_usd: Number(svcDlg.price_usd ?? 0), description: svcDlg.description ?? null, active: svcDlg.active ?? true };
    const q = svcDlg.id ? supabase.from("service_catalog").update(payload).eq("id", svcDlg.id) : supabase.from("service_catalog").insert(payload);
    const { error } = await q; if (error) return toast.error(error.message);
    toast.success("Saved"); setSvcDlg(null); loadAll();
  };
  const delService = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("service_catalog").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  // Injection ops
  const fInjs = useMemo(() => injs.filter(i => !injQ || i.name.toLowerCase().includes(injQ.toLowerCase()) || (i.brand ?? "").toLowerCase().includes(injQ.toLowerCase())), [injs, injQ]);
  const saveInj = async () => {
    if (!injDlg?.name) return toast.error("Name required");
    const payload: any = { name: injDlg.name, brand: injDlg.brand ?? null, dose: injDlg.dose ?? null, route: injDlg.route ?? null, category: injDlg.category ?? "general", price_usd: Number(injDlg.price_usd ?? 0), stock: Number(injDlg.stock ?? 0), description: injDlg.description ?? null, active: injDlg.active ?? true };
    const q = injDlg.id ? supabase.from("injections" as any).update(payload).eq("id", injDlg.id) : supabase.from("injections" as any).insert(payload);
    const { error } = await q; if (error) return toast.error(error.message);
    toast.success("Saved"); setInjDlg(null); loadAll();
  };
  const delInj = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("injections" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  // Package ops
  const fPkgs = useMemo(() => packages.filter(p => !pkgQ || p.name.toLowerCase().includes(pkgQ.toLowerCase()) || p.category.toLowerCase().includes(pkgQ.toLowerCase())), [packages, pkgQ]);

  const openPkgDlg = (p?: HPackage) => {
    if (p) {
      setPkgDlg(p);
      setPkgDlgItems(pkgItems[p.id] ?? []);
    } else {
      setPkgDlg({ active: true, category: "general", discount_percent: 10 });
      setPkgDlgItems([]);
    }
  };

  const total = pkgDlgItems.reduce((s, it) => s + Number(it.price_usd) * (it.quantity || 1), 0);
  const discount = (Number(pkgDlg?.discount_percent ?? 0) / 100) * total;
  const final = total - discount;

  const addPkgItem = (item_type: string, ref_id: string, name: string, price: number) => {
    if (pkgDlgItems.some(i => i.ref_id === ref_id && i.item_type === item_type)) return;
    setPkgDlgItems(prev => [...prev, { item_type, ref_id, name, price_usd: price, quantity: 1 }]);
  };
  const removePkgItem = (idx: number) => setPkgDlgItems(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, q: number) => setPkgDlgItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, q) } : it));

  const savePackage = async () => {
    if (!pkgDlg?.name) return toast.error("Package name required");
    if (!pkgDlgItems.length) return toast.error("Add at least one item");
    const payload: any = {
      name: pkgDlg.name, code: pkgDlg.code ?? null, category: pkgDlg.category ?? "general",
      description: pkgDlg.description ?? null,
      total_price_usd: total, discount_percent: Number(pkgDlg.discount_percent ?? 0), final_price_usd: final,
      active: pkgDlg.active ?? true,
    };
    let pkgId = pkgDlg.id;
    if (pkgId) {
      const { error } = await supabase.from("health_packages" as any).update(payload).eq("id", pkgId);
      if (error) return toast.error(error.message);
      await supabase.from("health_package_items" as any).delete().eq("package_id", pkgId);
    } else {
      const { data, error } = await supabase.from("health_packages" as any).insert(payload).select("id").single();
      if (error || !data) return toast.error(error?.message ?? "Failed");
      pkgId = (data as any).id;
    }
    const items = pkgDlgItems.map(it => ({ package_id: pkgId, item_type: it.item_type, ref_id: it.ref_id, name: it.name, price_usd: it.price_usd, quantity: it.quantity }));
    const { error: e2 } = await supabase.from("health_package_items" as any).insert(items);
    if (e2) return toast.error(e2.message);
    toast.success("Package saved"); setPkgDlg(null); setPkgDlgItems([]); loadAll();
  };
  const delPackage = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("health_packages" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="h-8 w-8 text-primary" /> Services, Injections & Packages</h1>
        <p className="text-muted-foreground mt-1">Manage clinical services, injection catalog, and bundled health packages</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Services</div><div className="text-3xl font-bold mt-1">{services.length}</div></div><div className="p-3 rounded-full bg-muted text-primary"><Briefcase className="h-5 w-5" /></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Injections</div><div className="text-3xl font-bold mt-1">{injs.length}</div></div><div className="p-3 rounded-full bg-muted text-blue-600"><Syringe className="h-5 w-5" /></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Packages</div><div className="text-3xl font-bold mt-1">{packages.length}</div></div><div className="p-3 rounded-full bg-muted text-success"><Package className="h-5 w-5" /></div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-2" />Services</TabsTrigger>
          <TabsTrigger value="injections"><Syringe className="h-4 w-4 mr-2" />Injections</TabsTrigger>
          <TabsTrigger value="packages"><Package className="h-4 w-4 mr-2" />Health Packages</TabsTrigger>
        </TabsList>

        {/* SERVICES */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search services..." className="pl-9" value={svcQ} onChange={e => setSvcQ(e.target.value)} />
              </div>
              <Button onClick={() => setSvcDlg({ active: true, category: "service", price_usd: 0 })}><Plus className="h-4 w-4" /> Add Service</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {fServices.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><div className="font-medium">{s.name}</div>{s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{s.category.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{fmtUSD(s.price_usd)}</TableCell>
                      <TableCell>{s.active ? <Badge variant="outline" className="bg-success/15 text-success border-success/30">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setSvcDlg(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delService(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!fServices.length && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No services yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INJECTIONS */}
        <TabsContent value="injections" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search injections..." className="pl-9" value={injQ} onChange={e => setInjQ(e.target.value)} />
              </div>
              <Button onClick={() => setInjDlg({ active: true, route: "IM", price_usd: 0, stock: 0 })}><Plus className="h-4 w-4" /> Add Injection</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Dose</TableHead><TableHead>Route</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {fInjs.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-sm">{i.brand ?? "—"}</TableCell>
                      <TableCell className="text-sm">{i.dose ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{i.route ?? "—"}</Badge></TableCell>
                      <TableCell className={i.stock < 5 ? "text-destructive font-semibold" : ""}>{i.stock}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtUSD(i.price_usd)}</TableCell>
                      <TableCell>{i.active ? <Badge variant="outline" className="bg-success/15 text-success border-success/30">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setInjDlg(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delInj(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!fInjs.length && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No injections yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PACKAGES */}
        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search packages..." className="pl-9" value={pkgQ} onChange={e => setPkgQ(e.target.value)} />
              </div>
              <Button onClick={() => openPkgDlg()}><Plus className="h-4 w-4" /> New Package</Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fPkgs.map(p => {
                  const items = pkgItems[p.id] ?? [];
                  return (
                    <Card key={p.id} className="hover:shadow-md transition">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{p.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1 capitalize">{p.category}</Badge>
                          </div>
                          {p.discount_percent > 0 && <Badge className="bg-success text-success-foreground">{p.discount_percent}% OFF</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                        <div className="text-xs text-muted-foreground">{items.length} items included</div>
                        <div className="flex items-end justify-between pt-2 border-t">
                          <div>
                            {p.discount_percent > 0 && <div className="text-xs text-muted-foreground line-through">{fmtUSD(p.total_price_usd)}</div>}
                            <div className="text-2xl font-bold text-primary">{fmtUSD(p.final_price_usd)}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setViewPkg(p)}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => openPkgDlg(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => delPackage(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {!fPkgs.length && <div className="col-span-full text-center py-16 text-muted-foreground">No packages yet. Create your first health package!</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Dialog */}
      <Dialog open={!!svcDlg} onOpenChange={o => !o && setSvcDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{svcDlg?.id ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
          {svcDlg && (
            <div className="grid gap-3">
              <div><Label>Name *</Label><Input value={svcDlg.name ?? ""} onChange={e => setSvcDlg({ ...svcDlg, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={svcDlg.category ?? "service"} onValueChange={v => setSvcDlg({ ...svcDlg, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Price (USD)</Label><Input type="number" value={svcDlg.price_usd ?? 0} onChange={e => setSvcDlg({ ...svcDlg, price_usd: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={svcDlg.description ?? ""} onChange={e => setSvcDlg({ ...svcDlg, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={svcDlg.active ?? true} onCheckedChange={c => setSvcDlg({ ...svcDlg, active: c })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSvcDlg(null)}>Cancel</Button><Button onClick={saveService}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Injection Dialog */}
      <Dialog open={!!injDlg} onOpenChange={o => !o && setInjDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{injDlg?.id ? "Edit" : "Add"} Injection</DialogTitle></DialogHeader>
          {injDlg && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Name *</Label><Input value={injDlg.name ?? ""} onChange={e => setInjDlg({ ...injDlg, name: e.target.value })} /></div>
              <div><Label>Brand</Label><Input value={injDlg.brand ?? ""} onChange={e => setInjDlg({ ...injDlg, brand: e.target.value })} /></div>
              <div><Label>Dose</Label><Input value={injDlg.dose ?? ""} onChange={e => setInjDlg({ ...injDlg, dose: e.target.value })} placeholder="e.g. 500mg / 1ml" /></div>
              <div>
                <Label>Route</Label>
                <Select value={injDlg.route ?? "IM"} onValueChange={v => setInjDlg({ ...injDlg, route: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INJ_ROUTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (USD)</Label><Input type="number" value={injDlg.price_usd ?? 0} onChange={e => setInjDlg({ ...injDlg, price_usd: Number(e.target.value) })} /></div>
              <div><Label>Stock</Label><Input type="number" value={injDlg.stock ?? 0} onChange={e => setInjDlg({ ...injDlg, stock: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={injDlg.description ?? ""} onChange={e => setInjDlg({ ...injDlg, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={injDlg.active ?? true} onCheckedChange={c => setInjDlg({ ...injDlg, active: c })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setInjDlg(null)}>Cancel</Button><Button onClick={saveInj}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={!!pkgDlg} onOpenChange={o => !o && setPkgDlg(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{pkgDlg?.id ? "Edit" : "New"} Health Package</DialogTitle></DialogHeader>
          {pkgDlg && (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Package Name *</Label><Input value={pkgDlg.name ?? ""} onChange={e => setPkgDlg({ ...pkgDlg, name: e.target.value })} placeholder="e.g. Full Body Checkup" /></div>
                <div><Label>Code</Label><Input value={pkgDlg.code ?? ""} onChange={e => setPkgDlg({ ...pkgDlg, code: e.target.value })} placeholder="PKG-FBC" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={pkgDlg.category ?? "general"} onValueChange={v => setPkgDlg({ ...pkgDlg, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PKG_CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Discount %</Label><Input type="number" value={pkgDlg.discount_percent ?? 0} onChange={e => setPkgDlg({ ...pkgDlg, discount_percent: Number(e.target.value) })} /></div>
                <div className="md:col-span-2"><Label>Description</Label><Textarea value={pkgDlg.description ?? ""} onChange={e => setPkgDlg({ ...pkgDlg, description: e.target.value })} /></div>
              </div>

              <div>
                <Label className="text-base">Add items to package</Label>
                <Tabs defaultValue="svc" className="mt-2">
                  <TabsList>
                    <TabsTrigger value="svc">Services</TabsTrigger>
                    <TabsTrigger value="inj">Injections</TabsTrigger>
                    <TabsTrigger value="lab">Lab Tests</TabsTrigger>
                    <TabsTrigger value="xr">X-Ray</TabsTrigger>
                  </TabsList>
                  <TabsContent value="svc"><ItemPicker items={services.filter(s => s.active).map(s => ({ id: s.id, name: s.name, price: s.price_usd }))} onAdd={(x) => addPkgItem("service", x.id, x.name, x.price)} /></TabsContent>
                  <TabsContent value="inj"><ItemPicker items={injs.filter(i => i.active).map(i => ({ id: i.id, name: `${i.name}${i.dose ? ` (${i.dose})` : ""}`, price: i.price_usd }))} onAdd={(x) => addPkgItem("injection", x.id, x.name, x.price)} /></TabsContent>
                  <TabsContent value="lab"><ItemPicker items={labTests.map(t => ({ id: t.id, name: t.name, price: t.price_usd }))} onAdd={(x) => addPkgItem("lab", x.id, x.name, x.price)} /></TabsContent>
                  <TabsContent value="xr"><ItemPicker items={xrayTests.map(t => ({ id: t.id, name: `${t.name} (${t.modality})`, price: t.price_usd }))} onAdd={(x) => addPkgItem("xray", x.id, x.name, x.price)} /></TabsContent>
                </Tabs>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Selected Items ({pkgDlgItems.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pkgDlgItems.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="outline" className="capitalize">{it.item_type}</Badge></TableCell>
                          <TableCell className="text-sm">{it.name}</TableCell>
                          <TableCell><Input type="number" min={1} value={it.quantity} onChange={e => updateQty(idx, Number(e.target.value))} className="h-8 w-16" /></TableCell>
                          <TableCell className="text-right">{fmtUSD(it.price_usd)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtUSD(it.price_usd * it.quantity)}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" onClick={() => removePkgItem(idx)}><X className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                      {!pkgDlgItems.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No items added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="bg-muted/40 p-4 rounded-lg space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtUSD(total)}</span></div>
                <div className="flex justify-between text-sm text-success"><span>Discount ({pkgDlg.discount_percent ?? 0}%)</span><span>-{fmtUSD(discount)}</span></div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Final Price</span><span className="text-primary">{fmtUSD(final)}</span></div>
              </div>

              <div className="flex items-center gap-2"><Switch checked={pkgDlg.active ?? true} onCheckedChange={c => setPkgDlg({ ...pkgDlg, active: c })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPkgDlg(null)}>Cancel</Button><Button onClick={savePackage}>Save Package</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Package */}
      <Dialog open={!!viewPkg} onOpenChange={o => !o && setViewPkg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewPkg?.name}</DialogTitle></DialogHeader>
          {viewPkg && (
            <div className="space-y-3">
              {viewPkg.description && <p className="text-sm text-muted-foreground">{viewPkg.description}</p>}
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Qty × Price</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(pkgItems[viewPkg.id] ?? []).map(it => (
                    <TableRow key={it.id}><TableCell><Badge variant="outline" className="capitalize">{it.item_type}</Badge></TableCell><TableCell>{it.name}</TableCell><TableCell className="text-right">{it.quantity} × {fmtUSD(it.price_usd)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="bg-muted/40 p-4 rounded-lg flex justify-between items-end">
                <div><div className="text-xs text-muted-foreground line-through">{fmtUSD(viewPkg.total_price_usd)}</div><div className="text-sm text-success">{viewPkg.discount_percent}% discount</div></div>
                <div className="text-2xl font-bold text-primary">{fmtUSD(viewPkg.final_price_usd)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemPicker({ items, onAdd }: { items: { id: string; name: string; price: number }[]; onAdd: (x: { id: string; name: string; price: number }) => void }) {
  const [q, setQ] = useState("");
  const filt = items.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="mb-2" />
      <div className="border rounded-md max-h-48 overflow-y-auto">
        {filt.map(it => (
          <div key={it.id} className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer border-b last:border-0" onClick={() => onAdd(it)}>
            <span className="text-sm">{it.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{fmtUSD(it.price)}</span>
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </div>
        ))}
        {!filt.length && <div className="text-sm text-muted-foreground p-4 text-center">No items</div>}
      </div>
    </div>
  );
}
