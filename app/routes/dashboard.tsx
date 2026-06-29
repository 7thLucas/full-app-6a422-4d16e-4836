import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Users,
  ClipboardList,
  ChevronRight,
  Search,
} from "lucide-react";
import { AppShell } from "~/components/amanah/app-shell";
import { StatusBadge } from "~/components/amanah/status";
import { fetchDashboard, type DashboardData, type AuditStatus } from "~/lib/amanah";
import { cn } from "~/lib/utils";

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  tone: "neutral" | "compliant" | "at_risk" | "gap";
}) {
  const toneStyles: Record<string, string> = {
    neutral: "text-primary bg-primary/10",
    compliant: "text-chart-1 bg-chart-1/10",
    at_risk: "text-chart-2 bg-chart-2/10",
    gap: "text-destructive bg-destructive/10",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneStyles[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusBar({ data }: { data: DashboardData["summary"] }) {
  const audited = data.compliant + data.atRisk + data.gap || 1;
  const seg = (n: number) => `${(n / audited) * 100}%`;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-chart-1" style={{ width: seg(data.compliant) }} />
        <div className="bg-chart-2" style={{ width: seg(data.atRisk) }} />
        <div className="bg-destructive" style={{ width: seg(data.gap) }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" /> Sesuai {data.compliant}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-2" /> Berisiko {data.atRisk}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Temuan {data.gap}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Belum diaudit {data.unaudited}</span>
      </div>
    </div>
  );
}

export default function DashboardRoute() {
  return (
    <AppShell requireRole={["officer", "manager"]}>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus | "unaudited">("all");

  useEffect(() => {
    fetchDashboard()
      .then((res) => res.success && res.data && setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "unaudited") return !r.audit;
        return r.audit?.status === statusFilter;
      })
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          r.staff.name.toLowerCase().includes(q) ||
          r.staff.branch.toLowerCase().includes(q) ||
          r.staff.roleLabel.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rank = (s?: string) => (s === "gap" ? 0 : s === "at_risk" ? 1 : s === "compliant" ? 2 : 3);
        return rank(a.audit?.status) - rank(b.audit?.status);
      });
  }, [data, query, statusFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!data) return <p className="text-muted-foreground">Gagal memuat data.</p>;

  const s = data.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard Risiko Kepatuhan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status kepatuhan seluruh pegawai garis depan dalam satu pandangan.
          </p>
        </div>
        <Link
          to="/audit"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <ClipboardList className="h-4 w-4" />
          Mulai Audit
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Sesuai" value={s.compliant} hint="Memenuhi standar" icon={<ShieldCheck className="h-5 w-5" />} tone="compliant" />
        <SummaryCard label="Berisiko" value={s.atRisk} hint="Perlu perhatian" icon={<AlertTriangle className="h-5 w-5" />} tone="at_risk" />
        <SummaryCard label="Temuan" value={s.gap} hint={`${s.totalGaps} gap perlu tindakan`} icon={<XCircle className="h-5 w-5" />} tone="gap" />
        <SummaryCard label="Total Pegawai" value={s.total} hint={`Rata-rata skor ${s.averageScore}`} icon={<Users className="h-5 w-5" />} tone="neutral" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Sebaran status kepatuhan</p>
        <StatusBar data={s} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Pegawai garis depan</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / cabang…"
                className="h-9 w-56 rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Semua status</option>
              <option value="gap">Temuan</option>
              <option value="at_risk">Berisiko</option>
              <option value="compliant">Sesuai</option>
              <option value="unaudited">Belum diaudit</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Pegawai</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Cabang</th>
                <th className="px-4 py-3 font-medium">Skor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Gap</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.staff._id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{r.staff.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.staff.roleLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.staff.branch}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {r.audit ? r.audit.score : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.audit ? (
                      <StatusBadge status={r.audit.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum diaudit</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.audit?.gapCount ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/audit/${r.staff._id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {r.audit ? "Audit ulang" : "Audit"}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Tidak ada pegawai yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
