import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import {
  MATCH_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  SCORE_DIMENSION_META,
  ScoreBreakdown,
  ScoreDimensionKey,
} from '@/types/app'
import { humanizeAIText } from '@/lib/ai/field-presentation'

const statusColor: Record<string, string> = {
  pending: 'border-border bg-secondary text-foreground/70',
  reviewing: 'border-primary/10 bg-primary/8 text-primary',
  contacted_male: 'border-sky-200 bg-sky-50 text-sky-700',
  contacted_female: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  both_agreed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  meeting_scheduled: 'border-amber-200 bg-amber-50 text-amber-700',
  met: 'border-lime-200 bg-lime-50 text-lime-700',
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-600',
  dismissed: 'border-border bg-muted text-muted-foreground',
}

interface MatchCardProps {
  match: {
    id: string
    status: string
    match_score: number
    match_reason: string | null
    score_breakdown: ScoreBreakdown | null
    recommendation_type: 'confirmed' | 'pending_confirmation' | 'rejected'
    pending_reasons?: string[] | null
    male_profile: { name: string; age: number | null; city: string | null }
    female_profile: { name: string; age: number | null; city: string | null }
  }
  hrefPrefix?: string
}

export function MatchCard({ match, hrefPrefix = '/matchmaker/matches' }: MatchCardProps) {
  const breakdown = match.score_breakdown
  const isPending = match.status === 'pending'

  return (
    <Link href={`${hrefPrefix}/${match.id}`}>
      <div className={`cursor-pointer rounded-[28px] border bg-white/95 p-5 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-40px_rgba(15,23,42,0.2)] ${isPending ? 'border-primary/15' : 'border-border/80'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{match.male_profile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[match.male_profile.age && `${match.male_profile.age}岁`, match.male_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center px-4">
            <div className="text-2xl font-bold text-primary">{Math.round(match.match_score)}</div>
            <div className="text-xs text-muted-foreground">匹配分</div>
            {breakdown && (
              <div className="flex gap-0.5 mt-1">
                {SCORE_DIMENSION_META.map(({ key, max }) => {
                  const score = breakdown[key as ScoreDimensionKey] ?? 0
                  return (
                    <div key={key} className="h-1.5 w-4 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary/85" style={{ width: `${(score / max) * 100}%` }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <div className="text-right">
                <p className="font-medium text-sm text-foreground">{match.female_profile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[match.female_profile.age && `${match.female_profile.age}岁`, match.female_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                <User className="w-4 h-4 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusColor[match.status]}`}>
              {MATCH_STATUS_LABELS[match.status as keyof typeof MATCH_STATUS_LABELS]}
            </span>
            <Badge
              variant="outline"
              className={
                match.recommendation_type === 'confirmed'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-primary/10 bg-primary/8 text-primary'
              }
            >
              {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
            </Badge>
          </div>
        </div>

        {match.match_reason && (
          <p className="mt-3 line-clamp-1 pl-10 text-xs text-muted-foreground">{humanizeAIText(match.match_reason)}</p>
        )}
        {match.recommendation_type === 'pending_confirmation' && match.pending_reasons?.length ? (
          <p className="mt-2 line-clamp-1 pl-10 text-xs text-primary">
            待确认：{match.pending_reasons.map((reason) => humanizeAIText(reason)).join('、')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
