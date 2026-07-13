// ============================================================
// Dashboard.jsx — מסך ראשי: KPI, ניצול תקציב, פירוט לפי שלבים
// + באנר תזכורת גיבוי שבועי
// ============================================================
import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  AlertTriangle,
  BellRing,
  X,
} from "lucide-react";
import { BACKUP_REMINDER_MS } from "./config";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useBudget, fmt, pct, phaseTotals } from "./Utilities";

const kpiStyles = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  red: "bg-red-50 text-red-600",
};

function Kpi({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpiStyles[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-lg font-extrabold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

const DISMISS_KEY = "backup-banner-dismissed";

// ---------- באנר תזכורת גיבוי ----------
function BackupReminder() {
  const { data } = useBudget();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  const ts = data.meta.lastBackupTimestamp;
  const due = !ts || Date.now() - ts > BACKUP_REMINDER_MS;
  if (!due || dismissed) return null;

  const days = ts ? Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000)) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pe-6">
          <div className="font-bold text-amber-900">הגיע הזמן לגבות את הנתונים!</div>
          <p className="mt-0.5 text-sm text-amber-800">
            {days === null
              ? "טרם בוצע גיבוי לנתונים."
              : `הגיבוי האחרון בוצע לפני ${days} ימים.`}{" "}
            היכנסי לטאב <b>גיבוי</b> וייצאי קובץ JSON או Excel — זה לוקח שניה
            ושומר על כל ההיסטוריה.
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="absolute end-2.5 top-2.5 rounded-lg p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
          aria-label="סגירת התזכורת"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const shorten = (name) => (name.length > 12 ? name.slice(0, 11) + "…" : name);
const compact = (v) =>
  new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export default function Dashboard() {
  const { data, totals } = useBudget();
  const utilization = pct(totals.paid, totals.cost);

  const byPhase = data.phases.map((ph) => {
    const t = phaseTotals(ph, data.contractors);
    return {
      name: shorten(ph.name),
      fullName: ph.name,
      "תקציב": t.cost,
      "שולם": t.paid,
    };
  });

  return (
    <div className="space-y-4">
      {/* תזכורת גיבוי שבועית */}
      <BackupReminder />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={Wallet} label="תקציב כולל" value={fmt(totals.cost)} color="indigo" />
        <Kpi icon={TrendingUp} label="שולם עד כה" value={fmt(totals.paid)} color="emerald" />
        <Kpi icon={PiggyBank} label="יתרה לתשלום" value={fmt(totals.remaining)} color="sky" />
        <Kpi
          icon={AlertTriangle}
          label="סעיפים בחריגה"
          value={totals.exceeded}
          color={totals.exceeded > 0 ? "red" : "emerald"}
          sub={totals.exceeded > 0 ? "דורש בדיקה" : "הכל תקין"}
        />
      </div>

      {/* Utilization radial */}
      <div className="card p-5">
        <h2 className="mb-2 font-bold">ניצול תקציב</h2>
        <div className="relative mx-auto h-44 w-44">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="78%"
              outerRadius="100%"
              data={[{ value: utilization }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={20}
                fill={utilization > 100 ? "#ef4444" : "#6366f1"}
                background={{ fill: "#e2e8f0" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tabular-nums">{utilization}%</span>
            <span className="text-xs text-slate-500">מהתקציב שולם</span>
          </div>
        </div>
        <div className="mt-2 text-center text-sm text-slate-500">
          {fmt(totals.paid)} מתוך {fmt(totals.cost)}
        </div>
      </div>

      {/* Per-phase breakdown */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold">תקציב מול תשלום לפי שלב</h2>
        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPhase} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={55}
              />
              <YAxis tickFormatter={compact} tick={{ fontSize: 10, fill: "#64748b" }} width={45} />
              <Tooltip
                formatter={(v) => fmt(v)}
                labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l}
                contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="תקציב" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
              <Bar dataKey="שולם" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
