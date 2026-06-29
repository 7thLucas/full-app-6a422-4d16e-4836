## Product: Amanah

**Amanah** is a role-based compliance audit system for **Bank Syariah Indonesia (BSI)**, used by the HR & Compliance team. The name "Amanah" (trust/trustworthiness) reflects the audit-grade, trustworthy nature of the tool and the fiduciary duty of frontline banking staff.

### What it is
An internal compliance audit system for client-facing employees at BSI. Compliance officers and line managers audit, score, and track frontline staff (Relationship Managers, tellers, customer service) against role-specific compliance standards, so manpower quality and audit-readiness stay high at the point of customer contact.

### Who it's for (role-based access)
- **Compliance officers & internal auditors (primary)** — monitor compliance status of all client-facing staff in one dashboard; run audits and surface gaps across the organization.
- **Branch / area managers (secondary)** — monitor their own teams and follow up on flagged gaps.
- **Audited client-facing staff (tertiary, limited / read-only access)** — Relationship Managers, tellers, customer service; view their own compliance score and improvement points only.

### The problem
Compliance risk at a bank concentrates in client-facing roles: KYC/CDD gaps, product mis-selling, service-standard violations, and sharia-compliance lapses happen at the point of customer contact. Today these are surfaced through periodic, manual audits — so gaps are found late, often only when an internal auditor or the regulator (OJK) finds them, when they have already become findings, fines, or reputational damage.

### Day-one core feature (MVP — build this now)
A per-employee audit record built around a role-specific compliance checklist:
1. A compliance officer selects a client-facing staff member (RM / teller / customer service).
2. The app shows a role-specific audit checklist (e.g. KYC, document completeness, sharia akad/contract compliance, service standards).
3. Each checklist item is scored.
4. The app automatically computes a compliance score and flags gaps.
5. Everything rolls up into a single risk dashboard showing who is compliant, who is at risk, and which gaps need action.

**Day-one "one thing brilliantly":** score a single client-facing employee against a role checklist and surface the gaps — the audit record itself, rolling up into the risk dashboard.

### Domain
Indonesian Islamic banking. Standards cover both general banking compliance (KYC/CDD, service standards) and sharia compliance (akad/contract compliance), in an Indonesian-language context.

### Tone & strategic principles
- Trustworthy, clean, professional, audit-grade.
- Internal operational tool — not customer-facing.
- Role-aware: different client-facing roles have different compliance checklists.
- Role-based access enforced across the three user tiers.
- Purpose is maintaining frontline manpower quality through continuous audit-readiness (catch gaps before review), not just record-keeping.

### Anti-references (what NOT to build now — later layers)
- Follow-up notifications.
- OJK-ready exportable reports.
- Per-employee audit history / timeline.
Keep the MVP focused on: select staff → role checklist → score → auto compliance score + gap flags → risk dashboard roll-up.