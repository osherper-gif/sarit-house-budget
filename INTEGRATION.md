# Integration Guide — 3 New Modules

## File map
```
src/
├── utils/scheduleUtils.js        # pure cascade/date logic (no React)
├── data/knowledgeBase.js         # templates + checklists (content only)
└── components/
    ├── DelaySimulator.jsx        # wraps the תוכנית עבודה tab rows
    ├── StrategicAdvisor.jsx      # new יועץ אסטרטגי tab
    └── KnowledgeBase.jsx         # new "מה עושים כש..." tab + OverdueActionCard
```

## 1. Context assumptions
All components consume the existing global context via a `useBudget()` hook:

```js
const { contractors, setContractors } = useBudget();
```

Expected contractor shape (fields the modules read):
```js
{
  id, name,
  category | phase,          // used to fill template placeholders
  status: "active" | ...,    // "active" + past estimatedEndDate ⇒ overdue
  estimatedStartDate: "YYYY-MM-DD",
  estimatedEndDate?: "YYYY-MM-DD",   // OR durationDays (fallback: 7)
}
```
If your dates are stored differently, adapt only `getContractorEnd()` in
`scheduleUtils.js` — everything else derives from it.

## 2. Tabs
```jsx
const TABS = [
  ...existingTabs,
  { id: "advisor",   label: "יועץ אסטרטגי",  component: <StrategicAdvisor /> },
  { id: "knowledge", label: "מה עושים כש...", component: <KnowledgeBase /> },
];
```
In the existing Work Plan tab, render `<DelaySimulatorPanel />` in place of
(or wrapping) the current contractor row list.

## 3. Hooking the insights engine
Add one rule to your existing rule set:

```js
// insightsRules.js
{
  id: "contractor-overdue",
  test: (c) =>
    c.status === "active" &&
    c.estimatedEndDate &&
    new Date(c.estimatedEndDate) < new Date(),
  render: (c) => <OverdueActionCard contractor={c} ownerName={settings.ownerName} />,
}
```

## 4. New LocalStorage keys (namespaced, non-colliding)
| Key | Purpose |
|---|---|
| `constructionApp.advisorAnswers.v1` | quiz answers → SWOT persists across sessions |
| `constructionApp.kbChecks.v1` | checklist tick state |

The delay simulator writes **nothing** — it only calls the existing
`setContractors` when the user commits, so your current persistence layer
handles it.

## 5. Design decisions worth knowing
- **Simulation is derived state** (`useMemo` over `contractors + sim`), never
  copied into storage — no risk of a "stuck" simulated plan after a crash.
- Shifted rows carry `_originalStart/_originalEnd` flags so the UI renders a
  strikethrough diff; `commitSimulation()` strips all `_`-prefixed flags
  before persisting.
- Cascade model: sequential Gantt-lite — every contractor whose start date is
  after the delayed contractor shifts by the same amount. If you later add an
  explicit dependency graph, only `simulateDelay()` needs to change.
- Template escalation (nudge → firm → formal) is auto-suggested from the size
  of the delay (≤5, ≤14, >14 days) but Sarit can pick any level.
- Clipboard uses `navigator.clipboard` with a `window.prompt` fallback for
  non-secure contexts.
