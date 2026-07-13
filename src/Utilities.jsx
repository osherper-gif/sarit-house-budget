// ============================================================
// Utilities.jsx — ניהול State מרכזי, LocalStorage, גיבוי/שחזור
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Upload,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileUp,
} from "lucide-react";
import { initialData, SCHEMA_VERSION } from "./data/initialData";
import { exportToExcel, importFromExcel } from "./excel";

const STORAGE_KEY = "sarit-home-budget-v1";

// ---------- helpers ----------
export const uid = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const fmt = (v) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(num(v));

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";

export const pct = (part, whole) =>
  whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;

// ---------- derived calculations (single source of truth) ----------
export const contractorPaid = (c) =>
  (c?.milestones || []).reduce((s, m) => s + (m.isPaid ? num(m.amount) : 0), 0);

export const itemPaid = (item, contractors) => {
  if (item.contractorId) {
    const c = contractors.find((x) => x.id === item.contractorId);
    return c ? contractorPaid(c) : 0;
  }
  return num(item.paid);
};

export const phaseTotals = (phase, contractors) =>
  phase.items.reduce(
    (acc, it) => {
      const paid = itemPaid(it, contractors);
      acc.cost += num(it.cost);
      acc.paid += paid;
      return acc;
    },
    { cost: 0, paid: 0 }
  );

// ---------- תזמון (תוכנית עבודה) ----------
const DAY_MS = 24 * 60 * 60 * 1000;

// מחזיר {start, end} או null אם לא הוגדר לוז לקבלן
export const contractorSchedule = (c) => {
  if (!c?.estimatedStartDate || !num(c.durationDays)) return null;
  const start = new Date(c.estimatedStartDate);
  if (isNaN(start)) return null;
  return { start, end: new Date(start.getTime() + num(c.durationDays) * DAY_MS) };
};

// צוואר בקבוק: חלון העבודה הסתיים ונותרו פעימות שלא שולמו
export const isBottleneck = (c) => {
  const s = contractorSchedule(c);
  if (!s) return false;
  const hasUnpaid = (c.milestones || []).some((m) => !m.isPaid);
  return hasUnpaid && s.end.getTime() < Date.now();
};

export const projectTotals = (data) => {
  let cost = 0,
    paid = 0,
    exceeded = 0;
  for (const ph of data.phases) {
    for (const it of ph.items) {
      const p = itemPaid(it, data.contractors);
      cost += num(it.cost);
      paid += p;
      if (num(it.cost) > 0 && p > num(it.cost)) exceeded++;
    }
  }
  return { cost, paid, remaining: cost - paid, exceeded };
};

// ---------- context ----------
const BudgetContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.phases && parsed?.contractors) return parsed;
    }
  } catch {
    /* corrupted storage — fall back to seed */
  }
  return initialData;
}

