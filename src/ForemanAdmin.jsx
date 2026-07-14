// ============================================================
// ForemanAdmin.jsx — "לוח בקרה: מנהל עבודה" (הטאב של שרית)
// בחירת קבלנים שגלויים למנהל העבודה + בניית צ'ק-ליסטים מותאמים.
// ============================================================
import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  KeyRound,
  Wifi,
  WifiOff,
  CheckCircle2,
  RotateCcw,
  HardHat,
} from "lucide-react";
import { useBudget, uid, ProgressBar, pct, fmtDate } from "./Utilities";
import { FOREMAN_PASSCODE } from "./config";
import { isRemoteEnabled, useForemanSync } from "./foremanSync";

const emptyAssignment = (contractorId) => ({
  contractorId,
  visibleToForeman: false,
  signedOff: false,
  signedOffAt: null,
  subTasks: [],
});

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "start-[22px]" : "start-0.5"
        }`}
      />
    </button>
  );
}

function SubTaskBuilder({ contractor, assignment }) {
  const { updateForeman } = useBudget();
  const [title, setTitle] = useState("");

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    updateForeman(contractor.id, (a) => ({
      ...a,
      subTasks: [...a.subTasks, { id: uid(), title: t, done: false, doneAt: null }],
    }));
    setTitle("");
  };

  const removeTask = (tid) =>
    updateForeman(contractor.id, (a) => ({
      ...a,
      subTasks: a.subTasks.filter((t) => t.id !== tid),
    }));

  const done = assignment.subTasks.filter((t) => t.done).length;
  const total = assignment.subTasks.length;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold">משימות למנהל העבודה</span>
        {total > 0 && (
          <span className="tabular-nums">
            בוצעו {done}/{total}
          </span>
        )}
      </div>
      {total > 0 && <ProgressBar value={pct(done, total)} />}

      {assignment.subTasks.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
            t.done
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          {t.done && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          <span className="min-w-0 flex-1 truncate">{t.title}</span>
          {t.done && t.doneAt && (
            <span className="shrink-0 text-[10px] text-emerald-600">{fmtDate(t.doneAt)}</span>
          )}
          <button
            onClick={() => removeTask(t.id)}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="מחיקת משימה"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder='למשל: "לוודא הגעה", "לצלם צנרת לפני יציקה"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button onClick={addTask} className="btn-primary shrink-0 !px-3" aria-label="הוספת משימה">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ContractorAssignmentCard({ contractor }) {
  const { data, updateForeman, setContractors } = useBudget();
  const assignment =
    (data.foreman?.assignments || []).find((a) => a.contractorId === contractor.id) ||
    emptyAssignment(contractor.id);

  const toggleVisible = () =>
    updateForeman(contractor.id, (a) => ({
      ...a,
      visibleToForeman: !a.visibleToForeman,
    }));

  const resetSignOff = () => {
    if (!window.confirm("לבטל את חתימת הסיום? הקבלן יחזור להיות פעיל בתוכנית העבודה.")) return;
    updateForeman(contractor.id, (a) => ({ ...a, signedOff: false, signedOffAt: null }));
    setContractors((prev) =>
      prev.map((c) =>
        c.id === contractor.id
          ? { ...c, workCompleted: false, workCompletedAt: null }
          : c
      )
    );
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <HardHat className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{contractor.name}</div>
          <div className="text-xs text-slate-500">{contractor.trade}</div>
        </div>
        {assignment.signedOff && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            נחתם {fmtDate(assignment.signedOffAt)}
          </span>
        )}
        <Toggle
          checked={assignment.visibleToForeman}
          onChange={toggleVisible}
          label={`הצגת ${contractor.name} למנהל העבודה`}
        />
      </div>

      {assignment.visibleToForeman && (
        <div className="mt-3 space-y-2">
          <SubTaskBuilder contractor={contractor} assignment={assignment} />
          {assignment.signedOff && (
            <button onClick={resetSignOff} className="btn-ghost border border-slate-200 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              ביטול חתימת סיום
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ForemanAdmin() {
  const { data, setForemanAssignments } = useBudget();
  useForemanSync(data.foreman?.assignments || [], setForemanAssignments);

  const visibleCount = (data.foreman?.assignments || []).filter(
    (a) => a.visibleToForeman
  ).length;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-1 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold">לוח בקרה: מנהל עבודה</h2>
        </div>
        <p className="text-sm text-slate-500">
          בחרי אילו קבלנים גלויים למנהל העבודה והגדירי לו משימות שטח לכל קבלן.
          הוא רואה אך ורק את המשימות — ללא תקציב, סכומים או קבלנים אחרים.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <KeyRound className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="text-slate-600">
              קוד כניסה למנהל העבודה:{" "}
              <b className="font-mono" dir="ltr">{FOREMAN_PASSCODE}</b>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            {isRemoteEnabled() ? (
              <>
                <Wifi className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-slate-600">סנכרון בין מכשירים פעיל (Supabase)</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="text-slate-600">
                  מצב מקומי — מנהל העבודה מתחבר מהמכשיר הזה (הוראות הפעלת סנכרון: src/foremanSync.js)
                </span>
              </>
            )}
          </div>
        </div>
        {visibleCount > 0 && (
          <p className="mt-2 text-xs font-semibold text-indigo-600">
            {visibleCount} קבלנים מוקצים כרגע למנהל העבודה
          </p>
        )}
      </div>

      {data.contractors.map((c) => (
        <ContractorAssignmentCard key={c.id} contractor={c} />
      ))}
    </div>
  );
}
