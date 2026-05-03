import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmtUSD, fmtBoth } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, Legend, Line, LineChart, AreaChart, Area,
} from "recharts";
import {
  CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, Receipt, Briefcase,
  Users, Stethoscope, Pill, FlaskConical, Scan, FileText, Printer, AlertTriangle,
} from "lucide-react";

type RangeKey = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday",
  this_week: "This Week", last_week: "Last Week",
  this_month: "This Month", last_month: "Last Month",
  this_year: "This Year", custom: "Custom Range",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "hsl(var(--success))",
  aba: "hsl(var(--primary))",
  acleda: "hsl(var(--primary-glow))",
  paypal: "hsl(var(--warning))",
  visa: "hsl(168 50% 55%)",
  card: "hsl(168 50% 55%)",
  insurance: "hsl(38 92% 50%)",
};
const CHART_PALETTE = [
  "hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(168 50% 55%)",
  "hsl(38 60% 45%)", "hsl(200 60% 50%)",
];

const sod = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const eod = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const sow = (d: Date) => { const x = sod(d); const day = x.getDay() === 0 ? 6 : x.getDay() - 1; x.setDate(x.getDate() - day); return x; };
const som = (d: Date) => { const x = sod(d); x.setDate(1); return x; };
const soy = (d: Date) => { const x = sod(d); x.setMonth(0,1); return x; };

function resolveRange(key: RangeKey, custom?: { from?: Date; to?: Date }) {
  const now = new Date();
  switch (key) {
    case "today": return { from: sod(now), to: eod(now) };
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate()-1); return { from: sod(y), to: eod(y) }; }
    case "this_week": return { from: sow(now), to: eod(now) };
    case "last_week": { const s = sow(now); const last = new Date(s); last.setDate(last.getDate()-7); const end = new Date(s); end.setMilliseconds(-1); return { from: last, to: end }; }
    case "this_month": return { from: som(now), to: eod(now) };
    case "last_month": { const s = som(now); const last = new Date(s); last.setMonth(last.getMonth()-1); const end = new Date(s); end.setMilliseconds(-1); return { from: last, to: end }; }
    case "this_year": return { from: soy(now), to: eod(now) };
    case "custom": return { from: custom?.from ? sod(custom.from) : sod(now), to: custom?.to ? eod(custom.to) : eod(now) };
  }
}

