'use client';

// Phần dùng chung cho các biểu đồ recharts trong khu Admin.
export const AXIS_PROPS = {
  stroke: 'var(--border)',
  tick: { fill: 'var(--muted-foreground)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const SERIES = {
  dau: 'var(--primary)',
  wau: '#f59e0b',
  mau: '#94a3b8',
  activities: 'var(--primary)',
} as const;

export interface TooltipRow {
  name: string;
  value: string;
  color: string;
}

export function ChartTooltip({
  label,
  rows,
}: {
  label: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <p key={row.name} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function DeltaText({ value, suffix }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-xs text-success' : 'text-xs text-destructive'}>
      {positive ? '+' : ''}
      {value.toFixed(1)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}
