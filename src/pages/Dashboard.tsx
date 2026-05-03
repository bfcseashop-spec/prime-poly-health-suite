import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Stethoscope, Pill, Receipt, AlertTriangle, CreditCard, Wallet, Building2, DollarSign } from "lucide-react";
import { fmtBoth, fmtUSD } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "hsl(var(--success))",
  aba: "hsl(var(--primary))",
  acleda: "hsl(var(--primary-glow))",
  paypal: "hsl(var(--warning))",
  visa: "hsl(var(--accent-foreground))",
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, opd: 0, sales: 0, revenue: 0, lowStock: 0 });
  const [byMethod, setByMethod] = useState<{ name: string; value: number }[]>([]);
  const [last7, setLast7] = useState<{ day: string; revenue: number }[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayISO = today.toISOString();
    const weekAgo = new Date(Date.now() - 6*24*3600*1000); weekAgo.setHours(0,0,0,0);

    const [patientsRes, opdRes, salesTodayRes, salesWeekRes, medsRes] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("opd_visits").select("*", { count: "exact", head: true }).gte("visit_date", today.toISOString().slice(0,10)),
      supabase.from("medicine_sales").select("total_usd, payment_method").gte("created_at", todayISO),
      supabase.from("medicine_sales").select("total_usd, payment_method, created_at, invoice_no").gte("created_at", weekAgo.toISOString()).order("created_at", { ascending: false }),
      supabase.from("medicines").select("*"),
    ]);

    const todaySales = salesTodayRes.data ?? [];
    const weekSales = salesWeekRes.data ?? [];
    const meds = medsRes.data ?? [];
    const low = meds.filter((m: any) => m.stock <= m.low_stock_threshold);

    setStats({
      patients: patientsRes.count ?? 0,
      opd: opdRes.count ?? 0,
      sales: todaySales.length,
      revenue: todaySales.reduce((s, r: any) => s + Number(r.total_usd || 0), 0),
      lowStock: low.length,
    });

    const methodMap: Record<string, number> = {};
    weekSales.forEach((r: any) => { methodMap[r.payment_method] = (methodMap[r.payment_method] || 0) + Number(r.total_usd || 0); });
    setByMethod(Object.entries(methodMap).map(([name, value]) => ({ name, value })));

    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i*24*3600*1000);
      dayMap[d.toISOString().slice(0,10)] = 0;
    }
    weekSales.forEach((r: any) => {
      const k = new Date(r.created_at).toISOString().slice(0,10);
      if (k in dayMap) dayMap[k] += Number(r.total_usd || 0);
    });
    setLast7(Object.entries(dayMap).map(([day, revenue]) => ({ day: day.slice(5), revenue })));

    setLowStock(low.slice(0, 5));
    setRecent(weekSales.slice(0, 6));
    setLoading(false);
  })(); }, []);

  const StatCard = ({ icon: Icon, label, value, hint, tone = "primary" }: any) => (
    <Card className="shadow-soft hover:shadow-card transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PaymentCard = ({ icon: Icon, label, method }: any) => {
    const v = byMethod.find(m => m.name === method)?.value ?? 0;
    return (
      <Card className="shadow-soft">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold truncate">{fmtUSD(v)}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><div className="grid gap-4 grid-cols-1 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to Prime Poly Clinic — today's overview</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Patients" value={stats.patients} />
        <StatCard icon={Stethoscope} label="OPD Today" value={stats.opd} />
        <StatCard icon={Pill} label="Sales Today" value={stats.sales} hint={`${fmtUSD(stats.revenue)} revenue`} tone="success" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} hint="medicines below threshold" tone="warning" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment breakdown (last 7 days)</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <PaymentCard icon={Building2} label="ABA Bank" method="aba" />
          <PaymentCard icon={Building2} label="ACLEDA Bank" method="acleda" />
          <PaymentCard icon={DollarSign} label="PayPal" method="paypal" />
          <PaymentCard icon={CreditCard} label="Visa/Card" method="visa" />
          <PaymentCard icon={Wallet} label="Cash" method="cash" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader><CardTitle>Revenue — Last 7 Days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {byMethod.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">No sales yet</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {byMethod.map((e, i) => <Cell key={i} fill={PAYMENT_COLORS[e.name] || "hsl(var(--muted-foreground))"} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtUSD(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-1 mt-2">
              {byMethod.map(m => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <span className="capitalize flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PAYMENT_COLORS[m.name] }} />{m.name}</span>
                  <span className="font-medium">{fmtUSD(m.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Low Stock Alerts</CardTitle><Badge variant="destructive">{stats.lowStock}</Badge></CardHeader>
          <CardContent>
            {lowStock.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">All medicines well stocked</p> : (
              <div className="space-y-2">
                {lowStock.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-muted-foreground">{m.brand}</p></div>
                    <Badge variant="outline" className="text-warning border-warning">{m.stock} {m.unit}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No transactions yet</p> : (
              <div className="space-y-2">
                {recent.map((r: any) => (
                  <div key={r.invoice_no} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div><p className="font-medium text-sm">{r.invoice_no}</p><p className="text-xs text-muted-foreground capitalize">{r.payment_method} • {new Date(r.created_at).toLocaleString()}</p></div>
                    <p className="font-semibold text-sm">{fmtBoth(Number(r.total_usd))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
