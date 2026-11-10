"""Convert docs/data/report-ranking.xlsx to docs/data/report-ranking.json (read by the report picker)."""
import json
import os
from openpyxl import load_workbook

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "data")
wb = load_workbook(os.path.join(root, "report-ranking.xlsx"), data_only=True)
lists = wb["Lists"]
goals = [c.value for c in lists["A"][1:] if c.value]
products = [c.value for c in lists["B"][1:] if c.value]
ws = wb["Reports"]
clean = lambda v: str(v).strip() if v is not None and str(v).strip() else ""
reports = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not clean(row[0]):
        continue
    order = row[3] if isinstance(row[3], (int, float)) else 9999
    reports.append({
        "id": clean(row[0]), "title": clean(row[1]), "tier": clean(row[2]) or "Standard", "order": order,
        "badge": clean(row[4]), "outcome": clean(row[5]),
        "goals": [g for g in (clean(x) for x in row[6:9]) if g],
        "products": [p for p in (clean(x) for x in row[9:13]) if p],
        "repo": clean(row[13]) if len(row) > 13 else "",
    })
# Keep the AI-in-One tile's published destinations when refreshing spreadsheet data.
for report in reports:
    if report["id"] == "ai-in-one":
        report.update({
            "repo": "https://microsoft.github.io/AI-in-One-Dashboard/index.html",
            "repoLabel": "Repo",
            "guide": "https://microsoft.github.io/AI-in-One-Dashboard/get-started.html",
        })
with open(os.path.join(root, "report-ranking.json"), "w", encoding="utf-8") as f:
    json.dump({"goals": goals, "products": products, "reports": reports}, f, indent=1, ensure_ascii=False)
print("wrote", len(reports), "reports")