export function BudgetProvider({ children }) {
  const [data, setData] = useState(loadInitial);
  const firstRun = useRef(true);

  // auto-persist on every change
  useEffect(() => {
    const payload = {
      ...data,
      meta: { ...data.meta, lastUpdated: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (firstRun.current) firstRun.current = false;
  }, [data]);

  // ----- phase / item actions -----
  const updateItem = useCallback((phaseId, itemId, patch) => {
    setData((d) => ({
      ...d,
      phases: d.phases.map((ph) =>
        ph.id !== phaseId
          ? ph
          : {
              ...ph,
              items: ph.items.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it
              ),
            }
      ),
    }));
  }, []);

  const addItem = useCallback((phaseId) => {
    const item = {
      id: uid(),
      name: "סעיף חדש",
      supplier: "",
      cost: 0,
      paid: 0,
      contractorId: null,
      notes: "",
    };
    setData((d) => ({
      ...d,
      phases: d.phases.map((ph) =>
        ph.id === phaseId ? { ...ph, items: [...ph.items, item] } : ph
      ),
    }));
    return item.id;
  }, []);

  const removeItem = useCallback((phaseId, itemId) => {
    setData((d) => ({
      ...d,
      phases: d.phases.map((ph) =>
        ph.id === phaseId
          ? { ...ph, items: ph.items.filter((it) => it.id !== itemId) }
          : ph
      ),
    }));
  }, []);

  const addPhase = useCallback(() => {
    setData((d) => ({
      ...d,
      phases: [...d.phases, { id: uid(), name: "שלב חדש", items: [] }],
    }));
  }, []);

  const renamePhase = useCallback((phaseId, name) => {
    setData((d) => ({
      ...d,
      phases: d.phases.map((ph) => (ph.id === phaseId ? { ...ph, name } : ph)),
    }));
  }, []);

  const removePhase = useCallback((phaseId) => {
    setData((d) => ({
      ...d,
      phases: d.phases.filter((ph) => ph.id !== phaseId),
    }));
  }, []);

  // ----- contractor actions -----
  const addContractor = useCallback(() => {
    const c = {
      id: uid(),
      name: "קבלן חדש",
      trade: "כללי",
      totalValue: 0,
      phone: "",
      email: "",
      contactName: "",
      estimatedStartDate: null,
      durationDays: 0,
      notes: "",
      milestones: [],
    };
    setData((d) => ({ ...d, contractors: [...d.contractors, c] }));
    return c.id;
  }, []);

  const updateContractor = useCallback((cid, patch) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) =>
        c.id === cid ? { ...c, ...patch } : c
      ),
    }));
  }, []);

  const removeContractor = useCallback((cid) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.filter((c) => c.id !== cid),
      // unlink budget items that pointed at this contractor
      phases: d.phases.map((ph) => ({
        ...ph,
        items: ph.items.map((it) =>
          it.contractorId === cid ? { ...it, contractorId: null } : it
        ),
      })),
    }));
  }, []);

  const addMilestone = useCallback((cid) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) =>
        c.id === cid
          ? {
              ...c,
              milestones: [
                ...c.milestones,
                {
                  id: uid(),
                  description: "פעימה חדשה",
                  amount: 0,
                  isPaid: false,
                  paidDate: null,
                },
              ],
            }
          : c
      ),
    }));
  }, []);

  const updateMilestone = useCallback((cid, mid, patch) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) =>
        c.id !== cid
          ? c
          : {
              ...c,
              milestones: c.milestones.map((m) =>
                m.id === mid ? { ...m, ...patch } : m
              ),
            }
      ),
    }));
  }, []);

  const toggleMilestone = useCallback((cid, mid) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) =>
        c.id !== cid
          ? c
          : {
              ...c,
              milestones: c.milestones.map((m) =>
                m.id !== mid
                  ? m
                  : {
                      ...m,
                      isPaid: !m.isPaid,
                      paidDate: !m.isPaid
                        ? new Date().toISOString().slice(0, 10)
                        : null,
                    }
              ),
            }
      ),
    }));
  }, []);

  const removeMilestone = useCallback((cid, mid) => {
    setData((d) => ({
      ...d,
      contractors: d.contractors.map((c) =>
        c.id !== cid
          ? c
          : { ...c, milestones: c.milestones.filter((m) => m.id !== mid) }
      ),
    }));
  }, []);

  // ----- backup -----
  const importData = useCallback((parsed) => {
    if (!parsed || !Array.isArray(parsed.phases) || !Array.isArray(parsed.contractors)) {
      throw new Error("invalid");
    }
    setData({
      meta: {
        schemaVersion: SCHEMA_VERSION,
        projectName: parsed.meta?.projectName || "הבית של שרית",
        currency: "ILS",
        lastUpdated: null,
        ...parsed.meta,
      },
      phases: parsed.phases,
      contractors: parsed.contractors,
    });
  }, []);

  const resetData = useCallback(() => setData(initialData), []);

  // עדכון חותמת זמן של הגיבוי האחרון (JSON או Excel)
  const markBackedUp = useCallback(() => {
    setData((d) => ({
      ...d,
      meta: { ...d.meta, lastBackupTimestamp: Date.now() },
    }));
  }, []);

  const value = useMemo(
    () => ({
      data,
      totals: projectTotals(data),
      markBackedUp,
      updateItem,
      addItem,
      removeItem,
      addPhase,
      renamePhase,
      removePhase,
      addContractor,
      updateContractor,
      removeContractor,
      addMilestone,
      updateMilestone,
      toggleMilestone,
      removeMilestone,
      importData,
      resetData,
    }),
    [
      data,
      markBackedUp,
      updateItem,
      addItem,
      removeItem,
      addPhase,
      renamePhase,
      removePhase,
      addContractor,
      updateContractor,
      removeContractor,
      addMilestone,
      updateMilestone,
      toggleMilestone,
      removeMilestone,
      importData,
      resetData,
    ]
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used inside <BudgetProvider>");
  return ctx;
}

