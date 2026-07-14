// ============================================================
// הגדרות אפליקציה — ניתן לשינוי בקלות
// ============================================================

// הסיסמה לכניסה לאפליקציה
export const APP_PASSWORD = "Sarit2026";

// מפתח הסשן בדפדפן (אין צורך לשנות)
export const AUTH_SESSION_KEY = "sarit-auth-ok";

// תזכורת גיבוי — 7 ימים במילישניות
export const BACKUP_REMINDER_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000

// ---------- אזור מנהל עבודה ----------
// קוד הכניסה של מנהל העבודה (רואה רק משימות — ללא תקציב וכספים)
export const FOREMAN_PASSCODE = "Boaz2026";
export const FOREMAN_SESSION_KEY = "sarit-foreman-ok";

// סנכרון מרוחק אופציונלי בין מכשירים (Supabase Free Tier).
// השאירי ריק לעבודה מקומית בלבד (מכשיר אחד).
// להפעלה: צרי פרויקט ב-supabase.com, הריצי את ה-SQL שבקובץ
// src/foremanSync.js, והדביקי כאן את ה-URL וה-anon key.
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const FOREMAN_SYNC_INTERVAL_MS = 10000; // תדירות סנכרון (10 שניות)
