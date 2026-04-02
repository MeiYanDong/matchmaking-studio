'use client'

import { type ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CONVERSATION_STATUS_LABELS } from '@/types/app'
import { Conversation } from '@/types/database'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Loader,
  Mic,
  Plus,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatFieldDiff,
  formatFieldValue,
  getFieldDisplayLabel,
  humanizeAIText,
} from '@/lib/ai/field-presentation'

interface ConversationsTabProps {
  conversations: Conversation[]
  profileId: string
}

type ExtractedData = {
  applied_field_updates?: Array<{
    field_key: string
    field_label?: string
    old_value?: unknown
    new_value?: unknown
  }>
  review_required?: Array<{
    field_key: string
    field_label?: string
    candidate_value?: unknown
  }>
  missing_critical_fields?: string[]
  suggested_followup_questions?: string[]
  processing_notes?: string[]
}

const statusIcon = {
  pending: <Clock className="w-4 h-4 text-gray-400" />,
  transcribing: <Loader className="w-4 h-4 text-blue-400 animate-spin" />,
  extracting: <Loader className="w-4 h-4 text-purple-400 animate-spin" />,
  done: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failed: <AlertCircle className="w-4 h-4 text-red-400" />,
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  transcribing: 'secondary',
  extracting: 'secondary',
  done: 'default',
  failed: 'destructive',
}

