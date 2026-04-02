import { NewClientForm } from '@/components/client/new-client-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link href="/matchmaker/clients" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ChevronLeft className="w-4 h-4" />
        返回客户列表
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">新增客户</h1>
      <p className="text-gray-500 text-sm mb-6">
        先创建最少上下文的草稿客户，再上传第一段录音，让 AI 自动补齐大部分字段
      </p>
      <NewClientForm />
    </div>
  )
}
