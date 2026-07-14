// components/StrategicAdvisor.jsx
// "יועץ אסטרטגי" tab — 5-question self-diagnostic → SWOT matrix → TOWS advice.
// Answers persist under their own LocalStorage key so re-opening the tab
// shows the last diagnosis, and "אבחון מחדש" restarts the quiz.

import { useEffect, useMemo, useState } from "react";
import { useBudget } from "../context/BudgetContext";

const LS_KEY = "constructionApp.advisorAnswers.v1";

/* ------------------------- Quiz definition ------------------------- */
// Each answer sets a profile dimension to "low" | "mid" | "high".
const QUESTIONS = [
  {
    id: "time",
    text: "כמה זמן פנוי יש לך בפועל לניהול הפרויקט בשבוע?",
    options: [
      { label: "פחות מ־3 שעות", value: "low" },
      { label: "3–8 שעות", value: "mid" },
      { label: "מעל 8 שעות — אני זמינה כמעט כל יום", value: "high" },
    ],
  },
  {
    id: "experience",
    text: "מה רמת הניסיון הטכני שלך בעבודות בנייה ושיפוץ?",
    options: [
      { label: "אין ניסיון — סומכת על אנשי מקצוע", value: "low" },
      { label: "ניסיון בסיסי (צביעה, הרכבות, תיקונים קלים)", value: "mid" },
      { label: "ניסיון ממשי — ביצעתי עבודות מורכבות בעצמי", value: "high" },
    ],
  },
  {
    id: "budget",
    text: "כמה גמישות יש בתקציב מעבר למתוכנן?",
    options: [
      { label: "אין רזרבה — כל חריגה כואבת", value: "low" },
      { label: "רזרבה של עד 10%", value: "mid" },
      { label: "רזרבה נוחה של 15% ומעלה", value: "high" },
    ],
  },
  {
    id: "risk",
    text: "איך את מרגישה עם קבלת החלטות בתנאי אי־ודאות?",
    options: [
      { label: "מעדיפה ודאות — כל סיכון מלחיץ אותי", value: "low" },
      { label: "מוכנה לסיכון מחושב אחרי בדיקה", value: "mid" },
      { label: "נוח לי לקחת סיכונים אם התמורה שווה", value: "high" },
    ],
  },
  {
    id: "support",
    text: "כמה עזרה זמינה לך (משפחה, חברים, איש מקצוע מלווה)?",
    options: [
      { label: "אני לבד על זה", value: "low" },
      { label: "יש מי שיעזור מדי פעם", value: "mid" },
      { label: "יש לי מעטפת תמיכה חזקה / מפקח מלווה", value: "high" },
    ],
  },
];

