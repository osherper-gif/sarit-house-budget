// ============================================================
// ContractorEditModal.jsx — מודל עריכת פרטי קבלן (משותף לטאבים
// "קבלנים" ו"תוכנית עבודה"). שמירה מעדכנת State + LocalStorage מיידית.
// ============================================================
import { useEffect, useState } from "react";
import { X, Save, HardHat } from "lucide-react";
import { useBudget, num } from "./Utilities";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function ContractorEditModal({ contractor, onClose }) {
  const { updateContractor } = useBudget();
  const [draft, setDraft] = useState({
    name: contractor.name || "",
    trade: contractor.trade || "",
    contactName: contractor.contactName || "",
    phone: contractor.phone || "",
    email: contractor.email || "",
    totalValue: contractor.totalValue ?? 0,
    estimatedStartDate: contractor.estimatedStartDate || "",
    durationDays: contractor.durationDays || "",
    notes: contractor.notes || "",
  });

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  // סגירה ב-Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = (e) => {
    e.preventDefault();
    updateContractor(contractor.id, {
      name: draft.name.trim() || contractor.name,
      trade: draft.trade.trim() || "כללי",
      contactName: draft.contactName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      totalValue: num(draft.totalValue),
      estimatedStartDate: draft.estimatedStartDate || null,
      durationDays: num(draft.durationDays),
      notes: draft.notes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="עריכת פרטי קבלן"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold leading-tight">עריכת פרטי קבלן</h2>
              <p className="text-xs text-slate-400">{contractor.trade} · {contractor.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="סגירה"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="שם הקבלן / בעל עניין">
              <input className="input" value={draft.name} onChange={set("name")} required />
            </Field>
          </div>
          <Field label="תחום">
            <input className="input" value={draft.trade} onChange={set("trade")} />
          </Field>
          <Field label="שם איש קשר">
            <input className="input" value={draft.contactName} onChange={set("contactName")} />
          </Field>
          <Field label="מספר טלפון">
            <input
              type="tel"
              dir="ltr"
              className="input"
              placeholder="050-1234567"
              value={draft.phone}
              onChange={set("phone")}
            />
          </Field>
          <Field label="אימייל">
            <input
              type="email"
              dir="ltr"
              className="input"
              placeholder="name@mail.com"
              value={draft.email}
              onChange={set("email")}
            />
          </Field>
          <Field label="היקף חוזה (₪)">
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={draft.totalValue}
              onChange={set("totalValue")}
            />
          </Field>
          <div />
          <Field label="תאריך התחלה משוער">
            <input
              type="date"
              className="input"
              value={draft.estimatedStartDate}
              onChange={set("estimatedStartDate")}
            />
          </Field>
          <Field label="משך זמן בימים">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              className="input"
              placeholder="למשל: 30"
              value={draft.durationDays}
              onChange={set("durationDays")}
            />
          </Field>
          <div className="col-span-2">
            <Field label="הערות">
              <textarea className="input" rows={2} value={draft.notes} onChange={set("notes")} />
            </Field>
          </div>
          <p className="col-span-2 -mt-1 text-[11px] text-slate-400">
            תאריך ההתחלה והמשך קובעים את מיקום ורוחב הפס בטאב "תוכנית עבודה"
          </p>

          <div className="col-span-2 mt-1 flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2.5">
              <Save className="h-4 w-4" />
              שמירה
            </button>
            <button type="button" onClick={onClose} className="btn-ghost border border-slate-200 px-5">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
