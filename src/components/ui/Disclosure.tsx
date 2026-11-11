export default function Disclosure({ title, children, defaultOpen = false }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-sand bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-dim transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-sand px-4 py-3 text-sm leading-relaxed">{children}</div>
    </details>
  )
}
