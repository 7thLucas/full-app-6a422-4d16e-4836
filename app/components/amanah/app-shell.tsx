import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, ClipboardCheck, ShieldCheck, LogOut, UserCircle, Menu, X } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { fetchMe, type AmanahMe, type AmanahRole } from "~/lib/amanah";
import { apiRequest } from "~/lib/api.client";
import { cn } from "~/lib/utils";

const ROLE_LABEL: Record<AmanahRole, string> = {
  officer: "Compliance Officer",
  manager: "Manajer Cabang",
  staff: "Pegawai",
};

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: AmanahRole[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard Risiko", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, roles: ["officer", "manager"] },
  { to: "/audit", label: "Audit Pegawai", icon: <ClipboardCheck className="h-[18px] w-[18px]" />, roles: ["officer", "manager"] },
  { to: "/me", label: "Skor Saya", icon: <UserCircle className="h-[18px] w-[18px]" />, roles: ["staff"] },
];

function BrandMark({ logoUrl, appName }: { logoUrl?: string; appName: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={appName} className="h-9 w-9 rounded-lg object-contain bg-sidebar-accent/40 p-1" />;
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
      <ShieldCheck className="h-5 w-5" />
    </span>
  );
}

export function AppShell({ children, requireRole }: { children: ReactNode; requireRole?: AmanahRole[] }) {
  const { config } = useConfigurables();
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<AmanahMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const appName = config?.appName || "Amanah";
  const orgName = config?.organizationName || "Bank Syariah Indonesia";

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setMe(res.data);
        else navigate("/auth/login", { replace: true });
      })
      .catch(() => navigate("/auth/login", { replace: true }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [navigate]);

  // Role-gate the page itself: send staff to their self-view.
  useEffect(() => {
    if (!me || !requireRole) return;
    if (!requireRole.includes(me.amanahRole)) {
      navigate(me.amanahRole === "staff" ? "/me" : "/dashboard", { replace: true });
    }
  }, [me, requireRole, navigate]);

  async function handleLogout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    navigate("/auth/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat…
        </div>
      </div>
    );
  }
  if (!me) return null;

  const items = NAV.filter((n) => n.roles.includes(me.amanahRole));
  const displayName = me.linkedStaff?.name || me.username;

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandMark logoUrl={config?.logoUrl} appName={appName} />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight text-sidebar-accent-foreground">{appName}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">{config?.tagline || "Sistem Audit Kepatuhan"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/60 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{ROLE_LABEL[me.amanahRole]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-navbar/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">{orgName}</p>
              <p className="text-xs text-muted-foreground">Audit kepatuhan pegawai garis depan</p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
