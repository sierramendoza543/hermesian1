export default function ScoreBar({
  label,
  value,
  min = 0,
  max = 100,
  hint,
  goodHigh,
  bipolar = false,
}: {
  label: string
  value: number
  min?: number
  max?: number
  hint: string
  /** true = high is good (green), false = high is a warning (red), undefined = neutral */
  goodHigh?: boolean
  bipolar?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  const intensity = bipolar ? Math.abs(value) / Math.max(Math.abs(min), Math.abs(max)) : (value - min) / (max - min)
  const color =
    goodHigh === undefined
      ? '#966c6b'
      : (goodHigh ? intensity : 1 - intensity) > 0.6
      ? '#059669'
      : (goodHigh ? intensity : 1 - intensity) > 0.35
      ? '#d97706'
      : '#dc2626'
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <span className="label-mono">{label}</span>
        <span className="font-headline text-2xl font-black tabular-nums">{value > 0 && bipolar ? `+${value}` : value}</span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-line">
        {bipolar ? (
          <>
            <span className="absolute left-1/2 top-0 h-2 w-px bg-ink/30" />
            <span
              className="absolute top-0 h-2 rounded-full"
              style={{
                background: color,
                left: pct >= 50 ? '50%' : `${pct}%`,
                width: `${Math.abs(pct - 50)}%`,
              }}
            />
          </>
        ) : (
          <span className="absolute left-0 top-0 h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
        )}
      </div>
      <p className="mt-2 text-xs leading-snug text-muted">{hint}</p>
    </div>
  )
}
