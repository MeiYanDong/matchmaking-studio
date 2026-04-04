'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Bell, ChevronRight, Compass, ShieldCheck } from 'lucide-react'

type TopContextBarProps = {
  role: 'matchmaker' | 'admin'
  displayName: string
  unreadCount?: number
}

type RouteMeta = {
  title: string
  eyebrow: string
  description: string
}

function resolveRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/matchmaker/guide') || pathname.startsWith('/admin/guide')) {
    return {
      eyebrow: 'Product Guide',
      title: '产品说明',
      description: '用非技术语言解释系统在解决什么问题、核心工作流是什么，以及当前版本重点放在哪里。',
    }
  }

  if (pathname.startsWith('/matchmaker/clients/') && pathname.includes('/conversations/')) {
    return {
      eyebrow: 'Conversation Review',
      title: '录音处理工作台',
      description: '查看转录、AI 提取、异常确认与补问建议。',
    }
  }

  if (pathname.startsWith('/matchmaker/clients/')) {
    return {
      eyebrow: 'Client Workspace',
      title: '客户详情',
      description: '围绕客户当前状态、录音更新、匹配候选与跟进任务进行推进。',
    }
  }

  if (pathname.startsWith('/matchmaker/matches')) {
    return {
      eyebrow: 'Matching Desk',
      title: '匹配工作台',
      description: '优先处理已确认候选，再推进待确认补问候选。',
    }
  }

  if (pathname.startsWith('/matchmaker/reminders')) {
    return {
      eyebrow: 'Follow-up Queue',
      title: '提醒中心',
      description: '把待补问、待确认和长期未推进事项收束成工作列表。',
    }
  }

  if (pathname.startsWith('/matchmaker/clients')) {
    return {
      eyebrow: 'Client Desk',
      title: '我的客户',
      description: '录音优先建档，AI 自动入库，红娘只处理异常与推进动作。',
    }
  }

  if (pathname.startsWith('/admin/matches')) {
    return {
      eyebrow: 'Governance',
      title: '匹配治理',
      description: '查看敏感模式、待确认候选与匹配推进质量。',
    }
  }

  if (pathname.startsWith('/admin/matchmakers')) {
    return {
      eyebrow: 'Team',
      title: '红娘管理',
      description: '管理团队、分配客户与监督补问完成质量。',
    }
  }

  if (pathname.startsWith('/admin/clients')) {
    return {
      eyebrow: 'Data Governance',
      title: '客户治理',
      description: '从字段完整度、敏感模式和异常记录观察客户资产质量。',
    }
  }

  return {
    eyebrow: 'Overview',
    title: '总览看板',
    description: '从字段质量、待确认积压和撮合推进漏斗管理整个平台。',
  }
}

function formatToday() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

export function TopContextBar({
  role,
  displayName,
  unreadCount = 0,
}: TopContextBarProps) {
  const pathname = usePathname()
  const meta = resolveRouteMeta(pathname)
  const roleLabel = role === 'admin' ? '管理视角' : '红娘视角'
  const reminderHref = role === 'admin' ? '/admin/dashboard' : '/matchmaker/reminders'

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[linear-gradient(180deg,rgba(252,248,241,0.98),rgba(252,248,241,0.94))] supports-backdrop-filter:backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-5 px-4 py-4 xl:px-8">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#8e6e54]">
            <Compass className="h-3.5 w-3.5" />
            <span>{meta.eyebrow}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            <span>{roleLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl leading-tight text-[#231815]">{meta.title}</h1>
            <Badge className="border border-[#d8c7b6] bg-white/80 px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] text-[#7a5744]">
              {displayName}
            </Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6c5a4d]">{meta.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden rounded-[22px] border border-[#e5d8c6] bg-white/80 px-4 py-3 text-right shadow-[0_18px_40px_-34px_rgba(35,24,21,0.4)] lg:block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8e6e54]">Today</div>
            <div className="mt-1 text-sm font-medium text-[#2d221c]">{formatToday()}</div>
          </div>

          <Link
            href={reminderHref}
            className="group flex items-center gap-3 rounded-[22px] border border-[#e5d8c6] bg-white/90 px-4 py-3 text-sm text-[#2d221c] shadow-[0_18px_40px_-34px_rgba(35,24,21,0.4)] transition-all hover:-translate-y-0.5 hover:border-[#d6b49b]"
          >
            {role === 'admin' ? <ShieldCheck className="h-4 w-4 text-[#8f3c32]" /> : <Bell className="h-4 w-4 text-[#8f3c32]" />}
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8e6e54]">
                {role === 'admin' ? 'Admin View' : 'Unread'}
              </div>
              <div className="mt-0.5 flex items-center gap-2 font-medium text-[#2d221c]">
                <span>{role === 'admin' ? '治理入口' : `${unreadCount} 条待处理提醒`}</span>
                <span className="text-[#b78963] transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
