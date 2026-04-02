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
  pending: 'bg-gray-100 text-gray-600',
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
      <div className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer ${isPending ? 'border-rose-200' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{match.male_profile.name}</p>
                <p className="text-xs text-gray-400">
                  {[match.male_profile.age && `${match.male_profile.age}岁`, match.male_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center px-4">
            <div className="text-2xl font-bold text-rose-500">{Math.round(match.match_score)}</div>
            <div className="text-xs text-gray-400">匹配分</div>
            {breakdown && (
              <div className="flex gap-0.5 mt-1">
                {SCORE_DIMENSION_META.map(({ key, max }) => {
                  const score = breakdown[key as ScoreDimensionKey] ?? 0
                  return (
                    <div key={key} className="w-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(score / max) * 100}%` }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <div className="text-right">
                <p className="font-medium text-sm">{match.female_profile.name}</p>
                <p className="text-xs text-gray-400">
                  {[match.female_profile.age && `${match.female_profile.age}岁`, match.female_profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <User className="w-4 h-4 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusColor[match.status]}`}>
              {MATCH_STATUS_LABELS[match.status as keyof typeof MATCH_STATUS_LABELS]}
            </span>
            <Badge
              variant="outline"
              className={
                match.recommendation_type === 'confirmed'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }
            >
              {RECOMMENDATION_TYPE_LABELS[match.recommendation_type]}
            </Badge>
          </div>
        </div>

        {match.match_reason && (
          <p className="text-xs text-gray-500 mt-3 pl-10 line-clamp-1">{humanizeAIText(match.match_reason)}</p>
        )}
        {match.recommendation_type === 'pending_confirmation' && match.pending_reasons?.length ? (
          <p className="text-xs text-amber-700 mt-2 pl-10 line-clamp-1">
            待确认：{match.pending_reasons.map((reason) => humanizeAIText(reason)).join('、')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
