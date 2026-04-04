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
      className="block rounded-[1.45rem] border border-border/80 bg-[color:var(--surface-soft-strong)] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/15 hover:bg-[color:var(--surface-contrast)] hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
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
    <aside className="hidden w-[304px] shrink-0 border-l border-border/70 bg-[color:var(--surface-panel)] px-5 py-6 2xl:block">
      <div className="sticky top-[106px] space-y-4">
        <section className="rounded-[1.75rem] border border-white/90 bg-[color:var(--surface-soft-strong)] p-5 text-foreground shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/80" />
            <span>{isMatchmaker ? 'Private Desk' : 'Control Room'}</span>
          </div>
          <p className="mt-3 font-heading text-2xl leading-tight">{displayName}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isMatchmaker
              ? '今天优先处理待确认候选、缺口补问与最新录音带来的字段更新。'
              : '先看字段完整度、待确认积压和敏感模式候选，再处理团队工作负载。'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Badge className="border border-primary/10 bg-primary/8 px-2.5 py-1 text-[11px] tracking-[0.12em] text-primary">
              {isMatchmaker ? '红娘工作台' : '管理总览'}
            </Badge>
            <Badge className="border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] tracking-[0.12em] text-muted-foreground">
              {isMatchmaker ? `${unreadCount} 条提醒` : '字段治理'}
            </Badge>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-border/80 bg-[color:var(--surface-soft)] p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Work Rhythm</div>
          <ol className="mt-4 space-y-3">
            {[
              '上传录音，优先让 AI 自动建档或增量更新。',
              '只处理异常、低置信度和敏感确认，不做整页表单录入。',
              '根据待补问与待确认候选继续线下推进，系统自动重跑匹配。',
            ].map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-foreground/80">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/8 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Quick Access</div>
          {isMatchmaker ? (
            <>
              <QuickLink href="/matchmaker/clients" icon={<Users className="h-4 w-4 text-primary" />} label="客户档案" helper="查看最新录音更新、字段缺口与客户当前状态。" />
              <QuickLink href="/matchmaker/matches" icon={<HeartHandshake className="h-4 w-4 text-primary" />} label="匹配工作台" helper="优先推进已确认候选，再补问待确认候选。" />
              <QuickLink href="/matchmaker/reminders" icon={<Bell className="h-4 w-4 text-primary" />} label="提醒中心" helper="把待补问、待确认和久未推进事项收成工作列表。" />
            </>
          ) : (
            <>
              <QuickLink href="/admin/dashboard" icon={<Sparkles className="h-4 w-4 text-primary" />} label="治理总览" helper="观察字段完整度、漏斗与敏感模式候选积压。" />
              <QuickLink href="/admin/clients" icon={<Users className="h-4 w-4 text-primary" />} label="客户治理" helper="按字段质量、敏感模式和失败记录筛选客户资产。" />
              <QuickLink href="/admin/matches" icon={<NotebookPen className="h-4 w-4 text-primary" />} label="匹配治理" helper="按推荐类型、推进状态与异常原因查看整体质量。" />
            </>
          )}
        </section>

        {isMatchmaker && pathname.startsWith('/matchmaker/clients') && (
          <section className="rounded-[1.6rem] border border-border/80 bg-[linear-gradient(160deg,rgba(230,235,255,0.86),rgba(255,255,255,0.98))] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mic className="h-4 w-4 text-primary" />
              <span>录音优先策略</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              能先上传录音，就不要先填大表单。让 AI 先抽事实、找缺口、给补问，再由红娘推进。
            </p>
          </section>
        )}
      </div>
    </aside>
  )
}
