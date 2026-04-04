import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin, Briefcase, Heart } from 'lucide-react'
import { GENDER_LABELS, INTENT_LABELS, STATUS_LABELS } from '@/types/app'
import { GenderType, PrimaryIntent } from '@/types/database'
import { ProfileAvatar } from '@/components/client/profile-avatar'

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
      ? 'bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(255,255,255,0.98))]'
      : 'bg-[linear-gradient(180deg,rgba(253,242,248,0.9),rgba(255,255,255,0.98))]'

  return (
    <Link href={`/matchmaker/clients/${profile.id}`}>
      <div
        className={`cursor-pointer rounded-[28px] border border-border/80 ${genderTone} p-5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_28px_60px_-40px_rgba(15,23,42,0.22)]`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <ProfileAvatar
              name={profile.name}
              avatarUrl={profile.avatar_url}
              className={`h-11 w-11 overflow-hidden rounded-full border border-white/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] ${profile.gender === 'male' ? 'bg-blue-50' : 'bg-rose-50'}`}
              imageClassName="h-full w-full object-cover"
              iconClassName={`h-5 w-5 ${profile.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}
            />
            <div>
              <p className="font-semibold text-foreground">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{GENDER_LABELS[profile.gender as GenderType]}</p>
            </div>
          </div>
          <Badge variant={profile.status === 'active' ? 'secondary' : 'outline'} className="text-xs">
            {STATUS_LABELS[profile.status as keyof typeof STATUS_LABELS]}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {(profile.age || profile.city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
              {[profile.age && `${profile.age}岁`, profile.city].filter(Boolean).join(' · ')}
            </div>
          )}
          {profile.occupation && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
              {profile.job_title || profile.occupation}
            </div>
          )}
          {intention?.primary_intent && (
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-foreground/80">{INTENT_LABELS[intention.primary_intent as PrimaryIntent]}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
