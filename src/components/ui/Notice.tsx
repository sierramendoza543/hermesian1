import { AlertTriangle, Info } from 'lucide-react'

export default function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'error'
  title?: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-line bg-white text-ink'
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
