import { useEffect } from "react";
import { useConfigurables } from "../hooks/use-configurables";

/**
 * ConfigurablesCSSBridge — Syncs brandColor and font from configurables into
 * CSS custom properties so Tailwind utilities and font-family declarations
 * reflect the DB-driven config in real time.
 *
 * How it works:
 *   1. Tailwind config maps e.g. `primary` → `var(--primary)`.
 *   2. tailwind.css defines the default CSS variable values.
 *   3. This component overrides those CSS vars at runtime on <html>,
 *      so every Tailwind utility referencing var(--primary) updates instantly.
 *   4. For fonts, a <link> tag is injected/updated to load the chosen Google
 *      Fonts, and --heading-font / --text-font vars drive font-family usage.
 *   5. When the portal sends QB_MIDDLE_EDITOR_UPDATE, useConfigurables()
 *      re-renders → effects re-run → CSS vars + fonts update.
 *
 * Mount this INSIDE <ConfigurablesProvider>, but outside <ThemeProvider> so it
 * applies before any themed children paint.
 */
export function ConfigurablesCSSBridge() {
  const { config } = useConfigurables();

  // ── Brand colors ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === "undefined") return;

    const brandColor = config?.brandColor;
    if (!brandColor || typeof brandColor !== "object") return;

    const root = document.documentElement;
    const isValidColor = (v: unknown): v is string =>
      typeof v === "string" && v.length > 0;

    // Declarative map: configurable field name → CSS custom property name.
    // Mirrors every var defined in tailwind.css so a single loop covers all.
    const COLOR_MAP: Record<string, string> = {
      // Base
      background:               "--background",
      foreground:               "--foreground",
      // Card
      card:                     "--card",
      cardForeground:           "--card-foreground",
      // Popover
      popover:                  "--popover",
      popoverForeground:        "--popover-foreground",
      // Primary
      primary:                  "--primary",
      primaryForeground:        "--primary-foreground",
      // Secondary
      secondary:                "--secondary",
      secondaryForeground:      "--secondary-foreground",
      // Muted
      muted:                    "--muted",
      mutedForeground:          "--muted-foreground",
      // Accent
      accent:                   "--accent",
      accentForeground:         "--accent-foreground",
      // Destructive
      destructive:              "--destructive",
      destructiveForeground:    "--destructive-foreground",
      // Border / Input / Ring
      border:                   "--border",
      input:                    "--input",
      ring:                     "--ring",
      // Charts
      chart1:                   "--chart-1",
      chart2:                   "--chart-2",
      chart3:                   "--chart-3",
      chart4:                   "--chart-4",
      chart5:                   "--chart-5",
      // Navbar
      navbarBackground:         "--navbar-background",
      // Sidebar
      sidebarBackground:        "--sidebar-background",
      sidebarForeground:        "--sidebar-foreground",
      sidebarPrimary:           "--sidebar-primary",
      sidebarPrimaryForeground: "--sidebar-primary-foreground",
      sidebarAccent:            "--sidebar-accent",
      sidebarAccentForeground:  "--sidebar-accent-foreground",
      sidebarBorder:            "--sidebar-border",
      sidebarRing:              "--sidebar-ring",
    };

    for (const [field, cssVar] of Object.entries(COLOR_MAP)) {
      const value = (brandColor as Record<string, unknown>)[field];
      if (isValidColor(value)) {
        root.style.setProperty(cssVar, value);
      }
    }
  }, [config?.brandColor]);


  // ── Typography ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === "undefined") return;

    const font = config?.font;
    if (!font || typeof font !== "object") return;

    const headingFont = font.headingFont;
    const textFont = font.textFont;

    // Collect unique fonts to load
    const fontsToLoad = [...new Set([headingFont, textFont].filter(Boolean))];
    if (fontsToLoad.length === 0) return;

    // Add preconnect tags for performance and reliability
    const preconnects = [
      { id: "qb-fonts-preconnect-api", href: "https://fonts.googleapis.com" },
      { id: "qb-fonts-preconnect-gstatic", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ];
    preconnects.forEach(({ id, href, crossOrigin }) => {
      if (!document.getElementById(id)) {
        const linkEl = document.createElement("link");
        linkEl.id = id;
        linkEl.rel = "preconnect";
        linkEl.href = href;
        if (crossOrigin) linkEl.crossOrigin = crossOrigin;
        document.head.appendChild(linkEl);
      }
    });

    // Custom query parameters for each supported Google Font to prevent 400 Bad Request
    const FONT_PARAMS_MAP: Record<string, string> = {
      "Inter": "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900",
      "Inter Tight": "Inter Tight:ital,wght@0,100..900;1,100..900",
      "Plus Jakarta Sans": "Plus Jakarta Sans:ital,wght@0,200..800;1,200..800",
      "Poppins": "Poppins:ital,wght@0,100..900;1,100..900",
      "Montserrat": "Montserrat:ital,wght@0,100..900;1,100..900",
      "Raleway": "Raleway:ital,wght@0,100..900;1,100..900",
      "Playfair Display": "Playfair Display:ital,opsz,wght@0,17..120,400..900;1,17..120,400..900",
      "Lora": "Lora:ital,wght@0,400..700;1,400..700",
      "Merriweather": "Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900",
      "EB Garamond": "EB Garamond:ital,wght@0,400..800;1,400..800",
      "Cinzel": "Cinzel:wght@400..900",
      "Cormorant Garamond": "Cormorant Garamond:ital,wght@0,300..700;1,300..700",
      "Libre Baskerville": "Libre Baskerville:ital,wght@0,400..700;1,400..700",
      "PT Serif": "PT Serif:ital,wght@0,400;0,700;1,400;1,700",
      "Nunito": "Nunito:ital,wght@0,200..1000;1,200..1000",
      "Outfit": "Outfit:wght@100..900",
      "DM Sans": "DM Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000",
      "Sora": "Sora:wght@100..800",
      "Space Grotesk": "Space Grotesk:wght@300..700",
      "Josefin Sans": "Josefin Sans:ital,wght@0,100..700;1,100..700",
      "Rubik": "Rubik:ital,wght@0,300..900;1,300..900",
      "Quicksand": "Quicksand:wght@300..700",
      "Figtree": "Figtree:ital,wght@0,300..900;1,300..900",
      "Lexend": "Lexend:wght@100..900",
      "Source Sans 3": "Source Sans 3:ital,wght@0,200..900;1,200..900",
      "Noto Sans": "Noto Sans:ital,wdth,wght@0,62.5..100,100..900;1,62.5..100,100..900",
      "Lato": "Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900",
      "Open Sans": "Open Sans:ital,wdth,wght@0,75..100,300..800;1,75..100,300..800",
      "Roboto": "Roboto:ital,wdth,wght@0,75..100,100..900;1,75..100,100..900"
    };

    // Build a Google Fonts URL using matching spec parameters
    const familyParams = fontsToLoad
      .map((f) => {
        const paramSpec = FONT_PARAMS_MAP[f];
        if (paramSpec) {
          const parts = paramSpec.split(":");
          const familyName = parts[0];
          const rest = parts.slice(1).join(":");
          return `family=${encodeURIComponent(familyName)}${rest ? ":" + rest : ""}`;
        }
        return `family=${encodeURIComponent(f)}:wght@400;700`;
      })
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;

    // Reuse or create the managed <link> tag
    const LINK_ID = "qb-configurables-fonts";
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;

    // List of known serif fonts to use correct fallback
    const SERIF_FONTS = new Set([
      "Playfair Display",
      "Lora",
      "Merriweather",
      "EB Garamond",
      "Cinzel",
      "Cormorant Garamond",
      "Libre Baskerville",
      "PT Serif"
    ]);

    const getFallback = (f: string) => SERIF_FONTS.has(f) ? "serif" : "sans-serif";

    // Set CSS custom properties so any element can reference them
    const root = document.documentElement;
    if (headingFont) {
      root.style.setProperty("--heading-font", `'${headingFont}', ${getFallback(headingFont)}`);
    }
    if (textFont) {
      root.style.setProperty("--text-font", `'${textFont}', ${getFallback(textFont)}`);
    }
  }, [config?.font]);

  return null; // renderless component
}

