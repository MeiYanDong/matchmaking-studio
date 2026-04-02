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
import { Phone, Calendar, MapPin, FileText, TrendingUp, X, CheckCircle } from 'lucide-react'
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
    { next: 'succeeded', label: '匹配成功 🎉', color: 'bg-green-500 hover:bg-green-600' },
    { next: 'failed', label: '匹配失败', color: 'bg-gray-500 hover:bg-gray-600' },
  ],
  succeeded: [],
  failed: [],
  dismissed: [],
}

const statusBg: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  contacted_male: 'bg-cyan-100 text-cyan-700',
  contacted_female: 'bg-pink-100 text-pink-700',
  both_agreed: 'bg-purple-100 text-purple-700',
  meeting_scheduled: 'bg-orange-100 text-orange-700',
  met: 'bg-yellow-100 text-yellow-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  dismissed: 'bg-gray-100 text-gray-400',
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
      <div className={`rounded-xl p-4 flex items-center justify-between ${statusBg[status]}`}>
        <div>
          <span className="text-sm font-medium">当前状态：</span>
          <span className="font-bold text-lg ml-2">{MATCH_STATUS_LABELS[status]}</span>
          <span className="ml-3 text-xs rounded-full bg-white/80 px-2 py-1">
            {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
          </span>
        </div>
        <div className="text-2xl font-bold">{Math.round(match.match_score)}<span className="text-sm font-normal ml-1">分</span></div>
      </div>

      {/* Score breakdown */}
      {breakdown && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">匹配得分明细</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {SCORE_DIMENSION_META.map(({ label, key, max }) => {
              const score = breakdown[key as ScoreDimensionKey] ?? 0
              const pct = (score / max) * 100
              return (
                <div key={key} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-sm font-bold mt-1">{Math.round(score)}<span className="text-xs text-gray-400">/{max}</span></div>
                </div>
              )
            })}
          </div>
          {(breakdown.pending_fields.length > 0 || breakdown.hard_conflicts.length > 0) && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800 mb-2">待确认字段</p>
                {breakdown.pending_fields.length ? (
                  <div className="flex flex-wrap gap-2">
                    {breakdown.pending_fields.map((field) => (
                      <span key={field} className="rounded-full bg-white px-2 py-1 text-xs text-amber-700">
                        {getFieldDisplayLabel(field)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">无</p>
                )}
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-700 mb-2">硬冲突字段</p>
                {breakdown.hard_conflicts.length ? (
                  <div className="space-y-1">
                    {breakdown.hard_conflicts.map((field) => (
                      <p key={field} className="text-xs text-red-700">{getFieldDisplayLabel(field)}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-700">无</p>
                )}
              </div>
            </div>
          )}
          {match.match_reason && (
            <div className="mt-3 p-3 bg-rose-50 rounded-lg border-l-2 border-rose-300">
              <p className="text-sm text-rose-700">{humanizeAIText(match.match_reason)}</p>
            </div>
          )}
        </div>
      )}

      {(match.pending_reasons?.length || match.suggested_followup_questions?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900 mb-2 text-sm">待确认原因</h3>
            {match.pending_reasons?.length ? (
              <div className="space-y-2">
                {match.pending_reasons.map((reason) => (
                  <p key={reason} className="text-sm text-amber-800">{humanizeAIText(reason)}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700">当前无待确认原因。</p>
            )}
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h3 className="font-semibold text-rose-900 mb-2 text-sm">下一步建议补问</h3>
            {match.suggested_followup_questions?.length ? (
              <div className="space-y-2">
                {match.suggested_followup_questions.map((question) => (
                  <p key={question} className="text-sm text-rose-800">{question}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-rose-700">当前无补问建议。</p>
            )}
          </div>
        </div>
      )}

      {/* Profile cards */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">👨 男方</p>
          <ProfileCard profile={maleProfile} intention={maleIntention} printable />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">👩 女方</p>
          <ProfileCard profile={femaleProfile} intention={femaleIntention} printable />
        </div>
      </div>

      {/* Follow-up area */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">跟进操作</h3>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-sm text-gray-600 flex items-center gap-1.5"><FileText className="w-4 h-4" />跟进备注</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="记录跟进情况..." />
        </div>

        {/* Meeting info */}
        {(status === 'both_agreed' || status === 'meeting_scheduled' || status === 'met') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-gray-600 flex items-center gap-1.5"><Calendar className="w-4 h-4" />约谈时间</Label>
                <Input type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-gray-600 flex items-center gap-1.5"><MapPin className="w-4 h-4" />约谈地点</Label>
                <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="地点" />
              </div>
            </div>
            {status === 'met' && (
              <div className="space-y-1">
                <Label className="text-sm text-gray-600">见面结果</Label>
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
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">推进跟进状态：</p>
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
              <Button size="sm" variant="outline" onClick={() => setShowDismiss(true)} className="text-gray-500">
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
