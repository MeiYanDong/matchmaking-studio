import { DiscoverClient } from '@/components/user/discover-client'

export default function UserDiscoverPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI 筛选对象</h1>
        <p className="text-sm text-gray-500 mt-1">支持自然语言描述和条件筛选两种方式。</p>
      </div>
      <DiscoverClient />
    </div>
  )
}
