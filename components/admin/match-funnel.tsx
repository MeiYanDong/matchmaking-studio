interface FunnelData {
  label: string
  count: number
  color: string
}

interface MatchFunnelProps {
  data: FunnelData[]
}

export function MatchFunnel({ data }: MatchFunnelProps) {
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = (item.count / max) * 100
        const convRate = i > 0 && data[i - 1].count > 0
          ? Math.round((item.count / data[i - 1].count) * 100)
          : null
        return (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-16 text-right text-sm text-gray-500 shrink-0">{item.label}</div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                >
                  <span className="text-white text-xs font-bold">{item.count}</span>
                </div>
              </div>
            </div>
            {convRate !== null && (
              <div className="w-16 text-xs text-gray-400 shrink-0">↓ {convRate}%</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
