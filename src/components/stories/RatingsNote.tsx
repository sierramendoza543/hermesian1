import { OUTLET_DISCLAIMER } from '@/lib/outlets'

export default function RatingsNote() {
  return (
    <details className="group mt-3 text-xs text-dim">
      <summary className="cursor-pointer list-none font-medium hover:text-charcoal [&::-webkit-details-marker]:hidden">
        ⓘ About these ratings
      </summary>
      <p className="mt-1.5 max-w-xl leading-relaxed">{OUTLET_DISCLAIMER}</p>
    </details>
  )
}
