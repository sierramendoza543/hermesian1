'use client'

export interface TabDef<T extends string> {
  key: T
  label: string
  count?: number
}

export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabDef<T>[]
  value: T
  onChange: (key: T) => void
}) {
  return (
    <div role="tablist" className="no-print -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-hide">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            value === t.key ? 'bg-charcoal text-white shadow-card' : 'text-charcoal/70 hover:bg-accent/60 hover:text-charcoal'
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${value === t.key ? 'bg-white/20' : 'bg-sand'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
