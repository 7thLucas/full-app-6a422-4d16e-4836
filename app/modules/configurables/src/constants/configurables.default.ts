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
  // Mirror new schema fields here. Example:
  //   maxItemsPerPage?: number;
  //   enableNotifications?: boolean;
  //   featuredCategories?: string[];
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "My App",
  logoUrl: "",
  brandColor: {
    // Base
    background:        "#ffffff",
    foreground:        "#09090b",
    // Card
    card:              "#ffffff",
    cardForeground:    "#09090b",
    // Popover
    popover:           "#ffffff",
    popoverForeground: "#09090b",
    // Primary
    primary:           "#2563eb",
    primaryForeground: "#ffffff",
    // Secondary
    secondary:           "#f4f4f5",
    secondaryForeground: "#18181b",
    // Muted
    muted:           "#f4f4f5",
    mutedForeground: "#71717a",
    // Accent
    accent:           "#f4f4f5",
    accentForeground: "#18181b",
    // Destructive
    destructive:           "#ef4444",
    destructiveForeground: "#fafafa",
    // Border / Input / Ring
    border: "#e4e4e7",
    input:  "#e4e4e7",
    ring:   "#2563eb",
    // Charts
    chart1: "#f97316",
    chart2: "#0d9488",
    chart3: "#1e3a5f",
    chart4: "#d4a017",
    chart5: "#ea580c",
    // Navbar
    navbarBackground: "#ffffff",
    // Sidebar
    sidebarBackground:        "#fafafa",
    sidebarForeground:        "#3f3f46",
    sidebarPrimary:           "#2563eb",
    sidebarPrimaryForeground: "#ffffff",
    sidebarAccent:            "#f4f4f5",
    sidebarAccentForeground:  "#18181b",
    sidebarBorder:            "#e4e4e7",
    sidebarRing:              "#2563eb",
  },
  font: {
    headingFont: "Plus Jakarta Sans",
    textFont: "Inter",
  },
  // ─────────────────────────────────────────────────────────────────────
  // Add new field defaults here. See RULES.md §5 for per-type shape.
  // ─────────────────────────────────────────────────────────────────────
};
