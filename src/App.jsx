// ============================================================
// App.jsx — מסך כניסה (סיסמה) + מסגרת האפליקציה + ניווט תחתון
// ============================================================
import { useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  HardHat,
  Settings,
  Home,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import { BudgetProvider, SettingsBackup, useBudget, fmt } from "./Utilities";
import { APP_PASSWORD, AUTH_SESSION_KEY } from "./config";
import Dashboard from "./Dashboard";
import BudgetTable from "./BudgetTable";
import ContractorTracker from "./ContractorTracker";

const TABS = [
  { id: "dashboard", label: "דשבורד", icon: LayoutDashboard, component: Dashboard },
  { id: "budget", label: "תקציב", icon: ListChecks, component: BudgetTable },
  { id: "contractors", label: "קבלנים", icon: HardHat, component: ContractorTracker },
  { id: "settings", label: "גיבוי", icon: Settings, component: SettingsBackup },
];

// ---------- מסך כניסה ----------
function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/50">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">הבית של שרית</h1>
          <p className="mt-1 text-sm text-slate-400">מעקב תקציב בניה ותשלומים</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-xl backdrop-blur"
        >
          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
            <Lock className="h-4 w-4" />
            סיסמה
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              autoFocus
              dir="ltr"
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full rounded-xl border bg-slate-900/70 px-4 py-3 text-left text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-600 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
              placeholder="••••••••"
              aria-label="סיסמה"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 end-3 my-auto text-slate-400 hover:text-slate-200"
              aria-label={show ? "הסתרת סיסמה" : "הצגת סיסמה"}
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm font-medium text-red-400">
              סיסמה שגויה — נסי שוב
            </p>
          )}

          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-500 active:scale-[0.99]"
          >
            <LogIn className="h-5 w-5" />
            כניסה
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          הנתונים שמורים מקומית במכשיר זה בלבד
        </p>
      </div>
    </div>
  );
}

// ---------- מסגרת האפליקציה ----------
function Header() {
  const { data, totals } = useBudget();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold leading-tight">
            {data.meta.projectName}
          </h1>
          <p className="text-xs text-slate-500 tabular-nums">
            שולם {fmt(totals.paid)} · יתרה {fmt(totals.remaining)}
          </p>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find((t) => t.id === tab).component;

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <Active />
      </main>

      {/* Bottom navigation — mobile first */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_SESSION_KEY) === "1"
  );

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <BudgetProvider>
      <Shell />
    </BudgetProvider>
  );
}
