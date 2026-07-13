// ============================================================
// Dashboard.jsx — מסך ראשי: KPI, ניצול תקציב, פירוט לפי שלבים
// + באנר תזכורת גיבוי שבועי
// ============================================================
import { useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  AlertTriangle,
  BellRing,
  X,
  Bot,
  CheckSquare,
  CreditCard,
  Sparkles,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import { BACKUP_REMINDER_MS } from "./config";
import { buildInsights, telHref, waHref, waPhone } from "./insights";
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

// ---------- קופסת המלצות יומיות (AI Co-Pilot) ----------
const INSIGHT_STYLES = {
  verify: {
    icon: CheckSquare,
    box: "border-sky-200 bg-sky-50",
    chip: "bg-sky-100 text-sky-600",
    text: "text-sky-900",
    label: "לוודא ש...",
  },
  pay: {
    icon: CreditCard,
    box: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-600",
    text: "text-amber-900",
    label: "לשלם ל...",
  },
  risk: {
    icon: AlertTriangle,
    box: "border-red-200 bg-red-50",
    chip: "bg-red-100 text-red-600",
    text: "text-red-900",
    label: "להיזהר מ...",
  },
  success: {
    icon: Sparkles,
    box: "border-emerald-200 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-900",
    label: "כל הכבוד!",
  },
};

const INSIGHTS_DISMISS_KEY = "insights-dismissed";

function InsightCard({ insight, onDismiss }) {
  const st = INSIGHT_STYLES[insight.type];
  const Icon = st.icon;
  const phone = insight.contractor?.phone?.trim();

  return (
    <div className={`relative rounded-xl border p-3 ${st.box}`}>
      <div className="flex items-start gap-2.5 pe-6">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${st.chip}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`mb-0.5 text-[10px] font-extrabold uppercase tracking-wide opacity-60 ${st.text}`}>
            {st.label}
          </div>
          <p className={`text-sm leading-snug ${st.text}`}>{insight.text}</p>

          {phone && waPhone(phone) && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={telHref(phone)} className="btn !py-1.5 !px-2.5 !text-xs border border-white/60 bg-white/70 text-slate-700 hover:bg-white">
                <PhoneCall className="h-3.5 w-3.5" />
                התקשר כעת
              </a>
              {insight.waText && (
                <a
                  href={waHref(phone, insight.waText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn !py-1.5 !px-2.5 !text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  שלח וואטסאפ
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className={`absolute end-2 top-2 rounded-md p-0.5 opacity-40 hover:opacity-100 ${st.text}`}
        aria-label="הסתרת ההמלצה"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DailyInsights() {
  const { data } = useBudget();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(INSIGHTS_DISMISS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const insights = useMemo(() => buildInsights(data), [data]);
  const visible = insights.filter((i) => !dismissed.has(i.id));

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem(INSIGHTS_DISMISS_KEY, JSON.stringify([...next]));
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-l from-indigo-50 to-white px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold leading-tight">קופסת המלצות יומיות</h2>
          <p className="text-[11px] text-slate-400">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {visible.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 tabular-nums">
            {visible.length}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        {visible.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            אין המלצות חדשות להיום — הכל מתקדם לפי התוכנית
          </p>
        ) : (
          visible.map((ins) => (
            <InsightCard key={ins.id} insight={ins} onDismiss={() => dismiss(ins.id)} />
          ))
        )}
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
      {/* המלצות יומיות — AI Co-Pilot */}
      <DailyInsights />

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
