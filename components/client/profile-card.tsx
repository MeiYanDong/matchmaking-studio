'use client'

import { Profile, Intention } from '@/types/database'
import { GENDER_LABELS, EDUCATION_LABELS, EDUCATION_LEVEL_V2_LABELS, INTENT_LABELS, STATUS_LABELS, TRI_STATE_LABELS, MARITAL_HISTORY_LABELS, HAS_CHILDREN_LABELS, LIFESTYLE_YN_LABELS } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Briefcase, GraduationCap, Heart, DollarSign, Printer, Scale, Sparkles } from 'lucide-react'
import { ProfileAvatar } from '@/components/client/profile-avatar'

interface ProfileCardProps {
  profile: Profile
  intention?: Intention | null
  compact?: boolean
  printable?: boolean
}

export function ProfileCard({ profile, intention, compact = false, printable = false }: ProfileCardProps) {
  const genderColor = profile.gender === 'male'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-400/12 dark:text-blue-100'
    : 'bg-pink-100 text-pink-700 dark:bg-pink-400/12 dark:text-pink-100'
  const intentLabel = intention?.primary_intent ? INTENT_LABELS[intention.primary_intent] : null

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
        <ProfileAvatar
          name={profile.name}
          avatarUrl={profile.avatar_url}
          className={`h-10 w-10 rounded-full overflow-hidden border ${genderColor} border-white/60 shadow-sm`}
          imageClassName="h-full w-full object-cover"
          iconClassName="h-5 w-5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium dark:text-foreground">{profile.name}</span>
            <Badge variant="outline" className="text-xs dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">{GENDER_LABELS[profile.gender]}</Badge>
            {intentLabel && <Badge className="text-xs bg-rose-100 text-rose-700 hover:bg-rose-100 dark:border-rose-300/12 dark:bg-rose-400/[0.08] dark:text-rose-100">{intentLabel}</Badge>}
          </div>
          <p className="truncate text-xs text-gray-500 dark:text-foreground/56">
            {[profile.age && `${profile.age}岁`, profile.current_city || profile.city, profile.occupation].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="print-card-shell overflow-hidden border-0 shadow-xl dark:border dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(18,25,35,0.98),rgba(11,16,24,0.98)_58%,rgba(8,12,18,0.98))] dark:shadow-[0_30px_72px_-42px_rgba(0,0,0,0.68)]">
      <div className={`h-2 ${profile.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`} />
      <CardContent className="pt-0 px-0">
        <div className="grid lg:grid-cols-[220px_1fr]">
          <div className="border-r border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,20,30,0.98),rgba(10,15,22,0.98))]">
            <div className="aspect-[3/4] overflow-hidden">
              <ProfileAvatar
                name={profile.name}
                avatarUrl={profile.avatar_url}
                className="h-full w-full rounded-none border-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(241,244,249,0.82))] dark:bg-[radial-gradient(circle_at_top_left,rgba(103,132,177,0.16),transparent_45%),linear-gradient(180deg,rgba(18,25,35,0.98),rgba(11,16,23,0.96))]"
                imageClassName="h-full w-full object-cover"
                iconClassName="h-10 w-10 text-[#b87e74]"
                fallbackLabel="暂无头像"
              />
            </div>
            <div className="space-y-3 border-t border-gray-100/80 p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(19,27,38,0.96),rgba(12,18,26,0.98))]">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">{GENDER_LABELS[profile.gender]}</Badge>
                <Badge variant="secondary" className="dark:border-white/10 dark:bg-white/[0.08] dark:text-foreground/78">{STATUS_LABELS[profile.status]}</Badge>
              </div>
              {printable && (
                <Button
                  type="button"
                  variant="outline"
                  className="no-print w-full dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(44,55,72,0.72),rgba(31,40,54,0.78))] dark:text-foreground/78 dark:hover:bg-[linear-gradient(180deg,rgba(54,67,86,0.82),rgba(36,46,60,0.9))]"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  打印 / 导出
                </Button>
              )}
              {profile.raw_notes && (
                <details className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-300/12 dark:bg-[linear-gradient(145deg,rgba(78,55,24,0.42),rgba(32,25,18,0.62))]">
                  <summary className="cursor-pointer text-xs font-medium text-amber-700 dark:text-amber-100">查看内部备注</summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-amber-800 dark:text-amber-100/84">{profile.raw_notes}</p>
                </details>
              )}
            </div>
          </div>

          <div className="space-y-6 p-6 dark:bg-[linear-gradient(180deg,rgba(17,24,34,0.98),rgba(11,16,23,0.98))]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-foreground">{profile.name}</h3>
                  {intentLabel && (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:border-rose-300/12 dark:bg-rose-400/[0.1] dark:text-rose-100">
                      <Heart className="w-3.5 h-3.5 mr-1" />
                      {intentLabel}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-foreground/56">
                  {[profile.age && `${profile.age}岁`, profile.current_city || profile.city, (profile.hukou_city || profile.hometown) && `籍贯 ${profile.hukou_city || profile.hometown}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              {profile.appearance_score && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center dark:border dark:border-rose-300/12 dark:bg-[linear-gradient(145deg,rgba(78,34,49,0.36),rgba(29,21,33,0.62))]">
                  <div className="text-xs text-rose-500 dark:text-rose-100/78">颜值印象</div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-100">{profile.appearance_score}</div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<MapPin className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="所在城市" value={profile.current_city || profile.city} />
              <InfoRow icon={<GraduationCap className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="学历" value={profile.education_level_v2 ? EDUCATION_LEVEL_V2_LABELS[profile.education_level_v2] : (profile.education ? EDUCATION_LABELS[profile.education] : null)} />
              <InfoRow icon={<Briefcase className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="职业" value={profile.job_title || profile.occupation} />
              <InfoRow icon={<DollarSign className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="收入" value={profile.monthly_income ? `月收入约 ${profile.monthly_income} 万元` : (profile.annual_income ? `约 ${profile.annual_income} 万元` : profile.income_range)} />
              <InfoRow icon={<Scale className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="身高 / 体重" value={[(profile.height_cm || profile.height) && `${profile.height_cm || profile.height}cm`, (profile.weight_kg || profile.weight) && `${profile.weight_kg || profile.weight}kg`].filter(Boolean).join(' / ') || null} />
              <InfoRow icon={<Sparkles className="h-4 w-4 text-gray-400 dark:text-foreground/36" />} label="婚史 / 孩子" value={[profile.marital_history_enum ? MARITAL_HISTORY_LABELS[profile.marital_history_enum] : profile.marital_history, profile.has_children_enum ? `有孩：${HAS_CHILDREN_LABELS[profile.has_children_enum]}` : (profile.has_children != null ? `有孩：${profile.has_children ? '是' : '否'}` : null)].filter(Boolean).join(' · ') || null} />
            </div>

            {profile.hobbies?.length ? (
              <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5 dark:border-rose-300/10 dark:bg-[linear-gradient(145deg,rgba(48,31,44,0.62),rgba(22,19,30,0.78))]">
                <h4 className="mb-3 font-medium text-gray-900 dark:text-foreground">兴趣爱好</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby) => (
                    <span key={hobby} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700 dark:border-rose-300/12 dark:bg-rose-400/[0.12] dark:text-rose-100">
                      {hobby}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3 rounded-3xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(20,28,39,0.92),rgba(12,17,25,0.96))]">
              <h4 className="font-medium text-gray-900 dark:text-foreground">意图区</h4>
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
                  <p className="mb-2 text-xs text-gray-400 dark:text-foreground/40">硬性要求</p>
                  <div className="flex flex-wrap gap-2">
                    {intention.dealbreakers.map((item) => (
                      <span key={item} className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs text-red-600 dark:border-red-300/12 dark:bg-red-400/[0.12] dark:text-red-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {profile.ai_summary && (
              <section className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-rose-300/10 dark:bg-[linear-gradient(145deg,rgba(50,23,34,0.42),rgba(18,19,28,0.66))]">
                <h4 className="mb-2 font-medium text-rose-700 dark:text-rose-100">AI 综合描述</h4>
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-foreground/72">{profile.ai_summary}</p>
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
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(28,36,48,0.72),rgba(17,23,32,0.84))]">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-400 dark:text-foreground/40">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-gray-700 dark:text-foreground/84">{value || '未填写'}</div>
    </div>
  )
}
