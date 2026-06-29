import { useEffect, useState } from "react";
import { Info, ListChecks } from "lucide-react";
import { AppShell } from "~/components/amanah/app-shell";
import { ScoreRing } from "~/components/amanah/score-ring";
import { StatusBadge, OutcomeBadge, SeverityTag } from "~/components/amanah/status";
import { fetchSelf, type Audit, type Staff } from "~/lib/amanah";

export default function MeRoute() {
  return (
    <AppShell requireRole={["staff"]}>
      <SelfView />
    </AppShell>
  );
}

function SelfView() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSelf()
      .then((res) => {
        if (res.success && res.data) {
          setStaff(res.data.staff);
          setAudit(res.data.audit);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const gaps = audit?.items.filter((i) => i.isGap) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Skor Kepatuhan Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {staff ? `${staff.name} · ${staff.roleLabel} · ${staff.branch}` : "Pegawai garis depan"}
        </p>
      </div>

      {!audit ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <Info className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">Belum ada audit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Skor kepatuhan Anda akan muncul di sini setelah audit pertama selesai.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 shadow-sm sm:flex-row sm:justify-between">
            <div className="flex items-center gap-6">
              <ScoreRing score={audit.score} status={audit.status} label="Skor Kepatuhan" />
              <div>
                <StatusBadge status={audit.status} />
                <p className="mt-3 text-sm text-muted-foreground">
                  Audit terakhir
                  <br />
                  <span className="font-medium text-foreground">
                    {new Date(audit.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gaps.length === 0
                    ? "Tidak ada temuan — pertahankan!"
                    : `${gaps.length} poin perbaikan`}
                </p>
              </div>
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <ListChecks className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Poin perbaikan</h2>
              </div>
              <div className="divide-y divide-border/60">
                {gaps.map((g) => (
                  <div key={g.criterionId} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{g.name}</p>
                      <SeverityTag severity={g.severity} />
                      <OutcomeBadge outcome={g.outcome} />
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{g.category}</p>
                    {g.note && <p className="mt-2 text-sm text-muted-foreground">{g.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {audit.notes && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Catatan auditor</h2>
              <p className="mt-2 text-sm text-muted-foreground">{audit.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
