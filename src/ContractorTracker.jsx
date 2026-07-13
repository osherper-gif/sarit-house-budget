// ============================================================
// ContractorTracker.jsx — קבלנים לפי תחום + פעימות תשלום
// + פרטי קשר ופעולות מהירות: חיוג / וואטסאפ (ללא שרת, בחינם)
// ============================================================
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  HardHat,
  CalendarDays,
  UserPlus,
  Phone,
  Mail,
  User,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useBudget,
  fmt,
  num,
  pct,
  fmtDate,
  contractorPaid,
  isBottleneck,
  ProgressBar,
} from "./Utilities";

// המרת טלפון ישראלי לפורמט בינלאומי עבור wa.me
const waPhone = (p) => {
  const digits = String(p || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
};

// הודעת וואטסאפ אוטומטית לפי סטטוס הפעימות
const waMessage = (c) => {
  const who = c.contactName || c.name;
  const next = (c.milestones || []).find((m) => !m.isPaid);
  if (!next) {
    return `היי ${who}, רציתי לעדכן שכל פעימות התשלום עבור עבודות ה${c.trade} שולמו במלואן. תודה רבה על העבודה! שרית`;
  }
  return `היי ${who}, רציתי להתעדכן לגבי עבודות ה${c.trade}: הפעימה "${next.description}" בסך ${fmt(
    num(next.amount)
  )} ממתינה לביצוע/תשלום. אשמח לעדכון לגבי לוח הזמנים. תודה, שרית`;
};

function QuickActions({ contractor }) {
  const phone = String(contractor.phone || "").trim();
  const wa = waPhone(phone);
  if (!phone) {
    return (
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-400">
        הוסיפי מספר טלפון (בעריכת הקבלן) כדי להפעיל חיוג מהיר ווואטסאפ
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`tel:${phone}`}
        className="btn border border-sky-200 bg-sky-50 py-2.5 text-sky-700 hover:bg-sky-100"
      >
        <Phone className="h-4 w-4" />
        חיוג מהיר
      </a>
      <a
        href={`https://wa.me/${wa}?text=${encodeURIComponent(waMessage(contractor))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn bg-emerald-600 py-2.5 text-white hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" />
        שלח הודעת וואטסאפ
      </a>
    </div>
  );
}

function ContactDetails({ contractor }) {
  const rows = [
    contractor.contactName && { icon: User, text: contractor.contactName },
    contractor.phone && { icon: Phone, text: contractor.phone, dir: "ltr" },
    contractor.email && { icon: Mail, text: contractor.email, dir: "ltr" },
  ].filter(Boolean);
  if (!rows.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
      {rows.map(({ icon: Icon, text, dir }, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          <span dir={dir}>{text}</span>
        </span>
      ))}
    </div>
  );
}

function MilestoneRow({ contractor, m }) {
  const { toggleMilestone, updateMilestone, removeMilestone } = useBudget();
  const [editing, setEditing] = useState(false);

  return (
    <div className={`rounded-xl border p-3 ${m.isPaid ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={m.isPaid}
          onChange={() => toggleMilestone(contractor.id, m.id)}
          className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-emerald-600"
          aria-label="סימון פעימה כשולמה"
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${m.isPaid ? "text-emerald-800" : ""}`}>
            {m.description}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold tabular-nums">{fmt(m.amount)}</span>
            {m.isPaid && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {fmtDate(m.paidDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditing((v) => !v)} className="btn-ghost !p-1.5" aria-label="עריכת פעימה">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              window.confirm("למחוק את הפעימה?") && removeMilestone(contractor.id, m.id)
            }
            className="btn-danger !p-1.5"
            aria-label="מחיקת פעימה"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">תיאור הפעימה</span>
            <input
              className="input"
              value={m.description}
              onChange={(e) => updateMilestone(contractor.id, m.id, { description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">סכום (₪)</span>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={m.amount}
              onChange={(e) => updateMilestone(contractor.id, m.id, { amount: num(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">תאריך תשלום</span>
            <input
              type="date"
              className="input"
              value={m.paidDate || ""}
              onChange={(e) => updateMilestone(contractor.id, m.id, { paidDate: e.target.value || null })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ContractorCard({ contractor }) {
  const { updateContractor, removeContractor, addMilestone } = useBudget();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const paid = contractorPaid(contractor);
  const total = num(contractor.totalValue);
  const milestonesSum = contractor.milestones.reduce((s, m) => s + num(m.amount), 0);
  const mismatch = total > 0 && Math.abs(milestonesSum - total) > 1;
  const late = isBottleneck(contractor);

  return (
    <div className={`card overflow-hidden ${late ? "border-amber-300" : ""}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <HardHat className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-bold">
              {late && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
              <span className="truncate">{contractor.name}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums">
              {fmt(paid)} / {fmt(total)}
            </span>
          </div>
          <ProgressBar value={pct(paid, total)} className="mt-2" />
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3">
          {late && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              חלון העבודה המתוכנן הסתיים ונותרו פעימות פתוחות — ראי "תוכנית עבודה"
            </div>
          )}

          <ContactDetails contractor={contractor} />
          <QuickActions contractor={contractor} />

          {editing && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">שם / חברה</span>
                <input
                  className="input"
                  value={contractor.name}
                  onChange={(e) => updateContractor(contractor.id, { name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">תחום</span>
                <input
                  className="input"
                  value={contractor.trade}
                  onChange={(e) => updateContractor(contractor.id, { trade: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">היקף חוזה (₪)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input"
                  value={contractor.totalValue}
                  onChange={(e) => updateContractor(contractor.id, { totalValue: num(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">איש קשר</span>
                <input
                  className="input"
                  value={contractor.contactName || ""}
                  onChange={(e) => updateContractor(contractor.id, { contactName: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">טלפון</span>
                <input
                  type="tel"
                  dir="ltr"
                  className="input"
                  placeholder="050-1234567"
                  value={contractor.phone || ""}
                  onChange={(e) => updateContractor(contractor.id, { phone: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">אימייל</span>
                <input
                  type="email"
                  dir="ltr"
                  className="input"
                  value={contractor.email || ""}
                  onChange={(e) => updateContractor(contractor.id, { email: e.target.value })}
                />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">הערות</span>
                <input
                  className="input"
                  value={contractor.notes || ""}
                  onChange={(e) => updateContractor(contractor.id, { notes: e.target.value })}
                />
              </label>
            </div>
          )}

          {mismatch && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              ⚠ סכום הפעימות ({fmt(milestonesSum)}) שונה מהיקף החוזה ({fmt(total)})
            </div>
          )}

          <div className="space-y-2">
            {contractor.milestones.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                אין פעימות תשלום עדיין
              </div>
            )}
            {contractor.milestones.map((m) => (
              <MilestoneRow key={m.id} contractor={contractor} m={m} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => addMilestone(contractor.id)} className="btn-primary">
              <Plus className="h-4 w-4" />
              הוספת פעימה
            </button>
            <div className="flex gap-1">
              <button onClick={() => setEditing((v) => !v)} className="btn-ghost !px-2" aria-label="עריכת קבלן">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  window.confirm(`למחוק את הקבלן "${contractor.name}"? סעיפי תקציב מקושרים ינותקו.`) &&
                  removeContractor(contractor.id)
                }
                className="btn-danger !px-2"
                aria-label="מחיקת קבלן"
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

export default function ContractorTracker() {
  const { data, addContractor } = useBudget();

  const byTrade = useMemo(() => {
    const groups = new Map();
    for (const c of data.contractors) {
      const key = c.trade || "כללי";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    return [...groups.entries()];
  }, [data.contractors]);

  return (
    <div className="space-y-5">
      {byTrade.map(([trade, list]) => (
        <section key={trade}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {trade}
          </h2>
          <div className="space-y-3">
            {list.map((c) => (
              <ContractorCard key={c.id} contractor={c} />
            ))}
          </div>
        </section>
      ))}
      <button
        onClick={addContractor}
        className="btn-ghost w-full border border-dashed border-slate-300 py-3"
      >
        <UserPlus className="h-4 w-4" />
        הוספת קבלן חדש
      </button>
    </div>
  );
}