export function ConversationsTab({ conversations, profileId }: ConversationsTabProps) {
  const router = useRouter()
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const latestConversation = conversations[0] ?? null
  const latestExtracted = (latestConversation?.extracted_fields as ExtractedData | null) ?? null

  async function handleRetry(conversation: Conversation) {
    setRetryingId(conversation.id)
    try {
      const endpoint = conversation.transcript ? '/api/extract' : '/api/transcribe'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || '重试失败')
      }

      toast.success('已重新触发处理，请稍后刷新查看状态')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Link href={`/matchmaker/clients/${profileId}/upload`}>
          <Button className="bg-rose-500 hover:bg-rose-600 gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            上传录音
          </Button>
        </Link>
      </div>

      {!conversations.length ? (
        <div className="rounded-[28px] border border-dashed border-gray-200 bg-white/80 px-6 py-16 text-center text-gray-400">
          <Mic className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">暂无录音记录</p>
          <p className="text-sm mt-1">上传与客户的对话录音，AI 会自动更新客户快照并生成补问建议</p>
        </div>
      ) : (
        <div className="space-y-4">
          {latestConversation && (
            <div className="overflow-hidden rounded-[30px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,0.98)_52%,rgba(255,247,237,0.96))]">
              <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">最近一次 AI 更新</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {format(new Date(latestConversation.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                    {latestConversation.reviewed_at ? ' · 异常已处理' : ' · 已按默认规则自动入库'}
                  </p>
                </div>
                <Badge variant={statusVariant[latestConversation.status]} className="rounded-full px-3 py-1">
                  {CONVERSATION_STATUS_LABELS[latestConversation.status]}
                </Badge>
              </div>

              <div className="grid gap-3 border-t border-white/80 px-6 py-5 md:grid-cols-3">
                <SummaryCard
                  title="自动写入字段"
                  value={String(latestExtracted?.applied_field_updates?.length ?? 0)}
                  description="AI 已直接同步到当前客户快照"
                  tone="emerald"
                />
                <SummaryCard
                  title="待确认异常"
                  value={String(latestExtracted?.review_required?.length ?? 0)}
                  description="需要红娘补看或确认的字段"
                  tone="amber"
                />
                <SummaryCard
                  title="待补问建议"
                  value={String(latestExtracted?.suggested_followup_questions?.length ?? 0)}
                  description="下一轮线下可直接复述的问题数"
                  tone="rose"
                />
              </div>

              {!!latestExtracted?.missing_critical_fields?.length && (
                <div className="border-t border-white/70 px-6 pb-5 pt-1">
                  <p className="text-xs font-medium text-gray-500 mb-2">关键缺口</p>
                  <div className="flex flex-wrap gap-2">
                    {latestExtracted.missing_critical_fields.map((field) => (
                      <Badge key={field} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        {getFieldDisplayLabel(field)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {conversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              profileId={profileId}
              retrying={retryingId === conversation.id}
              onRetry={() => handleRetry(conversation)}
              onOpen={() => setSelectedConversation(conversation)}
              isLatest={index === 0}
            />
          ))}
        </div>
      )}

      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-[30px] border-0 bg-[#fbf7f1] p-0 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.65)] sm:max-w-[min(1180px,calc(100vw-2.5rem))]">
          {selectedConversation && <ConversationDetail conversation={selectedConversation} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConversationCard({
  conversation,
  profileId,
  retrying,
  onRetry,
  onOpen,
  isLatest,
}: {
  conversation: Conversation
  profileId: string
  retrying: boolean
  onRetry: () => void
  onOpen: () => void
  isLatest: boolean
}) {
  const extracted = (conversation.extracted_fields as ExtractedData | null) ?? null
  const autoAppliedCount = extracted?.applied_field_updates?.length ?? 0
  const reviewRequiredCount = extracted?.review_required?.length ?? 0
  const missingFieldCount = extracted?.missing_critical_fields?.length ?? 0
  const shouldReview = conversation.status === 'done' && reviewRequiredCount > 0 && !conversation.reviewed_at
  const transcriptPreview = conversation.transcript?.trim() || '当前还没有转录文本。'
  const insightPreview = humanizeAIText(
    conversation.extraction_notes
    || extracted?.processing_notes?.[0]
    || (reviewRequiredCount
      ? `发现 ${reviewRequiredCount} 项需要人工确认的异常字段。`
      : autoAppliedCount
        ? `AI 已自动同步 ${autoAppliedCount} 项字段更新。`
        : '这段录音暂时还没有生成摘要。')
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[28px] border bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(249,250,251,0.96)_46%,rgba(255,247,237,0.92))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.4)]',
        isLatest ? 'border-rose-200/80' : 'border-gray-200/90'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-800">
            {statusIcon[conversation.status]}
            <span>{format(new Date(conversation.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}</span>
            {conversation.audio_duration ? (
              <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-normal text-gray-500">
                {Math.floor(conversation.audio_duration / 60)}分{conversation.audio_duration % 60}秒
              </span>
            ) : null}
            {conversation.reviewed_at ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                已处理异常
              </span>
            ) : null}
          </div>
          <p className="text-xs tracking-[0.16em] text-gray-400 uppercase">
            {conversation.status === 'done' ? '会话摘要' : '处理中'}
          </p>
        </div>

        <Badge variant={statusVariant[conversation.status]} className="rounded-full px-3 py-1">
          {CONVERSATION_STATUS_LABELS[conversation.status]}
        </Badge>
      </div>

      <div className="grid gap-4 px-5 pb-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <SnippetPanel
          icon={<FileText className="w-4 h-4" />}
          label="录音速记"
          content={transcriptPreview}
          tone="slate"
          clampClass="line-clamp-4"
        />
        <SnippetPanel
          icon={<Sparkles className="w-4 h-4" />}
          label="AI 摘要"
          content={insightPreview}
          tone="amber"
          clampClass="line-clamp-5"
        />
      </div>

      {conversation.error_message && (
        <div className="mx-5 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {conversation.error_message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] bg-white/55 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {autoAppliedCount > 0 && <CountChip tone="emerald" label={`自动写入 ${autoAppliedCount}`} />}
          {reviewRequiredCount > 0 && <CountChip tone="amber" label={`异常 ${reviewRequiredCount}`} />}
          {missingFieldCount > 0 && <CountChip tone="rose" label={`缺口 ${missingFieldCount}`} />}
          {!autoAppliedCount && !reviewRequiredCount && !missingFieldCount && conversation.status === 'done' && (
            <CountChip tone="slate" label="本次无新增异常" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" className="text-gray-600" onClick={onOpen}>
            <FileText className="w-4 h-4 mr-1.5" />
            查看详情
          </Button>
          {shouldReview && (
            <Link href={`/matchmaker/clients/${profileId}/conversations/${conversation.id}/review`}>
              <Button size="sm" variant="outline" className="border-rose-200 bg-white text-rose-600 hover:bg-rose-50">
                处理异常
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
          {conversation.status === 'failed' && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
              onClick={onRetry}
              disabled={retrying}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1.5', retrying && 'animate-spin')} />
              {retrying ? '重试中...' : '重试处理'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationDetail({ conversation }: { conversation: Conversation }) {
  const extracted = (conversation.extracted_fields as ExtractedData | null) ?? null
  const appliedUpdates = extracted?.applied_field_updates ?? []
  const reviewRequired = extracted?.review_required ?? []
  const missingCriticalFields = extracted?.missing_critical_fields ?? []
  const suggestedQuestions = extracted?.suggested_followup_questions ?? []
  const processingNotes = extracted?.processing_notes ?? []

  return (
    <div className="flex max-h-[88vh] min-h-[70vh] flex-col">
      <DialogHeader className="border-b border-black/5 bg-[linear-gradient(135deg,rgba(255,251,245,0.98),rgba(255,255,255,0.96)_40%,rgba(236,253,245,0.88))] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <DialogTitle className="text-xl text-slate-900">录音处理详情</DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{format(new Date(conversation.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}</span>
              {conversation.audio_duration ? (
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-black/5">
                  {Math.floor(conversation.audio_duration / 60)}分{conversation.audio_duration % 60}秒
                </span>
              ) : null}
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-black/5">
                {conversation.reviewed_at ? '异常已处理' : '工作流详情'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant[conversation.status]} className="rounded-full px-3 py-1">
              {CONVERSATION_STATUS_LABELS[conversation.status]}
            </Badge>
            <CountChip tone="emerald" label={`自动写入 ${appliedUpdates.length}`} />
            <CountChip tone="amber" label={`异常 ${reviewRequired.length}`} />
            <CountChip tone="rose" label={`缺口 ${missingCriticalFields.length}`} />
          </div>
        </div>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.4fr)_420px]">
        <div className="min-h-0 border-b border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.9))] lg:border-b-0 lg:border-r">
          <div className="grid gap-3 border-b border-black/5 px-6 py-5 sm:grid-cols-3">
            <SummaryCard title="自动写入字段" value={String(appliedUpdates.length)} description="AI 已同步更新" tone="emerald" />
            <SummaryCard title="待确认异常" value={String(reviewRequired.length)} description="需要人工复核" tone="amber" />
            <SummaryCard title="待补问建议" value={String(suggestedQuestions.length)} description="下一轮可直接追问" tone="rose" />
          </div>

          <div className="min-h-0 px-6 py-5">
            <div className="flex h-full min-h-[24rem] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_50px_-42px_rgba(15,23,42,0.5)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <FileText className="w-4 h-4 text-slate-500" />
                  转录全文
                </div>
                <span className="text-xs text-slate-400">滚动查看完整内容</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="mx-auto max-w-4xl whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                  {conversation.transcript || '暂无转录文本'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(251,247,241,0.92),rgba(255,255,255,0.98))] px-5 py-5">
          <div className="space-y-4">
            <DetailPanel
              title="AI 处理摘要"
              icon={<Sparkles className="w-4 h-4 text-amber-500" />}
              tone="amber"
            >
              {conversation.extraction_notes ? (
                <p className="text-sm leading-7 text-amber-900">{humanizeAIText(conversation.extraction_notes)}</p>
              ) : (
                <p className="text-sm text-gray-400">当前没有额外摘要。</p>
              )}
            </DetailPanel>

            {!!suggestedQuestions.length && (
              <DetailPanel
                title="下一步补问"
                icon={<Wand2 className="w-4 h-4 text-rose-500" />}
                tone="rose"
              >
                <div className="space-y-2">
                  {suggestedQuestions.map((question) => (
                    <div key={question} className="rounded-2xl border border-rose-200/70 bg-white/90 px-4 py-3 text-sm leading-6 text-rose-800">
                      {question}
                    </div>
                  ))}
                </div>
              </DetailPanel>
            )}

            {!!processingNotes.length && (
              <DetailPanel
                title="AI 处理备注"
                icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
                tone="slate"
              >
                <div className="space-y-2 text-sm leading-6 text-slate-700">
                  {processingNotes.map((note) => (
                    <p key={note}>• {humanizeAIText(note)}</p>
                  ))}
                </div>
              </DetailPanel>
            )}

            {!!appliedUpdates.length && (
              <DetailPanel
                title="自动写入结果"
                icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
                tone="emerald"
              >
                <div className="space-y-3">
                  {appliedUpdates.map((item) => (
                    <InsightRow
                      key={`${item.field_key}-${String(item.new_value)}`}
                      label={item.field_label ?? getFieldDisplayLabel(item.field_key)}
                      detail={formatFieldDiff(item.field_key, item.old_value, item.new_value)}
                      tone="emerald"
                    />
                  ))}
                </div>
              </DetailPanel>
            )}

            {!!reviewRequired.length && (
              <DetailPanel
                title="待确认异常"
                icon={<AlertCircle className="w-4 h-4 text-orange-500" />}
                tone="amber"
              >
                <div className="space-y-3">
                  {reviewRequired.map((item) => (
                    <InsightRow
                      key={item.field_key}
                      label={item.field_label ?? getFieldDisplayLabel(item.field_key)}
                      detail={`AI 候选：${formatFieldValue(item.field_key, item.candidate_value)}`}
                      tone="amber"
                    />
                  ))}
                </div>
              </DetailPanel>
            )}

            {!!missingCriticalFields.length && (
              <DetailPanel
                title="关键缺口"
                icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
                tone="amber"
              >
                <div className="flex flex-wrap gap-2">
                  {missingCriticalFields.map((field) => (
                    <Badge key={field} variant="outline" className="border-amber-200 bg-white text-amber-700">
                      {getFieldDisplayLabel(field)}
                    </Badge>
                  ))}
                </div>
              </DetailPanel>
            )}

            {conversation.error_message && (
              <DetailPanel
                title="失败原因"
                icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                tone="red"
              >
                <p className="whitespace-pre-wrap text-sm leading-6 text-red-700">{conversation.error_message}</p>
              </DetailPanel>
            )}

            <details className="rounded-[24px] border border-slate-200 bg-white/70 p-4">
              <summary className="cursor-pointer text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">
                查看原始结构化结果
              </summary>
              <pre className="mt-3 max-h-[22rem] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(conversation.extracted_fields ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}

function SnippetPanel({
  icon,
  label,
  content,
  tone,
  clampClass,
}: {
  icon: ReactNode
  label: string
  content: string
  tone: 'slate' | 'amber'
  clampClass: string
}) {
  const toneClass = tone === 'amber'
    ? 'border-amber-200/70 bg-[linear-gradient(160deg,rgba(255,247,237,0.95),rgba(255,255,255,0.92))]'
    : 'border-slate-200/70 bg-[linear-gradient(160deg,rgba(248,250,252,0.95),rgba(255,255,255,0.92))]'

  return (
    <div className={cn('relative overflow-hidden rounded-[24px] border p-4 shadow-[0_20px_40px_-40px_rgba(15,23,42,0.55)]', toneClass)}>
      <div className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-gray-500 uppercase">
        {icon}
        {label}
      </div>
      <p className={cn('mt-3 text-[15px] leading-7 text-gray-700', clampClass)}>{content}</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/95 via-white/70 to-transparent" />
    </div>
  )
}

function DetailPanel({
  title,
  icon,
  tone,
  children,
}: {
  title: string
  icon: ReactNode
  tone: 'emerald' | 'amber' | 'rose' | 'slate' | 'red'
  children: ReactNode
}) {
  const toneClass = {
    emerald: 'border-emerald-200/70 bg-[linear-gradient(160deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))]',
    amber: 'border-amber-200/70 bg-[linear-gradient(160deg,rgba(255,247,237,0.88),rgba(255,255,255,0.95))]',
    rose: 'border-rose-200/70 bg-[linear-gradient(160deg,rgba(255,241,242,0.88),rgba(255,255,255,0.95))]',
    slate: 'border-slate-200/80 bg-[linear-gradient(160deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))]',
    red: 'border-red-200/80 bg-[linear-gradient(160deg,rgba(254,242,242,0.9),rgba(255,255,255,0.98))]',
  }[tone]

  return (
    <section className={cn('rounded-[24px] border p-4 shadow-[0_18px_40px_-42px_rgba(15,23,42,0.45)]', toneClass)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function InsightRow({
  label,
  detail,
  tone,
}: {
  label: string
  detail: string
  tone: 'emerald' | 'amber'
}) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-200/70 bg-white/85 text-emerald-900'
    : 'border-orange-200/70 bg-white/85 text-orange-900'

  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClass)}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs leading-6 text-current/80">{detail}</p>
    </div>
  )
}

function CountChip({
  tone,
  label,
}: {
  tone: 'emerald' | 'amber' | 'rose' | 'slate'
  label: string
}) {
  const toneClass = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone]

  return (
    <span className={cn('rounded-full border px-3 py-1 text-xs font-medium', toneClass)}>
      {label}
    </span>
  )
}

function SummaryCard({
  title,
  value,
  description,
  tone,
}: {
  title: string
  value: string
  description: string
  tone: 'emerald' | 'amber' | 'rose'
}) {
  const toneClass = {
    emerald: 'border-emerald-200/70 bg-white/80',
    amber: 'border-amber-200/70 bg-white/80',
    rose: 'border-rose-200/70 bg-white/80',
  }[tone]

  return (
    <div className={cn('rounded-[22px] border p-4 shadow-[0_12px_30px_-30px_rgba(15,23,42,0.4)]', toneClass)}>
      <p className="text-xs tracking-[0.12em] text-gray-500 uppercase">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  )
}
