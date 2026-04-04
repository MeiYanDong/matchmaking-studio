interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'pink' | 'purple' | 'rose' | 'green' | 'orange'
  subtitle?: string
}

const colorMap = {
  blue: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#f5f8ff)]',
  pink: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#fbf7fb)]',
  purple: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#f7f7fd)]',
  rose: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#fbf8f7)]',
  green: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#f6faf8)]',
  orange: 'border-border/80 bg-[linear-gradient(180deg,#ffffff,#faf8f4)]',
}

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.14)] ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-foreground/75">{title}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-3xl text-foreground">{displayValue}</span>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  )
}
