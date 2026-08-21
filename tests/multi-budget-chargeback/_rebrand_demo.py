"""Re-cuts the demo dataset for the Multi-Budget Chargeback Report.

The tool is not healthcare-specific: it settles a shared prepaid pool for any
tenant where several separately budgeted organisations sit inside it. The demo
data was written around a health payer, which quietly narrows how the tool
reads. This maps every value onto sector-neutral equivalents that a viewer from
any industry can map onto their own org chart.

Mapping is one-to-one and order-preserving, so the underlying usage
distribution, the settlement arithmetic and the tests are all unchanged. Only
the labels move.
"""
import pathlib, re

APP = pathlib.Path(r"C:\Studio proj\Analytics-Hub\docs\cowork-billing\multi-budget-chargeback\app")
SRC = APP / "demo-data.js"

DEPT = {
    "Claims Processing":      "Customer Operations",
    "Member Services":        "Customer Support",
    "Clinical Operations":    "Field Services",
    "Network Management":     "Infrastructure",
    "Pharmacy Benefits":      "Procurement",
    "Actuarial & Underwriting": "Risk & Pricing",
    "Government Programs":    "Public Sector",
    "Sales (Employer Group)": "Regional Sales",
    "Data & Analytics":       "Data & Analytics",
    "Engineering":            "Product Engineering",
    "Finance":                "Finance",
    "Human Resources":        "Human Resources",
    "IT Service Desk":        "IT Service Desk",
    "Legal & Compliance":     "Legal & Compliance",
    "Marketing":              "Marketing",
    "Product Management":     "Product Management",
}

BU = {
    "Claims & Benefits":   "Operations",
    "Clinical & Care":     "Field & Delivery",
    "Corporate":           "Corporate",
    "Product & Analytics": "Technology",
}

TITLE = {
    "Claims Examiner":      "Operations Analyst",
    "Claims Auditor":       "Operations Auditor",
    "Escalations Lead":     "Escalations Lead",
    "CSR":                  "Support Agent",
    "Care Coordinator":     "Service Coordinator",
    "RN Care Manager":      "Field Team Manager",
    "Clinical Analyst":     "Field Analyst",
    "Provider Relations":   "Partner Relations",
    "Contract Negotiator":  "Contract Manager",
    "Network Analyst":      "Network Analyst",
    "Formulary Specialist": "Category Specialist",
    "Pharmacy Tech":        "Procurement Assistant",
    "PBM Analyst":          "Sourcing Analyst",
    "Medicare Analyst":     "Programme Analyst",
    "Medicaid Liaison":     "Programme Liaison",
    "Underwriter":          "Pricing Underwriter",
    "Actuary":              "Actuarial Analyst",
    "Recovery Specialist":  "Collections Specialist",
    "Privacy Officer":      "Privacy Officer",
    "Quality Analyst":      "Quality Analyst",
    "Renewal Manager":      "Renewals Manager",
    "Account Executive":    "Account Executive",
    "Sales Engineer":       "Solutions Engineer",
    "Policy Analyst":       "Policy Analyst",
    "Pricing Analyst":      "Pricing Analyst",
    "Compliance Analyst":   "Compliance Analyst",
    "Financial Analyst":    "Financial Analyst",
    "FP&A Manager":         "FP&A Manager",
    "Accountant":           "Accountant",
    "Comp Analyst":         "Reward Analyst",
    "HRBP":                 "HR Business Partner",
    "Recruiter":            "Recruiter",
    "Content Strategist":   "Content Strategist",
    "Brand Lead":           "Brand Lead",
    "Marketing Manager":    "Marketing Manager",
    "Data Analyst":         "Data Analyst",
    "Data Scientist":       "Data Scientist",
    "BI Engineer":          "BI Engineer",
    "ML Engineer":          "ML Engineer",
    "Software Engineer":    "Software Engineer",
    "Platform Engineer":    "Platform Engineer",
    "SRE":                  "Site Reliability Engineer",
    "Eng Manager":          "Engineering Manager",
    "Desktop Admin":        "Desktop Admin",
    "Tier 1 Tech":          "Tier 1 Technician",
    "Tier 2 Tech":          "Tier 2 Technician",
    "Sr PM":                "Senior Product Manager",
    "PM":                   "Product Manager",
}

# cost-centre prefixes are derived from the department, so retag them too
CC = {
    "CC-CLMS": "CC-CUST",
    "CC-MBRS": "CC-SUPP",
    "CC-CLIN": "CC-FLDS",
    "CC-NTWK": "CC-INFR",
    "CC-PHRM": "CC-PROC",
    "CC-ACTR": "CC-RISK",
    "CC-GOVT": "CC-PUBS",
    "CC-SLES": "CC-SALE",
    "CC-DATA": "CC-DATA",
    "CC-ENGR": "CC-ENGR",
    "CC-FINX": "CC-FINX",
    "CC-HRXX": "CC-HRXX",
    "CC-ITSD": "CC-ITSD",
    "CC-LEGL": "CC-LEGL",
    "CC-MKTG": "CC-MKTG",
    "CC-PROD": "CC-PRDM",
}

MANAGER = {
    "member.mgr": "support.mgr",
    "claims.mgr": "custops.mgr",
    "clinical.mgr": "field.mgr",
    "pharmacy.mgr": "procure.mgr",
    "network.mgr": "infra.mgr",
    "actuarial.mgr": "risk.mgr",
    "govt.mgr": "public.mgr",
    "sales.mgr": "sales.mgr",
}

text = SRC.read_text(encoding="utf-8")
before = text

# longest first so "Claims Processing" is not partly eaten by "Claims"
for table in (DEPT, BU, TITLE, CC, MANAGER):
    for old, new in sorted(table.items(), key=lambda kv: -len(kv[0])):
        text = text.replace(old, new)

text = text.replace(
    "// demo-data.js - synthetic demo datasets embedded as string constants.\n"
    "// Customer Example shape at 70% scale. Not for real decisions.",
    "// demo-data.js - synthetic demo datasets embedded as string constants.\n"
    "// Sector-neutral org shape at 70% scale of a real tenant. Not for real decisions.")

SRC.write_text(text, encoding="utf-8")

# report what is left
leftovers = []
for term in ("Claims", "Clinical", "Pharmacy", "Medicare", "Medicaid", "RN ",
             "Care Manager", "Member", "Formulary", "PBM", "Underwrit", "Actuar",
             "Provider", "healthcare", "Health"):
    hits = len(re.findall(term, text))
    if hits:
        leftovers.append(f"{term}: {hits}")

print(f"rewrote {SRC.name}  ({len(before)} -> {len(text)} chars)")
print("residual sector terms:", ", ".join(leftovers) if leftovers else "none")
