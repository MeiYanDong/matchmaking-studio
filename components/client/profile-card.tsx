'use client'

import { Profile, Intention } from '@/types/database'
import { GENDER_LABELS, EDUCATION_LABELS, INTENT_LABELS, STATUS_LABELS, TRI_STATE_LABELS } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User, MapPin, Briefcase, GraduationCap, Heart, DollarSign, Printer, Images, Scale, Sparkles } from 'lucide-react'

interface ProfileCardProps {
  profile: Profile
  intention?: Intention | null
  compact?: boolean
  printable?: boolean
}

function renderPhoto(profile: Profile) {
  const photoUrl = profile.photo_urls?.[0]

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={profile.name} className="w-full h-full object-cover" />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-amber-50 text-gray-400">
      <div className="text-center">
        <Images className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs">暂无照片</p>
      </div>
    </div>
  )
}

export function ProfileCard({ profile, intention, compact = false, printable = false }: ProfileCardProps) {
  const genderColor = profile.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
  const intentLabel = intention?.primary_intent ? INTENT_LABELS[intention.primary_intent] : null

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${genderColor}`}>
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{profile.name}</span>
            <Badge variant="outline" className="text-xs">{GENDER_LABELS[profile.gender]}</Badge>
            {intentLabel && <Badge className="text-xs bg-rose-100 text-rose-700 hover:bg-rose-100">{intentLabel}</Badge>}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {[profile.age && `${profile.age}岁`, profile.city, profile.occupation].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl print-card-shell">
      <div className={`h-2 ${profile.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`} />
      <CardContent className="pt-0 px-0">
        <div className="grid lg:grid-cols-[220px_1fr]">
          <div className="bg-gray-50 border-r border-gray-100">
            <div className="aspect-[3/4] overflow-hidden">
              {renderPhoto(profile)}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{GENDER_LABELS[profile.gender]}</Badge>
                <Badge variant="secondary">{STATUS_LABELS[profile.status]}</Badge>
              </div>
              {printable && (
                <Button type="button" variant="outline" className="w-full no-print" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  打印 / 导出
                </Button>
              )}
              {profile.raw_notes && (
                <details className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <summary className="text-xs font-medium text-amber-700 cursor-pointer">查看内部备注</summary>
                  <p className="text-xs text-amber-800 leading-5 mt-2 whitespace-pre-wrap">{profile.raw_notes}</p>
                </details>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-semibold text-gray-900">{profile.name}</h3>
                  {intentLabel && (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                      <Heart className="w-3.5 h-3.5 mr-1" />
                      {intentLabel}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {[profile.age && `${profile.age}岁`, profile.city, profile.hometown && `籍贯 ${profile.hometown}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              {profile.appearance_score && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center">
                  <div className="text-xs text-rose-500">颜值印象</div>
                  <div className="text-2xl font-bold text-rose-600">{profile.appearance_score}</div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="所在城市" value={profile.city} />
              <InfoRow icon={<GraduationCap className="w-4 h-4 text-gray-400" />} label="学历" value={profile.education ? EDUCATION_LABELS[profile.education] : null} />
              <InfoRow icon={<Briefcase className="w-4 h-4 text-gray-400" />} label="职业" value={profile.job_title || profile.occupation} />
              <InfoRow icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="收入" value={profile.annual_income ? `约 ${profile.annual_income} 万元` : profile.income_range} />
              <InfoRow icon={<Scale className="w-4 h-4 text-gray-400" />} label="身高 / 体重" value={[profile.height && `${profile.height}cm`, profile.weight && `${profile.weight}kg`].filter(Boolean).join(' / ') || null} />
              <InfoRow icon={<Sparkles className="w-4 h-4 text-gray-400" />} label="资产情况" value={profile.assets} />
            </div>

            {profile.hobbies?.length ? (
              <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5">
                <h4 className="font-medium text-gray-900 mb-3">兴趣爱好</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby) => (
                    <span key={hobby} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700">
                      {hobby}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-gray-100 bg-white p-5 space-y-3">
              <h4 className="font-medium text-gray-900">意图区</h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <InfoRow label="主意图" value={intentLabel} />
                <InfoRow
                  label="期望年龄"
                  value={
                    intention?.preferred_age_min || intention?.preferred_age_max
                      ? `${intention?.preferred_age_min ?? '?'}-${intention?.preferred_age_max ?? '?'} 岁`
                      : null
                  }
                />
                <InfoRow label="期望城市" value={intention?.preferred_cities?.join('、') || null} />
                <InfoRow
                  label="期望学历"
                  value={intention?.preferred_education?.map((item) => EDUCATION_LABELS[item]).join('、') || null}
                />
                <InfoRow label="期望最低收入" value={intention?.preferred_income_min ? `${intention.preferred_income_min} 万元+` : null} />
                <InfoRow
                  label="是否接受异地"
                  value={intention?.accepts_long_distance ? TRI_STATE_LABELS[intention.accepts_long_distance] : null}
                />
              </div>
              {intention?.dealbreakers?.length ? (
                <div>
                  <p className="text-xs text-gray-400 mb-2">硬性要求</p>
                  <div className="flex flex-wrap gap-2">
                    {intention.dealbreakers.map((item) => (
                      <span key={item} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600 border border-red-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {profile.ai_summary && (
              <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-5">
                <h4 className="font-medium text-rose-700 mb-2">AI 综合描述</h4>
                <p className="text-sm text-gray-600 leading-7 whitespace-pre-wrap">{profile.ai_summary}</p>
              </section>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium">{value || '未填写'}</div>
    </div>
  )
}
