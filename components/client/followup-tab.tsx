'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, Link2, Sparkles, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MATCH_STATUS_LABELS } from '@/types/app'
import { FollowupTask, Match, Profile } from '@/types/database'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getFieldDisplayLabel, humanizeAIText } from '@/lib/ai/field-presentation'

interface FollowupTabProps {
  matches: (Match & { male_profile: Profile; female_profile: Profile })[]
  tasks: FollowupTask[]
}

const statusColor: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  reviewing: 'bg-blue-100 text-blue-600',
  contacted_male: 'bg-cyan-100 text-cyan-600',
  contacted_female: 'bg-pink-100 text-pink-600',
  both_agreed: 'bg-purple-100 text-purple-600',
  meeting_scheduled: 'bg-orange-100 text-orange-600',
  met: 'bg-yellow-100 text-yellow-600',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  dismissed: 'bg-gray-100 text-gray-400',
}

const priorityTone: Record<string, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
}

const taskTypeLabel: Record<string, string> = {
  missing_field: '字段补问',
  sensitive_confirmation: '敏感确认',
  verification: '信息核验',
  relationship_followup: '关系跟进',
}

export function FollowupTab({ matches, tasks }: FollowupTabProps) {
  const router = useRouter()
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const openTasks = tasks.filter((task) => task.status === 'open' || task.status === 'in_progress')
  const closedTasks = tasks.filter((task) => task.status === 'done' || task.status === 'dismissed')

  async function updateTaskStatus(taskId: string, status: FollowupTask['status']) {
    setUpdatingTaskId(taskId)
    try {
      const supabase = createClient()
      const payload = status === 'done'
        ? { status, completed_at: new Date().toISOString() }
        : { status, completed_at: null }

      const { error } = await supabase.from('followup_tasks').update(payload).eq('id', taskId)
      if (error) throw error

      toast.success(status === 'done' ? '任务已完成' : '任务已忽略')
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message || '更新失败')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const timelineMatches = [...matches].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-900">待补问任务</h3>
          <Badge variant="outline" className="ml-auto">
            {openTasks.length} 项未完成
          </Badge>
        </div>

        {!openTasks.length ? (
          <p className="text-sm text-gray-400">当前没有待补问任务，AI 已经把需要继续确认的事项清空了。</p>
        ) : (
          <div className="space-y-3">
            {openTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={priorityTone[task.priority]}>
                    {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    {taskTypeLabel[task.task_type] ?? task.task_type}
                  </Badge>
                  <span className="text-xs text-gray-400 ml-auto">
                    更新于 {format(new Date(task.updated_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                  </span>
                </div>

                {task.rationale && (
                  <p className="mt-3 text-sm text-gray-700">{humanizeAIText(task.rationale)}</p>
                )}

                {!!task.field_keys?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.field_keys.map((fieldKey) => (
                      <Badge key={fieldKey} variant="outline" className="bg-white text-gray-600">
                        {getFieldDisplayLabel(fieldKey)}
                      </Badge>
                    ))}
                  </div>
                )}

                {!!task.question_list?.length && (
                  <div className="mt-3 space-y-2">
                    {task.question_list.map((question) => (
                      <div key={question} className="rounded-lg bg-white/90 p-3 text-sm text-gray-700">
                        {question}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {task.match_id ? (
                    <Link href={`/matchmaker/matches/${task.match_id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        查看匹配
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={updatingTaskId === task.id}
                    onClick={() => updateTaskStatus(task.id, 'done')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    已完成补问
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500"
                    disabled={updatingTaskId === task.id}
                    onClick={() => updateTaskStatus(task.id, 'dismissed')}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    暂不处理
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!!closedTasks.length && (
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-gray-900">最近已处理任务</h3>
          </div>
          <div className="space-y-2">
            {closedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{taskTypeLabel[task.task_type] ?? task.task_type}</p>
                    <p className="text-xs text-slate-500 mt-1">{humanizeAIText(task.rationale || '已由红娘完成处理')}</p>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {task.status === 'done' ? '已完成' : '已忽略'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-gray-900">匹配跟进时间线</h3>
        </div>

        {!timelineMatches.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">暂无匹配跟进记录</p>
          </div>
        ) : (
          <div className="relative ml-3 border-l border-rose-100 pl-6 space-y-5">
            {timelineMatches.map((match) => (
              <div key={match.id} className="relative">
                <div className="absolute -left-[31px] top-5 w-3 h-3 rounded-full bg-rose-400 border-4 border-white" />
                <Link href={`/matchmaker/matches/${match.id}`}>
                  <div className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{match.male_profile.name}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{match.female_profile.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[match.status]}`}>
                        {MATCH_STATUS_LABELS[match.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                      <span>匹配分：{Math.round(match.match_score)}</span>
                      {match.meeting_time && (
                        <span>约谈：{format(new Date(match.meeting_time), 'MM月dd日 HH:mm', { locale: zhCN })}</span>
                      )}
                      <span>更新于 {format(new Date(match.updated_at), 'MM月dd日', { locale: zhCN })}</span>
                    </div>
                    {match.matchmaker_notes && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">备注：{match.matchmaker_notes}</p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
