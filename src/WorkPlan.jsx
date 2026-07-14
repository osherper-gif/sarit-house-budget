// ============================================================
// WorkPlan.jsx — תוכנית עבודה: ציר זמן (Gantt-lite) לפי קבלן
// + זיהוי צווארי בקבוק (חלון עבודה שהסתיים עם פעימות פתוחות)
// ============================================================
import { useMemo, useState } from "react";
import {
  CalendarRange,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  Clock,
  CalendarPlus,
} from "lucide-react";
import {
  useBudget,
  fmt,
  num,
  pct,
  contractorPaid,
  contractorSchedule,
  isBottleneck,
} from "./Utilities";
import ContractorEditModal from "./ContractorEditModal";

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtShort = (d) =>
  d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "2-digit" });

// סטטוס ויזואלי לשורה בציר הזמן
function rowStatus(c) {
  const s = contractorSchedule(c);
  const allPaid = c.milestones.length > 0 && c.milestones.every((m) => m.isPaid);
  if (c.workCompleted) return "done"; // חתימת מנהל עבודה
  if (isBottleneck(c)) return "late";
  if (allPaid) return "done";
  if (s && s.start.getTime() <= Date.now() && Date.now() <= s.end.getTime()) return "active";
  return "future";
}

const BAR_STYLES = {
  late: "bg-gradient-to-l from-red-400 to-amber-400",
  done: "bg-emerald-500",
  active: "bg-indigo-500",
  future: "bg-indigo-200",
};

const STATUS_LABEL = {
  late: "בחריגה מהלוז",
  done: "הושלם",
  active: "בעבודה",
  future: "מתוכנן",
};

function TimelineRow({ contractor, range }) {
  const [showEdit, setShowEdit] = useState(false);
  const s = contractorSchedule(contractor);
  const status = rowStatus(contractor);
  const paid = contractorPaid(contractor);
  const progress = pct(paid, num(contractor.totalValue));
  const unpaidCount = contractor.milestones.filter((m) => !m.isPaid).length;

  const barStart = s ? ((s.start.getTime() - range.min) / range.span) * 100 : 0;
  const barWidth = s
    ? Math.max(1.5, ((s.end.getTime() - s.start.getTime()) / range.span) * 100)
    : 0;
  const todayPos = ((Date.now() - range.min) / range.span) * 100;

  return (
    <div className="border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          {status === "late" && (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          {status === "done" && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
          <span className="truncate">
            {contractor.trade} · {contractor.name}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              status === "late"
                ? "bg-amber-100 text-amber-700"
                : status === "done"
                ? "bg-emerald-100 text-emerald-700"
                : status === "active"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="עריכת לוז"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {s ? (
        <>
          {/* מסילת ציר הזמן */}
          <div className="relative h-5 overflow-hidden rounded-lg bg-slate-100">
            {/* קו "היום" */}
            {todayPos >= 0 && todayPos <= 100 && (
              <div
                className="absolute inset-y-0 z-10 w-0.5 bg-amber-500/80"
                style={{ insetInlineStart: `${todayPos}%` }}
              />
            )}
            {/* פס הפעילות */}
            <div
              className={`absolute inset-y-0.5 rounded-md ${BAR_STYLES[status]}`}
              style={{
                insetInlineStart: `${barStart}%`,
                width: `${barWidth}%`,
              }}
            >
              {/* מילוי התקדמות תשלומים בתוך הפס */}
              <div
                className="h-full rounded-md bg-black/20"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {fmtShort(s.start)} ← {fmtShort(s.end)} · {contractor.durationDays} ימים
            </span>
            <span className="tabular-nums">
              שולם {progress}%{unpaidCount > 0 && ` · ${unpaidCount} פעימות פתוחות`}
            </span>
          </div>
        </>
      ) : (
        <button
          onClick={() => setShowEdit(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          הגדר תאריך התחלה
        </button>
      )}

      {showEdit && (
        <ContractorEditModal contractor={contractor} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}

export default function WorkPlan() {
  const { data } = useBudget();

  const range = useMemo(() => {
    const schedules = data.contractors
      .map(contractorSchedule)
      .filter(Boolean);
    if (!schedules.length) return null;
    let min = Math.min(...schedules.map((s) => s.start.getTime()));
    let max = Math.max(...schedules.map((s) => s.end.getTime()), Date.now());
    const pad = Math.max((max - min) * 0.03, DAY_MS);
    min -= pad;
    max += pad;
    return { min, max, span: max - min };
  }, [data.contractors]);

  // גם כשאין אף לוז מוגדר — מציגים את כל השורות עם כפתור "הגדר תאריך התחלה"
  const effectiveRange = range ?? {
    min: Date.now() - 30 * DAY_MS,
    max: Date.now() + 30 * DAY_MS,
    span: 60 * DAY_MS,
  };

  const bottlenecks = data.contractors.filter(isBottleneck);

  // ממוינים: לפי תאריך התחלה, ללא-לוז בסוף
  const sorted = [...data.contractors].sort((a, b) => {
    const sa = contractorSchedule(a);
    const sb = contractorSchedule(b);
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    return sa.start - sb.start;
  });

  return (
    <div className="space-y-4">
      {/* התראת צווארי בקבוק */}
      {bottlenecks.length > 0 && (
        <div className="card border-amber-300 bg-gradient-to-l from-amber-50 to-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            זוהו {bottlenecks.length} צווארי בקבוק בלוח הזמנים
          </div>
          <ul className="space-y-1.5">
            {bottlenecks.map((c) => {
              const s = contractorSchedule(c);
              const overdue = Math.ceil((Date.now() - s.end.getTime()) / DAY_MS);
              const unpaid = c.milestones.filter((m) => !m.isPaid);
              return (
                <li key={c.id} className="flex items-start gap-2 text-sm text-amber-800">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <b>
                      {c.trade} — {c.name}
                    </b>
                    : חלון העבודה הסתיים לפני {overdue} ימים ונותרו {unpaid.length}{" "}
                    פעימות פתוחות ({fmt(unpaid.reduce((t, m) => t + num(m.amount), 0))}).
                    עיכוב זה עלול לדחוף את השלבים הבאים.
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ציר הזמן */}
      <div className="card p-4">
        <div className="mb-1 flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold">תוכנית עבודה</h2>
        </div>
        {data.contractors.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            אין קבלנים עדיין — הוסיפי קבלנים בטאב "קבלנים"
          </p>
        ) : (
          <>
            {range && (
              <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{fmtShort(new Date(range.min))}</span>
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <span className="inline-block h-2.5 w-0.5 bg-amber-500" /> היום
                </span>
                <span>{fmtShort(new Date(range.max))}</span>
              </div>
            )}
            <div>
              {sorted.map((c) => (
                <TimelineRow key={c.id} contractor={c} range={effectiveRange} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* מקרא */}
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-indigo-500" /> בעבודה
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-indigo-200" /> מתוכנן
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-emerald-500" /> הושלם
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-gradient-to-l from-red-400 to-amber-400" />{" "}
          בחריגה
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-slate-800/20" /> מילוי כהה = % ששולם
        </span>
      </div>
    </div>
  );
}