/* --------------------- SWOT + TOWS rule engine --------------------- */
// Pure function: profile → { swot, tows }. Easy to extend with more rules.
export function generateStrategy(profile, liveStats = {}) {
  const S = [], W = [], O = [], T = [];

  // Strengths / Weaknesses from the profile
  if (profile.time === "high") S.push("זמינות גבוהה לפיקוח יומיומי באתר — פחות הפתעות, יותר שליטה");
  if (profile.time === "low") W.push("זמן פיקוח מוגבל — קבלנים עלולים 'להתרווח' בלי מעקב צמוד");
  if (profile.experience === "high") S.push("ניסיון טכני שמאפשר לזהות עבודה לקויה בזמן אמת");
  if (profile.experience === "low") W.push("קושי לאמת איכות ביצוע טכנית באופן עצמאי");
  if (profile.budget === "high") S.push("רזרבה תקציבית שמאפשרת לפתור בעיות בכסף במקום בזמן");
  if (profile.budget === "low") W.push("תקציב הדוק — כל חריגה מסכנת שלבים עתידיים");
  if (profile.risk === "high") S.push("נכונות לקבל החלטות מהירות בלי לתקוע את הפרויקט");
  if (profile.risk === "low") W.push("רתיעה מסיכון עלולה לעכב החלטות בצמתים קריטיים");
  if (profile.support === "high") S.push("מעטפת תמיכה — אפשר להאציל בדיקות וסידורים");
  if (profile.support === "low") W.push("אין גיבוי — צוואר בקבוק אחד (את) לכל ההחלטות");

  // Opportunities / Threats — profile plus live app data if provided
  if (profile.experience !== "low")
    O.push("ביצוע עצמי של עבודות גמר פשוטות (צביעה, הרכבות) לחיסכון של אלפי שקלים");
  if (profile.time === "high")
    O.push("השוואת הצעות מחיר ומיקוח ישיר — זמינות גבוהה שווה כוח מיקוח");
  if (profile.budget !== "low")
    O.push("שדרוגים נקודתיים בעלי החזר גבוה (בידוד, אינסטלציה איכותית) בזמן שהקירות פתוחים");
  O.push("תיעוד מסודר באפליקציה — בסיס ראייתי חזק מול קבלנים במחלוקת");

  if (profile.budget === "low")
    T.push("עליית מחירי חומרים או תוספות 'קטנות' של קבלנים שאין להן כיסוי");
  if (profile.time === "low")
    T.push("עיכובים מצטברים שמתגלים מאוחר בגלל פיקוח לא רציף");
  if (profile.experience === "low")
    T.push("אישור עבודה לקויה שתתגלה רק אחרי כיסוי (ריצוף/גבס) — תיקון יקר פי כמה");
  if (liveStats.overdueContractors > 0)
    T.push(`יש כרגע ${liveStats.overdueContractors} קבלנים בחריגת לו״ז פעילה — סיכון שרשרת לשלבים הבאים`);
  if (!T.length) T.push("תלות בקבלן יחיד בשלבים קריטיים — היעדר חלופה זמינה");

  /* TOWS: cross-pair the quadrants into tactics */
  const tows = [];

  // W×T — defensive (most important when both are present)
  if (profile.experience === "low" && profile.budget === "low")
    tows.push({
      type: "WT",
      title: "הגנה: אל תעשי DIY במערכות קריטיות",
      body:
        "ניסיון נמוך + תקציב הדוק = אסור לחסוך על חשמל, אינסטלציה ואיטום. שכרי מוסמכים בלבד לעבודות האלה, וחסכי דווקא בגמר: צביעה עצמית, הרכבת ארונות, ניקיון מסירה.",
    });
  if (profile.time === "low" && profile.support === "low")
    tows.push({
      type: "WT",
      title: "הגנה: קני פיקוח במקום זמן",
      body:
        "בלי זמן ובלי מעטפת — שקלי מפקח בנייה לביקורות נקודתיות (לפני יציקה, לפני כיסוי צנרת, לפני ריצוף). עלות של כמה ביקורים קטנה מעלות תיקון אחד.",
    });

  // S×O — offensive
  if (profile.time === "high" && profile.experience !== "low")
    tows.push({
      type: "SO",
      title: "התקפה: קחי בעלות על עבודות הגמר",
      body:
        "זמינות + ידיים טובות = בצעי בעצמך צביעה, הרכבות וגינון בסיסי. תעדי את החיסכון כקטגוריה נפרדת באפליקציה כדי לראות את התמורה.",
    });
  if (profile.budget === "high" && profile.risk !== "low")
    tows.push({
      type: "SO",
      title: "התקפה: נצלי את הרזרבה לקיצור לו״ז",
      body:
        "רזרבה + סובלנות לסיכון מאפשרות לשלם פרמיה קטנה על זמינות קבלן מיידית בצמתים קריטיים, במקום לחכות שבועות ולשלם בריבית של עיכובים.",
    });

  // S×T — leverage strengths against threats
  if (profile.time === "high")
    tows.push({
      type: "ST",
      title: "מינוף: פיקוח יומי כתחליף לניסיון",
      body:
        "גם בלי ידע טכני, נוכחות יומית + צילום כל שלב לפני כיסוי (קירות, רצפה, תקרה) יוצרים הרתעה ובסיס ראייתי. השתמשי בצ׳ק־ליסטים של מאגר הידע לפני כל אישור.",
    });

  // W×O — fix weaknesses via opportunities
  if (profile.experience === "low")
    tows.push({
      type: "WO",
      title: "שיפור: הפכי כל ביקור לאימון",
      body:
        "בקשי מכל קבלן הסבר של 5 דקות על מה בוצע ולמה. תוך חודש תזהי לבד עבודה מסודרת מול מרושלת — וזה משנה את יחסי הכוחות.",
    });

  return { swot: { S, W, O, T }, tows };
}

