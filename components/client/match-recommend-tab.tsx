'use client'

import { useState } from 'react'
import { Profile, Match } from '@/types/database'
import {
  MATCH_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  SCORE_DIMENSION_META,
  ScoreBreakdown,
  ScoreDimensionKey,
} from '@/types/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateMatchStatus, dismissMatch } from '@/actions/matches'
import { Heart, User, MapPin, Briefcase, TrendingUp, X } from 'lucide-react'
import { getFieldDisplayLabel, humanizeAIText } from '@/lib/ai/field-presentation'

interface MatchRecommendTabProps {
  matches: (Match & { male_profile: Profile; female_profile: Profile })[]
  profile: Profile
}

export function MatchRecommendTab({ matches, profile }: MatchRecommendTabProps) {
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [dismissReason, setDismissReason] = useState('')
  const [loading, setLoading] = useState(false)

  const activeMatches = matches.filter(
    (match) => match.status !== 'dismissed' && match.status !== 'failed' && match.recommendation_type !== 'rejected'
  )
  const confirmedMatches = activeMatches.filter((match) => match.recommendation_type === 'confirmed')
  const pendingMatches = activeMatches.filter((match) => match.recommendation_type === 'pending_confirmation')
  const topConfirmed = confirmedMatches[0] ?? null
  const supportingConfirmed = topConfirmed ? confirmedMatches.slice(1, 3) : confirmedMatches.slice(0, 3)
  const topPending = pendingMatches[0] ?? null
  const supportingPending = topPending ? pendingMatches.slice(1, 3) : pendingMatches.slice(0, 3)

  async function handleFollowup(matchId: string) {
    setLoading(true)
    try {
      await updateMatchStatus(matchId, { status: 'reviewing' })
      toast.success('已标记为跟进中')
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss() {
    if (!dismissing) return
    setLoading(true)
    try {
      await dismissMatch(dismissing, dismissReason)
      toast.success('已放弃此推荐')
      setDismissing(null)
      setDismissReason('')
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  if (!activeMatches.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-white/72 py-16 text-center text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-foreground/56">
        <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">暂无匹配推荐</p>
        <p className="text-sm mt-1">完善客户信息后，AI 将自动生成匹配推荐</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {confirmedMatches.length > 0 && (
        <SectionTitle
          title="已确认候选"
          description={`前台主显 Top1，当前共 ${confirmedMatches.length} 条可直接推进的候选，并保留另外 2 条候补`}
        />
      )}
      {topConfirmed ? [topConfirmed].map(match => {
        const otherProfile = profile.gender === 'male' ? match.female_profile : match.male_profile
        const breakdown = match.score_breakdown as ScoreBreakdown | null

        return (
          <div key={match.id} className="rounded-[28px] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96)_52%,rgba(244,247,252,0.94))] p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top_left,rgba(82,145,243,0.18),transparent_34%),linear-gradient(145deg,rgba(16,24,36,0.98),rgba(10,15,23,0.98)_58%,rgba(9,13,21,0.96))] dark:shadow-[0_30px_72px_-42px_rgba(0,0,0,0.68)]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${otherProfile.gender === 'male' ? 'bg-blue-100 dark:bg-blue-400/[0.14]' : 'bg-pink-100 dark:bg-pink-400/[0.12]'}`}>
                  <User className={`w-6 h-6 ${otherProfile.gender === 'male' ? 'text-blue-600 dark:text-blue-200' : 'text-pink-600 dark:text-pink-200'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-foreground">{otherProfile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-foreground/56">
                    {[otherProfile.age && `${otherProfile.age}岁`, otherProfile.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{Math.round(match.match_score)}</div>
                  <div className="text-xs text-gray-400 dark:text-foreground/46">匹配分</div>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/12 dark:bg-emerald-400/[0.08] dark:text-emerald-100">
                  {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
                </Badge>
                <Badge variant={match.status === 'pending' ? 'default' : 'secondary'} className="text-xs">
                  {MATCH_STATUS_LABELS[match.status]}
                </Badge>
              </div>
            </div>

            {/* Score breakdown */}
            {breakdown && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {SCORE_DIMENSION_META.map(({ label, key, max }) => {
                  const score = breakdown[key as ScoreDimensionKey] ?? 0
                  const pct = (score / max) * 100
                  return (
                    <div key={key} className="text-center">
                      <div className="text-xs text-gray-500 mb-1 dark:text-foreground/50">{label}</div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden dark:bg-white/[0.08]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs font-medium mt-1 dark:text-foreground/84">{Math.round(score)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Match reason */}
            {match.match_reason && (
              <p className="mb-4 rounded-[18px] border border-primary/10 bg-primary/8 p-3 text-sm text-slate-700 dark:border-primary/16 dark:bg-primary/12 dark:text-foreground/78">
                {humanizeAIText(match.match_reason)}
              </p>
            )}

            {/* Actions */}
            {match.status === 'pending' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleFollowup(match.id)} disabled={loading}>
                  <TrendingUp className="w-4 h-4 mr-1" />开始跟进
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDismissing(match.id)}>
                  <X className="w-4 h-4 mr-1" />放弃
                </Button>
              </div>
            )}
          </div>
        )
      }) : null}

      {supportingConfirmed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top 3 候补</p>
          {supportingConfirmed.map(match => {
            const otherProfile = profile.gender === 'male' ? match.female_profile : match.male_profile
            const breakdown = match.score_breakdown as ScoreBreakdown | null

            return (
              <div key={match.id} className="rounded-[26px] border border-border/80 bg-white/84 p-5 shadow-[0_18px_40px_-38px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(145deg,rgba(14,20,31,0.96),rgba(10,15,22,0.94))] dark:shadow-[0_26px_64px_-40px_rgba(0,0,0,0.64)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${otherProfile.gender === 'male' ? 'bg-blue-100 dark:bg-blue-400/[0.14]' : 'bg-pink-100 dark:bg-pink-400/[0.12]'}`}>
                      <User className={`w-6 h-6 ${otherProfile.gender === 'male' ? 'text-blue-600 dark:text-blue-200' : 'text-pink-600 dark:text-pink-200'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-foreground">{otherProfile.name}</p>
                      <p className="text-sm text-gray-500 dark:text-foreground/56">
                        {[otherProfile.age && `${otherProfile.age}岁`, otherProfile.city].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{Math.round(match.match_score)}</div>
                      <div className="text-xs text-gray-400 dark:text-foreground/46">匹配分</div>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/12 dark:bg-emerald-400/[0.08] dark:text-emerald-100">
                      {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
                    </Badge>
                  </div>
                </div>

                {breakdown && (
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {SCORE_DIMENSION_META.map(({ label, key, max }) => {
                      const score = breakdown[key as ScoreDimensionKey] ?? 0
                      const pct = (score / max) * 100
                      return (
                        <div key={key} className="text-center">
                          <div className="text-xs text-gray-500 mb-1 dark:text-foreground/50">{label}</div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden dark:bg-white/[0.08]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs font-medium mt-1 dark:text-foreground/84">{Math.round(score)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {match.match_reason && (
                  <p className="rounded-[18px] border border-primary/10 bg-primary/8 p-3 text-sm text-slate-700 dark:border-primary/16 dark:bg-primary/12 dark:text-foreground/78">
                    {humanizeAIText(match.match_reason)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pendingMatches.length > 0 && (
        <SectionTitle
          title="待确认候选"
          description={`这些候选基础分不错，但仍有敏感字段需要补问；当前主显 Top1，并保留另外 2 条待确认候补`}
        />
      )}
      {topPending ? [topPending].map((match) => {
        const otherProfile = profile.gender === 'male' ? match.female_profile : match.male_profile
        const breakdown = match.score_breakdown as ScoreBreakdown | null

        return (
          <div key={match.id} className="rounded-[28px] border border-primary/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,248,255,0.96)_55%,rgba(237,244,255,0.94))] p-5 shadow-[0_20px_48px_-40px_rgba(59,130,246,0.14)] dark:border-primary/14 dark:bg-[radial-gradient(circle_at_top_left,rgba(82,145,243,0.18),transparent_34%),linear-gradient(145deg,rgba(14,21,33,0.98),rgba(10,15,23,0.98)_58%,rgba(8,12,19,0.96))] dark:shadow-[0_30px_72px_-42px_rgba(15,56,121,0.52)]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${otherProfile.gender === 'male' ? 'bg-blue-100 dark:bg-blue-400/[0.14]' : 'bg-pink-100 dark:bg-pink-400/[0.12]'}`}>
                  <User className={`w-6 h-6 ${otherProfile.gender === 'male' ? 'text-blue-600 dark:text-blue-200' : 'text-pink-600 dark:text-pink-200'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-foreground">{otherProfile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-foreground/56">
                    {[otherProfile.age && `${otherProfile.age}岁`, otherProfile.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{Math.round(match.match_score)}</div>
                  <div className="text-xs text-gray-400 dark:text-foreground/46">匹配分</div>
                </div>
                <Badge variant="outline" className="border-primary/15 bg-white text-primary dark:border-primary/16 dark:bg-white/[0.06] dark:text-primary">
                  {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
                </Badge>
              </div>
            </div>

            {breakdown && breakdown.pending_fields.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {breakdown.pending_fields.map((field) => (
                  <Badge key={field} variant="outline" className="border-primary/15 bg-white text-primary dark:border-primary/16 dark:bg-white/[0.06] dark:text-primary">
                    待确认：{getFieldDisplayLabel(field)}
                  </Badge>
                ))}
              </div>
            )}

            {match.pending_reasons?.length ? (
              <div className="mb-3 rounded-[20px] border border-primary/10 bg-white/78 p-3 dark:border-primary/16 dark:bg-white/[0.05]">
                <p className="mb-2 text-xs font-medium text-primary">待确认原因</p>
                <div className="space-y-1">
                  {match.pending_reasons.map((reason) => (
                    <p key={reason} className="text-sm text-slate-700 dark:text-foreground/76">{humanizeAIText(reason)}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {match.suggested_followup_questions?.length ? (
              <div className="mb-3 rounded-[20px] border border-primary/10 bg-white p-3 dark:border-primary/16 dark:bg-white/[0.05]">
                <p className="mb-2 text-xs font-medium text-primary">AI 推荐补问</p>
                <div className="space-y-2">
                  {match.suggested_followup_questions.map((question) => (
                    <p key={question} className="text-sm text-slate-700 dark:text-foreground/76">{question}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {breakdown && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {SCORE_DIMENSION_META.map(({ label, key, max }) => {
                  const score = breakdown[key as ScoreDimensionKey] ?? 0
                  const pct = (score / max) * 100
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[11px] text-gray-500 mb-1 dark:text-foreground/50">{label}</div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden dark:bg-white/[0.08]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs font-medium mt-1 dark:text-foreground/84">{Math.round(score)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      }) : null}

      {supportingPending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">待确认候补</p>
          {supportingPending.map((match) => {
            const otherProfile = profile.gender === 'male' ? match.female_profile : match.male_profile
            const breakdown = match.score_breakdown as ScoreBreakdown | null

            return (
              <div key={match.id} className="rounded-[26px] border border-primary/10 bg-white/82 p-5 shadow-[0_18px_40px_-38px_rgba(59,130,246,0.14)] dark:border-primary/14 dark:bg-[linear-gradient(145deg,rgba(14,21,33,0.96),rgba(10,15,23,0.94))] dark:shadow-[0_26px_64px_-40px_rgba(15,56,121,0.5)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${otherProfile.gender === 'male' ? 'bg-blue-100 dark:bg-blue-400/[0.14]' : 'bg-pink-100 dark:bg-pink-400/[0.12]'}`}>
                      <User className={`w-6 h-6 ${otherProfile.gender === 'male' ? 'text-blue-600 dark:text-blue-200' : 'text-pink-600 dark:text-pink-200'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-foreground">{otherProfile.name}</p>
                      <p className="text-sm text-gray-500 dark:text-foreground/56">
                        {[otherProfile.age && `${otherProfile.age}岁`, otherProfile.city].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{Math.round(match.match_score)}</div>
                      <div className="text-xs text-gray-400 dark:text-foreground/46">匹配分</div>
                    </div>
                    <Badge variant="outline" className="border-primary/15 bg-white text-primary dark:border-primary/16 dark:bg-white/[0.06] dark:text-primary">
                      {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
                    </Badge>
                  </div>
                </div>

                {breakdown && breakdown.pending_fields.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {breakdown.pending_fields.map((field) => (
                      <Badge key={field} variant="outline" className="border-primary/15 bg-white text-primary dark:border-primary/16 dark:bg-white/[0.06] dark:text-primary">
                        待确认：{getFieldDisplayLabel(field)}
                      </Badge>
                    ))}
                  </div>
                )}

                {match.pending_reasons?.length ? (
                  <div className="mb-3 rounded-[20px] border border-primary/10 bg-white/78 p-3 dark:border-primary/16 dark:bg-white/[0.05]">
                    <p className="mb-2 text-xs font-medium text-primary">待确认原因</p>
                    <div className="space-y-1">
                      {match.pending_reasons.map((reason) => (
                        <p key={reason} className="text-sm text-slate-700 dark:text-foreground/76">{humanizeAIText(reason)}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Dismiss dialog */}
      <Dialog open={!!dismissing} onOpenChange={() => setDismissing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>放弃此推荐</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>放弃原因（可选）</Label>
            <Textarea value={dismissReason} onChange={e => setDismissReason(e.target.value)} placeholder="请输入放弃原因..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissing(null)}>取消</Button>
            <Button onClick={handleDismiss} disabled={loading} variant="destructive">确认放弃</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-foreground">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 dark:text-foreground/58">{description}</p>
    </div>
  )
}