const exportCSV = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => {
    const v = r[h] ?? ""; const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const range = useMemo(() => resolveRange(rangeKey, { from: customFrom, to: customTo }), [rangeKey, customFrom, customTo]);

  const [data, setData] = useState({
    sales: [] as any[], expenses: [] as any[], salaries: [] as any[],
    opd: [] as any[], patients: [] as any[], meds: [] as any[],
    labs: [] as any[], xrays: [] as any[], invoices: [] as any[],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      const fromDate = range.from.toISOString().slice(0,10);
      const toDate = range.to.toISOString().slice(0,10);

      const queries: Promise<any>[] = [
        supabase.from("medicine_sales").select("*").gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").gte("expense_date", fromDate).lte("expense_date", toDate),
        supabase.from("staff_salaries").select("*").gte("paid_on", fromDate).lte("paid_on", toDate),
        supabase.from("opd_visits").select("*, patients(full_name)").gte("visit_date", fromDate).lte("visit_date", toDate),
        supabase.from("patients").select("*").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("medicines").select("*"),
        (supabase.from("lab_orders" as any).select("*").gte("created_at", fromISO).lte("created_at", toISO) as any).then((r: any) => r, () => ({ data: [] })),
        (supabase.from("xray_orders" as any).select("*").gte("created_at", fromISO).lte("created_at", toISO) as any).then((r: any) => r, () => ({ data: [] })),
        (supabase.from("invoices" as any).select("*, patients(full_name, patient_code)").gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }) as any).then((r: any) => r, () => ({ data: [] })),
      ];

      const [salesR, expR, salR, opdR, patR, medR, labR, xrR, invR] = await Promise.all(queries);
      if (cancelled) return;

      setData({
        sales: salesR.data ?? [],
        expenses: expR.data ?? [],
        salaries: salR.data ?? [],
        opd: opdR.data ?? [],
        patients: patR.data ?? [],
        meds: medR.data ?? [],
        labs: labR.data ?? [],
        xrays: xrR.data ?? [],
        invoices: invR.data ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  const stats = useMemo(() => {
    const revenue = data.sales.reduce((s, r) => s + Number(r.total_usd || 0), 0);
    const expense = data.expenses.reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    const salary = data.salaries.reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    const profit = revenue - expense - salary;
    const lowStock = data.meds.filter((m: any) => m.stock <= m.low_stock_threshold).length;
    const avgTicket = data.sales.length ? revenue / data.sales.length : 0;
    return {
      revenue, expense, salary, profit, lowStock, avgTicket,
      salesCount: data.sales.length, opdCount: data.opd.length,
      patientCount: data.patients.length, labCount: data.labs.length,
      xrayCount: data.xrays.length, invoiceCount: data.invoices.length,
    };
  }, [data]);

  const trend = useMemo(() => {
    const dayMs = 86400000;
    const totalDays = Math.min(60, Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / dayMs) + 1));
    const map: Record<string, { revenue: number; expense: number; salary: number }> = {};
    for (let i = 0; i < totalDays; i++) {
      const k = new Date(range.from.getTime() + i * dayMs).toISOString().slice(0,10);
      map[k] = { revenue: 0, expense: 0, salary: 0 };
    }
    data.sales.forEach((r: any) => { const k = new Date(r.created_at).toISOString().slice(0,10); if (map[k]) map[k].revenue += Number(r.total_usd || 0); });
    data.expenses.forEach((r: any) => { if (map[r.expense_date]) map[r.expense_date].expense += Number(r.amount_usd || 0); });
    data.salaries.forEach((r: any) => { if (map[r.paid_on]) map[r.paid_on].salary += Number(r.amount_usd || 0); });
    return Object.entries(map).map(([day, v]) => ({
      day: day.slice(5), ...v, profit: v.revenue - v.expense - v.salary,
    }));
  }, [data, range]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    data.sales.forEach((r: any) => { m[r.payment_method] = (m[r.payment_method] || 0) + Number(r.total_usd || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [data.sales]);

  const expenseByCat = useMemo(() => {
    const m: Record<string, number> = {};
    data.expenses.forEach((r: any) => { m[r.category || "other"] = (m[r.category || "other"] || 0) + Number(r.amount_usd || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  const topMeds = useMemo(() => {
    return [...data.meds].sort((a: any, b: any) => Number(b.stock) - Number(a.stock)).slice(0, 8)
      .map((m: any) => ({ name: m.name, stock: Number(m.stock), threshold: Number(m.low_stock_threshold) }));
  }, [data.meds]);

  const lowStockItems = useMemo(() =>
    data.meds.filter((m: any) => m.stock <= m.low_stock_threshold).slice(0, 10),
  [data.meds]);

  const profitPositive = stats.profit >= 0;
  const profitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

  const printReport = () => window.print();

  const exportAll = () => {
    exportCSV(`sales_${rangeKey}.csv`, data.sales.map((s: any) => ({
      invoice: s.invoice_no, date: s.created_at, total_usd: s.total_usd, payment: s.payment_method,
    })));
  };

  const KPI = ({ icon: Icon, label, value, hint, tone = "primary", trend: t }: any) => {
    const tones: Record<string, string> = {
      primary: "from-primary/15 to-primary/5 text-primary",
      success: "from-success/15 to-success/5 text-success",
      warning: "from-warning/15 to-warning/5 text-warning",
      danger: "from-destructive/15 to-destructive/5 text-destructive",
      muted: "from-muted to-background text-foreground",
    };
    return (
      <Card className="shadow-soft hover:shadow-card transition-all border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className={cn("p-5 bg-gradient-to-br", tones[tone])}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
                <p className="text-2xl font-bold mt-1.5 text-foreground truncate">{value}</p>
                {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
              </div>
              <div className="h-11 w-11 shrink-0 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-soft">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            {t !== undefined && (
              <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                {t >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                <span className={t >= 0 ? "text-success" : "text-destructive"}>{Math.abs(t).toFixed(1)}%</span>
                <span className="text-muted-foreground">vs prior</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Comprehensive overview — {RANGE_LABELS[rangeKey]}
            <span className="ml-2 text-xs">({format(range.from, "MMM d, yyyy")} → {format(range.to, "MMM d, yyyy")})</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-[170px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
                <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rangeKey === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("font-normal", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{customFrom ? format(customFrom, "PP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("font-normal", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{customTo ? format(customTo, "PP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}
          <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={printReport} className="clinic-gradient text-primary-foreground"><Printer className="h-4 w-4 mr-2" />Print</Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center pb-4 border-b">
        <h1 className="text-xl font-bold text-primary">PRIME POLY CLINIC</h1>
        <p className="text-sm">Reports & Analytics — {RANGE_LABELS[rangeKey]}</p>
        <p className="text-xs text-muted-foreground">{format(range.from, "PPP")} → {format(range.to, "PPP")}</p>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KPI icon={DollarSign} label="Total Revenue" value={fmtUSD(stats.revenue)} hint={`${stats.salesCount} sales`} tone="success" />
            <KPI icon={Receipt} label="Expenses" value={fmtUSD(stats.expense)} hint="Operations" tone="warning" />
            <KPI icon={Briefcase} label="Salaries Paid" value={fmtUSD(stats.salary)} hint={`${data.salaries.length} payouts`} tone="primary" />
            <KPI
              icon={profitPositive ? TrendingUp : TrendingDown}
              label={profitPositive ? "Net Profit" : "Net Loss"}
              value={fmtUSD(Math.abs(stats.profit))}
              hint={`Margin: ${profitMargin.toFixed(1)}%`}
              tone={profitPositive ? "success" : "danger"}
            />
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
            <KPI icon={Users} label="New Patients" value={stats.patientCount} tone="muted" />
            <KPI icon={Stethoscope} label="OPD Visits" value={stats.opdCount} tone="primary" />
            <KPI icon={FileText} label="Invoices" value={stats.invoiceCount} tone="muted" />
            <KPI icon={FlaskConical} label="Lab Orders" value={stats.labCount} tone="primary" />
            <KPI icon={Scan} label="X-Ray Orders" value={stats.xrayCount} tone="muted" />
            <KPI icon={AlertTriangle} label="Low Stock" value={stats.lowStock} hint="below threshold" tone="warning" />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="financial" className="space-y-4">
            <TabsList className="bg-muted/60 print:hidden">
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            {/* Financial */}
            <TabsContent value="financial" className="space-y-4 mt-0">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-soft">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Revenue vs Expense Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--success))" fill="url(#rev)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" name="Expense" stroke="hsl(var(--warning))" fill="url(#exp)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-soft">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Profit Trajectory</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                        <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Net {profitPositive ? "Profit" : "Loss"}</p>
                        <p className={cn("text-lg font-bold", profitPositive ? "text-success" : "text-destructive")}>{fmtBoth(Math.abs(stats.profit))}</p>
                      </div>
                      <Badge variant={profitPositive ? "default" : "destructive"} className="text-sm">
                        {profitMargin.toFixed(1)}% margin
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-soft">
                <CardHeader className="pb-2"><CardTitle className="text-base">Expense Breakdown by Category</CardTitle></CardHeader>
                <CardContent>
                  {expenseByCat.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">No expenses in this range</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={expenseByCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                            {expenseByCat.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => fmtUSD(Number(v))} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {expenseByCat.map((c, i) => (
                          <div key={c.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <span className="capitalize flex items-center gap-2 text-sm">
                              <span className="h-3 w-3 rounded-sm" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                              {c.name}
                            </span>
                            <span className="font-semibold text-sm">{fmtUSD(c.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments */}
            <TabsContent value="payments" className="space-y-4 mt-0">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-soft">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Payment Method Distribution</CardTitle></CardHeader>
                  <CardContent>
                    {byMethod.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">No payments yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                            {byMethod.map((e, i) => <Cell key={i} fill={PAYMENT_COLORS[e.name] || CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => fmtUSD(Number(v))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-soft">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Payment Method Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {byMethod.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">No data</p>
                    ) : byMethod.map((m, i) => {
                      const pct = stats.revenue > 0 ? (m.value / stats.revenue) * 100 : 0;
                      return (
                        <div key={m.name} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="capitalize font-medium flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: PAYMENT_COLORS[m.name] || CHART_PALETTE[i % CHART_PALETTE.length] }} />
                              {m.name}
                            </span>
                            <span className="font-bold">{fmtUSD(m.value)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PAYMENT_COLORS[m.name] || CHART_PALETTE[i % CHART_PALETTE.length] }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-soft">
                <CardHeader className="pb-2"><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.slice(0, 10).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.invoice_no}</TableCell>
                          <TableCell className="text-sm">{format(new Date(s.created_at), "PP p")}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{s.payment_method}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{fmtUSD(Number(s.total_usd || 0))}</TableCell>
                        </TableRow>
                      ))}
                      {data.sales.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No sales</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operations */}
            <TabsContent value="operations" className="space-y-4 mt-0">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="shadow-soft">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Avg Transaction</p>
                    <p className="text-2xl font-bold mt-2">{fmtUSD(stats.avgTicket)}</p>
                    <p className="text-xs text-muted-foreground mt-1">per sale</p>
                  </CardContent>
                </Card>
                <Card className="shadow-soft">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Visits / Day</p>
                    <p className="text-2xl font-bold mt-2">
                      {(stats.opdCount / Math.max(1, trend.length)).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">average OPD volume</p>
                  </CardContent>
                </Card>
                <Card className="shadow-soft">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Tests Performed</p>
                    <p className="text-2xl font-bold mt-2">{stats.labCount + stats.xrayCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">lab + x-ray</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-soft">
                <CardHeader className="pb-2"><CardTitle className="text-base">Daily Activity Mix</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      <Bar dataKey="expense" name="Expense" fill="hsl(var(--warning))" radius={[4,4,0,0]} />
                      <Bar dataKey="salary" name="Salary" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="space-y-4 mt-0">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-soft">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top Stocked Items</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topMeds} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-soft border-warning/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />Low Stock Alert
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Min</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-8 text-success font-medium">All items well stocked ✓</TableCell></TableRow>
                        ) : lowStockItems.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell className="text-right"><Badge variant="destructive">{m.stock}</Badge></TableCell>
                            <TableCell className="text-right text-muted-foreground">{m.low_stock_threshold}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices" className="space-y-4 mt-0">
              <Card className="shadow-soft">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Recent Invoices</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportCSV(`invoices_${rangeKey}.csv`, data.invoices.map((i: any) => ({
                    invoice: i.invoice_no, date: i.created_at, patient: i.patients?.full_name, total: i.total_usd, paid: i.paid_usd, status: i.status,
                  })))}><Download className="h-4 w-4 mr-1" />CSV</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.slice(0, 15).map((inv: any) => {
                        const due = Number(inv.total_usd || 0) - Number(inv.paid_usd || 0);
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">{inv.invoice_no}</TableCell>
                            <TableCell className="text-sm">{format(new Date(inv.created_at), "PP")}</TableCell>
                            <TableCell>{inv.patients?.full_name || "Walking In"}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === "paid" ? "default" : due > 0 ? "destructive" : "secondary"} className="capitalize">
                                {inv.status || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{fmtUSD(Number(inv.total_usd || 0))}</TableCell>
                            <TableCell className="text-right text-success">{fmtUSD(Number(inv.paid_usd || 0))}</TableCell>
                            <TableCell className={cn("text-right", due > 0 ? "text-destructive font-semibold" : "text-muted-foreground")}>{fmtUSD(due)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {data.invoices.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices in this range</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
