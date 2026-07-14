// ============================================================
// foremanSync.js — לוגיקת Cascade לחתימת מנהל עבודה + סנכרון
// מרוחק אופציונלי בין מכשירים (Supabase Free Tier, REST בלבד,
// ללא ספריות נוספות). כשה-config ריק — הכל עובד מקומית.
//
// ---- הקמת Supabase (חד-פעמי, חינם) ----
// 1. פרויקט חדש ב-https://supabase.com
// 2. SQL Editor → הריצי:
//      create table foreman_state (
//        id int primary key,
//        payload jsonb not null default '[]',
//        updated_at timestamptz not null default now()
//      );
//      insert into foreman_state (id) values (1);
//      alter table foreman_state enable row level security;
//      create policy "anon read"  on foreman_state for select using (true);
//      create policy "anon write" on foreman_state for update using (true);
// 3. Settings → API → העתיקי URL + anon key אל src/config.js
// הערה: ה-anon key חשוף בצד הלקוח — שמרי בטבלה הזו אך ורק את
// נתוני המשימות (ללא כספים), בדיוק כפי שהקוד הזה עושה.
// ============================================================
import { useEffect, useRef } from "react";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  FOREMAN_SYNC_INTERVAL_MS,
} from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY_MS);

// ============================================================
// Cascade: חתימת סיום של מנהל העבודה מעדכנת את הגאנט של שרית.
// - הקבלן מסומן workCompleted (מוצג "הושלם" בתוכנית העבודה)
// - משך העבודה מעודכן למשך בפועל (התחלה → תאריך חתימה)
// - הדלתא מול הסיום המתוכנן (איחור/הקדמה) מזיזה את תאריכי
//   ההתחלה של כל הקבלנים במורד הזרם — בדיוק כמו בסימולטור.
// ============================================================
export function cascadeCompletion(contractors, contractorId, actualEndIso) {
  const c = contractors.find((x) => x.id === contractorId);
  if (!c) return contractors;

  // אין לוז מוגדר — רק מסמנים הושלם, בלי הזזת לוחות זמנים
  if (!c.estimatedStartDate || !c.durationDays) {
    return contractors.map((x) =>
      x.id === contractorId
        ? { ...x, workCompleted: true, workCompletedAt: actualEndIso }
        : x
    );
  }

  const plannedEnd = addDays(c.estimatedStartDate, c.durationDays);
  const delta = diffDays(plannedEnd, actualEndIso); // חיובי = איחור, שלילי = הקדמה
  const actualDuration = Math.max(1, diffDays(c.estimatedStartDate, actualEndIso));

  return contractors.map((x) => {
    if (x.id === contractorId) {
      return {
        ...x,
        workCompleted: true,
        workCompletedAt: actualEndIso,
        durationDays: actualDuration,
      };
    }
    // במורד הזרם: מתחיל אחרי הקבלן שהושלם, טרם הושלם בעצמו
    if (
      delta !== 0 &&
      x.estimatedStartDate &&
      !x.workCompleted &&
      new Date(x.estimatedStartDate) > new Date(c.estimatedStartDate)
    ) {
      return { ...x, estimatedStartDate: addDays(x.estimatedStartDate, delta) };
    }
    return x;
  });
}

// ============================================================
// סנכרון מרוחק (אופציונלי)
// ============================================================
export const isRemoteEnabled = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const sbHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

export async function pullAssignments() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/foreman_state?id=eq.1&select=payload`,
    { headers: sbHeaders() }
  );
  if (!res.ok) throw new Error(`pull ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows[0]?.payload) ? rows[0].payload : [];
}

export async function pushAssignments(assignments) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/foreman_state?id=eq.1`, {
    method: "PATCH",
    headers: { ...sbHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({
      payload: assignments,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`push ${res.status}`);
}

// מיזוג Last-Write-Wins ברמת הקצאה בודדת (לפי updatedAt)
export function mergeAssignments(local = [], remote = []) {
  const byId = new Map();
  for (const a of local) byId.set(a.contractorId, a);
  for (const r of remote) {
    const l = byId.get(r.contractorId);
    if (!l || new Date(r.updatedAt || 0) > new Date(l.updatedAt || 0)) {
      byId.set(r.contractorId, r);
    }
  }
  return [...byId.values()];
}

/**
 * useForemanSync — Hook לסנכרון דו-כיווני בפולינג.
 * לא עושה דבר כשהסנכרון המרוחק כבוי (ברירת המחדל).
 */
export function useForemanSync(assignments, setForemanAssignments) {
  const latest = useRef(assignments);
  latest.current = assignments;

  useEffect(() => {
    if (!isRemoteEnabled()) return;
    let stopped = false;

    const tick = async () => {
      try {
        const remote = await pullAssignments();
        if (stopped) return;
        const merged = mergeAssignments(latest.current, remote);
        if (JSON.stringify(merged) !== JSON.stringify(latest.current)) {
          setForemanAssignments(merged);
        }
        await pushAssignments(merged);
      } catch {
        /* offline / לא מוגדר — ננסה בסבב הבא */
      }
    };

    tick();
    const iv = setInterval(tick, FOREMAN_SYNC_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [setForemanAssignments]);
}
