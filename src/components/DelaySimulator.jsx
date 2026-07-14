// components/DelaySimulator.jsx
// Wraps the existing "תוכנית עבודה" (Work Plan) tab content.
// Simulation is 100% non-destructive: nothing touches the context or
// LocalStorage until Sarit explicitly clicks "עדכן לוח זמנים".

import { useMemo, useState } from "react";
import { useBudget } from "../context/BudgetContext"; // your existing global context
import {
  simulateDelay,
  getProjectCompletion,
  getContractorEnd,
  formatHe,
  diffDays,
} from "../utils/scheduleUtils";

export default function DelaySimulatorPanel() {
  const { contractors, setContractors } = useBudget();

  // { contractorId, days } — null means simulation is off
  const [sim, setSim] = useState(null);

  // Derived, never stored: the simulated plan
  const simulatedPlan = useMemo(
    () =>
      sim
        ? simulateDelay(contractors, sim.contractorId, sim.days)
        : contractors,
    [contractors, sim]
  );

  const baselineCompletion = useMemo(
    () => getProjectCompletion(contractors),
    [contractors]
  );
  const simulatedCompletion = useMemo(
    () => getProjectCompletion(simulatedPlan),
    [simulatedPlan]
  );

  const slipDays =
    sim && baselineCompletion && simulatedCompletion
      ? diffDays(baselineCompletion, simulatedCompletion)
      : 0;

  const applySimulation = () => {
    if (!sim) return;
    // Commit: strip simulation flags and persist through the context
    // (the context's setContractors should already write to LocalStorage)
    setContractors(
      simulatedPlan.map(
        ({ _shifted, _delaySource, _originalStart, _originalEnd, ...c }) => c
      )
    );
    setSim(null);
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* ---- Completion-date preview banner (only while simulating) ---- */}
      {sim && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm font-semibold text-amber-900">
              מצב סימולציה — שום דבר עוד לא נשמר
            </p>
            <p className="text-sm text-amber-800 mt-1">
              סיום צפוי מקורי:{" "}
              <span className="font-medium">{formatHe(baselineCompletion)}</span>
              {" ← "}
              סיום צפוי חדש:{" "}
              <span className="font-bold text-amber-900">
                {formatHe(simulatedCompletion)}
              </span>
              {slipDays > 0 && (
                <span className="mr-2 inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                  ‎+{slipDays} ימים
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applySimulation}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
            >
              עדכן לוח זמנים
            </button>
            <button
              onClick={() => setSim(null)}
              className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition"
            >
              בטל סימולציה
            </button>
          </div>
        </div>
      )}

      {/* ---- Contractor rows ---- */}
      <ul className="space-y-2">
        {simulatedPlan
          .filter((c) => c.estimatedStartDate)
          .sort(
            (a, b) =>
              new Date(a.estimatedStartDate) - new Date(b.estimatedStartDate)
          )
          .map((c) => (
            <ContractorRow
              key={c.id}
              contractor={c}
              isSimActive={!!sim}
              simDays={sim?.contractorId === c.id ? sim.days : null}
              onSimulate={(days) =>
                days > 0
                  ? setSim({ contractorId: c.id, days })
                  : setSim(null)
              }
            />
          ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ContractorRow({ contractor: c, isSimActive, simDays, onSimulate }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(simDays ?? 7);
  const end = getContractorEnd(c);

  const shifted = c._shifted;

  return (
    <li
      className={[
        "rounded-xl border p-3 transition-colors",
        shifted
          ? "border-amber-400 bg-amber-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <p className="font-semibold text-slate-800">
            {c.name}
            {c._delaySource && (
              <span className="mr-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                מקור העיכוב
              </span>
            )}
          </p>
          <p className="text-sm text-slate-600">
            {shifted && c._originalStart !== c.estimatedStartDate ? (
              <>
                <span className="line-through text-slate-400">
                  {formatHe(c._originalStart)}
                </span>{" "}
                <span className="font-semibold text-amber-700">
                  {formatHe(c.estimatedStartDate)}
                </span>
              </>
            ) : (
              formatHe(c.estimatedStartDate)
            )}
            {" — "}
            {shifted ? (
              <>
                <span className="line-through text-slate-400">
                  {formatHe(c._originalEnd)}
                </span>{" "}
                <span className="font-semibold text-amber-700">
                  {formatHe(end)}
                </span>
              </>
            ) : (
              formatHe(end)
            )}
          </p>
        </div>

        {/* Gantt-lite bar — amber when shifted */}
        <GanttBar contractor={c} shifted={shifted} />

        <button
          onClick={() => setOpen((v) => !v)}
          className={[
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            open || simDays
              ? "bg-amber-100 text-amber-800 border border-amber-300"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          ].join(" ")}
        >
          סימולטור דחייה
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <label className="text-sm text-slate-700">
            דחייה של
            <input
              type="number"
              min={1}
              max={120}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mx-2 w-20 rounded-lg border border-slate-300 px-2 py-1 text-center focus:border-amber-500 focus:outline-none"
            />
            ימים
          </label>
          <input
            type="range"
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-40 accent-amber-500"
          />
          <button
            onClick={() => onSimulate(days)}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 transition"
          >
            הצג השפעה
          </button>
          {isSimActive && simDays && (
            <button
              onClick={() => onSimulate(0)}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              אפס
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/* Minimal proportional bar consistent with a Gantt-lite look */
function GanttBar({ contractor: c, shifted }) {
  const duration = Math.max(
    1,
    (new Date(getContractorEnd(c)) - new Date(c.estimatedStartDate)) /
      (24 * 3600 * 1000)
  );
  const width = Math.min(160, 12 + duration * 4);
  return (
    <div className="hidden sm:block h-3 rounded-full bg-slate-100 w-40 overflow-hidden">
      <div
        className={[
          "h-full rounded-full transition-all duration-500",
          shifted ? "bg-amber-400" : "bg-sky-400",
        ].join(" ")}
        style={{ width: `${width}px` }}
      />
    </div>
  );
}
