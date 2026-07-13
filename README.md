# הבית של שרית — מעקב תקציב בניה ותשלומי קבלנים

אפליקציית Web חד-עמודית (SPA), Mobile-First, בעברית מלאה (RTL).
100% צד-לקוח: React + Vite + Tailwind CSS + Recharts + Lucide. שמירה אוטומטית ב-LocalStorage + ייצוא/ייבוא JSON.

---

## 1. התקנה והרצה — `C:\Users\Administrator\Desktop\פרויקט בית`

דרישה מקדימה: Node.js 18+ מותקן (https://nodejs.org).

### אפשרות א׳ — הפרויקט המוכן (מומלץ)
חלצי את תוכן ה-ZIP אל התיקיה, ואז ב-PowerShell / CMD:

```powershell
cd "C:\Users\Administrator\Desktop\פרויקט בית"
npm install
npm run dev
```

פתחי בדפדפן: http://localhost:5173

### אפשרות ב׳ — אתחול Vite מאפס (אם מתחילים ריק)
```powershell
cd "C:\Users\Administrator\Desktop"
npm create vite@latest "פרויקט בית" -- --template react
cd "C:\Users\Administrator\Desktop\פרויקט בית"
npm install
npm install lucide-react recharts
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```
ואז החליפי את הקבצים בקבצי הפרויקט הזה.

### בניה לפרודקשן
```powershell
npm run build      # יוצר תיקיית dist — ניתן לפתוח מכל שרת סטטי
npm run preview    # תצוגה מקדימה של הבניה
```

---

## 2. סכימת הנתונים (JSON)

זהו גם הפורמט של קובץ הגיבוי (ייצוא/ייבוא במסך "גיבוי"):

```json
{
  "meta": {
    "schemaVersion": 1,
    "projectName": "הבית של שרית",
    "currency": "ILS",
    "lastUpdated": "2026-07-13T10:00:00.000Z"
  },
  "phases": [
    {
      "id": "ph-3",
      "name": "בניית שלד ותשתיות",
      "items": [
        {
          "id": "it-3a",
          "name": "קבלן שלד",
          "supplier": "אחים לוי בניה",
          "cost": 850000,
          "paid": 0,
          "contractorId": "con-sheled",
          "notes": "לפי פעימות"
        }
      ]
    }
  ],
  "contractors": [
    {
      "id": "con-sheled",
      "name": "אחים לוי בניה בע\"מ",
      "trade": "שלד",
      "totalValue": 850000,
      "phone": "",
      "notes": "כולל חומרים",
      "milestones": [
        {
          "id": "m-sh-1",
          "description": "מקדמה + התארגנות",
          "amount": 170000,
          "isPaid": true,
          "paidDate": "2026-03-10"
        }
      ]
    }
  ]
}
```

### כלל הסנכרון (מקור אמת יחיד)
- כאשר `item.contractorId` מוגדר — השדה "שולם" של הסעיף **מחושב אוטומטית** כסכום כל הפעימות המסומנות `isPaid: true` של אותו קבלן (השדה `paid` הידני מנוטרל).
- כאשר `contractorId` הוא `null` — "שולם" מעודכן ידנית בשדה `paid`.
- סימון פעימה כ"שולמה" קובע `paidDate` להיום ומתעדכן מיידית בסעיף התקציב, בשלב, ובדשבורד.

---

## 3. מבנה הקבצים

```
פרויקט בית/
├── index.html              ← lang="he" dir="rtl", פונט Heebo
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── index.css           ← Tailwind + קלאסים משותפים (card / input / btn)
    ├── App.jsx             ← מסגרת, כותרת, ניווט תחתון (4 טאבים)
    ├── Dashboard.jsx       ← KPI, גרף רדיאלי לניצול, גרף עמודות לפי שלב
    ├── BudgetTable.jsx     ← אקורדיון שלבים + כרטיסי סעיפים (עריכה inline)
    ├── ContractorTracker.jsx ← קבלנים לפי תחום + פעימות תשלום
    ├── Utilities.jsx       ← Context, LocalStorage, חישובים, גיבוי/שחזור
    └── data/initialData.js ← Seed: מבנה התקציב של שרית (ניתן לעריכה מלאה)
```

## 4. טיפים
- **גיבוי**: טאב "גיבוי" → "ייצוא נתונים (JSON)". שמרי את הקובץ בענן/דיסק. שחזור דרך "ייבוא".
- הנתונים ההתחלתיים הם דוגמה — כל סעיף, שלב, קבלן ופעימה ניתנים לעריכה, הוספה ומחיקה מהאפליקציה.
- "סעיפים בחריגה" בדשבורד = סעיפים שבהם שולם יותר מהעלות המתוכננת.
