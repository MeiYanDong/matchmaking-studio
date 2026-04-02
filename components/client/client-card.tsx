import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { User, MapPin, Briefcase, Heart } from 'lucide-react'
import { GENDER_LABELS, INTENT_LABELS, STATUS_LABELS } from '@/types/app'
import { GenderType, PrimaryIntent } from '@/types/database'

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
    intentions?: Array<{ primary_intent: PrimaryIntent | null }> | null
  }
}

export function ClientCard({ profile }: ClientCardProps) {
  const intention = profile.intentions?.[0]
  const genderColor = profile.gender === 'male' ? 'border-t-blue-400' : 'border-t-pink-400'

  return (
    <Link href={`/matchmaker/clients/${profile.id}`}>
      <div className={`bg-white rounded-xl border-t-4 ${genderColor} border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
              <User className={`w-5 h-5 ${profile.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-xs text-gray-400">{GENDER_LABELS[profile.gender as GenderType]}</p>
            </div>
          </div>
          <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {STATUS_LABELS[profile.status as keyof typeof STATUS_LABELS]}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600">
          {(profile.age || profile.city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {[profile.age && `${profile.age}岁`, profile.city].filter(Boolean).join(' · ')}
            </div>
          )}
          {profile.occupation && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {profile.job_title || profile.occupation}
            </div>
          )}
          {intention?.primary_intent && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-600">{INTENT_LABELS[intention.primary_intent as PrimaryIntent]}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
