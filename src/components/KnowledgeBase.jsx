// components/KnowledgeBase.jsx
// "מה עושים כש..." — contextual action cards.
// Two entry points:
//   1. <OverdueActionCard contractor={c} />  — rendered by the insights
//      engine next to an "overdue contractor" insight.
//   2. <KnowledgeBase />                     — the full browsable repository.

import { useMemo, useState } from "react";
import { useBudget } from "../context/BudgetContext";
import {
  TRADES,
  WHATSAPP_TEMPLATES,
  CHECKLISTS,
  fillTemplate,
} from "../data/knowledgeBase";
import { diffDays, formatHe } from "../utils/scheduleUtils";

const LS_CHECKS = "constructionApp.kbChecks.v1";

/* ------------------------------------------------------------------ */
/* 1. Contextual action card — plug into the insights widget           */
/* ------------------------------------------------------------------ */

export function OverdueActionCard({ contractor, ownerName = "" }) {
  const delayDays = contractor.estimatedEndDate
    ? Math.max(0, diffDays(contractor.estimatedEndDate, new Date().toISOString()))
    : 0;

  const [openTemplates, setOpenTemplates] = useState(false);

  return (
    <div
      dir="rtl"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-rose-900">
            {contractor.name} בחריגה של {delayDays} ימים
          </p>
          <p className="text-sm text-rose-800">
            מועד סיום שסוכם: {formatHe(contractor.estimatedEndDate)} — הנה מה
            שאפשר לעשות עכשיו:
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpenTemplates((v) => !v)}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
        >
          שלחי הודעת התראה
        </button>
        <a
          href="#knowledge-base"
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 transition"
        >
          צ׳ק־ליסט לפני המשך עבודה
        </a>
      </div>

      {openTemplates && (
        <TemplatePicker
          contractor={contractor}
          delayDays={delayDays}
          ownerName={ownerName}
        />
      )}
    </div>
  );
}

/* Escalation-aware template list with one-tap copy */
function TemplatePicker({ contractor, delayDays, ownerName }) {
  const [copiedId, setCopiedId] = useState(null);

  const vars = {
    contractorName: contractor.name,
    phaseName: contractor.phase ?? contractor.category ?? "העבודה",
    dueDate: contractor.estimatedEndDate
      ? formatHe(contractor.estimatedEndDate)
      : "[תאריך]",
    today: formatHe(new Date().toISOString()),
    delayDays: String(delayDays || "[מספר]"),
    ownerName,
  };

  // Suggest escalation level from the size of the delay
  const suggested = delayDays > 14 ? 3 : delayDays > 5 ? 2 : 1;

  const copy = async (tpl) => {
    const text = fillTemplate(tpl.body, vars);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(tpl.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard blocked — show the text for manual copy
      window.prompt("העתיקי ידנית:", text);
    }
  };

  return (
    <div className="space-y-2">
      {WHATSAPP_TEMPLATES.map((tpl) => (
        <div
          key={tpl.id}
          className={[
            "rounded-lg border bg-white p-3",
            tpl.escalation === suggested
              ? "border-rose-400 ring-1 ring-rose-300"
              : "border-slate-200",
          ].join(" ")}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {tpl.title}
              {tpl.escalation === suggested && (
                <span className="mr-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  מומלץ לחריגה של {delayDays} ימים
                </span>
              )}
            </p>
            <button
              onClick={() => copy(tpl)}
              className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-900 transition"
            >
              {copiedId === tpl.id ? "הועתק ✓" : "העתק לוואטסאפ"}
            </button>
          </div>
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
            {fillTemplate(tpl.body, vars)}
          </p>
        </div>
      ))}
      <p className="text-[11px] text-slate-400">
        * הנוסח הפורמלי הוא תבנית כללית ואינו ייעוץ משפטי — במחלוקת מהותית כדאי
        להתייעץ עם עו״ד.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Full browsable knowledge base tab                                */
/* ------------------------------------------------------------------ */

export default function KnowledgeBase() {
  const { contractors = [] } = useBudget();
  const [activeTrade, setActiveTrade] = useState("general");

  // checkbox state persists so a checklist survives a page refresh
  const [checks, setChecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CHECKS)) ?? {};
    } catch {
      return {};
    }
  });

  const toggle = (trade, idx) => {
    setChecks((prev) => {
      const key = `${trade}:${idx}`;
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(LS_CHECKS, JSON.stringify(next));
      return next;
    });
  };

  // Contextual banner: any overdue active contractors bubble to the top
  const overdue = useMemo(() => {
    const today = new Date();
    return contractors.filter(
      (c) =>
        c.status === "active" &&
        c.estimatedEndDate &&
        new Date(c.estimatedEndDate) < today
    );
  }, [contractors]);

  const checklist = CHECKLISTS[activeTrade];
  const doneCount = checklist.items.filter(
    (_, i) => checks[`${activeTrade}:${i}`]
  ).length;

  return (
    <div dir="rtl" id="knowledge-base" className="mx-auto max-w-3xl space-y-5 p-1">
      <header>
        <h2 className="text-xl font-bold text-slate-800">מה עושים כש...</h2>
        <p className="text-sm text-slate-600">
          תבניות הודעה וצ׳ק־ליסטים לפני כל אישור, כיסוי או תשלום אחרון
        </p>
      </header>

      {overdue.map((c) => (
        <OverdueActionCard key={c.id} contractor={c} />
      ))}

      {/* Trade selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TRADES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTrade(key)}
            className={[
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              activeTrade === key
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Checklist card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-800">{checklist.title}</h3>
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-xs font-bold",
              doneCount === checklist.items.length
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {doneCount}/{checklist.items.length}
          </span>
        </div>
        <ul className="space-y-2.5">
          {checklist.items.map((item, i) => {
            const checked = !!checks[`${activeTrade}:${i}`];
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(activeTrade, i)}
                    className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                  />
                  <span
                    className={[
                      "text-sm leading-relaxed",
                      checked
                        ? "text-slate-400 line-through"
                        : "text-slate-700",
                    ].join(" ")}
                  >
                    {item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {doneCount === checklist.items.length && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-sm font-medium text-emerald-800">
            ✓ הכל מסומן — אפשר לאשר לקבלן להתקדם / לעזוב את האתר
          </p>
        )}
      </div>
    </div>
  );
}
