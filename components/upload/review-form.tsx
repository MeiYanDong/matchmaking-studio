'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Conversation, Json, Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EducationChipSelect } from '@/components/ui/education-chip-select'
import { PreferenceImportanceEditor } from '@/components/ui/preference-importance-editor'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, FileText, LoaderCircle, Sparkles, Wand2 } from 'lucide-react'
import { resolveConversationReview } from '@/actions/conversations'
import {
  EDUCATION_LABELS,
  INTENT_LABELS,
  RELATIONSHIP_MODE_LABELS,
  TRI_STATE_LABELS,
} from '@/types/app'
import {
  EDUCATION_VALUES,
  PRIMARY_INTENT_VALUES,
  RELATIONSHIP_MODE_VALUES,
  V1_FIELD_SPEC_BY_KEY,
  type V1FieldKey,
} from '@/lib/ai/field-spec'
import {
  formatFieldDiff,
  formatFieldValueLines,
  getFieldDisplayLabel,
  humanizeAIText,
  isPlaceholderCandidateValue,
  parseEditableFieldValue,
  toEditableFieldValue,
} from '@/lib/ai/field-presentation'
import { buildDisplayFollowupQuestions, dedupeFieldKeysByDisplay } from '@/lib/followup/presentation'

interface ReviewFormProps {
  conversation: Conversation
  profile: Profile
}

type ExtractedData = {
  applied_field_updates?: Array<{
    field_key: V1FieldKey
    field_label?: string
    old_value?: Json
    new_value?: Json
    evidence_excerpt?: string
    reason?: string
  }>
  review_required?: Array<{
    field_key: string
    field_label?: string
    old_value?: Json
    candidate_value?: Json
    confidence?: 'high' | 'medium' | 'low'
    evidence_excerpt?: string
    reason?: string
  }>
  missing_critical_fields?: string[]
  suggested_followup_questions?: string[]
  processing_notes?: string[]
}

