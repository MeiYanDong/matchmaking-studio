'use client'

import { useState } from 'react'
import { Match, Profile, Intention, MatchStatus } from '@/types/database'
import {
  MATCH_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  SCORE_DIMENSION_META,
  ScoreBreakdown,
  ScoreDimensionKey,
} from '@/types/app'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ProfileCard } from '@/components/client/profile-card'
import { toast } from 'sonner'
import { updateMatchStatus, dismissMatch } from '@/actions/matches'
import { Phone, Calendar, MapPin, FileText, TrendingUp, X, CheckCircle, Mars, Venus } from 'lucide-react'
import { getFieldDisplayLabel, humanizeAIText } from '@/lib/ai/field-presentation'

interface MatchDetailClientProps {
  match: Match
  maleProfile: Profile
  femaleProfile: Profile
  maleIntention: Intention | null
  femaleIntention: Intention | null
}

const STATUS_FLOW: Record<MatchStatus, { next: MatchStatus; label: string; color: string }[]> = {
  pending: [{ next: 'reviewing', label: '开始跟进', color: 'bg-rose-500 hover:bg-rose-600' }],
  reviewing: [
    { next: 'contacted_male', label: '已联系男方', color: 'bg-blue-500 hover:bg-blue-600' },
    { next: 'contacted_female', label: '已联系女方', color: 'bg-pink-500 hover:bg-pink-600' },
  ],
  contacted_male: [
    { next: 'contacted_female', label: '已联系女方', color: 'bg-pink-500 hover:bg-pink-600' },
    { next: 'both_agreed', label: '双方同意见面', color: 'bg-purple-500 hover:bg-purple-600' },
  ],
  contacted_female: [
    { next: 'contacted_male', label: '已联系男方', color: 'bg-blue-500 hover:bg-blue-600' },
    { next: 'both_agreed', label: '双方同意见面', color: 'bg-purple-500 hover:bg-purple-600' },
  ],
  both_agreed: [{ next: 'meeting_scheduled', label: '安排约谈', color: 'bg-orange-500 hover:bg-orange-600' }],
  meeting_scheduled: [{ next: 'met', label: '确认已见面', color: 'bg-yellow-500 hover:bg-yellow-600' }],
  met: [
    { next: 'succeeded', label: '标记匹配成功', color: 'bg-green-500 hover:bg-green-600' },
    { next: 'failed', label: '匹配失败', color: 'bg-gray-500 hover:bg-gray-600' },
  ],
  succeeded: [],
  failed: [],
  dismissed: [],
}

const statusBg: Record<string, string> = {
  pending: 'border border-border/80 bg-secondary text-foreground/72 dark:border-border/70 dark:bg-white/[0.06] dark:text-foreground/72',
  reviewing: 'border border-primary/10 bg-primary/8 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-primary',
  contacted_male: 'border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-200',
  contacted_female: 'border border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/25 dark:bg-pink-500/10 dark:text-pink-200',
  both_agreed: 'border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-200',
  meeting_scheduled: 'border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200',
  met: 'border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/25 dark:bg-yellow-500/10 dark:text-yellow-200',
  succeeded: 'border border-green-200 bg-green-50 text-green-700 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-200',
  failed: 'border border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200',
  dismissed: 'border border-border bg-muted text-muted-foreground dark:border-border/70 dark:bg-white/[0.04] dark:text-foreground/50',
}

