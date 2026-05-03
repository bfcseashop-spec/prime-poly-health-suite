import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Phone, MapPin, Cake, ShieldCheck, Stethoscope, Pill, Receipt, Calendar, Activity, ClipboardList, FlaskConical } from "lucide-react";
import { fmtUSD } from "@/lib/currency";
import MedicalRecordsTab from "@/components/patient/MedicalRecordsTab";
import LabReportsTab from "@/components/patient/LabReportsTab";

function initials(name?: string) {
  return (name ?? "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function PatientProfile() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [pat, vs, rxs, sl, mr, lr] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).maybeSingle(),
        supabase.from("opd_visits").select("*").eq("patient_id", id).order("visit_date", { ascending: false }),
        supabase.from("prescriptions").select("*, prescription_items(*)").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("medicine_sales").select("*, medicine_sale_items(*)").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("medical_records" as any).select("*").eq("patient_id", id).order("record_date", { ascending: false }),
        supabase.from("lab_reports" as any).select("*").eq("patient_id", id).order("test_date", { ascending: false }),
      ]);
      setP(pat.data);
      setVisits(vs.data ?? []);
      setRx(rxs.data ?? []);
      setSales(sl.data ?? []);
      setRecords((mr.data as any) ?? []);
      setLabs((lr.data as any) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading patient...</div>;
  if (!p) return <div className="p-10 text-center">Patient not found. <Link to="/patients" className="text-primary underline">Back</Link></div>;

  const a = age(p.dob);
  const totalSpent = sales.reduce((s, x) => s + Number(x.total_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/patients"><ArrowLeft className="h-4 w-4 mr-1" />Back to Patients</Link></Button>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden shadow-card">
        <div className="h-28 clinic-gradient" />
        <div className="px-6 pb-6 -mt-14 flex flex-col md:flex-row md:items-end gap-4">
          <Avatar className="h-28 w-28 border-4 border-card shadow-elevated">
            <AvatarImage src={p.photo_url} />
            <AvatarFallback className="text-2xl bg-accent text-accent-foreground">{initials(p.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 mt-2 md:mt-10">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{p.full_name}</h1>
              <Badge variant="outline" className="font-mono">{p.patient_code}</Badge>
              {p.blood_group && <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">{p.blood_group}</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {p.gender && <span className="capitalize">{p.gender}</span>}
              {a !== null && <span className="flex items-center gap-1"><Cake className="h-3.5 w-3.5" />{a} yrs</span>}
              {p.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.phone}</span>}
              {p.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.address}</span>}
              {p.insurance_provider && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{p.insurance_provider}</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "OPD Visits", v: visits.length, Icon: Stethoscope, tone: "bg-primary/10 text-primary" },
          { label: "Prescriptions", v: rx.length, Icon: Pill, tone: "bg-blue-500/10 text-blue-600" },
          { label: "Pharmacy Orders", v: sales.length, Icon: Receipt, tone: "bg-warning/10 text-warning" },
          { label: "Total Spent", v: fmtUSD(totalSpent), Icon: Activity, tone: "bg-success/10 text-success" },
        ].map(({ label, v, Icon, tone }) => (
          <Card key={label} className="p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xl font-bold leading-tight">{v}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SummaryPanel records={records} labs={labs} visits={visits} rx={rx} />

      <Tabs defaultValue="records">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="records"><ClipboardList className="h-4 w-4 mr-1" />Medical Records</TabsTrigger>
          <TabsTrigger value="lab"><FlaskConical className="h-4 w-4 mr-1" />Lab Reports</TabsTrigger>
          <TabsTrigger value="visits">Visit History</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
          <TabsTrigger value="info">Info & Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="records"><MedicalRecordsTab patientId={p.id} /></TabsContent>
        <TabsContent value="lab"><LabReportsTab patientId={p.id} /></TabsContent>

        <TabsContent value="visits">
          <Card className="shadow-soft">
            {visits.length === 0 ? <div className="p-10 text-center text-muted-foreground">No visits yet</div> : (
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
            {rx.length === 0 ? <Card className="p-10 text-center text-muted-foreground shadow-soft">No prescriptions yet</Card> : rx.map(r => (
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
            {sales.length === 0 ? <div className="p-10 text-center text-muted-foreground">No pharmacy purchases</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.invoice_no}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{s.medicine_sale_items?.length ?? 0}</TableCell>
                      <TableCell className="capitalize">{s.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(Number(s.total_usd))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
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
