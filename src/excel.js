// ============================================================
// excel.js — ייצוא/ייבוא Excel (SheetJS)
// גיליון 1: "תקציב כללי"        — כל סעיפי התקציב לפי שלבים
// גיליון 2: "מעקב קבלנים ותשתיות" — קבלנים + פעימות תשלום
// ============================================================
import * as XLSX from "xlsx";

export const BUDGET_SHEET = "תקציב כללי";
export const CONTRACTORS_SHEET = "מעקב קבלנים ותשתיות";

// helpers מקומיים (ללא תלות מעגלית ב-Utilities)
const num = (v) => {
  if (typeof v === "string") v = v.replace(/[₪,\s]/g, "");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const uid = () =>
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const contractorPaid = (c) =>
  (c?.milestones || []).reduce((s, m) => s + (m.isPaid ? num(m.amount) : 0), 0);

// ---------------- ייצוא ----------------
export function buildWorkbook(data) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  // גיליון תקציב
  const budgetRows = [];
  for (const ph of data.phases) {
    for (const it of ph.items) {
      const linked = it.contractorId
        ? data.contractors.find((c) => c.id === it.contractorId)
        : null;
      const paid = linked ? contractorPaid(linked) : num(it.paid);
      budgetRows.push({
        "שלב": ph.name,
        "סעיף": it.name,
        "ספק": it.supplier || "",
        "עלות": num(it.cost),
        "שולם": paid,
        "יתרה": num(it.cost) - paid,
        "מזהה קבלן": it.contractorId || "",
        "הערות": it.notes || "",
      });
    }
  }
  const ws1 = XLSX.utils.json_to_sheet(budgetRows);
  ws1["!cols"] = [
    { wch: 22 }, { wch: 34 }, { wch: 24 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 34 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, BUDGET_SHEET);

  // גיליון קבלנים — שורה לכל פעימה (פרטי הקבלן חוזרים בכל שורה)
  const conRows = [];
  for (const c of data.contractors) {
    const base = {
      "מזהה קבלן": c.id,
      "שם הקבלן": c.name,
      "תחום": c.trade || "",
      "היקף חוזה": num(c.totalValue),
      "טלפון": c.phone || "",
      "הערות קבלן": c.notes || "",
    };
    if (!c.milestones?.length) {
      conRows.push({ ...base, "תיאור פעימה": "", "סכום": "", "שולם": "", "תאריך תשלום": "" });
    } else {
      for (const m of c.milestones) {
        conRows.push({
          ...base,
          "תיאור פעימה": m.description || "",
          "סכום": num(m.amount),
          "שולם": m.isPaid ? "כן" : "לא",
          "תאריך תשלום": m.paidDate || "",
        });
      }
    }
  }
  const ws2 = XLSX.utils.json_to_sheet(conRows);
  ws2["!cols"] = [
    { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
    { wch: 28 }, { wch: 34 }, { wch: 12 }, { wch: 8 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, CONTRACTORS_SHEET);

  return wb;
}

export function exportToExcel(data) {
  const wb = buildWorkbook(data);
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `גיבוי-תקציב-בית-${date}.xlsx`);
}

// ---------------- ייבוא ----------------
const normHeader = (h) => String(h ?? "").replace(/[?؟:]/g, "").trim();

const parseBool = (v) => {
  if (v === true) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return ["כן", "true", "1", "yes", "v", "✓", "שולם"].includes(s);
};

const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // תאריך סריאלי של Excel
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s || /^-+$/.test(s)) return null;
  return s;
};

// המרת גיליון לרשימת אובייקטים — עמיד לשורות ריקות ולשורות כותרת שאינן בשורה הראשונה
function sheetToObjects(ws, requiredHeaders) {
  if (!ws) return [];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = grid.findIndex((row) => {
    const cells = row.map(normHeader);
    return requiredHeaders.every((h) => cells.includes(h));
  });
  if (headerIdx === -1) return [];
  const headers = grid[headerIdx].map(normHeader);
  const out = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue; // שורה ריקה
    const obj = {};
    headers.forEach((h, j) => {
      if (h) obj[h] = row[j];
    });
    out.push(obj);
  }
  return out;
}

const findSheet = (wb, keyword, fallbackIdx) => {
  const name =
    wb.SheetNames.find((n) => n.includes(keyword)) ?? wb.SheetNames[fallbackIdx];
  return name ? wb.Sheets[name] : null;
};

export function parseWorkbook(wb) {
  const wsBudget = findSheet(wb, "תקציב", 0);
  const wsContractors = findSheet(wb, "קבלנ", 1);

  // --- קבלנים ---
  const conRows = sheetToObjects(wsContractors, ["שם הקבלן"]);
  const contractorsMap = new Map();
  for (const r of conRows) {
    const name = String(r["שם הקבלן"] ?? "").trim();
    if (!name || name === 'סה"כ') continue;
    const key = String(r["מזהה קבלן"] ?? "").trim() || `${name}|${r["תחום"] ?? ""}`;
    if (!contractorsMap.has(key)) {
      contractorsMap.set(key, {
        id: String(r["מזהה קבלן"] ?? "").trim() || uid(),
        name,
        trade: String(r["תחום"] ?? "").trim() || "כללי",
        totalValue: num(r["היקף חוזה"]),
        phone: String(r["טלפון"] ?? "").trim(),
        notes: String(r["הערות קבלן"] ?? "").trim(),
        milestones: [],
      });
    }
    const c = contractorsMap.get(key);
    const desc = String(r["תיאור פעימה"] ?? "").trim();
    if (desc) {
      c.milestones.push({
        id: uid(),
        description: desc,
        amount: num(r["סכום"]),
        isPaid: parseBool(r["שולם"]),
        paidDate: parseDate(r["תאריך תשלום"]),
      });
    }
  }
  const contractors = [...contractorsMap.values()];
  const contractorIds = new Set(contractors.map((c) => c.id));

  // --- תקציב ---
  const budRows = sheetToObjects(wsBudget, ["שלב", "סעיף"]);
  const phasesMap = new Map();
  for (const r of budRows) {
    const phaseName = String(r["שלב"] ?? "").trim();
    const itemName = String(r["סעיף"] ?? "").trim();
    if (!itemName || itemName === 'סה"כ' || phaseName === 'סה"כ') continue;
    const phKey = phaseName || "כללי";
    if (!phasesMap.has(phKey)) {
      phasesMap.set(phKey, { id: uid(), name: phKey, items: [] });
    }
    const cid = String(r["מזהה קבלן"] ?? "").trim();
    const linked = cid && contractorIds.has(cid);
    phasesMap.get(phKey).items.push({
      id: uid(),
      name: itemName,
      supplier: String(r["ספק"] ?? "").trim(),
      cost: num(r["עלות"]),
      paid: linked ? 0 : num(r["שולם"]),
      contractorId: linked ? cid : null,
      notes: String(r["הערות"] ?? "").trim(),
    });
  }
  const phases = [...phasesMap.values()];

  if (!phases.length && !contractors.length) {
    throw new Error("empty");
  }
  return { phases, contractors };
}

export async function importFromExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  return parseWorkbook(wb);
}