export function MatchDetailClient({ match, maleProfile, femaleProfile, maleIntention, femaleIntention }: MatchDetailClientProps) {
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [notes, setNotes] = useState(match.matchmaker_notes ?? '')
  const [meetingTime, setMeetingTime] = useState(match.meeting_time ? match.meeting_time.slice(0, 16) : '')
  const [meetingLocation, setMeetingLocation] = useState(match.meeting_location ?? '')
  const [outcomeNotes, setOutcomeNotes] = useState(match.outcome_notes ?? '')
  const [dismissReason, setDismissReason] = useState('')
  const [showDismiss, setShowDismiss] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [loading, setLoading] = useState(false)

  const breakdown = match.score_breakdown as ScoreBreakdown | null
  const nextSteps = STATUS_FLOW[status] ?? []

  async function handleStatusChange(newStatus: MatchStatus) {
    setLoading(true)
    try {
      await updateMatchStatus(match.id, {
        status: newStatus,
        matchmaker_notes: notes,
        meeting_time: meetingTime ? new Date(meetingTime).toISOString() : null,
        meeting_location: meetingLocation || null,
        outcome_notes: outcomeNotes || null,
      })
      setStatus(newStatus)
      toast.success(`状态已更新为：${MATCH_STATUS_LABELS[newStatus]}`)
      setShowMeeting(false)
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveNotes() {
    setLoading(true)
    try {
      await updateMatchStatus(match.id, {
        status,
        matchmaker_notes: notes,
        outcome_notes: outcomeNotes || null,
      })
      toast.success('备注已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss() {
    setLoading(true)
    try {
      await dismissMatch(match.id, dismissReason)
      setStatus('dismissed')
      setShowDismiss(false)
      toast.success('已放弃此推荐')
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className={`flex items-center justify-between rounded-[24px] p-4 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.16)] dark:shadow-[0_28px_68px_-48px_rgba(0,0,0,0.62)] ${statusBg[status]}`}>
        <div>
          <span className="text-sm font-medium">当前状态：</span>
          <span className="font-bold text-lg ml-2">{MATCH_STATUS_LABELS[status]}</span>
          <span className="ml-3 rounded-full bg-white/80 px-2 py-1 text-xs dark:bg-white/[0.08] dark:text-foreground/72">
            {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
          </span>
        </div>
        <div className="text-2xl font-bold">{Math.round(match.match_score)}<span className="text-sm font-normal ml-1">分</span></div>
      </div>

      {/* Score breakdown */}
      {breakdown && (
        <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,250,255,0.95)_52%,rgba(241,246,252,0.93))] p-4 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.16)] dark:border-border/70 dark:bg-[linear-gradient(145deg,rgba(18,25,35,0.96),rgba(12,17,25,0.97)_52%,rgba(9,13,19,0.98))] dark:shadow-[0_30px_72px_-48px_rgba(0,0,0,0.62)]">
          <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-foreground">匹配得分明细</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {SCORE_DIMENSION_META.map(({ label, key, max }) => {
              const score = breakdown[key as ScoreDimensionKey] ?? 0
              const pct = (score / max) * 100
              return (
                <div key={key} className="text-center">
                  <div className="mb-1 text-xs text-muted-foreground dark:text-foreground/54">{label}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
                    <div className="h-full rounded-full bg-rose-400 transition-all dark:bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-sm font-bold text-foreground dark:text-foreground">{Math.round(score)}<span className="text-xs text-gray-400 dark:text-foreground/56">/{max}</span></div>
                </div>
              )
            })}
          </div>
          {(breakdown.pending_fields.length > 0 || breakdown.hard_conflicts.length > 0) && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-200">待确认字段</p>
                {breakdown.pending_fields.length ? (
                  <div className="flex flex-wrap gap-2">
                    {breakdown.pending_fields.map((field) => (
                      <span key={field} className="rounded-full bg-white px-2 py-1 text-xs text-amber-700 dark:bg-white/[0.08] dark:text-amber-100">
                        {getFieldDisplayLabel(field)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-200">无</p>
                )}
              </div>
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-3 dark:border-red-500/25 dark:bg-red-500/10">
                <p className="mb-2 text-xs font-medium text-red-700 dark:text-red-200">硬冲突字段</p>
                {breakdown.hard_conflicts.length ? (
                  <div className="space-y-1">
                    {breakdown.hard_conflicts.map((field) => (
                      <p key={field} className="text-xs text-red-700 dark:text-red-200">{getFieldDisplayLabel(field)}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-700 dark:text-red-200">无</p>
                )}
              </div>
            </div>
          )}
          {match.match_reason && (
            <div className="mt-3 rounded-[20px] border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/25 dark:bg-rose-500/10">
              <p className="text-sm text-rose-700 dark:text-rose-200">{humanizeAIText(match.match_reason)}</p>
            </div>
          )}
        </div>
      )}

      {(match.pending_reasons?.length || match.suggested_followup_questions?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
            <h3 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">待确认原因</h3>
            {match.pending_reasons?.length ? (
              <div className="space-y-2">
                {match.pending_reasons.map((reason) => (
                  <p key={reason} className="text-sm text-amber-800 dark:text-amber-200">{humanizeAIText(reason)}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-200">当前无待确认原因。</p>
            )}
          </div>
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/25 dark:bg-rose-500/10">
            <h3 className="mb-2 text-sm font-semibold text-rose-900 dark:text-rose-100">下一步建议补问</h3>
            {match.suggested_followup_questions?.length ? (
              <div className="space-y-2">
                {match.suggested_followup_questions.map((question) => (
                  <p key={question} className="text-sm text-rose-800 dark:text-rose-200">{question}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-rose-700 dark:text-rose-200">当前无补问建议。</p>
            )}
          </div>
        </div>
      )}

      {/* Profile cards */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-foreground/46">
            <Mars className="h-3.5 w-3.5" />
            男方
          </p>
          <ProfileCard profile={maleProfile} intention={maleIntention} printable />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-foreground/46">
            <Venus className="h-3.5 w-3.5" />
            女方
          </p>
          <ProfileCard profile={femaleProfile} intention={femaleIntention} printable />
        </div>
      </div>

      {/* Follow-up area */}
      <div className="space-y-4 rounded-[24px] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,250,255,0.95)_52%,rgba(241,246,252,0.93))] p-5 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.16)] dark:border-border/70 dark:bg-[linear-gradient(145deg,rgba(18,25,35,0.96),rgba(12,17,25,0.97)_52%,rgba(9,13,19,0.98))] dark:shadow-[0_30px_72px_-48px_rgba(0,0,0,0.62)]">
        <h3 className="font-semibold text-foreground dark:text-foreground">跟进操作</h3>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-foreground/66"><FileText className="w-4 h-4" />跟进备注</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="记录跟进情况..." />
        </div>

        {/* Meeting info */}
        {(status === 'both_agreed' || status === 'meeting_scheduled' || status === 'met') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-foreground/66"><Calendar className="w-4 h-4" />约谈时间</Label>
                <Input type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-foreground/66"><MapPin className="w-4 h-4" />约谈地点</Label>
                <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="地点" />
              </div>
            </div>
            {status === 'met' && (
              <div className="space-y-1">
                <Label className="text-sm text-gray-600 dark:text-foreground/66">见面结果</Label>
                <Textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} rows={2} placeholder="记录见面结果和双方反馈..." />
              </div>
            )}
          </>
        )}

        {/* Save notes button */}
        <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={loading}>
          保存备注
        </Button>

        {/* Status actions */}
        {nextSteps.length > 0 && status !== 'dismissed' && (
          <div className="border-t border-gray-100 pt-2 dark:border-white/[0.08]">
            <p className="mb-2 text-xs text-gray-500 dark:text-foreground/50">推进跟进状态：</p>
            <div className="flex flex-wrap gap-2">
              {nextSteps.map(step => (
                <Button
                  key={step.next}
                  size="sm"
                  className={step.color + ' text-white'}
                  onClick={() => step.next === 'meeting_scheduled' ? setShowMeeting(true) : handleStatusChange(step.next)}
                  disabled={loading}
                >
                  {step.label}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setShowDismiss(true)} className="text-gray-500 dark:text-foreground/60 dark:hover:bg-white/[0.06]">
                <X className="w-3.5 h-3.5 mr-1" />放弃推荐
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Meeting schedule dialog */}
      <Dialog open={showMeeting} onOpenChange={setShowMeeting}>
        <DialogContent>
          <DialogHeader><DialogTitle>安排约谈</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>约谈时间</Label>
              <Input type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>约谈地点</Label>
              <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="请输入约谈地点" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeeting(false)}>取消</Button>
            <Button onClick={() => handleStatusChange('meeting_scheduled')} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              <Calendar className="w-4 h-4 mr-2" />确认安排
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss dialog */}
      <Dialog open={showDismiss} onOpenChange={setShowDismiss}>
        <DialogContent>
          <DialogHeader><DialogTitle>放弃此推荐</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>放弃原因（可选）</Label>
            <Textarea value={dismissReason} onChange={e => setDismissReason(e.target.value)} placeholder="请输入放弃原因..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDismiss(false)}>取消</Button>
            <Button onClick={handleDismiss} disabled={loading} variant="destructive">确认放弃</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
