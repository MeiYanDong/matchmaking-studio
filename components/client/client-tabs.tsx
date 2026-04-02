'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Profile, Intention, Conversation, Match, TraitProfile, FollowupTask } from '@/types/database'
import { ProfileInfoTab } from './profile-info-tab'
import { MatchRecommendTab } from './match-recommend-tab'
import { ConversationsTab } from './conversations-tab'
import { FollowupTab } from './followup-tab'

interface ClientTabsProps {
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
  conversations: Conversation[]
  matches: (Match & { male_profile: Profile; female_profile: Profile })[]
  followupTasks: FollowupTask[]
}

export function ClientTabs({ profile, intention, traitProfile, conversations, matches, followupTasks }: ClientTabsProps) {
  const pendingMatchCount = matches.filter((match) => match.recommendation_type === 'pending_confirmation').length
  const openTaskCount = followupTasks.filter((task) => task.status === 'open' || task.status === 'in_progress').length

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="info">基本信息</TabsTrigger>
        <TabsTrigger value="matches">
          匹配推荐
          {pendingMatchCount > 0 && (
            <span className="ml-1.5 bg-rose-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5">
              {pendingMatchCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="conversations">录音记录</TabsTrigger>
        <TabsTrigger value="followup">
          跟进记录
          {openTaskCount > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5">
              {openTaskCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <ProfileInfoTab profile={profile} intention={intention} traitProfile={traitProfile} />
      </TabsContent>
      <TabsContent value="matches">
        <MatchRecommendTab matches={matches} profile={profile} />
      </TabsContent>
      <TabsContent value="conversations">
        <ConversationsTab conversations={conversations} profileId={profile.id} />
      </TabsContent>
      <TabsContent value="followup">
        <FollowupTab matches={matches} tasks={followupTasks} />
      </TabsContent>
    </Tabs>
  )
}
