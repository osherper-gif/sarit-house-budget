// ============================================================
// BudgetTable.jsx — תוכנית תקציב לפי שלבים (אקורדיון + כרטיסי סעיפים)
// סעיף המקושר לקבלן: "שולם" מחושב אוטומטית מפעימות התשלום.
// ============================================================
import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Link2,
  Pencil,
  FolderPlus,
} from "lucide-react";
import {
  useBudget,
  fmt,
  num,
  pct,
  itemPaid,
  phaseTotals,
  ProgressBar,
} from "./Utilities";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ItemCard({ phase, item }) {
  const { data, updateItem, removeItem } = useBudget();
  const [editing, setEditing] = useState(false);

  const paid = itemPaid(item, data.contractors);
  const remaining = num(item.cost) - paid;
  const linked = Boolean(item.contractorId);
  const linkedName = linked
    ? data.contractors.find((c) => c.id === item.contractorId)?.name || "קבלן נמחק"
    : null;
  const over = num(item.cost) > 0 && paid > num(item.cost);

  return (
    <div className={`rounded-xl border p-3 ${over ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{item.name || "ללא שם"}</div>
          <div className="truncate text-xs text-slate-500">
            {item.supplier || "ללא ספק"}
            {linked && (
              <span className="mr-1 inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                <Link2 className="h-2.5 w-2.5" />
                {linkedName}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditing((v) => !v)} className="btn-ghost !p-1.5" aria-label="עריכה">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => window.confirm(`למחוק את "${item.name}"?`) && removeItem(phase.id, item.id)}
            className="btn-danger !p-1.5"
            aria-label="מחיקה"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-slate-500">עלות</div>
          <div className="text-sm font-bold tabular-nums">{fmt(item.cost)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">שולם</div>
          <div className="text-sm font-bold tabular-nums text-emerald-600">{fmt(paid)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">יתרה</div>
          <div className={`text-sm font-bold tabular-nums ${remaining < 0 ? "text-red-600" : "text-sky-600"}`}>
            {fmt(remaining)}
          </div>
        </div>
      </div>
      <ProgressBar value={pct(paid, num(item.cost))} danger={over} className="mt-2" />
      {item.notes && !editing && (
        <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500">{item.notes}</div>
      )}

      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <Field label="שם הסעיף">
            <input
              className="input"
              value={item.name}
              onChange={(e) => updateItem(phase.id, item.id, { name: e.target.value })}
            />
          </Field>
          <Field label="ספק">
            <input
              className="input"
              value={item.supplier}
              onChange={(e) => updateItem(phase.id, item.id, { supplier: e.target.value })}
            />
          </Field>
          <Field label="עלות (₪)">
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={item.cost}
              onChange={(e) => updateItem(phase.id, item.id, { cost: num(e.target.value) })}
            />
          </Field>
          <Field label={linked ? "שולם (אוטומטי מקבלן)" : "שולם (₪)"}>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={linked ? paid : item.paid}
              disabled={linked}
              onChange={(e) => updateItem(phase.id, item.id, { paid: num(e.target.value) })}
            />
          </Field>
          <div className="col-span-2">
            <Field label="קישור לקבלן (סנכרון תשלומים אוטומטי)">
              <select
                className="input"
                value={item.contractorId || ""}
                onChange={(e) =>
                  updateItem(phase.id, item.id, { contractorId: e.target.value || null })
                }
              >
                <option value="">— ללא קישור (עדכון ידני) —</option>
                {data.contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.trade}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="הערות">
              <textarea
                className="input"
                rows={2}
                value={item.notes}
                onChange={(e) => updateItem(phase.id, item.id, { notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase }) {
  const { data, addItem, renamePhase, removePhase } = useBudget();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const t = phaseTotals(phase, data.contractors);
  const progress = pct(t.paid, t.cost);
  const over = t.cost > 0 && t.paid > t.cost;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-start"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{phase.name}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums">
              {fmt(t.paid)} / {fmt(t.cost)}
            </span>
          </div>
          <ProgressBar value={progress} danger={over} className="mt-2" />
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3">
          {renaming ? (
            <div className="flex gap-2">
              <input
                className="input"
                value={phase.name}
                autoFocus
                onChange={(e) => renamePhase(phase.id, e.target.value)}
                onBlur={() => setRenaming(false)}
                onKeyDown={(e) => e.key === "Enter" && setRenaming(false)}
              />
            </div>
          ) : null}

          {phase.items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
              אין סעיפים בשלב זה עדיין
            </div>
          )}
          {phase.items.map((item) => (
            <ItemCard key={item.id} phase={phase} item={item} />
          ))}

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => addItem(phase.id)} className="btn-primary">
              <Plus className="h-4 w-4" />
              הוספת סעיף
            </button>
            <div className="flex gap-1">
              <button onClick={() => setRenaming(true)} className="btn-ghost !px-2" aria-label="שינוי שם שלב">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  window.confirm(`למחוק את השלב "${phase.name}" על כל הסעיפים שבו?`) &&
                  removePhase(phase.id)
                }
                className="btn-danger !px-2"
                aria-label="מחיקת שלב"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetTable() {
  const { data, addPhase } = useBudget();
  return (
    <div className="space-y-3">
      {data.phases.map((phase) => (
        <PhaseSection key={phase.id} phase={phase} />
      ))}
      <button onClick={addPhase} className="btn-ghost w-full border border-dashed border-slate-300 py-3">
        <FolderPlus className="h-4 w-4" />
        הוספת שלב חדש
      </button>
    </div>
  );
}
