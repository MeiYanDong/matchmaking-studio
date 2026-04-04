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
  pending: 'border-border/80 bg-secondary text-foreground/70 dark:border-border/70 dark:bg-white/[0.06] dark:text-foreground/72',
  reviewing: 'border-primary/10 bg-primary/8 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-primary',
  contacted_male: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200',
  contacted_female: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200',
  both_agreed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
  meeting_scheduled: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
  met: 'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-500/25 dark:bg-lime-500/10 dark:text-lime-200',
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
  failed: 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200',
  dismissed: 'border-border bg-muted text-muted-foreground dark:border-border/70 dark:bg-white/[0.04] dark:text-foreground/50',
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
      <div className={`cursor-pointer rounded-[28px] border bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,250,255,0.95)_52%,rgba(241,246,252,0.93))] p-5 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-40px_rgba(15,23,42,0.2)] dark:bg-[linear-gradient(145deg,rgba(18,25,35,0.96),rgba(12,17,25,0.97)_52%,rgba(9,13,19,0.98))] dark:shadow-[0_30px_64px_-44px_rgba(0,0,0,0.62)] ${isPending ? 'border-primary/15 dark:border-primary/20' : 'border-border/80 dark:border-border/70'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/12">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-200" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground dark:text-foreground">{match.male_profile.name}</p>
                <p className="text-xs text-muted-foreground dark:text-foreground/60">
                  {[match.male_profile.age && `${match.male_profile.age}岁`, match.male_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center px-4">
            <div className="text-2xl font-bold text-primary dark:text-foreground">{Math.round(match.match_score)}</div>
            <div className="text-xs text-muted-foreground dark:text-foreground/66">匹配分</div>
            {breakdown && (
              <div className="flex gap-0.5 mt-1">
                {SCORE_DIMENSION_META.map(({ key, max }) => {
                  const score = breakdown[key as ScoreDimensionKey] ?? 0
                  return (
                    <div key={key} className="h-1.5 w-4 overflow-hidden rounded-full bg-secondary dark:bg-white/[0.08]">
                      <div className="h-full rounded-full bg-primary/85 dark:bg-primary" style={{ width: `${(score / max) * 100}%` }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <div className="text-right">
                <p className="font-medium text-sm text-foreground dark:text-foreground">{match.female_profile.name}</p>
                <p className="text-xs text-muted-foreground dark:text-foreground/60">
                  {[match.female_profile.age && `${match.female_profile.age}岁`, match.female_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 dark:bg-pink-500/12">
                <User className="w-4 h-4 text-pink-600 dark:text-pink-200" />
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
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-primary/10 bg-primary/8 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-primary'
              }
            >
              {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
            </Badge>
          </div>
        </div>

        {match.match_reason && (
          <p className="mt-3 line-clamp-1 pl-10 text-xs text-muted-foreground dark:text-foreground/60">{humanizeAIText(match.match_reason)}</p>
        )}
        {match.recommendation_type === 'pending_confirmation' && match.pending_reasons?.length ? (
          <p className="mt-2 line-clamp-1 pl-10 text-xs text-primary dark:text-primary">
            待确认：{match.pending_reasons.map((reason) => humanizeAIText(reason)).join('、')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
