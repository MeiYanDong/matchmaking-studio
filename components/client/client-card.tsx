import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin, Briefcase, Heart } from 'lucide-react'
import { GENDER_LABELS, INTENT_LABELS, STATUS_LABELS } from '@/types/app'
import { GenderType, PrimaryIntent } from '@/types/database'
import { ProfileAvatar } from '@/components/client/profile-avatar'
import { cn } from '@/lib/utils'

interface ClientCardProps {
  profile: {
    id: string
    name: string
    gender: GenderType
    status: string
    age: number | null
    city: string | null
    occupation: string | null
    job_title: string | null
    avatar_url?: string | null
    intentions?: Array<{ primary_intent: PrimaryIntent | null }> | null
  }
}

export function ClientCard({ profile }: ClientCardProps) {
  const intention = profile.intentions?.[0]
  const genderTone =
    profile.gender === 'male'
      ? 'bg-[radial-gradient(circle_at_top_left,rgba(11,99,246,0.12),transparent_42%),linear-gradient(180deg,rgba(246,250,255,0.96),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(114,168,255,0.18),transparent_42%),linear-gradient(180deg,rgba(16,24,36,0.98),rgba(11,16,23,0.96))]'
      : 'bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.1),transparent_44%),linear-gradient(180deg,rgba(254,246,250,0.96),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,111,166,0.14),transparent_42%),linear-gradient(180deg,rgba(25,20,31,0.98),rgba(11,16,23,0.96))]'

  return (
    <Link href={`/matchmaker/clients/${profile.id}`}>
      <div
        className={cn(
          'cursor-pointer rounded-[28px] border border-border/80 p-5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:border-primary/18 hover:shadow-[0_28px_60px_-40px_rgba(15,23,42,0.22)] dark:border-border/70 dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.6)] dark:hover:border-primary/28 dark:hover:shadow-[0_34px_72px_-44px_rgba(0,0,0,0.68)]',
          genderTone
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <ProfileAvatar
              name={profile.name}
              avatarUrl={profile.avatar_url}
              className={cn(
                'h-11 w-11 overflow-hidden rounded-full border border-white/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] dark:border-white/10 dark:shadow-[0_18px_34px_-20px_rgba(0,0,0,0.56)]',
                profile.gender === 'male'
                  ? 'bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98))] dark:bg-[linear-gradient(180deg,rgba(20,32,47,0.98),rgba(11,16,23,0.98))]'
                  : 'bg-[linear-gradient(180deg,rgba(253,242,248,0.98),rgba(255,255,255,0.98))] dark:bg-[linear-gradient(180deg,rgba(33,23,36,0.98),rgba(11,16,23,0.98))]'
              )}
              imageClassName="h-full w-full object-cover"
              iconClassName={cn('h-5 w-5', profile.gender === 'male' ? 'text-blue-600 dark:text-blue-300' : 'text-pink-600 dark:text-pink-300')}
            />
            <div>
              <p className="font-semibold text-foreground dark:text-foreground">{profile.name}</p>
              <p className="text-xs text-muted-foreground dark:text-foreground/58">{GENDER_LABELS[profile.gender as GenderType]}</p>
            </div>
          </div>
          <Badge
            variant={profile.status === 'active' ? 'secondary' : 'outline'}
            className={cn(
              'text-xs',
              profile.status === 'active' &&
                'bg-foreground/84 text-background dark:bg-white/14 dark:text-white dark:border-white/10'
            )}
          >
            {STATUS_LABELS[profile.status as keyof typeof STATUS_LABELS]}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground dark:text-foreground/68">
          {(profile.age || profile.city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 dark:text-foreground/42" />
              {[profile.age && `${profile.age}岁`, profile.city].filter(Boolean).join(' · ')}
            </div>
          )}
          {profile.occupation && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70 dark:text-foreground/42" />
              {profile.job_title || profile.occupation}
            </div>
          )}
          {intention?.primary_intent && (
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-primary/70 dark:text-primary/78" />
              <span className="text-foreground/80 dark:text-foreground/82">{INTENT_LABELS[intention.primary_intent as PrimaryIntent]}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
