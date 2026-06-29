/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  // Base
  background: string;
  foreground: string;
  // Card
  card: string;
  cardForeground: string;
  // Popover
  popover: string;
  popoverForeground: string;
  // Primary
  primary: string;
  primaryForeground: string;
  // Secondary
  secondary: string;
  secondaryForeground: string;
  // Muted
  muted: string;
  mutedForeground: string;
  // Accent
  accent: string;
  accentForeground: string;
  // Destructive
  destructive: string;
  destructiveForeground: string;
  // Border / Input / Ring
  border: string;
  input: string;
  ring: string;
  // Charts
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
  // Navbar
  navbarBackground: string;
  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type TFont = {
  headingFont: string;
  textFont: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  font: TFont;
  tagline?: string;
  organizationName?: string;
  loginHeadline?: string;
  loginSubtext?: string;
  compliantThreshold?: number;
  atRiskThreshold?: number;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "Amanah",
  logoUrl: "",
  brandColor: {
    // Base — clean near-white institutional surface
    background:        "#f8fafc",
    foreground:        "#0f172a",
    // Card
    card:              "#ffffff",
    cardForeground:    "#0f172a",
    // Popover
    popover:           "#ffffff",
    popoverForeground: "#0f172a",
    // Primary — deep institutional teal (BSI palette)
    primary:           "#0f766e",
    primaryForeground: "#f8fafc",
    // Secondary — soft teal tint surface
    secondary:           "#ecfdf5",
    secondaryForeground: "#115e59",
    // Muted
    muted:           "#f1f5f9",
    mutedForeground: "#64748b",
    // Accent — restrained gold for audit-grade emphasis
    accent:           "#fdf6e3",
    accentForeground: "#92660a",
    // Destructive — gap / fail / critical
    destructive:           "#dc2626",
    destructiveForeground: "#f8fafc",
    // Border / Input / Ring
    border: "#e2e8f0",
    input:  "#e2e8f0",
    ring:   "#0f766e",
    // Charts — compliance status semantics + brand
    chart1: "#16a34a", // compliant / pass — green
    chart2: "#d97706", // at risk — amber
    chart3: "#dc2626", // gap / critical — red
    chart4: "#0f766e", // brand teal
    chart5: "#d4a017", // gold accent
    // Navbar
    navbarBackground: "#ffffff",
    // Sidebar — deep teal institutional rail
    sidebarBackground:        "#115e59",
    sidebarForeground:        "#d1fae5",
    sidebarPrimary:           "#d4a017",
    sidebarPrimaryForeground: "#0f172a",
    sidebarAccent:            "#0f766e",
    sidebarAccentForeground:  "#f8fafc",
    sidebarBorder:            "#0f766e",
    sidebarRing:              "#d4a017",
  },
  font: {
    headingFont: "Plus Jakarta Sans",
    textFont: "Inter",
  },
  tagline: "Sistem Audit Kepatuhan",
  organizationName: "Bank Syariah Indonesia",
  loginHeadline: "Pantau kepatuhan, jaga amanah.",
  loginSubtext:
    "Sistem audit kepatuhan berbasis peran untuk pegawai garis depan BSI. Nilai, lacak, dan tutup temuan sebelum menjadi risiko.",
  compliantThreshold: 85,
  atRiskThreshold: 70,
};
