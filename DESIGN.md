## Design Guidelines: Amanah

### Brand personality
Trustworthy, clean, professional, audit-grade. The interface should feel like a serious, calm institutional banking tool — not playful. Clarity and legibility over decoration. Inspired by the disciplined clarity of Apple's Human Interface Guidelines: generous whitespace, clear hierarchy, restrained color, purposeful motion.

### Color palette (Islamic-banking / BSI)
- **Primary — Teal/Green:** deep institutional teal as the core brand color. Suggested primary ≈ `#0f766e` (teal-700), with a darker `#115e59` for emphasis and a softer `#14b8a6` / tint backgrounds for surfaces.
- **Accent — Gold:** restrained gold for highlights, key metrics, and audit-grade emphasis ≈ `#b8860b` / `#d4a017`. Use sparingly — accents, not fills.
- **Neutrals:** clean near-white background (`#f8fafc` / `#ffffff` surfaces), slate grays for text (`#0f172a` headings, `#475569` body, `#94a3b8` muted).
- **Status semantics for compliance:**
  - Compliant / pass — green (`#16a34a`).
  - At risk / warning — amber (`#d97706`).
  - Gap / fail / critical — red (`#dc2626`).
  Use these consistently for scores, badges, and dashboard risk states.

### Typography
- Clean, highly legible sans-serif (system UI stack or Inter). Strong typographic hierarchy: large semibold headings, comfortable body, tabular/mono numerals for scores and percentages so audit numbers align cleanly.
- Numbers (compliance scores, percentages) are first-class — give them weight and clarity.

### Layout & components
- Dashboard-first layout: a primary risk dashboard with summary cards (compliant / at-risk / gaps), a staff list, and an audit detail/checklist view.
- Cards with subtle elevation (soft shadows, rounded corners ~8–12px). Avoid heavy borders.
- Checklist: clear scoreable rows with status indicators and gap flags.
- Score visualization: ring/gauge or clear percentage with status color; readable at a glance.
- Tables/lists: scannable, with status badges (compliant / at-risk / gap).
- Role-based UI: officers/auditors see full dashboard + audit tools; managers see team-scoped views; audited staff see a minimal read-only self-view (own score + improvement points).

### Elevation & motion
- Soft, layered elevation to separate surfaces; nothing harsh.
- Subtle, functional transitions (state changes, score reveals). No gratuitous animation.

### Localization
- Indonesian-language banking context. UI copy in Bahasa Indonesia where natural (labels like "Skor Kepatuhan", "Berisiko", "Sesuai", "Temuan/Gap"), keeping the tone formal and professional.

### Logo
- Logo already set (teal mark signalling compliance/trust). Pair with the teal/gold palette consistently.