// ============================================================
// context/BudgetContext.js — שכבת התאמה (Adapter)
// הרכיבים החדשים (DelaySimulator / StrategicAdvisor / KnowledgeBase)
// מצפים ל-API בצורת { contractors, setContractors } — כאן ממפים אותו
// אל ה-Context הקיים שלנו ב-Utilities.jsx, בלי לשנות אותו.
// ============================================================
import { useCallback } from "react";
import { useBudget as useCoreBudget } from "../Utilities";

const DAY_MS = 24 * 60 * 60 * 1000;

// נרמול: הסימולטור כותב estimatedEndDate; הסכימה הקנונית שלנו
// (WorkPlan, Excel, JSON) עובדת עם durationDays. ממירים ומוחקים
// את השדה הזמני כדי שיהיה מקור אמת יחיד.
const normalizeContractor = (c) => {
  if (c.estimatedEndDate && c.estimatedStartDate) {
    const days = Math.round(
      (new Date(c.estimatedEndDate) - new Date(c.estimatedStartDate)) / DAY_MS
    );
    const { estimatedEndDate, ...rest } = c;
    return { ...rest, durationDays: days > 0 ? days : rest.durationDays ?? 0 };
  }
  return c;
};

export function useBudget() {
  const ctx = useCoreBudget();

  const setContractors = useCallback(
    (next) => {
      ctx.setContractors((prev) => {
        const arr = typeof next === "function" ? next(prev) : next;
        return arr.map(normalizeContractor);
      });
    },
    [ctx.setContractors] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    ...ctx,
    contractors: ctx.data.contractors,
    phases: ctx.data.phases,
    setContractors,
  };
}

export default useBudget;
