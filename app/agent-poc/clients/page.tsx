import Link from 'next/link'
import { Plus, UploadCloud } from 'lucide-react'
import { initializeAgentDatabase, listProfileSummaries, openAgentDatabase } from '@/experiments/agent-worker/db'

export const dynamic = 'force-dynamic'

export default function AgentPocClientsPage() {
  const db = openAgentDatabase()

  try {
    initializeAgentDatabase(db)
    const profiles = listProfileSummaries(db)

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="rounded-[28px] border border-[#e7ddd2] bg-[#fffaf4] p-8 shadow-[0_24px_80px_rgba(55,31,18,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadac8] bg-white px-4 py-1 text-sm text-[#6f5748]">
                Agent POC · Local Clients
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#21150f]">先建客户，再上传录音</h1>
              <p className="text-sm leading-7 text-[#6a574a]">
                这条本地实验流先对齐主线的基本节奏：先建立一个草稿客户，再把每段录音归到该客户名下，后续 transcript
                和字段更新也都围绕这个客户展开。
              </p>
            </div>
            <Link
              href="/agent-poc/clients/new"
              className="inline-flex items-center rounded-full bg-[#24150f] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3a2418]"
            >
              <Plus className="mr-2 h-4 w-4" />
              新建草稿客户
            </Link>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#d8c8b9] bg-white px-8 py-14 text-center shadow-[0_16px_48px_rgba(49,30,18,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f8efe5] text-[#8a6447]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#241711]">先创建第一位草稿客户</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#6a574a]">
              当前本地数据库还没有客户。先填姓名、性别和联系方式，再进入该客户的录音上传页做转录测试。
            </p>
            <Link
              href="/agent-poc/clients/new"
              className="mt-6 inline-flex items-center rounded-full bg-[#24150f] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3a2418]"
            >
              去创建草稿客户
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {profiles.map((profile) => (
              <section
                key={profile.id}
                className="rounded-[24px] border border-[#eadfce] bg-white p-6 shadow-[0_16px_48px_rgba(49,30,18,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-[#241711]">{profile.name}</h2>
                    <div className="text-sm text-[#7b6557]">
                      <div>性别：{profile.gender === 'male' ? '男方' : profile.gender === 'female' ? '女方' : '未设置'}</div>
                      <div>联系方式：{profile.phone || '未填写'}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-[#eadac8] bg-[#fff8f1] px-3 py-1 text-xs text-[#7b6557]">
                    {profile.conversationCount} 段录音
                  </div>
                </div>

                <div className="mt-4 rounded-[18px] bg-[#f8f2ea] px-4 py-3 text-sm text-[#5c493d]">
                  <div>备注：{profile.note || '暂无备注'}</div>
                  <div className="mt-2 text-xs text-[#8c7464]">
                    最近录音：{profile.latestConversationAt ? new Date(profile.latestConversationAt).toLocaleString('zh-CN') : '还没有上传录音'}
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/agent-poc/clients/${profile.id}/audio-transcribe`}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-[#24150f] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3a2418]"
                  >
                    继续上传录音
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    )
  } finally {
    db.close()
  }
}
