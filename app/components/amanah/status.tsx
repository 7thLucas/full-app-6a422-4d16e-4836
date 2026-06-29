import { cn } from "~/lib/utils";
import type { AuditStatus, Outcome } from "~/lib/amanah";
import { STATUS_LABEL, OUTCOME_LABEL, SEVERITY_LABEL } from "~/lib/amanah";

const STATUS_STYLES: Record<AuditStatus, string> = {
  compliant: "bg-chart-1/10 text-chart-1 ring-chart-1/25",
  at_risk: "bg-chart-2/10 text-chart-2 ring-chart-2/25",
  gap: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function StatusBadge({ status, className }: { status: AuditStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const OUTCOME_STYLES: Record<Outcome, string> = {
  pass: "bg-chart-1/10 text-chart-1 ring-chart-1/25",
  partial: "bg-chart-2/10 text-chart-2 ring-chart-2/25",
  fail: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        OUTCOME_STYLES[outcome],
      )}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-chart-2/10 text-chart-2",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

export function SeverityTag({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low,
      )}
    >
      {SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}

export function statusFromScore(
  score: number,
  compliant: number,
  atRisk: number,
): AuditStatus {
  if (score >= compliant) return "compliant";
  if (score >= atRisk) return "at_risk";
  return "gap";
}

export function scoreColorVar(status: AuditStatus): string {
  if (status === "compliant") return "var(--chart-1)";
  if (status === "at_risk") return "var(--chart-2)";
  return "var(--destructive)";
}
