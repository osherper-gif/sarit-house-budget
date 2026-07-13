// ============================================================
// insights.js — מנוע המלצות חכם (Rule-Based AI Co-Pilot)
// סורק את כל ה-State בכל טעינה ומחזיר המלצות יומיות לשרית.
// סוגים: verify (לוודא ש...), pay (לשלם ל...),
//        risk (להיזהר מ...), success (כל הכבוד!)
// ============================================================
import {
  contractorSchedule,
  isBottleneck,
  itemPaid,
  phaseTotals,
  fmt,
  num,
  fmtDate,
} from "./Utilities";

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

// ---------- קישורי פעולה מהירה ----------
export const waPhone = (p) => {
  const digits = String(p || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
};
export const telHref = (phone) => `tel:${String(phone).trim()}`;
export const waHref = (phone, text) =>
  `https://wa.me/${waPhone(phone)}?text=${encodeURIComponent(text)}`;

/**
 * מחזיר מערך המלצות ממוין לפי דחיפות:
 * { id, type: 'verify'|'pay'|'risk'|'success', priority, text,
 *   contractor?, waText? }
 */
export function buildInsights(data, now = new Date()) {
  const out = [];
  const today = startOfDay(now);
  const daysUntil = (d) => Math.round((startOfDay(d) - today) / DAY_MS);

  const scheduled = data.contractors.map((c) => ({ c, s: contractorSchedule(c) }));

  // ---- 1. לוודא ש... — קבלן מתחיל ב-3 הימים הקרובים ----
  for (const { c, s } of scheduled) {
    if (!s) continue;
    const du = daysUntil(s.start);
    if (du >= 0 && du <= 3) {
      const when = du === 0 ? "היום" : du === 1 ? "מחר" : `בעוד ${du} ימים`;
      const who = c.contactName || c.name;
      out.push({
        id: `arrive-${c.id}`,
        type: "verify",
        priority: 1,
        text: `לוודא הגעה: ${c.name} (${c.trade}) אמור להתחיל לעבוד ${when} (${fmtDate(
          s.start
        )}). מומלץ להתקשר אליו היום לוודא הגעה.`,
        contractor: c,
        waText: `היי ${who}, רק מוודאת שאנחנו בתוקף להתחלת עבודות ה${c.trade} ב-${fmtDate(
          s.start
        )}. אשמח לאישור הגעה. תודה, שרית`,
      });
    }
  }

  // ---- 2. לשלם ל... — פעימה עם תאריך מתוכנן ב-3 הימים הקרובים (ולא שולמה) ----
  for (const c of data.contractors) {
    for (const m of c.milestones || []) {
      if (m.isPaid || !m.paidDate) continue;
      const d = new Date(m.paidDate);
      if (isNaN(d)) continue;
      const du = daysUntil(d);
      if (du <= 3) {
        out.push({
          id: `pay-${m.id}`,
          type: "pay",
          priority: 2,
          text: `להכין תזרים: פעימת התשלום "${m.description}" עבור ${c.name} (${
            c.trade
          }) בסך ${fmt(m.amount)} מתוכננת ל-${fmtDate(m.paidDate)}${
            du < 0 ? " (התאריך עבר!)" : ""
          }.`,
          contractor: c,
        });
      }
    }
  }

  // ---- 3. לוודא ש... — צוואר בקבוק: לתאם עם הקבלן הבא ----
  const byStart = scheduled
    .filter((x) => x.s)
    .sort((a, b) => a.s.start - b.s.start);
  for (const { c, s } of scheduled) {
    if (!s || !isBottleneck(c)) continue;
    const next = byStart.find(
      (x) =>
        x.c.id !== c.id &&
        x.s.start.getTime() > s.end.getTime() &&
        (x.c.milestones || []).some((m) => !m.isPaid)
    );
    const who = c.contactName || c.name;
    out.push({
      id: `bn-${c.id}`,
      type: "verify",
      priority: 3,
      text: next
        ? `תיאום עיכובים: העיכוב עם ${c.name} (${c.trade}) מעכב את השלבים הבאים. מומלץ לעדכן את ${next.c.name} (${next.c.trade}) לגבי לוח הזמנים.`
        : `תיאום עיכובים: חלון העבודה של ${c.name} (${c.trade}) הסתיים ונותרו פעימות פתוחות. מומלץ לתאם מועד סיום.`,
      contractor: c,
      waText: `היי ${who}, רציתי להתעדכן לגבי עבודות ה${c.trade} — לוח הזמנים חרג ונותרו שלבים פתוחים. מתי ניתן לתאם המשך? תודה, שרית`,
    });
  }

  // ---- 4. לשלם ל... — סיור לפני תשלום (קבלן פעיל עם פעימה פתוחה) ----
  for (const { c, s } of scheduled) {
    if (!s) continue;
    if (String(c.trade || "").includes("מפקח")) continue; // לא רלוונטי למפקח עצמו
    const t = now.getTime();
    if (t < s.start.getTime() || t > s.end.getTime()) continue;
    const nextMs = (c.milestones || []).find((m) => !m.isPaid);
    if (nextMs) {
      out.push({
        id: `insp-${c.id}`,
        type: "pay",
        priority: 4,
        text: `לפני שאת משלמת: פעימת "${nextMs.description}" של ${c.name} (${
          c.trade
        }) בסך ${fmt(
          nextMs.amount
        )} מוגדרת כממתינה. מומלץ לבצע סיור עם מפקח הבנייה לאישור העבודה בשטח לפני העברת התשלום.`,
        contractor: c,
      });
    }
  }

  // ---- 5. להיזהר מ... — חריגה מהתקציב בסעיף ----
  for (const ph of data.phases) {
    for (const it of ph.items) {
      const paid = itemPaid(it, data.contractors);
      const cost = num(it.cost);
      if (cost > 0 && paid > cost) {
        out.push({
          id: `over-${it.id}`,
          type: "risk",
          priority: 5,
          text: `חריגה בתקציב: הסעיף "${it.name}" (${ph.name}) חרג ב-${fmt(
            paid - cost
          )} מהתקציב המתוכנן שלו. מומלץ לבדוק את הסיבה ולעדכן את התקציב.`,
        });
      }
    }
  }

  // ---- 6. כל הכבוד! — שלב ששולם במלואו ----
  for (const ph of data.phases) {
    const t = phaseTotals(ph, data.contractors);
    if (t.cost > 0 && t.paid >= t.cost) {
      out.push({
        id: `done-${ph.id}`,
        type: "success",
        priority: 9,
        text: `כל הכבוד! שלב "${ph.name}" הושלם ושולם במלואו — צעד ענק קדימה לבית החדש.`,
      });
    }
  }

  return out.sort((a, b) => a.priority - b.priority);
}
