import { BUCKET_META, BUCKET_ORDER, leanColor, leanLabel } from '@/lib/outlets'
import { signed } from '@/lib/format'

const CX = 150
const CY = 150
const R = 112

const pt = (lean: number, r = R) => {
  const theta = ((180 - ((lean + 100) / 200) * 180) * Math.PI) / 180
  return { x: CX + r * Math.cos(theta), y: CY - r * Math.sin(theta) }
}

const arc = (a: number, b: number) => {
  const p1 = pt(a)
  const p2 = pt(b)
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
}

export default function LeanGauge({
  lean,
  confidence,
  outletLean,
  outletName,
}: {
  lean: number
  confidence?: number
  outletLean?: number | null
  outletName?: string
}) {
  const tip = pt(lean, R - 18)
  const out = outletLean !== null && outletLean !== undefined ? pt(outletLean, R + 20) : null

  return (
    <div className="mx-auto w-full max-w-sm">
      <svg viewBox="0 0 300 190" role="img" aria-label={`Lean score ${signed(lean)}, ${leanLabel(lean)}`}>
        {BUCKET_ORDER.map((b) => (
          <path
            key={b}
            d={arc(BUCKET_META[b].range[0] + (b === 'left' ? 0 : 1.2), BUCKET_META[b].range[1] - (b === 'right' ? 0 : 1.2))}
            stroke={BUCKET_META[b].color}
            strokeWidth="22"
            fill="none"
            opacity={b === leanBucketKey(lean) ? 1 : 0.35}
          />
        ))}
        {out && (
          <g>
            <circle cx={out.x} cy={out.y} r="6" fill="#1c1620" stroke="white" strokeWidth="2" />
          </g>
        )}
        <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="#1c1620" strokeWidth="4" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="9" fill="#1c1620" />
        <text x="30" y="178" fontSize="11" textAnchor="middle" fill="#6b6270" fontFamily="ui-monospace,monospace">LEFT</text>
        <text x="270" y="178" fontSize="11" textAnchor="middle" fill="#6b6270" fontFamily="ui-monospace,monospace">RIGHT</text>
      </svg>
      <div className="-mt-10 text-center">
        <div className="font-headline text-5xl font-black tabular-nums" style={{ color: leanColor(lean) }}>
          {signed(lean)}
        </div>
        <div className="mt-1 text-sm font-semibold">{leanLabel(lean)} framing</div>
        {confidence !== undefined && <div className="label-mono mt-1">{confidence}% model confidence</div>}
        {out && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-dim">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-charcoal shadow" />
            {outletName} typical rating: {signed(outletLean as number)}
          </div>
        )}
      </div>
    </div>
  )
}

function leanBucketKey(lean: number) {
  if (lean <= -60) return 'left'
  if (lean < -20) return 'lean-left'
  if (lean <= 20) return 'center'
  if (lean < 60) return 'lean-right'
  return 'right'
}
