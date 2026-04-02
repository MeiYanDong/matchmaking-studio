interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'pink' | 'purple' | 'rose' | 'green' | 'orange'
  subtitle?: string
}

const colorMap = {
  blue: 'bg-blue-50 border-blue-100',
  pink: 'bg-pink-50 border-pink-100',
  purple: 'bg-purple-50 border-purple-100',
  rose: 'bg-rose-50 border-rose-100',
  green: 'bg-green-50 border-green-100',
  orange: 'bg-orange-50 border-orange-100',
}

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{displayValue}</span>
        {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
      </div>
    </div>
  )
}
