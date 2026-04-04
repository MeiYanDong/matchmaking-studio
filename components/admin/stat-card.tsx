interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'pink' | 'purple' | 'rose' | 'green' | 'orange'
  subtitle?: string
}

const colorMap = {
  blue: 'border-[#d9e0e8] bg-[linear-gradient(180deg,#ffffff,#f6f8fb)]',
  pink: 'border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfb,#faf4ef)]',
  purple: 'border-[#ddd8e7] bg-[linear-gradient(180deg,#ffffff,#f7f5fb)]',
  rose: 'border-[#e6d2c6] bg-[linear-gradient(180deg,#fffdfb,#fbf3ec)]',
  green: 'border-[#d8e5dc] bg-[linear-gradient(180deg,#ffffff,#f5faf6)]',
  orange: 'border-[#ebdcc8] bg-[linear-gradient(180deg,#fffcf8,#faf3ea)]',
}

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_18px_42px_-34px_rgba(35,24,21,0.22)] ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[#5e4c40]">{title}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-3xl text-[#231815]">{displayValue}</span>
        {subtitle && <span className="text-sm text-[#7b685b]">{subtitle}</span>}
      </div>
    </div>
  )
}