/* ----------------------------- UI ----------------------------- */

export default function StrategicAdvisor() {
  const { contractors = [] } = useBudget();

  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) ?? {};
    } catch {
      return {};
    }
  });
  const [step, setStep] = useState(() =>
    Object.keys(answers).length === QUESTIONS.length ? QUESTIONS.length : 0
  );

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(answers));
  }, [answers]);

  const done = step >= QUESTIONS.length;

  const liveStats = useMemo(() => {
    const today = new Date();
    const overdueContractors = contractors.filter(
      (c) =>
        c.status === "active" &&
        c.estimatedEndDate &&
        new Date(c.estimatedEndDate) < today
    ).length;
    return { overdueContractors };
  }, [contractors]);

  const strategy = useMemo(
    () => (done ? generateStrategy(answers, liveStats) : null),
    [done, answers, liveStats]
  );

  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-1">
      <header>
        <h2 className="text-xl font-bold text-slate-800">יועץ אסטרטגי</h2>
        <p className="text-sm text-slate-600">
          5 שאלות קצרות → ניתוח SWOT אישי → המלצות טקטיות לפרויקט שלך
        </p>
      </header>

      {!done ? (
        <QuizStep
          question={QUESTIONS[step]}
          index={step}
          total={QUESTIONS.length}
          onAnswer={(value) => {
            setAnswers((a) => ({ ...a, [QUESTIONS[step].id]: value }));
            setStep((s) => s + 1);
          }}
        />
      ) : (
        <>
          <SwotMatrix swot={strategy.swot} />
          <TowsAdvice tows={strategy.tows} />
          <button
            onClick={restart}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            אבחון מחדש
          </button>
        </>
      )}
    </div>
  );
}

function QuizStep({ question, index, total, onAnswer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold text-slate-400">
        שאלה {index + 1} מתוך {total}
      </p>
      <div className="mb-4 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        {question.text}
      </h3>
      <div className="grid gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAnswer(opt.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-right text-sm font-medium text-slate-700 hover:border-slate-800 hover:bg-slate-50 transition"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const QUADRANTS = [
  { key: "S", title: "חוזקות", tone: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  { key: "W", title: "חולשות", tone: "border-rose-300 bg-rose-50 text-rose-900" },
  { key: "O", title: "הזדמנויות", tone: "border-sky-300 bg-sky-50 text-sky-900" },
  { key: "T", title: "איומים", tone: "border-amber-300 bg-amber-50 text-amber-900" },
];

function SwotMatrix({ swot }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {QUADRANTS.map((q) => (
        <div key={q.key} className={`rounded-2xl border p-4 ${q.tone}`}>
          <h4 className="mb-2 font-bold">{q.title}</h4>
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {swot[q.key].length ? (
              swot[q.key].map((item, i) => <li key={i}>• {item}</li>)
            ) : (
              <li className="opacity-60">לא זוהו פריטים ברבע זה</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

const TOWS_LABELS = {
  SO: { label: "התקפה (חוזקה × הזדמנות)", tone: "bg-emerald-100 text-emerald-800" },
  WT: { label: "הגנה (חולשה × איום)", tone: "bg-rose-100 text-rose-800" },
  ST: { label: "מינוף (חוזקה מול איום)", tone: "bg-sky-100 text-sky-800" },
  WO: { label: "שיפור (הזדמנות לתיקון חולשה)", tone: "bg-violet-100 text-violet-800" },
};

function TowsAdvice({ tows }) {
  return (
    <section className="space-y-3">
      <h3 className="font-bold text-slate-800">המלצות טקטיות (TOWS)</h3>
      {tows.map((t, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <span
            className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${TOWS_LABELS[t.type].tone}`}
          >
            {TOWS_LABELS[t.type].label}
          </span>
          <h4 className="font-semibold text-slate-800">{t.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.body}</p>
        </div>
      ))}
    </section>
  );
}
