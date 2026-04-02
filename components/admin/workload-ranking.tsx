interface WorkloadRow {
  id: string
  name: string
  clientCount: number
  activeMatchCount: number
  successCount: number
  followupCompletionRate?: number
}

export function WorkloadRanking({ rows }: { rows: WorkloadRow[] }) {
  if (!rows.length) {
    return <div className="text-sm text-gray-400 py-8 text-center">暂无红娘数据</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">红娘</th>
            <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">客户数</th>
            <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">活跃匹配</th>
            <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">成功匹配</th>
            <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">补问完成率</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{row.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-700">{row.clientCount}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{row.activeMatchCount}</td>
              <td className="py-3 px-4 text-sm text-green-600 font-medium">{row.successCount}</td>
              <td className="py-3 px-4 text-sm text-gray-700">
                {row.followupCompletionRate === undefined ? '-' : `${row.followupCompletionRate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
