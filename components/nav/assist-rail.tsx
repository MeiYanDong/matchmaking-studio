'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Bell, HeartHandshake, Mic, NotebookPen, Sparkles, Users } from 'lucide-react'

type AssistRailProps = {
  role: 'matchmaker' | 'admin'
  displayName: string
  unreadCount?: number
}

function QuickLink({
  href,
  icon,
  label,
  helper,
}: {
  href: string
  icon: React.ReactNode
  label: string
  helper: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-[22px] border border-[#eadfce] bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-[#d8c1ae] hover:shadow-[0_18px_40px_-34px_rgba(35,24,21,0.35)]"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[#241913]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6f5d51]">{helper}</p>
    </Link>
  )
}

export function AssistRail({
  role,
  displayName,
  unreadCount = 0,
}: AssistRailProps) {
  const pathname = usePathname()
  const isMatchmaker = role === 'matchmaker'

  return (
    <aside className="hidden w-[292px] shrink-0 border-l border-black/5 bg-[linear-gradient(180deg,rgba(250,245,238,0.72),rgba(255,255,255,0.96))] px-5 py-6 2xl:block">
      <div className="sticky top-[106px] space-y-4">
        <section className="rounded-[28px] border border-[#d8c7b6] bg-[#221815] p-5 text-[#f5ece3] shadow-[0_28px_64px_-42px_rgba(35,24,21,0.8)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#cdb49c]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isMatchmaker ? 'Private Desk' : 'Control Room'}</span>
          </div>
          <p className="mt-3 font-heading text-2xl leading-tight">{displayName}</p>
          <p className="mt-2 text-sm leading-6 text-[#d7c7b8]">
            {isMatchmaker
              ? '今天优先处理待确认候选、缺口补问与最新录音带来的字段更新。'
              : '先看字段完整度、待确认积压和敏感模式候选，再处理团队工作负载。'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Badge className="border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] tracking-[0.12em] text-[#f5ece3]">
              {isMatchmaker ? '红娘工作台' : '管理总览'}
            </Badge>
            <Badge className="border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] tracking-[0.12em] text-[#f5ece3]">
              {isMatchmaker ? `${unreadCount} 条提醒` : '字段治理'}
            </Badge>
          </div>
        </section>

        <section className="rounded-[26px] border border-[#eadfce] bg-white/80 p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8e6e54]">Work Rhythm</div>
          <ol className="mt-4 space-y-3">
            {[
              '上传录音，优先让 AI 自动建档或增量更新。',
              '只处理异常、低置信度和敏感确认，不做整页表单录入。',
              '根据待补问与待确认候选继续线下推进，系统自动重跑匹配。',
            ].map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[#4d3c31]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#dbc8b7] bg-[#f8f1e8] text-xs font-medium text-[#7d5d49]">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8e6e54]">Quick Access</div>
          {isMatchmaker ? (
            <>
              <QuickLink href="/matchmaker/clients" icon={<Users className="h-4 w-4 text-[#8f3c32]" />} label="客户档案" helper="查看最新录音更新、字段缺口与客户当前状态。" />
              <QuickLink href="/matchmaker/matches" icon={<HeartHandshake className="h-4 w-4 text-[#8f3c32]" />} label="匹配工作台" helper="优先推进已确认候选，再补问待确认候选。" />
              <QuickLink href="/matchmaker/reminders" icon={<Bell className="h-4 w-4 text-[#8f3c32]" />} label="提醒中心" helper="把待补问、待确认和久未推进事项收成工作列表。" />
            </>
          ) : (
            <>
              <QuickLink href="/admin/dashboard" icon={<Sparkles className="h-4 w-4 text-[#8f3c32]" />} label="治理总览" helper="观察字段完整度、漏斗与敏感模式候选积压。" />
              <QuickLink href="/admin/clients" icon={<Users className="h-4 w-4 text-[#8f3c32]" />} label="客户治理" helper="按字段质量、敏感模式和失败记录筛选客户资产。" />
              <QuickLink href="/admin/matches" icon={<NotebookPen className="h-4 w-4 text-[#8f3c32]" />} label="匹配治理" helper="按推荐类型、推进状态与异常原因查看整体质量。" />
            </>
          )}
        </section>

        {isMatchmaker && pathname.startsWith('/matchmaker/clients') && (
          <section className="rounded-[26px] border border-[#eadfce] bg-[linear-gradient(160deg,rgba(255,247,237,0.9),rgba(255,255,255,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#251a14]">
              <Mic className="h-4 w-4 text-[#8f3c32]" />
              <span>录音优先策略</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6f5d51]">
              能先上传录音，就不要先填大表单。让 AI 先抽事实、找缺口、给补问，再由红娘推进。
            </p>
          </section>
        )}
      </div>
    </aside>
  )
}
