import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AgentPocNewClientForm } from '@/components/agent-poc/new-client-form'

export default function AgentPocNewClientPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <Link
        href="/agent-poc/clients"
        className="inline-flex w-fit items-center gap-2 text-sm text-[#7b6557] hover:text-[#241711]"
      >
        <ChevronLeft className="h-4 w-4" />
        返回本地客户列表
      </Link>

      <div className="rounded-[28px] border border-[#e7ddd2] bg-[#fffaf4] p-8 shadow-[0_24px_80px_rgba(55,31,18,0.08)]">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadac8] bg-white px-4 py-1 text-sm text-[#6f5748]">
            Agent POC · Draft Client
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#21150f]">先创建草稿客户，再上传第一段录音</h1>
          <p className="text-sm leading-7 text-[#6a574a]">
            这条本地支线先沿用主线思路：先有客户，再有录音。先填最少上下文，再让后续 transcript 和 Agent
            结果都稳定挂到这个客户下面。
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#eadfce] bg-white p-6 shadow-[0_16px_48px_rgba(49,30,18,0.06)]">
        <AgentPocNewClientForm />
      </div>
    </div>
  )
}
