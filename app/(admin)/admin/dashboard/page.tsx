import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/admin/stat-card'
import { MatchFunnel } from '@/components/admin/match-funnel'
import { NewUserTrend } from '@/components/admin/new-user-trend'
import { WorkloadRanking } from '@/components/admin/workload-ranking'
import { MatchingControls } from '@/components/admin/matching-controls'
import { getMatchThreshold } from '@/lib/matching/settings'
import { Users, Heart, TrendingUp, CheckCircle, UserCog, ShieldCheck, Sparkles, Clock3 } from 'lucide-react'

export default async function AdminDashboard() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await authClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/matchmaker/clients')

  const supabase = createServiceRoleClient()
  const currentThreshold = await getMatchThreshold()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalMale },
    { count: totalFemale },
    { count: newThisMonth },
    { count: activeMatches },
    { count: succeededMatches },
    { count: matchmakerCount },
    { data: matchStatusData },
    { data: allProfiles },
    { data: allIntentions },
    { data: allTraitProfiles },
    { data: matchmakers },
    { data: allMatches },
    { data: allFollowupTasks },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'male'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'female'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('matches').select('*', { count: 'exact', head: true }).not('status', 'in', '("failed","dismissed")'),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'succeeded'),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'matchmaker'),
    supabase.from('matches').select('status'),
    supabase.from('profiles').select('id, created_at, matchmaker_id, city, gender, age, education, occupation, annual_income, marital_history, has_children, phone, income_verified, assets_verified, marital_history_verified, hobbies'),
    supabase.from('intentions').select('profile_id, relationship_mode, accepts_mode_compensated_dating, accepts_mode_fertility_asset_arrangement, accepts_long_distance, relocation_willingness, accepts_partner_children, fertility_preference'),
    supabase.from('trait_profiles').select('profile_id, exercise_habits, diet_habits, sleep_schedule, smoking_habit, drinking_habit, social_preference, spending_style, emotional_stability'),
    supabase.from('user_roles').select('user_id, display_name').eq('role', 'matchmaker'),
    supabase.from('matches').select('matchmaker_id, status, dismissed_reason, match_score, male_profile_id, female_profile_id, recommendation_type, created_at, updated_at'),
    supabase.from('followup_tasks').select('matchmaker_id, status, task_type, created_at, updated_at'),
  ])

  const totalProfiles = (totalMale ?? 0) + (totalFemale ?? 0)
  const profileRows = allProfiles ?? []
  const intentionRows = allIntentions ?? []
  const traitRows = allTraitProfiles ?? []
  const followupTaskRows = allFollowupTasks ?? []

  const profileById = new Map(profileRows.map((profile) => [profile.id, profile]))
  const intentionByProfileId = new Map(intentionRows.map((intention) => [intention.profile_id, intention]))
  const traitByProfileId = new Map(traitRows.map((trait) => [trait.profile_id, trait]))

  const completenessRatio = (filled: number, total: number) => {
    if (!total) return 0
    return Math.round((filled / total) * 100)
  }

  const basicFieldKeys = ['phone', 'age', 'city', 'education', 'occupation', 'annual_income', 'marital_history', 'has_children'] as const
  const sensitiveFieldChecks = (profileId: string) => {
    const intention = intentionByProfileId.get(profileId)
    if (!intention) return 0

    return [
      intention.relationship_mode,
      intention.accepts_mode_compensated_dating,
      intention.accepts_mode_fertility_asset_arrangement,
      intention.accepts_long_distance,
      intention.relocation_willingness,
      intention.accepts_partner_children,
      intention.fertility_preference,
    ].filter(Boolean).length
  }

  const lifestyleFieldChecks = (profileId: string) => {
    const profile = profileById.get(profileId)
    const trait = traitByProfileId.get(profileId)
    return [
      profile?.hobbies?.length,
      trait?.exercise_habits,
      trait?.diet_habits,
      trait?.sleep_schedule,
      trait?.smoking_habit,
      trait?.drinking_habit,
      trait?.social_preference,
      trait?.spending_style,
      trait?.emotional_stability,
    ].filter(Boolean).length
  }

  const basicCompleteness = completenessRatio(
    profileRows.reduce((count, profile) => {
      return count + basicFieldKeys.filter((key) => {
        const value = profile[key]
        if (typeof value === 'boolean') return true
        return Array.isArray(value) ? value.length > 0 : Boolean(value)
      }).length
    }, 0),
    profileRows.length * basicFieldKeys.length
  )

  const sensitiveCompleteness = completenessRatio(
    profileRows.reduce((count, profile) => count + sensitiveFieldChecks(profile.id), 0),
    profileRows.length * 7
  )

  const lifestyleCompleteness = completenessRatio(
    profileRows.reduce((count, profile) => count + lifestyleFieldChecks(profile.id), 0),
    profileRows.length * 9
  )

  const verifiedFieldRatio = completenessRatio(
    profileRows.reduce((count, profile) => {
      return count + [profile.income_verified, profile.assets_verified, profile.marital_history_verified].filter(Boolean).length
    }, 0),
    profileRows.length * 3
  )

  const pendingConfirmationCount = (allMatches ?? []).filter((match) => match.recommendation_type === 'pending_confirmation').length
  const recommendationTypeCounts = (allMatches ?? []).reduce<Record<string, number>>((acc, match) => {
    const key = match.recommendation_type ?? 'confirmed'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const relationshipModeCounts = intentionRows.reduce<Record<string, number>>((acc, intention) => {
    if (!intention.relationship_mode) return acc
    acc[intention.relationship_mode] = (acc[intention.relationship_mode] ?? 0) + 1
    return acc
  }, {})

  const sensitiveConfirmHours = (allMatches ?? [])
    .filter((match) => match.recommendation_type === 'confirmed')
    .map((match) => {
      const createdAt = new Date(match.created_at).getTime()
      const updatedAt = new Date(match.updated_at).getTime()
      return Math.max(updatedAt - createdAt, 0) / 36e5
    })

  const avgSensitiveConfirmHours = sensitiveConfirmHours.length
    ? Math.round((sensitiveConfirmHours.reduce((sum, hours) => sum + hours, 0) / sensitiveConfirmHours.length) * 10) / 10
    : 0

  // Funnel data
  const statusCounts = matchStatusData?.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const funnelData = [
    { label: 'AI推荐', count: Object.values(statusCounts).reduce((a, b) => a + b, 0), color: '#f43f5e' },
    { label: '跟进中', count: (statusCounts['reviewing'] ?? 0) + (statusCounts['contacted_male'] ?? 0) + (statusCounts['contacted_female'] ?? 0) + (statusCounts['both_agreed'] ?? 0), color: '#8b5cf6' },
    { label: '已约谈', count: (statusCounts['meeting_scheduled'] ?? 0) + (statusCounts['met'] ?? 0), color: '#f97316' },
    { label: '匹配成功', count: statusCounts['succeeded'] ?? 0, color: '#22c55e' },
  ]

  const avgClientsPerMatchmaker = matchmakerCount ? Math.round(((totalMale ?? 0) + (totalFemale ?? 0)) / matchmakerCount) : 0

  const trendBuckets = Array.from({ length: 8 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() - (7 - offset) * 7)
    const weekStart = new Date(date)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
    const count = (allProfiles ?? []).filter((profile) => {
      const createdAt = new Date(profile.created_at)
      return createdAt >= weekStart && createdAt < weekEnd
    }).length

    return { label, count }
  })

  const workloadRows = (matchmakers ?? [])
    .map((matchmaker) => {
      const clientCount = (allProfiles ?? []).filter((profile) => profile.matchmaker_id === matchmaker.user_id).length
      const activeMatchCount = (allMatches ?? []).filter(
        (match) => match.matchmaker_id === matchmaker.user_id && !['failed', 'dismissed', 'succeeded'].includes(match.status)
      ).length
      const successCount = (allMatches ?? []).filter(
        (match) => match.matchmaker_id === matchmaker.user_id && match.status === 'succeeded'
      ).length
      const ownTasks = followupTaskRows.filter((task) => task.matchmaker_id === matchmaker.user_id)
      const closedTaskCount = ownTasks.filter((task) => task.status === 'done').length
      const completionRate = ownTasks.length ? Math.round((closedTaskCount / ownTasks.length) * 100) : 0

      return {
        id: matchmaker.user_id,
        name: matchmaker.display_name,
        clientCount,
        activeMatchCount,
        successCount,
        followupCompletionRate: completionRate,
      }
    })
    .sort((a, b) => b.clientCount - a.clientCount)

  const dismissedReasonRows = Object.entries(
    (allMatches ?? []).reduce((acc, match) => {
      if (match.status === 'dismissed') {
        const key = match.dismissed_reason?.trim() || '未填写原因'
        acc[key] = (acc[key] ?? 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])

  const succeededMatchesRows = (allMatches ?? []).filter((match) => match.status === 'succeeded')
  const successFeatureSummary = {
    avgScore: succeededMatchesRows.length
      ? Math.round(succeededMatchesRows.reduce((sum, match) => sum + match.match_score, 0) / succeededMatchesRows.length)
      : 0,
    total: succeededMatchesRows.length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">总览看板</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="男方客户"
          value={totalMale ?? 0}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="女方客户"
          value={totalFemale ?? 0}
          icon={<Users className="w-5 h-5 text-pink-500" />}
          color="pink"
        />
        <StatCard
          title="本月新增"
          value={newThisMonth ?? 0}
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          color="purple"
          subtitle="位客户"
        />
        <StatCard
          title="活跃匹配"
          value={activeMatches ?? 0}
          icon={<Heart className="w-5 h-5 text-rose-500" />}
          color="rose"
          subtitle="条进行中"
        />
        <StatCard
          title="匹配成功"
          value={succeededMatches ?? 0}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          color="green"
          subtitle="对"
        />
        <StatCard
          title="红娘团队"
          value={matchmakerCount ?? 0}
          icon={<UserCog className="w-5 h-5 text-orange-500" />}
          color="orange"
          subtitle={`人均 ${avgClientsPerMatchmaker} 位客户`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4 mb-8">
        <StatCard
          title="基础字段完整度"
          value={`${basicCompleteness}%`}
          icon={<Sparkles className="w-5 h-5 text-sky-500" />}
          color="blue"
          subtitle="姓名/城市/学历/收入等"
        />
        <StatCard
          title="敏感字段完整度"
          value={`${sensitiveCompleteness}%`}
          icon={<ShieldCheck className="w-5 h-5 text-amber-500" />}
          color="orange"
          subtitle="关系模式/接受状态"
        />
        <StatCard
          title="生活方式完整度"
          value={`${lifestyleCompleteness}%`}
          icon={<Heart className="w-5 h-5 text-emerald-500" />}
          color="green"
          subtitle="作息/运动/消费/情绪"
        />
        <StatCard
          title="待确认积压"
          value={pendingConfirmationCount}
          icon={<Clock3 className="w-5 h-5 text-rose-500" />}
          color="rose"
          subtitle={`核验字段占比 ${verifiedFieldRatio}%`}
        />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">匹配漏斗</h2>
        <MatchFunnel data={funnelData} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">新增用户趋势</h2>
          <NewUserTrend data={trendBuckets} />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">红娘工作量排行</h2>
            <span className="text-xs text-gray-400">按客户数排序</span>
          </div>
          <WorkloadRanking rows={workloadRows} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">放弃原因分布</h2>
          {!dismissedReasonRows.length ? (
            <p className="text-sm text-gray-400">暂时还没有被放弃的匹配记录。</p>
          ) : (
            <div className="space-y-3">
              {dismissedReasonRows.slice(0, 6).map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 line-clamp-1">{reason}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(count / dismissedReasonRows[0][1]) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">成功配对特征</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl bg-green-50 p-4">
              <div className="text-sm text-green-700">成功配对数</div>
              <div className="text-3xl font-bold text-green-800 mt-2">{successFeatureSummary.total}</div>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <div className="text-sm text-rose-700">平均匹配分</div>
              <div className="text-3xl font-bold text-rose-700 mt-2">{successFeatureSummary.avgScore}</div>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-6">
            当前成功样本的主要特征会优先体现在匹配分和红娘跟进结果上。后续如果样本继续积累，可以继续根据这里的分布手动调整评分权重。
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">字段治理概览</h2>
          <div className="space-y-4">
            {[
              { label: '基础字段完整度', value: basicCompleteness, tone: 'bg-sky-500' },
              { label: '敏感字段完整度', value: sensitiveCompleteness, tone: 'bg-amber-500' },
              { label: '生活方式完整度', value: lifestyleCompleteness, tone: 'bg-emerald-500' },
              { label: '已核验字段占比', value: verifiedFieldRatio, tone: 'bg-violet-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-gray-400">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              当前共统计 {totalProfiles} 位客户，用来观察 AI-first 采集后字段的覆盖质量和敏感补问压力。
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">敏感模式运营视图</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="text-sm text-amber-700">待确认候选</div>
              <div className="text-3xl font-bold text-amber-800 mt-2">{pendingConfirmationCount}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-sm text-emerald-700">平均确认耗时</div>
              <div className="text-3xl font-bold text-emerald-800 mt-2">{avgSensitiveConfirmHours}h</div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              ['标准婚恋', relationshipModeCounts['marriage_standard'] ?? 0],
              ['恋爱且带经济安排', relationshipModeCounts['compensated_dating'] ?? 0],
              ['生育资产安排型', relationshipModeCounts['fertility_asset_arrangement'] ?? 0],
            ].map(([label, count]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-gray-500">已确认</div>
              <div className="mt-1 text-xl font-semibold text-gray-900">{recommendationTypeCounts['confirmed'] ?? 0}</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-amber-700">待确认</div>
              <div className="mt-1 text-xl font-semibold text-amber-800">{recommendationTypeCounts['pending_confirmation'] ?? 0}</div>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <div className="text-red-700">已排除</div>
              <div className="mt-1 text-xl font-semibold text-red-800">{recommendationTypeCounts['rejected'] ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <MatchingControls currentThreshold={currentThreshold} />
      </div>
    </div>
  )
}
