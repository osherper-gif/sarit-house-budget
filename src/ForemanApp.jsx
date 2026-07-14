// ============================================================
// ForemanApp.jsx — תת-אפליקציה מינימליסטית למנהל העבודה (מובייל)
// מציג אך ורק: קבלנים שהוקצו לו + הצ'ק-ליסט שלהם + לוז.
// אפס נתונים כספיים: אין תקציב, אין סכומים, אין פעימות תשלום.
// חתימת סיום ב-100% ביצוע מעדכנת את הגאנט של שרית (Cascade).
// ============================================================
import {
  HardHat,
  LogOut,
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  PenLine,
} from "lucide-react";
import {
  useBudget,
  fmtDate,
  pct,
  contractorSchedule,
  ProgressBar,
} from "./Utilities";
import { cascadeCompletion, useForemanSync, isRemoteEnabled } from "./foremanSync";

function TaskItem({ contractor, task, disabled }) {
  const { updateForeman } = useBudget();

  const toggle = () =>
    updateForeman(contractor.id, (a) => ({
      ...a,
      subTasks: a.subTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              done: !t.done,
              doneAt: !t.done ? new Date().toISOString().slice(0, 10) : null,
            }
          : t
      ),
    }));

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
        task.done
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white active:bg-slate-50"
      } ${disabled ? "pointer-events-none opacity-70" : ""}`}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={toggle}
        disabled={disabled}
        className="h-6 w-6 shrink-0 cursor-pointer rounded border-slate-300 accent-emerald-600"
      />
      <span
        className={`min-w-0 flex-1 text-sm font-medium ${
          task.done ? "text-emerald-800 line-through decoration-emerald-400" : ""
        }`}
      >
        {task.title}
      </span>
      {task.done && task.doneAt && (
        <span className="shrink-0 text-[10px] text-emerald-600">{fmtDate(task.doneAt)}</span>
      )}
    </label>
  );
}

function AssignedContractorCard({ contractor, assignment }) {
  const { updateForeman, setContractors } = useBudget();
  const s = contractorSchedule(contractor);
  const done = assignment.subTasks.filter((t) => t.done).length;
  const total = assignment.subTasks.length;
  const allDone = total > 0 && done === total;

  const signOff = () => {
    if (
      !window.confirm(
        `לחתום על סיום העבודה של ${contractor.name} (${contractor.trade})?\nהפעולה תסמן את השלב כ"הושלם" בתוכנית העבודה של שרית.`
      )
    )
      return;
    const today = new Date().toISOString().slice(0, 10);
    updateForeman(contractor.id, (a) => ({
      ...a,
      signedOff: true,
      signedOffAt: today,
    }));
    // Cascade: עדכון הגאנט + הזזת קבלנים במורד הזרם לפי הסיום בפועל
    setContractors((prev) => cascadeCompletion(prev, contractor.id, today));
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <HardHat className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{contractor.name}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{contractor.trade}</span>
            {s && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {fmtDate(s.start)} — {fmtDate(s.end)}
              </span>
            )}
          </div>
        </div>
        {assignment.signedOff && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            הושלם
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        {total > 0 ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>התקדמות משימות</span>
              <span className="font-bold tabular-nums">
                {done}/{total}
              </span>
            </div>
            <ProgressBar value={pct(done, total)} />
            {assignment.subTasks.map((t) => (
              <TaskItem
                key={t.id}
                contractor={contractor}
                task={t}
                disabled={assignment.signedOff}
              />
            ))}
          </>
        ) : (
          <p className="py-2 text-center text-sm text-slate-400">
            שרית עדיין לא הגדירה משימות לקבלן זה
          </p>
        )}

        {!assignment.signedOff && total > 0 && (
          <button
            onClick={signOff}
            disabled={!allDone}
            className={`btn w-full py-3 font-bold ${
              allDone
                ? "bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            <PenLine className="h-4 w-4" />
            {allDone
              ? "חתימה על סיום העבודה"
              : `חתימה תתאפשר לאחר השלמת כל המשימות (${done}/${total})`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ForemanApp({ onLogout }) {
  const { data, setForemanAssignments } = useBudget();
  useForemanSync(data.foreman?.assignments || [], setForemanAssignments);

  const assigned = (data.foreman?.assignments || [])
    .filter((a) => a.visibleToForeman)
    .map((a) => ({
      assignment: a,
      contractor: data.contractors.find((c) => c.id === a.contractorId),
    }))
    .filter((x) => x.contractor);

  const openCount = assigned.filter((x) => !x.assignment.signedOff).length;

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      {/* כותרת מנהל עבודה — ללא שום נתון כספי */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-900">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold leading-tight">אזור מנהל עבודה</h1>
            <p className="text-xs text-slate-400">
              {openCount > 0 ? `${openCount} קבלנים בטיפול` : "אין משימות פתוחות"}
              {isRemoteEnabled() && " · מסונכרן"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            יציאה
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {assigned.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            שרית עדיין לא הקצתה לך קבלנים.
            <br />
            כשתוקצה עבודה — היא תופיע כאן.
          </div>
        ) : (
          assigned.map(({ contractor, assignment }) => (
            <AssignedContractorCard
              key={contractor.id}
              contractor={contractor}
              assignment={assignment}
            />
          ))
        )}
      </main>
    </div>
  );
}