export function ReviewForm({ conversation, profile }: ReviewFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const extracted = (conversation.extracted_fields as ExtractedData | null) ?? {}

  const appliedUpdates = extracted.applied_field_updates ?? []
  const reviewRequired = extracted.review_required ?? []
  const missingFields = dedupeFieldKeysByDisplay(extracted.missing_critical_fields ?? [])
  const suggestedQuestions = buildDisplayFollowupQuestions(
    missingFields,
    extracted.suggested_followup_questions ?? []
  )
  const processingNotes = extracted.processing_notes ?? []

  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(
    () =>
      new Set(
        reviewRequired
          .filter((item) => {
            const spec = V1_FIELD_SPEC_BY_KEY[item.field_key as V1FieldKey]
            return !spec || isPlaceholderCandidateValue(item.field_key, item.candidate_value as Json | undefined)
          })
          .map((item) => item.field_key)
      )
  )
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      reviewRequired.map((item) => [
        item.field_key,
        toEditableFieldValue(item.field_key, item.candidate_value as Json | undefined),
      ])
    )
  )

  const pendingReviewItems = useMemo(
    () => reviewRequired.filter((item) => !skippedKeys.has(item.field_key)),
    [reviewRequired, skippedKeys]
  )

  async function handleConfirm() {
    setSaving(true)
    try {
      const decisions = reviewRequired.map((item) => {
        const spec = V1_FIELD_SPEC_BY_KEY[item.field_key as V1FieldKey]
        const parsedValue = spec
          ? parseEditableFieldValue(item.field_key, spec.valueType, formValues[item.field_key])
          : undefined
        const placeholderOnly = isPlaceholderCandidateValue(
          item.field_key,
          item.candidate_value as Json | undefined
        )

        return {
          field_key: item.field_key,
          skip: skippedKeys.has(item.field_key) || !spec || (placeholderOnly && parsedValue === undefined),
          new_value: parsedValue,
        }
      })

      const result = await resolveConversationReview({
        conversationId: conversation.id,
        profileId: profile.id,
        decisions,
      })

      toast.success(`异常字段已处理，已刷新 ${result.matched} 条匹配`)
      router.push(`/matchmaker/clients/${profile.id}`)
    } catch (error) {
      toast.error('保存失败：' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="rounded-[28px] border border-border/80 bg-white/82 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-500 dark:text-foreground/50" />
            <h3 className="font-semibold text-gray-900 dark:text-foreground">转录全文</h3>
          </div>
          <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-foreground/74">
            {conversation.transcript || '暂无转录文本'}
          </div>
        </div>

        {(processingNotes.length > 0 || conversation.extraction_notes) && (
          <div className="rounded-[28px] border border-primary/12 bg-[linear-gradient(145deg,rgba(241,246,255,0.95),rgba(255,255,255,0.98))] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.12)] dark:border-primary/16 dark:bg-[linear-gradient(145deg,rgba(18,25,35,0.96),rgba(11,16,24,0.98))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.58)]">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-slate-900 dark:text-foreground">AI 处理备注</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-foreground/74">
              {processingNotes.map((note) => (
                <p key={note}>• {humanizeAIText(note)}</p>
              ))}
              {conversation.extraction_notes && !processingNotes.length && (
                <p className="whitespace-pre-wrap">{humanizeAIText(conversation.extraction_notes)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-[28px] border border-border/80 bg-white/82 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 dark:text-foreground">AI 已自动同步</h3>
          </div>

          {!appliedUpdates.length ? (
            <p className="text-sm text-gray-400 dark:text-foreground/48">这段录音没有产生可自动写入的字段更新。</p>
          ) : (
            <div className="space-y-3">
              {appliedUpdates.map((item) => (
                <div key={`${item.field_key}-${String(item.new_value)}`} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-300/12 dark:bg-emerald-400/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      {item.field_label ?? getFieldDisplayLabel(item.field_key)}
                    </p>
                    <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700 dark:border-emerald-300/14 dark:bg-white/[0.06] dark:text-emerald-100">
                      已自动写入
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-100/90">
                    {formatFieldDiff(item.field_key, item.old_value, item.new_value)}
                  </p>
                  {item.evidence_excerpt && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-emerald-700 dark:text-emerald-100/82">证据：{item.evidence_excerpt}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-border/80 bg-white/82 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-gray-900 dark:text-foreground">待补问与下一步建议</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-foreground/50">关键缺口</p>
              {!missingFields.length ? (
                <p className="text-sm text-gray-400 dark:text-foreground/48">这段录音暂无新的关键缺口。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {missingFields.map((field) => (
                    <Badge key={field} variant="outline" className="border-primary/12 bg-primary/8 text-primary dark:border-primary/16 dark:bg-white/[0.06] dark:text-primary-foreground">
                      {getFieldDisplayLabel(field)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-foreground/50">AI 推荐补问</p>
              {!suggestedQuestions.length ? (
                <p className="text-sm text-gray-400 dark:text-foreground/48">当前没有新增补问建议。</p>
              ) : (
                <div className="space-y-2">
                  {suggestedQuestions.map((question) => (
                    <div key={question} className="rounded-[20px] border border-primary/12 bg-primary/8 p-3 text-sm text-slate-700 dark:border-primary/16 dark:bg-white/[0.05] dark:text-foreground/76">
                      {question}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/80 bg-white/82 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-foreground">需要你确认的异常</h3>
          </div>

          {!reviewRequired.length ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-300/12 dark:bg-emerald-400/[0.06] dark:text-emerald-100">
              本次没有异常字段，AI 已完成自动入库。你可以直接返回客户详情继续看候选和补问任务。
            </div>
          ) : (
            <div className="space-y-4">
              {reviewRequired.map((item) => {
                const spec = V1_FIELD_SPEC_BY_KEY[item.field_key as V1FieldKey]
                const skipped = skippedKeys.has(item.field_key)
                const placeholderOnly = isPlaceholderCandidateValue(
                  item.field_key,
                  item.candidate_value as Json | undefined
                )

                return (
                  <div key={item.field_key} className={`rounded-xl border p-4 ${skipped ? 'border-gray-200 bg-gray-50 opacity-70 dark:border-white/8 dark:bg-white/[0.04]' : 'border-orange-200 bg-orange-50 dark:border-orange-300/12 dark:bg-orange-400/[0.06]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                          {item.field_label ?? getFieldDisplayLabel(item.field_key)}
                        </p>
                      </div>
                      <Badge variant="outline" className={item.confidence === 'low' ? 'border-red-200 bg-white text-red-600 dark:border-red-300/14 dark:bg-white/[0.06] dark:text-red-100' : 'border-orange-200 bg-white text-orange-700 dark:border-orange-300/14 dark:bg-white/[0.06] dark:text-orange-100'}>
                        {item.confidence === 'low' ? '低置信度' : '待确认'}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ValuePreview fieldKey={item.field_key} title="当前值" value={item.old_value} />
                      <ValuePreview fieldKey={item.field_key} title="AI 候选" value={item.candidate_value} tone="amber" />
                    </div>

                    {item.reason && (
                      <p className="mt-3 text-xs text-orange-800 dark:text-orange-100">{humanizeAIText(item.reason)}</p>
                    )}
                    {item.evidence_excerpt && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white/80 p-2 text-xs text-gray-700 dark:bg-white/[0.06] dark:text-foreground/72">
                        证据：{item.evidence_excerpt}
                      </p>
                    )}

                    {!spec && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-foreground/58">
                        这是一项系统归属/身份冲突提示，当前页面不直接回写该字段，默认先跳过；如需处理，请到客户详情或重新归档后再继续。
                      </p>
                    )}

                    {placeholderOnly && spec && (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-300/12 dark:bg-blue-400/[0.06] dark:text-blue-100">
                        AI 还没有给出可直接回写的具体值，这项更适合放进下一轮线下补问。
                        当前页默认不会回写它，你可以先根据上面的补问建议继续沟通。
                      </div>
                    )}

                    {!placeholderOnly && (
                      <div className="mt-3">
                        <ReviewInput
                          fieldKey={item.field_key}
                          value={formValues[item.field_key] ?? ''}
                          disabled={skipped || !spec}
                          onChange={(value) => setFormValues((prev) => ({ ...prev, [item.field_key]: value }))}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="mt-3 text-xs text-gray-500 hover:text-gray-700 dark:text-foreground/50 dark:hover:text-foreground/76"
                      onClick={() =>
                        setSkippedKeys((prev) => {
                          const next = new Set(prev)
                          if (next.has(item.field_key)) next.delete(item.field_key)
                          else next.add(item.field_key)
                          return next
                        })
                      }
                    >
                      {skipped ? '恢复处理' : placeholderOnly ? '这项转为待补问，不在此回写' : '这项先跳过，不回写'}
                    </button>
                  </div>
                )
              })}

              {pendingReviewItems.length === 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-300/12 dark:bg-blue-400/[0.06] dark:text-blue-100">
                  当前剩余异常都已经转成“待补问”或系统提示，不需要在这里手动回写。
                </div>
              )}

              <Button onClick={handleConfirm} disabled={saving || pendingReviewItems.length === 0} className="w-full">
                {saving ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {saving ? '处理中...' : `确认异常字段并同步（剩余 ${pendingReviewItems.length} 项）`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewInput({
  fieldKey,
  value,
  disabled,
  onChange,
}: {
  fieldKey: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const spec = V1_FIELD_SPEC_BY_KEY[fieldKey as V1FieldKey]

  if (!spec) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <Input value={value} disabled className="bg-white dark:bg-white/[0.05]" />
      </div>
    )
  }

  if (spec.valueType === 'tri_state') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm dark:bg-white/[0.05] dark:text-foreground"
        >
          <option value="">请选择</option>
          {Object.entries(TRI_STATE_LABELS).map(([nextValue, label]) => (
            <option key={nextValue} value={nextValue}>
              {label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (spec.valueType === 'string' && 'options' in spec && Array.isArray(spec.options) && spec.options.length) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm dark:bg-white/[0.05] dark:text-foreground"
        >
          <option value="">请选择</option>
          {(spec.options as readonly string[]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (spec.valueType === 'primary_intent') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm dark:bg-white/[0.05] dark:text-foreground"
        >
          <option value="">请选择主意图</option>
          {PRIMARY_INTENT_VALUES.map((option) => (
            <option key={option} value={option}>
              {INTENT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (spec.valueType === 'relationship_mode') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm dark:bg-white/[0.05] dark:text-foreground"
        >
          <option value="">请选择关系模式</option>
          {RELATIONSHIP_MODE_VALUES.map((option) => (
            <option key={option} value={option}>
              {RELATIONSHIP_MODE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (spec.valueType === 'education_array') {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值（可多选）</Label>
        <EducationChipSelect value={value} disabled={disabled} onChange={onChange} />
      </div>
    )
  }

  if (spec.valueType === 'string_array') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值（每行一项）</Label>
        <Textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="bg-white dark:bg-white/[0.05]"
        />
      </div>
    )
  }

  if (spec.valueType === 'json' && fieldKey === 'preference_importance') {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <PreferenceImportanceEditor value={value} disabled={disabled} onChange={onChange} />
      </div>
    )
  }

  if (spec.valueType === 'number') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
        <Input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="bg-white dark:bg-white/[0.05]"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500 dark:text-foreground/50">确认值</Label>
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="bg-white dark:bg-white/[0.05]"
      />
    </div>
  )
}

function ValuePreview({
  fieldKey,
  title,
  value,
  tone = 'gray',
}: {
  fieldKey: string
  title: string
  value: Json | undefined
  tone?: 'gray' | 'amber'
}) {
  const lines = formatFieldValueLines(fieldKey, value)
  const className = tone === 'amber'
    ? 'border-primary/12 bg-white/82 dark:border-primary/16 dark:bg-white/[0.05]'
    : 'border-gray-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]'

  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-foreground/50">{title}</p>
      {!lines.length ? (
        <p className="mt-2 text-sm text-gray-400 dark:text-foreground/46">未填写</p>
      ) : lines.length === 1 && lines[0].length < 40 ? (
        <p className="mt-2 text-sm font-medium text-gray-800 dark:text-foreground">{lines[0]}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {lines.map((line) => (
            <Badge key={line} variant="outline" className="bg-white text-gray-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-foreground/72">
              {line}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