// ---------- shared small UI ----------
export function ProgressBar({ value, danger = false, className = "" }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          danger ? "bg-red-500" : value >= 100 ? "bg-emerald-500" : "bg-indigo-500"
        }`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

// ---------- Settings / Backup screen ----------
export function SettingsBackup() {
  const { data, importData, resetData, markBackedUp } = useBudget();
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const fileRef = useRef(null);
  const excelRef = useRef(null);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `גיבוי-תקציב-בית-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    markBackedUp();
    flash("ok", "קובץ ה-JSON יוצא בהצלחה ✔");
  };

  const onImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(JSON.parse(reader.result));
        flash("ok", "הנתונים נטענו בהצלחה ✔");
      } catch {
        flash("err", "קובץ לא תקין — ודאי שזהו קובץ גיבוי שיוצא מהאפליקציה");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportExcel = () => {
    try {
      exportToExcel(data);
      markBackedUp();
      flash("ok", "קובץ האקסל יוצא בהצלחה ✔");
    } catch {
      flash("err", "שגיאה בייצוא לאקסל");
    }
  };

  const onImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await importFromExcel(file);
      if (
        !window.confirm(
          "הייבוא יחליף את כל הנתונים הקיימים באפליקציה. להמשיך?"
        )
      )
        return;
      importData(parsed);
      flash("ok", "קובץ האקסל נטען בהצלחה ✔");
    } catch {
      flash(
        "err",
        "לא ניתן לקרוא את הקובץ — ודאי שזהו קובץ .xlsx במבנה של גיבוי האפליקציה"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold">גיבוי ושחזור נתונים</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          כל הנתונים נשמרים אוטומטית בדפדפן (LocalStorage). מומלץ לייצא גיבוי
          מדי פעם ולשמור אותו במקום בטוח.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={exportJson} className="btn-primary w-full py-3">
            <Download className="h-4 w-4" />
            ייצוא נתונים (JSON)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn w-full border border-indigo-200 bg-indigo-50 py-3 text-indigo-700 hover:bg-indigo-100"
          >
            <Upload className="h-4 w-4" />
            ייבוא נתונים (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />

          <button
            onClick={exportExcel}
            className="btn w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            ייצוא לקובץ אקסל (Excel Export)
          </button>
          <button
            onClick={() => excelRef.current?.click()}
            className="btn w-full border border-emerald-200 bg-emerald-50 py-3 text-emerald-700 hover:bg-emerald-100"
          >
            <FileUp className="h-4 w-4" />
            ייבוא מקובץ אקסל (Excel Import)
          </button>
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onImportExcel}
          />
        </div>

        {msg && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
              msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {msg.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {msg.text}
          </div>
        )}

        <div className="mt-4 space-y-0.5 text-xs text-slate-400">
          <div>
            עדכון אחרון: {data.meta.lastUpdated ? new Date(data.meta.lastUpdated).toLocaleString("he-IL") : "—"}
          </div>
          <div>
            גיבוי אחרון:{" "}
            {data.meta.lastBackupTimestamp
              ? new Date(data.meta.lastBackupTimestamp).toLocaleString("he-IL")
              : "טרם בוצע גיבוי"}
          </div>
        </div>
      </div>

      <div className="card border-red-200 p-5">
        <h3 className="mb-1 font-bold text-red-700">איפוס נתונים</h3>
        <p className="mb-3 text-sm text-slate-500">
          מחיקת כל הנתונים וחזרה למבנה ההתחלתי. פעולה זו אינה הפיכה — ייצאי
          גיבוי קודם!
        </p>
        <button
          onClick={() => {
            if (window.confirm("למחוק את כל הנתונים ולחזור למצב התחלתי?"))
              resetData();
          }}
          className="btn-danger border border-red-200"
        >
          <RotateCcw className="h-4 w-4" />
          איפוס למצב התחלתי
        </button>
      </div>
    </div>
  );
}
