import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Check, MinusCircle, X, CheckCircle2 } from "lucide-react";
import { AppShell } from "~/components/amanah/app-shell";
import { ScoreRing } from "~/components/amanah/score-ring";
import { SeverityTag, statusFromScore, StatusBadge } from "~/components/amanah/status";
import { useConfigurables } from "~/modules/configurables";
import {
  fetchChecklist,
  submitAudit,
  type Checklist,
  type Staff,
  type Criterion,
  type Outcome,
} from "~/lib/amanah";
import { cn } from "~/lib/utils";

const OUTCOME_FRACTION: Record<Outcome, number> = { pass: 1, partial: 0.5, fail: 0 };

export default function AuditDetailRoute() {
  return (
    <AppShell requireRole={["officer", "manager"]}>
      <AuditDetail />
    </AppShell>
  );
}

interface RowState {
  outcome: Outcome;
  note: string;
}

function AuditDetail() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const { config } = useConfigurables();

  const compliantThreshold = config?.compliantThreshold ?? 85;
  const atRiskThreshold = config?.atRiskThreshold ?? 70;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    fetchChecklist(staffId)
      .then((res) => {
        if (res.success && res.data) {
          setStaff(res.data.staff);
          setChecklist(res.data.checklist);
          const initial: Record<string, RowState> = {};
          for (const c of res.data.checklist.criteria) {
            initial[c.id] = { outcome: "pass", note: "" };
          }
          setRows(initial);
        } else {
          setError(res.message ?? "Gagal memuat checklist.");
        }
      })
      .catch(() => setError("Gagal memuat checklist."))
      .finally(() => setLoading(false));
  }, [staffId]);

  const criteria = checklist?.criteria ?? [];

  const { score, status, gapCount } = useMemo(() => {
    const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) || 1;
    let earned = 0;
    let gaps = 0;
    let criticalFail = false;
    for (const c of criteria) {
      const st = rows[c.id]?.outcome ?? "fail";
      earned += (Number(c.weight) || 0) * OUTCOME_FRACTION[st];
      if (st !== "pass") gaps += 1;
      if (st === "fail" && (c.severity === "critical" || c.autoFailIfMissing)) criticalFail = true;
    }
    let sc = Math.round((earned / totalWeight) * 100);
    sc = Math.max(0, Math.min(100, sc));
    let stt = statusFromScore(sc, compliantThreshold, atRiskThreshold);
    if (criticalFail && stt === "compliant") stt = "at_risk";
    return { score: sc, status: stt, gapCount: gaps };
  }, [criteria, rows, compliantThreshold, atRiskThreshold]);

  // Group criteria by category for an audit-grade checklist layout.
  const grouped = useMemo(() => {
    const map = new Map<string, Criterion[]>();
    for (const c of criteria) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return Array.from(map.entries());
  }, [criteria]);

  function setOutcome(id: string, outcome: Outcome) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], outcome } }));
  }
  function setNote(id: string, note: string) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }

  async function handleSubmit() {
    if (!staffId) return;
    setSubmitting(true);
    setError(null);
    const res = await submitAudit({
      staffId,
      items: criteria.map((c) => ({
        criterionId: c.id,
        outcome: rows[c.id]?.outcome ?? "fail",
        note: rows[c.id]?.note ?? "",
      })),
      notes,
      compliantThreshold,
      atRiskThreshold,
    });
    setSubmitting(false);
    if (res.success) {
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } else {
      setError(res.message ?? "Gagal menyimpan audit.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (error && !checklist) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <p className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackLink />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Checklist */}
        <div className="space-y-5 lg:order-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{staff?.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {staff?.roleLabel} · {staff?.branch}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{checklist?.rules}</p>
          </div>

          {grouped.map(([category, items]) => (
            <div key={category} className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              </div>
              <div className="divide-y divide-border/60">
                {items.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{c.name}</p>
                          <SeverityTag severity={c.severity} />
                          <span className="text-xs text-muted-foreground">bobot {c.weight}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{c.passCriteria}</p>
                      </div>
                      <OutcomeToggle value={rows[c.id]?.outcome ?? "pass"} onChange={(o) => setOutcome(c.id, o)} />
                    </div>
                    {(rows[c.id]?.outcome ?? "pass") !== "pass" && (
                      <input
                        value={rows[c.id]?.note ?? ""}
                        onChange={(e) => setNote(c.id, e.target.value)}
                        placeholder="Catatan temuan / tindak lanjut…"
                        className="mt-3 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <label className="text-sm font-medium text-foreground">Catatan audit (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ringkasan temuan atau konteks audit…"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Live score summary (sticky) */}
        <div className="lg:order-2">
          <div className="sticky top-20 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col items-center">
              <ScoreRing score={score} status={status} label="Skor Kepatuhan" />
              <div className="mt-3">
                <StatusBadge status={status} />
              </div>
            </div>

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Item dinilai</dt>
                <dd className="font-medium tabular-nums text-foreground">{criteria.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Temuan / gap</dt>
                <dd className="font-medium tabular-nums text-destructive">{gapCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ambang sesuai</dt>
                <dd className="font-medium tabular-nums text-foreground">≥ {compliantThreshold}</dd>
              </div>
            </dl>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || done}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors",
                done
                  ? "bg-chart-1 text-primary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60",
              )}
            >
              {done ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Audit tersimpan
                </>
              ) : submitting ? (
                "Menyimpan…"
              ) : (
                "Simpan & Nilai Audit"
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Skor dihitung otomatis dari penilaian tiap item.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutcomeToggle({ value, onChange }: { value: Outcome; onChange: (o: Outcome) => void }) {
  const opts: { key: Outcome; label: string; icon: React.ReactNode; active: string }[] = [
    { key: "pass", label: "Sesuai", icon: <Check className="h-4 w-4" />, active: "bg-chart-1 text-primary-foreground" },
    { key: "partial", label: "Sebagian", icon: <MinusCircle className="h-4 w-4" />, active: "bg-chart-2 text-primary-foreground" },
    { key: "fail", label: "Gagal", icon: <X className="h-4 w-4" />, active: "bg-destructive text-destructive-foreground" },
  ];
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
            value === o.key ? o.active : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {o.icon}
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/audit" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      Kembali ke daftar pegawai
    </Link>
  );
}
