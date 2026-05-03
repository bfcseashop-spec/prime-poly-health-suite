import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Phone, MapPin, Cake, ShieldCheck, Stethoscope, Pill, Receipt, Calendar, Activity, ClipboardList, FlaskConical, ScanLine, CreditCard, FileText, Clock, User, Images, Scissors, Wallet, ExternalLink, Download, ImageIcon } from "lucide-react";
import { fmtUSD } from "@/lib/currency";
import MedicalRecordsTab from "@/components/patient/MedicalRecordsTab";
import LabReportsTab from "@/components/patient/LabReportsTab";
import PatientPhotoGallery from "@/components/patient/PatientPhotoGallery";

function initials(name?: string) {
  return (name ?? "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

const statusTone: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  in_progress: "bg-blue-500/10 text-blue-600",
  scheduled: "bg-blue-500/10 text-blue-600",
  completed: "bg-success/10 text-success",
  reviewed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  paid: "bg-success/10 text-success",
  partial: "bg-warning/10 text-warning",
  unpaid: "bg-destructive/10 text-destructive",
};

export default function PatientProfile() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [xrayOrders, setXrayOrders] = useState<any[]>([]);
  const [otBookings, setOtBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [pat, vs, rxs, sl, mr, lr, ic, lo, xo, ot] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).maybeSingle(),
        supabase.from("opd_visits").select("*").eq("patient_id", id).order("visit_date", { ascending: false }),
        supabase.from("prescriptions").select("*, prescription_items(*)").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("medicine_sales").select("*, medicine_sale_items(*)").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("medical_records" as any).select("*").eq("patient_id", id).order("record_date", { ascending: false }),
        supabase.from("lab_reports" as any).select("*").eq("patient_id", id).order("test_date", { ascending: false }),
        supabase.from("insurance_cards" as any).select("*").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("lab_orders" as any).select("*, lab_order_items(*)").eq("patient_id", id).order("ordered_on", { ascending: false }),
        supabase.from("xray_orders" as any).select("*, xray_order_items(*)").eq("patient_id", id).order("ordered_on", { ascending: false }),
        supabase.from("ot_bookings" as any).select("*").eq("patient_id", id).order("scheduled_at", { ascending: false }),
      ]);
      setP(pat.data);
      setVisits(vs.data ?? []);
      setRx(rxs.data ?? []);
      setSales(sl.data ?? []);
      setRecords((mr.data as any) ?? []);
      setLabs((lr.data as any) ?? []);
      setCards((ic.data as any) ?? []);
      setLabOrders((lo.data as any) ?? []);
      setXrayOrders((xo.data as any) ?? []);
      setOtBookings((ot.data as any) ?? []);

      const saleIds = (sl.data ?? []).map((s: any) => s.id);
      if (saleIds.length) {
        const { data: pays } = await supabase.from("invoice_payments" as any).select("*").in("sale_id", saleIds).order("paid_on", { ascending: false });
        setPayments((pays as any) ?? []);
      } else setPayments([]);
      setLoading(false);
    })();
  }, [id]);

  const xrays = useMemo(() => labs.filter(l => /x.?ray|radiograph|imaging|ct|mri|ultrasound/i.test(l.test_type ?? l.test_name ?? "")), [labs]);
  const labOnly = useMemo(() => labs.filter(l => !xrays.includes(l)), [labs, xrays]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading patient...</div>;
  if (!p) return <div className="p-10 text-center">Patient not found. <Link to="/patients" className="text-primary underline">Back</Link></div>;

  const a = age(p.dob);
  const totalBilled = sales.reduce((s, x) => s + Number(x.total_usd ?? 0), 0);
  const totalPaid = sales.reduce((s, x) => s + Number(x.amount_paid_usd ?? 0), 0);
  const totalDue = sales.reduce((s, x) => s + Number(x.due_usd ?? 0), 0);
  const otSpent = otBookings.filter(o => o.status === "completed").reduce((s, x) => s + Number(x.charges_usd ?? 0), 0);
  const labSpent = labOrders.reduce((s, x) => s + Number(x.total_usd ?? 0), 0);
  const xraySpent = xrayOrders.reduce((s, x) => s + Number(x.total_usd ?? 0), 0);
  const activeCard = cards.find(c => c.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/patients"><ArrowLeft className="h-4 w-4 mr-1" />Back to Patients</Link></Button>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />Registered {new Date(p.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Hero header */}
      <Card className="overflow-hidden shadow-elevated border-0">
        <div className="h-36 clinic-gradient relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
          {activeCard && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur capitalize gap-1">
                <CreditCard className="h-3 w-3" />{activeCard.tier} Member
              </Badge>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 -mt-16 flex flex-col md:flex-row md:items-end gap-5">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-card shadow-elevated ring-2 ring-primary/20">
              <AvatarImage src={p.photo_url} alt={p.full_name} className="object-cover" />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/60 text-white">{initials(p.full_name)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-success border-2 border-card flex items-center justify-center" title="Active">
              <span className="h-2 w-2 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex-1 mt-2 md:mt-12">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{p.full_name}</h1>
              <Badge variant="outline" className="font-mono">{p.patient_code}</Badge>
              {p.blood_group && <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">🩸 {p.blood_group}</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {p.gender && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /><span className="capitalize">{p.gender}</span></span>}
              {a !== null && <span className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5" />{a} yrs</span>}
              {p.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{p.phone}</span>}
              {p.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{p.address}</span>}
              {p.insurance_provider && <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />{p.insurance_provider}</span>}
            </div>
          </div>
          <div className="flex md:flex-col gap-2">
            {p.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${p.phone}`}><Phone className="h-3.5 w-3.5 mr-1" />Call</a></Button>}
            <Button asChild variant="default" size="sm"><Link to={`/opd?patient=${p.id}`}><Stethoscope className="h-3.5 w-3.5 mr-1" />New Visit</Link></Button>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "OPD Visits", v: visits.length, Icon: Stethoscope, tone: "bg-primary/10 text-primary" },
          { label: "Records", v: records.length, Icon: ClipboardList, tone: "bg-indigo-500/10 text-indigo-600" },
          { label: "Prescriptions", v: rx.length, Icon: Pill, tone: "bg-blue-500/10 text-blue-600" },
          { label: "Lab Orders", v: labOrders.length, Icon: FlaskConical, tone: "bg-purple-500/10 text-purple-600" },
          { label: "X-Ray / Imaging", v: xrayOrders.length + xrays.length, Icon: ScanLine, tone: "bg-cyan-500/10 text-cyan-600" },
          { label: "Surgeries", v: otBookings.length, Icon: Scissors, tone: "bg-rose-500/10 text-rose-600" },
          { label: "Total Billed", v: fmtUSD(totalBilled + otSpent + labSpent + xraySpent), Icon: Wallet, tone: "bg-success/10 text-success" },
          { label: "Outstanding Due", v: fmtUSD(totalDue), Icon: Receipt, tone: totalDue > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground" },
        ].map(({ label, v, Icon, tone }) => (
          <Card key={label} className="p-4 shadow-soft hover:shadow-card transition-all">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{label}</div>
                <div className="text-lg font-bold leading-tight truncate">{v}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SummaryPanel records={records} labs={labs} visits={visits} rx={rx} card={activeCard}
        totalBilled={totalBilled} totalPaid={totalPaid} totalDue={totalDue} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="records"><ClipboardList className="h-4 w-4 mr-1" />Medical Records</TabsTrigger>
          <TabsTrigger value="lab"><FlaskConical className="h-4 w-4 mr-1" />Lab Reports</TabsTrigger>
          <TabsTrigger value="laborders"><FlaskConical className="h-4 w-4 mr-1" />Lab Orders</TabsTrigger>
          <TabsTrigger value="xray"><ScanLine className="h-4 w-4 mr-1" />X-Ray / Imaging</TabsTrigger>
          <TabsTrigger value="surgery"><Scissors className="h-4 w-4 mr-1" />Surgery</TabsTrigger>
          <TabsTrigger value="visits"><Calendar className="h-4 w-4 mr-1" />Visits</TabsTrigger>
          <TabsTrigger value="prescriptions"><Pill className="h-4 w-4 mr-1" />Prescriptions</TabsTrigger>
          <TabsTrigger value="pharmacy"><Receipt className="h-4 w-4 mr-1" />Pharmacy</TabsTrigger>
          <TabsTrigger value="billing"><Wallet className="h-4 w-4 mr-1" />Billing</TabsTrigger>
          <TabsTrigger value="insurance"><CreditCard className="h-4 w-4 mr-1" />Insurance</TabsTrigger>
          <TabsTrigger value="gallery"><Images className="h-4 w-4 mr-1" />Gallery</TabsTrigger>
          <TabsTrigger value="info"><FileText className="h-4 w-4 mr-1" />Info</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery"><PatientPhotoGallery patientId={p.id} /></TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Timeline visits={visits} records={records} labs={labs} rx={rx} sales={sales} otBookings={otBookings} labOrders={labOrders} xrayOrders={xrayOrders} />
        </TabsContent>

        <TabsContent value="records"><MedicalRecordsTab patientId={p.id} /></TabsContent>
        <TabsContent value="lab"><LabReportsTab patientId={p.id} /></TabsContent>

        <TabsContent value="laborders">
          <Card className="shadow-soft">
            {labOrders.length === 0 ? (
              <Empty Icon={FlaskConical} text="No lab orders yet" cta={{ to: "/laboratory", label: "Create Lab Order" }} />
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{labOrders.length} order(s) — Total: <span className="font-semibold text-foreground">{fmtUSD(labSpent)}</span></div>
                  <Button asChild size="sm" variant="outline"><Link to="/laboratory"><FlaskConical className="h-4 w-4 mr-1" />New Order</Link></Button>
                </div>
                {labOrders.map(o => (
                  <Card key={o.id} className="p-4 border-l-4 border-l-purple-500">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{o.order_no}</span>
                        <Badge className={`capitalize ${statusTone[o.status] ?? ""}`}>{o.status?.replace("_", " ")}</Badge>
                        {o.priority !== "normal" && <Badge variant="outline" className="capitalize">{o.priority}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(o.ordered_on).toLocaleDateString()} • {o.doctor_name ?? "—"} • <span className="font-semibold text-foreground">{fmtUSD(Number(o.total_usd))}</span></div>
                    </div>
                    {o.lab_order_items?.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {o.lab_order_items.map((it: any) => (
                          <div key={it.id} className="text-sm border rounded-md p-2 bg-muted/30">
                            <div className="flex justify-between gap-2">
                              <div className="font-medium">{it.test_name}</div>
                              <Badge variant="outline" className="capitalize text-[10px]">{it.status}</Badge>
                            </div>
                            {it.result_value && <div className="mt-1 text-xs"><span className="text-muted-foreground">Result: </span>{it.result_value} {it.result_unit ?? ""} {it.flag && <Badge className="ml-1 text-[10px]">{it.flag}</Badge>}</div>}
                            {it.reference_range && <div className="text-[11px] text-muted-foreground">Ref: {it.reference_range}</div>}
                            {it.result_file_url && <a href={it.result_file_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="h-3 w-3" />View report<ExternalLink className="h-3 w-3" /></a>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="xray">
          <Card className="shadow-soft">
            {xrayOrders.length === 0 && xrays.length === 0 ? (
              <Empty Icon={ScanLine} text="No X-Ray or imaging reports yet" cta={{ to: "/xray", label: "Create X-Ray Order" }} />
            ) : (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{xrayOrders.length} order(s) • {xrays.length} report(s) — Total: <span className="font-semibold text-foreground">{fmtUSD(xraySpent)}</span></div>
                  <Button asChild size="sm" variant="outline"><Link to="/xray"><ScanLine className="h-4 w-4 mr-1" />New Order</Link></Button>
                </div>
                {xrayOrders.map(o => (
                  <Card key={o.id} className="p-4 border-l-4 border-l-cyan-500">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{o.order_no}</span>
                        <Badge className={`capitalize ${statusTone[o.status] ?? ""}`}>{o.status?.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(o.ordered_on).toLocaleDateString()} • {o.doctor_name ?? "—"} • <span className="font-semibold text-foreground">{fmtUSD(Number(o.total_usd))}</span></div>
                    </div>
                    {o.xray_order_items?.map((it: any) => (
                      <div key={it.id} className="border rounded-lg p-3 bg-muted/20 mb-2 last:mb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{it.test_name}</div>
                            <div className="text-xs text-muted-foreground">{[it.modality, it.body_part].filter(Boolean).join(" • ")}</div>
                          </div>
                          <Badge variant="outline" className="capitalize">{it.status}</Badge>
                        </div>
                        {it.findings && <div className="mt-2 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">Findings: </span>{it.findings}</div>}
                        {it.impression && <div className="mt-1 text-sm"><span className="text-xs uppercase tracking-wide text-muted-foreground">Impression: </span><span className="font-medium">{it.impression}</span></div>}
                        {it.radiologist_name && <div className="mt-1 text-xs text-muted-foreground">Radiologist: {it.radiologist_name}</div>}
                        {it.image_urls?.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {it.image_urls.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-md overflow-hidden border bg-black">
                                <img src={url} alt={`X-Ray ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <ExternalLink className="h-5 w-5 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                        {it.report_file_url && (
                          <a href={it.report_file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <FileText className="h-3 w-3" />View full report<ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </Card>
                ))}
                {xrays.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2 mt-4">Legacy Imaging Reports</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {xrays.map(x => (
                        <Card key={x.id} className="p-4 border-l-4 border-l-cyan-500">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold">{x.test_name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{x.test_type}</div>
                            </div>
                            <Badge className={`capitalize ${statusTone[x.status] ?? ""}`}>{x.status}</Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">{new Date(x.test_date).toLocaleDateString()}</div>
                          {x.results && <div className="mt-2 text-sm">{x.results}</div>}
                          {x.file_url && <a href={x.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="h-3 w-3" />View report<ExternalLink className="h-3 w-3" /></a>}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="surgery">
          <Card className="shadow-soft">
            {otBookings.length === 0 ? (
              <Empty Icon={Scissors} text="No surgeries scheduled" cta={{ to: "/ot", label: "Schedule Surgery" }} />
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{otBookings.length} booking(s) — Completed total: <span className="font-semibold text-foreground">{fmtUSD(otSpent)}</span></div>
                  <Button asChild size="sm" variant="outline"><Link to="/ot"><Scissors className="h-4 w-4 mr-1" />New Surgery</Link></Button>
                </div>
                {otBookings.map(o => (
                  <Card key={o.id} className="p-4 border-l-4 border-l-rose-500">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-rose-600" />{o.procedure_name}
                          <Badge className={`capitalize ${statusTone[o.status] ?? ""}`}>{o.status?.replace("_", " ")}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(o.scheduled_at).toLocaleString()} • {o.theater_room ?? "—"} • Surgeon: {o.surgeon_name ?? "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{fmtUSD(Number(o.charges_usd))}</div>
                        {o.duration_minutes && <div className="text-xs text-muted-foreground">{o.duration_minutes} min</div>}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {o.anesthesia_type && <div><span className="text-xs uppercase tracking-wide text-muted-foreground">Anesthesia: </span>{o.anesthesia_type}</div>}
                      {o.anesthetist_name && <div><span className="text-xs uppercase tracking-wide text-muted-foreground">Anesthetist: </span>{o.anesthetist_name}</div>}
                      {o.pre_op_notes && <div className="md:col-span-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">Pre-op: </span>{o.pre_op_notes}</div>}
                      {o.post_op_notes && <div className="md:col-span-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">Post-op: </span>{o.post_op_notes}</div>}
                      {o.complications && <div className="md:col-span-2 text-destructive"><span className="text-xs uppercase tracking-wide">Complications: </span>{o.complications}</div>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card className="shadow-soft">
            {visits.length === 0 ? <Empty Icon={Calendar} text="No visits yet" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Token</TableHead><TableHead>Complaint</TableHead><TableHead>BP</TableHead><TableHead>Temp</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visits.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{new Date(v.visit_date).toLocaleDateString()}</TableCell>
                      <TableCell>#{v.token_number ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{v.chief_complaint ?? "—"}</TableCell>
                      <TableCell>{v.bp ?? "—"}</TableCell>
                      <TableCell>{v.temperature ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{v.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <div className="space-y-3">
            {rx.length === 0 ? <Card className="shadow-soft"><Empty Icon={Pill} text="No prescriptions yet" /></Card> : rx.map(r => (
              <Card key={r.id} className="p-4 shadow-soft">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">{r.diagnosis ?? "Prescription"}</div>
                  <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                {r.advice && <div className="text-sm text-muted-foreground mb-2">{r.advice}</div>}
                <div className="space-y-1">
                  {r.prescription_items?.map((it: any) => (
                    <div key={it.id} className="flex flex-wrap gap-2 text-sm border-l-2 border-primary/40 pl-3 py-1">
                      <span className="font-medium">{it.name}</span>
                      {it.dose && <span className="text-muted-foreground">• {it.dose}</span>}
                      {it.frequency && <span className="text-muted-foreground">• {it.frequency}</span>}
                      {it.duration && <span className="text-muted-foreground">• {it.duration}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pharmacy">
          <Card className="shadow-soft">
            {sales.length === 0 ? <Empty Icon={Receipt} text="No pharmacy purchases" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.invoice_no}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{s.medicine_sale_items?.length ?? 0}</TableCell>
                      <TableCell className="capitalize">{s.payment_method}</TableCell>
                      <TableCell><Badge className={`capitalize ${statusTone[s.status] ?? ""}`}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(s.total_usd))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 shadow-soft border-l-4 border-l-success">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Billed (Pharmacy)</div>
                <div className="text-2xl font-bold mt-1">{fmtUSD(totalBilled)}</div>
              </Card>
              <Card className="p-4 shadow-soft border-l-4 border-l-primary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</div>
                <div className="text-2xl font-bold mt-1 text-success">{fmtUSD(totalPaid)}</div>
              </Card>
              <Card className={`p-4 shadow-soft border-l-4 ${totalDue > 0 ? "border-l-destructive" : "border-l-muted"}`}>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding Due</div>
                <div className={`text-2xl font-bold mt-1 ${totalDue > 0 ? "text-destructive" : ""}`}>{fmtUSD(totalDue)}</div>
              </Card>
            </div>

            <Card className="shadow-soft">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" />Invoices</div>
                <Button asChild size="sm" variant="outline"><Link to="/due-management"><Wallet className="h-4 w-4 mr-1" />Manage Dues</Link></Button>
              </div>
              {sales.length === 0 ? <Empty Icon={Receipt} text="No invoices yet" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.invoice_no}</TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{s.medicine_sale_items?.length ?? 0}</TableCell>
                        <TableCell className="text-right">{fmtUSD(Number(s.total_usd))}</TableCell>
                        <TableCell className="text-right text-success">{fmtUSD(Number(s.amount_paid_usd ?? 0))}</TableCell>
                        <TableCell className={`text-right ${Number(s.due_usd) > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{fmtUSD(Number(s.due_usd ?? 0))}</TableCell>
                        <TableCell><Badge className={`capitalize ${statusTone[s.status] ?? ""}`}>{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="shadow-soft">
              <div className="p-4 border-b font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" />Payment History</div>
              {payments.length === 0 ? <Empty Icon={Wallet} text="No payments recorded yet" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments.map(pay => {
                      const sale = sales.find(s => s.id === pay.sale_id);
                      return (
                        <TableRow key={pay.id}>
                          <TableCell>{new Date(pay.paid_on).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono">{sale?.invoice_no ?? "—"}</TableCell>
                          <TableCell className="capitalize">{pay.payment_method}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pay.reference ?? "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-success">{fmtUSD(Number(pay.amount_usd))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insurance">
          {cards.length === 0 ? (
            <Card className="shadow-soft"><Empty Icon={CreditCard} text="No insurance cards issued" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map(c => {
                const grad = c.tier === "vip" ? "from-fuchsia-500 via-purple-600 to-indigo-700"
                  : c.tier === "gold" ? "from-amber-400 to-yellow-600"
                  : c.tier === "silver" ? "from-zinc-400 to-zinc-600"
                  : "from-slate-500 to-slate-700";
                const usedPct = Number(c.coverage_amount_usd) > 0 ? Math.min(100, (Number(c.used_amount_usd) / Number(c.coverage_amount_usd)) * 100) : 0;
                return (
                  <div key={c.id} className={`relative rounded-2xl p-5 text-white shadow-elegant overflow-hidden bg-gradient-to-br ${grad}`}>
                    <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="flex items-start justify-between relative">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-semibold capitalize">{c.tier} Plan</p>
                        <p className="mt-2 font-mono text-lg tracking-widest">{c.card_no}</p>
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur capitalize">{c.status}</Badge>
                    </div>
                    <div className="relative mt-5 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-wider text-white/80">
                      <div><p>Discount</p><p className="text-base font-bold text-white normal-case">{Number(c.discount_percent)}%</p></div>
                      <div><p>Coverage</p><p className="text-base font-bold text-white normal-case">{fmtUSD(Number(c.coverage_amount_usd))}</p></div>
                      <div><p>Valid</p><p className="text-sm font-semibold text-white normal-case">{c.valid_to ? new Date(c.valid_to).toLocaleDateString() : "—"}</p></div>
                    </div>
                    <div className="relative mt-4">
                      <div className="flex justify-between text-[11px] text-white/80 mb-1"><span>Used {fmtUSD(Number(c.used_amount_usd))}</span><span>{usedPct.toFixed(0)}%</span></div>
                      <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white" style={{ width: `${usedPct}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-6 shadow-soft grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Field label="Patient ID" value={p.patient_code} />
            <Field label="Full Name" value={p.full_name} />
            <Field label="Date of Birth" value={p.dob ? new Date(p.dob).toLocaleDateString() : "—"} />
            <Field label="Gender" value={p.gender ?? "—"} />
            <Field label="Phone" value={p.phone ?? "—"} />
            <Field label="Blood Group" value={p.blood_group ?? "—"} />
            <Field label="Address" value={p.address ?? "—"} />
            <Field label="Insurance" value={p.insurance_provider ? `${p.insurance_provider} (${p.insurance_policy ?? "—"})` : "—"} />
            <Field label="Registered" value={new Date(p.created_at).toLocaleString()} />
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
              <div className="whitespace-pre-wrap">{p.notes ?? "—"}</div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Empty({ Icon, text, cta }: { Icon: any; text: string; cta?: { to: string; label: string } }) {
  return (
    <div className="p-12 text-center text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p>{text}</p>
      {cta && <Button asChild size="sm" variant="outline" className="mt-4"><Link to={cta.to}>{cta.label}</Link></Button>}
    </div>
  );
}

function Timeline({ visits, records, labs, rx, sales, otBookings, labOrders, xrayOrders }: any) {
  const events = useMemo(() => {
    const items: any[] = [];
    visits.forEach((v: any) => items.push({ id: `v-${v.id}`, date: v.visit_date, type: "Visit", icon: Calendar, tone: "bg-primary/10 text-primary", title: v.chief_complaint || "OPD Visit", meta: `Token #${v.token_number ?? "—"}` }));
    records.forEach((r: any) => items.push({ id: `r-${r.id}`, date: r.record_date, type: "Consultation", icon: Stethoscope, tone: "bg-indigo-500/10 text-indigo-600", title: r.diagnosis || "Consultation", meta: r.doctor_name ? `Dr. ${r.doctor_name}` : "" }));
    labs.forEach((l: any) => {
      const isXray = /x.?ray|imaging|ct|mri|ultrasound/i.test(l.test_type ?? l.test_name ?? "");
      items.push({ id: `l-${l.id}`, date: l.test_date, type: isXray ? "Imaging" : "Lab", icon: isXray ? ScanLine : FlaskConical, tone: isXray ? "bg-cyan-500/10 text-cyan-600" : "bg-purple-500/10 text-purple-600", title: l.test_name, meta: l.status });
    });
    (labOrders ?? []).forEach((o: any) => items.push({ id: `lo-${o.id}`, date: o.ordered_on, type: "Lab Order", icon: FlaskConical, tone: "bg-purple-500/10 text-purple-600", title: o.order_no, meta: `${o.lab_order_items?.length ?? 0} test(s) — ${fmtUSD(Number(o.total_usd))}` }));
    (xrayOrders ?? []).forEach((o: any) => items.push({ id: `xo-${o.id}`, date: o.ordered_on, type: "X-Ray Order", icon: ScanLine, tone: "bg-cyan-500/10 text-cyan-600", title: o.order_no, meta: `${o.xray_order_items?.length ?? 0} study — ${fmtUSD(Number(o.total_usd))}` }));
    (otBookings ?? []).forEach((o: any) => items.push({ id: `ot-${o.id}`, date: o.scheduled_at, type: "Surgery", icon: Scissors, tone: "bg-rose-500/10 text-rose-600", title: o.procedure_name, meta: `${o.status} — ${fmtUSD(Number(o.charges_usd))}` }));
    rx.forEach((r: any) => items.push({ id: `rx-${r.id}`, date: r.created_at, type: "Prescription", icon: Pill, tone: "bg-blue-500/10 text-blue-600", title: r.diagnosis || "Prescription", meta: `${r.prescription_items?.length ?? 0} items` }));
    sales.forEach((s: any) => items.push({ id: `s-${s.id}`, date: s.created_at, type: "Pharmacy", icon: Receipt, tone: "bg-warning/10 text-warning", title: `Invoice ${s.invoice_no}`, meta: fmtUSD(Number(s.total_usd)) }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
  }, [visits, records, labs, rx, sales, otBookings, labOrders, xrayOrders]);

  if (events.length === 0) {
    return <Card className="shadow-soft"><Empty Icon={Activity} text="No activity yet for this patient" /></Card>;
  }

  return (
    <Card className="p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Patient Timeline</h2>
        <span className="text-xs text-muted-foreground">All clinical activity in chronological order</span>
      </div>
      <div className="relative pl-6 border-l-2 border-border space-y-5">
        {events.map(e => {
          const Icon = e.icon;
          return (
            <div key={e.id} className="relative">
              <div className={`absolute -left-[34px] h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-card ${e.tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Badge variant="outline" className="text-[10px]">{e.type}</Badge>
                <span className="font-medium">{e.title}</span>
                {e.meta && <span className="text-xs text-muted-foreground">— {e.meta}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SummaryPanel({ records, labs, visits, rx, card, totalBilled, totalPaid, totalDue }: any) {
  const latest = records[0];
  const latestVisit = visits[0];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = records
    .filter((r: any) => r.follow_up_date && new Date(r.follow_up_date) >= today)
    .sort((a: any, b: any) => new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime())[0];
  const pendingLabs = labs.filter((l: any) => l.status === "pending" || l.status === "in_progress").length;

  const daysUntil = upcoming ? Math.ceil((new Date(upcoming.follow_up_date).getTime() - today.getTime()) / 86400000) : null;

  return (
    <Card className="p-5 shadow-soft border-l-4 border-l-primary">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Patient Summary</h2>
        <span className="text-xs text-muted-foreground">Quick overview</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Stethoscope className="h-4 w-4 text-primary" />Latest Consultation</div>
            {latest && <span className="text-xs text-muted-foreground">{new Date(latest.record_date).toLocaleDateString()}</span>}
          </div>
          {latest ? (
            <div className="space-y-1.5 text-sm">
              {latest.doctor_name && <div className="text-muted-foreground">Dr. {latest.doctor_name}</div>}
              {latest.diagnosis && <div><span className="text-xs uppercase tracking-wide text-muted-foreground">Diagnosis: </span><span className="font-medium">{latest.diagnosis}</span></div>}
              {latest.chief_complaint && <div className="text-muted-foreground line-clamp-2">{latest.chief_complaint}</div>}
            </div>
          ) : latestVisit ? (
            <div className="text-sm text-muted-foreground">
              Last OPD visit: {new Date(latestVisit.visit_date).toLocaleDateString()}
              {latestVisit.chief_complaint && <div className="line-clamp-2 mt-1">{latestVisit.chief_complaint}</div>}
            </div>
          ) : <div className="text-sm text-muted-foreground">No consultation recorded</div>}
        </div>

        <div className="rounded-lg border bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Calendar className="h-4 w-4 text-warning" />Upcoming Follow-up</div>
            {upcoming && (
              <Badge className={daysUntil! <= 3 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
                {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
              </Badge>
            )}
          </div>
          {upcoming ? (
            <div className="space-y-1.5 text-sm">
              <div className="font-semibold">{new Date(upcoming.follow_up_date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
              {upcoming.diagnosis && <div className="text-muted-foreground">For: {upcoming.diagnosis}</div>}
              {upcoming.doctor_name && <div className="text-xs text-muted-foreground">With Dr. {upcoming.doctor_name}</div>}
            </div>
          ) : <div className="text-sm text-muted-foreground">No follow-up scheduled</div>}
        </div>

        <div className="rounded-lg border bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4 text-success" />Billing</div>
            {totalDue > 0 && <Badge className="bg-destructive/10 text-destructive">Due</Badge>}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Billed</span><span className="font-medium">{fmtUSD(totalBilled)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium text-success">{fmtUSD(totalPaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className={`font-bold ${totalDue > 0 ? "text-destructive" : ""}`}>{fmtUSD(totalDue)}</span></div>
          </div>
        </div>

        <div className="rounded-lg border bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4 text-success" />Insurance</div>
            {card && <Badge variant="outline" className="capitalize">{card.tier}</Badge>}
          </div>
          {card ? (
            <div className="space-y-1.5 text-sm">
              <div className="font-mono text-xs">{card.card_no}</div>
              <div className="text-muted-foreground">{Number(card.discount_percent)}% discount • {fmtUSD(Number(card.coverage_amount_usd))} coverage</div>
            </div>
          ) : <div className="text-sm text-muted-foreground">No active insurance card</div>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{records.length} records</Badge>
        <Badge variant="outline">{visits.length} visits</Badge>
        <Badge variant="outline">{rx.length} prescriptions</Badge>
        <Badge variant="outline">{labs.length} lab/imaging</Badge>
        {pendingLabs > 0 && <Badge className="bg-warning/10 text-warning">{pendingLabs} pending</Badge>}
      </div>
    </Card>
  );
}
