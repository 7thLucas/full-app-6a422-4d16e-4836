import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, ChevronRight, ClipboardCheck } from "lucide-react";
import { AppShell } from "~/components/amanah/app-shell";
import { fetchStaff, type Staff } from "~/lib/amanah";

export default function AuditIndexRoute() {
  return (
    <AppShell requireRole={["officer", "manager"]}>
      <AuditPicker />
    </AppShell>
  );
}

function AuditPicker() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");

  useEffect(() => {
    fetchStaff()
      .then((res) => res.success && res.data && setStaff(res.data))
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => Array.from(new Set(staff.map((s) => s.roleKey))), [staff]);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (role !== "all" && s.roleKey !== role) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q);
    });
  }, [staff, query, role]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit Pegawai</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih pegawai garis depan untuk memulai audit kepatuhan sesuai perannya.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau cabang…"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Semua peran</option>
          {roles.map((r) => {
            const label = staff.find((s) => s.roleKey === r)?.roleLabel ?? r;
            return (
              <option key={r} value={r}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <Link
              key={s._id}
              to={`/audit/${s._id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {s.name.slice(0, 1)}
                </span>
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.roleLabel} · {s.branch}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                <ClipboardCheck className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Tidak ada pegawai yang cocok.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
