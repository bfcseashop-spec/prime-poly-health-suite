import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Stethoscope, Pill, AlertTriangle, CreditCard, Wallet, Building2, DollarSign,
  TrendingUp, TrendingDown, Receipt, Briefcase, CalendarIcon,
} from "lucide-react";
import { fmtBoth, fmtUSD } from "@/lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, Legend, Line, LineChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "hsl(var(--success))",
  aba: "hsl(var(--primary))",
  acleda: "hsl(var(--primary-glow))",
  paypal: "hsl(var(--warning))",
  visa: "hsl(var(--accent-foreground))",
};

type RangeKey =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "custom";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay() === 0 ? 6 : x.getDay() - 1; // Monday-start
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) { const x = startOfDay(d); x.setDate(1); return x; }
function endOfMonth(d: Date) { const x = startOfMonth(d); x.setMonth(x.getMonth()+1); x.setMilliseconds(-1); return x; }

function resolveRange(key: RangeKey, custom?: { from?: Date; to?: Date }): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate()-1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "this_week": return { from: startOfWeek(now), to: endOfDay(now) };
    case "last_week": {
      const s = startOfWeek(now); const last = new Date(s); last.setDate(last.getDate()-7);
      const end = new Date(s); end.setMilliseconds(-1);
      return { from: last, to: end };
    }
    case "this_month": return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const s = startOfMonth(now); const last = new Date(s); last.setMonth(last.getMonth()-1);
      const end = new Date(s); end.setMilliseconds(-1);
      return { from: last, to: end };
    }
    case "custom":
      return {
        from: custom?.from ? startOfDay(custom.from) : startOfDay(now),
        to: custom?.to ? endOfDay(custom.to) : endOfDay(now),
      };
  }
}

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday",
  this_week: "This Week", last_week: "Last Week",
  this_month: "This Month", last_month: "Last Month",
  custom: "Custom",
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const range = useMemo(
    () => resolveRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo],
  );

  const [stats, setStats] = useState({
    patients: 0, opd: 0, salesCount: 0, revenue: 0,
    expense: 0, salary: 0, lowStock: 0,
  });
  const [byMethod, setByMethod] = useState<{ name: string; value: number }[]>([]);
  const [trend, setTrend] = useState<{ day: string; revenue: number; expense: number; profit: number }[]>([]);
  const [expenseByCat, setExpenseByCat] = useState<{ name: string; value: number }[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      const fromDate = range.from.toISOString().slice(0,10);
      const toDate = range.to.toISOString().slice(0,10);

      const [patientsRes, opdRes, salesRes, expensesRes, salariesRes, medsRes] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("opd_visits").select("*", { count: "exact", head: true })
          .gte("visit_date", fromDate).lte("visit_date", toDate),
        supabase.from("medicine_sales")
          .select("total_usd, payment_method, created_at, invoice_no")
          .gte("created_at", fromISO).lte("created_at", toISO)
          .order("created_at", { ascending: false }),
        supabase.from("expenses")
          .select("amount_usd, category, expense_date")
          .gte("expense_date", fromDate).lte("expense_date", toDate),
        supabase.from("staff_salaries")
          .select("amount_usd, paid_on, staff_name")
          .gte("paid_on", fromDate).lte("paid_on", toDate),
        supabase.from("medicines").select("*"),
      ]);
      if (cancelled) return;

      const sales = salesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const salaries = salariesRes.data ?? [];
      const meds = medsRes.data ?? [];
      const low = meds.filter((m: any) => m.stock <= m.low_stock_threshold);

      const revenue = sales.reduce((s, r: any) => s + Number(r.total_usd || 0), 0);
      const expense = expenses.reduce((s, r: any) => s + Number(r.amount_usd || 0), 0);
      const salary = salaries.reduce((s, r: any) => s + Number(r.amount_usd || 0), 0);

      setStats({
        patients: patientsRes.count ?? 0,
        opd: opdRes.count ?? 0,
        salesCount: sales.length,
        revenue, expense, salary,
        lowStock: low.length,
      });

      const methodMap: Record<string, number> = {};
      sales.forEach((r: any) => { methodMap[r.payment_method] = (methodMap[r.payment_method] || 0) + Number(r.total_usd || 0); });
      setByMethod(Object.entries(methodMap).map(([name, value]) => ({ name, value })));

      const catMap: Record<string, number> = {};
      expenses.forEach((r: any) => { catMap[r.category || "other"] = (catMap[r.category || "other"] || 0) + Number(r.amount_usd || 0); });
      setExpenseByCat(Object.entries(catMap).map(([name, value]) => ({ name, value })));

      // Build daily trend bins across the range (cap at 60 buckets)
      const dayMap: Record<string, { revenue: number; expense: number }> = {};
      const dayMs = 24 * 3600 * 1000;
      const totalDays = Math.min(60, Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / dayMs) + 1));
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(range.from.getTime() + i * dayMs);
        dayMap[d.toISOString().slice(0,10)] = { revenue: 0, expense: 0 };
      }
      sales.forEach((r: any) => {
        const k = new Date(r.created_at).toISOString().slice(0,10);
        if (dayMap[k]) dayMap[k].revenue += Number(r.total_usd || 0);
      });
      expenses.forEach((r: any) => {
        const k = r.expense_date;
        if (dayMap[k]) dayMap[k].expense += Number(r.amount_usd || 0);
      });
      salaries.forEach((r: any) => {
        const k = r.paid_on;
        if (dayMap[k]) dayMap[k].expense += Number(r.amount_usd || 0);
      });
      setTrend(Object.entries(dayMap).map(([day, v]) => ({
        day: day.slice(5),
        revenue: v.revenue,
        expense: v.expense,
        profit: v.revenue - v.expense,
      })));

      setLowStock(low.slice(0, 5));
      setRecent(sales.slice(0, 6));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  const profit = stats.revenue - stats.expense - stats.salary;
  const profitPositive = profit >= 0;

  const StatCard = ({ icon: Icon, label, value, hint, tone = "primary" }: any) => {
    const tones: Record<string, string> = {
      primary: "bg-primary/10 text-primary",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      danger: "bg-destructive/10 text-destructive",
      muted: "bg-muted text-foreground",
    };
    return (
      <Card className="shadow-soft hover:shadow-card transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold mt-1 truncate">{value}</p>
              {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
            </div>
            <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${tones[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to Prime Poly Clinic — {RANGE_LABELS[rangeKey]} overview
            <span className="ml-2 text-xs">({format(range.from, "MMM d")} → {format(range.to, "MMM d, yyyy")})</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
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
                  <Button variant="outline" className={cn("justify-start font-normal", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customFrom ? format(customFrom, "PP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start font-normal", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customTo ? format(customTo, "PP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={DollarSign} label="Total Sales" value={fmtUSD(stats.revenue)} hint={`${stats.salesCount} transactions`} tone="success" />
            <StatCard icon={Receipt} label="Expense" value={fmtUSD(stats.expense)} hint="operational" tone="warning" />
            <StatCard icon={Briefcase} label="Staff Salary" value={fmtUSD(stats.salary)} hint="paid in range" tone="primary" />
            <StatCard
              icon={profitPositive ? TrendingUp : TrendingDown}
              label={profitPositive ? "Profit" : "Loss"}
              value={fmtUSD(Math.abs(profit))}
              hint="revenue − expense − salary"
              tone={profitPositive ? "success" : "danger"}
            />
            <StatCard icon={Users} label="Total Patients" value={stats.patients} tone="muted" />
            <StatCard icon={Stethoscope} label="OPD Visits" value={stats.opd} tone="primary" />
            <StatCard icon={Pill} label="Sales Count" value={stats.salesCount} tone="success" />
            <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} hint="below threshold" tone="warning" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment breakdown</h2>
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
              <CardHeader><CardTitle>Revenue vs Expense — {RANGE_LABELS[rangeKey]}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                    <Bar dataKey="expense" name="Expense" fill="hsl(var(--warning))" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader><CardTitle>Profit Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtUSD(Number(v))} />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net {profitPositive ? "Profit" : "Loss"}</span>
                  <span className={cn("font-semibold", profitPositive ? "text-success" : "text-destructive")}>{fmtBoth(Math.abs(profit))}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
              <CardContent>
                {byMethod.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">No sales in this range</p> : (
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

            <Card className="shadow-soft">
              <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
              <CardContent>
                {expenseByCat.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">No expenses in this range</p> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={expenseByCat} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                      <Tooltip formatter={(v: any) => fmtUSD(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="value" fill="hsl(var(--warning))" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
                {recent.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No transactions in this range</p> : (
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
        </>
      )}
    </div>
  );
}
