import type { AuditStatus } from "~/lib/amanah";
import { scoreColorVar } from "./status";

interface ScoreRingProps {
  score: number;
  status: AuditStatus;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/**
 * Audit-grade compliance score ring. Tabular numerals, status-colored arc.
 */
export function ScoreRing({ score, status, size = 132, strokeWidth = 10, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color = scoreColorVar(status);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums tracking-tight text-foreground"
          style={{ fontSize: size * 0.28, lineHeight: 1 }}
        >
          {clamped}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label ?? "Skor"}</span>
      </div>
    </div>
  );
}
