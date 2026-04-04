'use client'

import { useState } from 'react'
import { Profile, Intention, EducationLevel, GenderType, PrimaryIntent, ProfileStatus, RelationshipMode, TraitProfile, TriState } from '@/types/database'
import { EDUCATION_LABELS, GENDER_LABELS, INTENT_LABELS, STATUS_LABELS, TRI_STATE_LABELS } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EducationChipSelect } from '@/components/ui/education-chip-select'
import { PreferenceImportanceEditor } from '@/components/ui/preference-importance-editor'
import { toast } from 'sonner'
import { updateProfile, updateIntention, updateTraitProfile } from '@/actions/clients'
import { Edit, Save, X } from 'lucide-react'
import { formatFieldValueLines, parseEditableFieldValue, toEditableFieldValue } from '@/lib/ai/field-presentation'

interface ProfileInfoTabProps {
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
}

const BOOLEAN_OPTIONS = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' },
]

const TRI_STATE_OPTIONS = Object.entries(TRI_STATE_LABELS).map(([value, label]) => ({ value, label }))

export function ProfileInfoTab({ profile, intention, traitProfile }: ProfileInfoTabProps) {
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingIntent, setEditingIntent] = useState(false)
  const [saving, setSaving] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    gender: profile.gender,
    status: profile.status,
    age: profile.age?.toString() ?? '',
    height: profile.height?.toString() ?? '',
    weight: profile.weight?.toString() ?? '',
    city: profile.city ?? '',
    hometown: profile.hometown ?? '',
    education: profile.education ?? '',
    occupation: profile.occupation ?? '',
    job_title: profile.job_title ?? '',
    phone: profile.phone ?? '',
    annual_income: profile.annual_income?.toString() ?? '',
    income_range: profile.income_range ?? '',
    assets: profile.assets ?? '',
    appearance_score: profile.appearance_score?.toString() ?? '',
    photo_urls: profile.photo_urls?.join('\n') ?? '',
    hobbies: profile.hobbies?.join('、') ?? '',
    marital_history: profile.marital_history ?? '',
    has_children: booleanToForm(profile.has_children),
    children_notes: profile.children_notes ?? '',
    lifestyle_tags: profile.lifestyle_tags?.join('、') ?? '',
    personality_tags: profile.personality_tags?.join('、') ?? '',
    smoking: booleanToForm(profile.smoking),
    drinking: booleanToForm(profile.drinking),
    family_burden_notes: profile.family_burden_notes ?? '',
    parental_involvement: profile.parental_involvement ?? '',
    seriousness_score: profile.seriousness_score?.toString() ?? '',
    followup_strategy: profile.followup_strategy ?? '',
    hidden_expectations: profile.hidden_expectations ?? '',
    ai_summary: profile.ai_summary ?? '',
    raw_notes: profile.raw_notes ?? '',
  })

  const [traitForm, setTraitForm] = useState({
    exercise_habits: traitProfile?.exercise_habits ?? '',
    diet_habits: traitProfile?.diet_habits ?? '',
    sleep_schedule: traitProfile?.sleep_schedule ?? '',
    smoking_habit: traitProfile?.smoking_habit ?? '',
    drinking_habit: traitProfile?.drinking_habit ?? '',
    social_preference: traitProfile?.social_preference ?? '',
    spending_style: traitProfile?.spending_style ?? '',
    emotional_stability: traitProfile?.emotional_stability ?? '',
  })

  const [intentForm, setIntentForm] = useState({
    primary_intent: intention?.primary_intent ?? '',
    intent_notes: intention?.intent_notes ?? '',
    preferred_age_min: intention?.preferred_age_min?.toString() ?? '',
    preferred_age_max: intention?.preferred_age_max?.toString() ?? '',
    preferred_height_min: intention?.preferred_height_min?.toString() ?? '',
    preferred_income_min: intention?.preferred_income_min?.toString() ?? '',
    preferred_cities: intention?.preferred_cities?.join('、') ?? '',
    preferred_education: intention?.preferred_education?.join('、') ?? '',
    relationship_mode: intention?.relationship_mode ?? '',
    preference_importance: toEditableFieldValue('preference_importance', intention?.preference_importance ?? undefined),
    dealbreakers: intention?.dealbreakers?.join('\n') ?? '',
    tolerance_notes: intention?.tolerance_notes ?? '',
    acceptable_conditions: intention?.acceptable_conditions?.join('\n') ?? '',
    accepts_long_distance: triStateToForm(intention?.accepts_long_distance),
    long_distance_notes: intention?.long_distance_notes ?? '',
    fertility_preference: intention?.fertility_preference ?? '',
    settle_city_preferences: intention?.settle_city_preferences?.join('、') ?? '',
    relocation_willingness: triStateToForm(intention?.relocation_willingness),
    accepts_partner_marital_history: intention?.accepts_partner_marital_history?.join('\n') ?? '',
    accepts_partner_children: triStateToForm(intention?.accepts_partner_children),
    relationship_pace: intention?.relationship_pace ?? '',
    communication_style: intention?.communication_style ?? '',
    biggest_concerns: intention?.biggest_concerns?.join('\n') ?? '',
    implicit_intent_notes: intention?.implicit_intent_notes ?? '',
  })

  async function saveProfile() {
    setSaving(true)
    try {
      await Promise.all([
        updateProfile(profile.id, {
          name: profileForm.name.trim() || profile.name,
          gender: profileForm.gender as GenderType,
          status: profileForm.status as ProfileStatus,
          age: parseOptionalNumber(profileForm.age),
          height: parseOptionalNumber(profileForm.height),
          weight: parseOptionalNumber(profileForm.weight),
          city: emptyToNull(profileForm.city),
          hometown: emptyToNull(profileForm.hometown),
          education: profileForm.education as EducationLevel || null,
          occupation: emptyToNull(profileForm.occupation),
          job_title: emptyToNull(profileForm.job_title),
          phone: emptyToNull(profileForm.phone),
          annual_income: parseOptionalNumber(profileForm.annual_income),
          income_range: emptyToNull(profileForm.income_range),
          assets: emptyToNull(profileForm.assets),
          appearance_score: parseOptionalNumber(profileForm.appearance_score),
          photo_urls: splitList(profileForm.photo_urls),
          hobbies: splitList(profileForm.hobbies),
          marital_history: emptyToNull(profileForm.marital_history),
          has_children: parseOptionalBoolean(profileForm.has_children),
          children_notes: emptyToNull(profileForm.children_notes),
          lifestyle_tags: splitList(profileForm.lifestyle_tags),
          personality_tags: splitList(profileForm.personality_tags),
          smoking: parseOptionalBoolean(profileForm.smoking),
          drinking: parseOptionalBoolean(profileForm.drinking),
          family_burden_notes: emptyToNull(profileForm.family_burden_notes),
          parental_involvement: emptyToNull(profileForm.parental_involvement),
          seriousness_score: parseOptionalNumber(profileForm.seriousness_score),
          followup_strategy: emptyToNull(profileForm.followup_strategy),
          hidden_expectations: emptyToNull(profileForm.hidden_expectations),
          ai_summary: emptyToNull(profileForm.ai_summary),
          raw_notes: emptyToNull(profileForm.raw_notes),
        }),
        updateTraitProfile(profile.id, {
          exercise_habits: emptyToNull(traitForm.exercise_habits),
          diet_habits: emptyToNull(traitForm.diet_habits),
          sleep_schedule: emptyToNull(traitForm.sleep_schedule),
          smoking_habit: emptyToNull(traitForm.smoking_habit),
          drinking_habit: emptyToNull(traitForm.drinking_habit),
          social_preference: emptyToNull(traitForm.social_preference),
          spending_style: emptyToNull(traitForm.spending_style),
          emotional_stability: emptyToNull(traitForm.emotional_stability),
        }),
      ])
      toast.success('基础信息已保存')
      setEditingProfile(false)
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveIntent() {
    setSaving(true)
    try {
      await updateIntention(profile.id, {
        primary_intent: intentForm.primary_intent as PrimaryIntent || null,
        intent_notes: emptyToNull(intentForm.intent_notes),
        preferred_age_min: parseOptionalNumber(intentForm.preferred_age_min),
        preferred_age_max: parseOptionalNumber(intentForm.preferred_age_max),
        preferred_height_min: parseOptionalNumber(intentForm.preferred_height_min),
        preferred_income_min: parseOptionalNumber(intentForm.preferred_income_min),
        preferred_cities: splitList(intentForm.preferred_cities),
        preferred_education: splitList(intentForm.preferred_education) as EducationLevel[] | null,
        relationship_mode: (intentForm.relationship_mode as RelationshipMode) || null,
        dealbreakers: splitList(intentForm.dealbreakers),
        tolerance_notes: emptyToNull(intentForm.tolerance_notes),
        acceptable_conditions: splitList(intentForm.acceptable_conditions),
        accepts_long_distance: parseOptionalTriState(intentForm.accepts_long_distance),
        long_distance_notes: emptyToNull(intentForm.long_distance_notes),
        fertility_preference: emptyToNull(intentForm.fertility_preference),
        settle_city_preferences: splitList(intentForm.settle_city_preferences),
        relocation_willingness: parseOptionalTriState(intentForm.relocation_willingness),
        accepts_partner_marital_history: splitList(intentForm.accepts_partner_marital_history),
        accepts_partner_children: parseOptionalTriState(intentForm.accepts_partner_children),
        relationship_pace: emptyToNull(intentForm.relationship_pace),
        communication_style: emptyToNull(intentForm.communication_style),
        biggest_concerns: splitList(intentForm.biggest_concerns),
        implicit_intent_notes: emptyToNull(intentForm.implicit_intent_notes),
        preference_importance: parseEditableFieldValue(
          'preference_importance',
          'json',
          intentForm.preference_importance
        ) ?? null,
      })
      toast.success('意图信息已保存')
      setEditingIntent(false)
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">基础信息</h3>
          {editingProfile ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />取消
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={saving} className="bg-rose-500 hover:bg-rose-600">
                <Save className="w-4 h-4 mr-1" />{saving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
              <Edit className="w-4 h-4 mr-1" />编辑
            </Button>
          )}
        </div>

        {editingProfile ? (
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="姓名" value={profileForm.name} onChange={v => setProfileForm((p) => ({ ...p, name: v }))} />
            <SelectField
              label="性别"
              value={profileForm.gender}
              onChange={(value) => setProfileForm((p) => ({ ...p, gender: value as GenderType }))}
              options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择性别"
            />
            <SelectField
              label="状态"
              value={profileForm.status}
              onChange={(value) => setProfileForm((p) => ({ ...p, status: value as ProfileStatus }))}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择状态"
            />
            <FieldInput label="联系方式" value={profileForm.phone} onChange={v => setProfileForm((p) => ({ ...p, phone: v }))} placeholder="手机号 / 微信 / 备注" />
            <FieldInput label="年龄" value={profileForm.age} onChange={v => setProfileForm((p) => ({ ...p, age: v }))} type="number" />
            <FieldInput label="身高(cm)" value={profileForm.height} onChange={v => setProfileForm((p) => ({ ...p, height: v }))} type="number" />
            <FieldInput label="体重(kg)" value={profileForm.weight} onChange={v => setProfileForm((p) => ({ ...p, weight: v }))} type="number" />
            <FieldInput label="所在城市" value={profileForm.city} onChange={v => setProfileForm((p) => ({ ...p, city: v }))} />
            <FieldInput label="户籍/老家" value={profileForm.hometown} onChange={v => setProfileForm((p) => ({ ...p, hometown: v }))} />
            <SelectField
              label="学历"
              value={profileForm.education}
              onChange={(value) => setProfileForm((p) => ({ ...p, education: value }))}
              options={Object.entries(EDUCATION_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择学历"
            />
            <FieldInput label="职业/行业" value={profileForm.occupation} onChange={v => setProfileForm((p) => ({ ...p, occupation: v }))} />
            <FieldInput label="具体职位" value={profileForm.job_title} onChange={v => setProfileForm((p) => ({ ...p, job_title: v }))} />
            <FieldInput label="年薪(万元)" value={profileForm.annual_income} onChange={v => setProfileForm((p) => ({ ...p, annual_income: v }))} type="number" />
            <FieldInput label="收入区间" value={profileForm.income_range} onChange={v => setProfileForm((p) => ({ ...p, income_range: v }))} />
            <FieldInput label="房产/车/资产" value={profileForm.assets} onChange={v => setProfileForm((p) => ({ ...p, assets: v }))} />
            <FieldInput label="颜值评分" value={profileForm.appearance_score} onChange={v => setProfileForm((p) => ({ ...p, appearance_score: v }))} type="number" />
            <FieldInput label="婚史" value={profileForm.marital_history} onChange={v => setProfileForm((p) => ({ ...p, marital_history: v }))} placeholder="未婚 / 离异 / 丧偶" />
            <FieldInput label="认真程度(1-10)" value={profileForm.seriousness_score} onChange={v => setProfileForm((p) => ({ ...p, seriousness_score: v }))} type="number" />
            <SelectField
              label="是否有孩子"
              value={profileForm.has_children}
              onChange={(value) => setProfileForm((p) => ({ ...p, has_children: value }))}
              options={BOOLEAN_OPTIONS}
              placeholder="请选择"
            />
            <SelectField
              label="是否吸烟"
              value={profileForm.smoking}
              onChange={(value) => setProfileForm((p) => ({ ...p, smoking: value }))}
              options={BOOLEAN_OPTIONS}
              placeholder="请选择"
            />
            <SelectField
              label="是否饮酒"
              value={profileForm.drinking}
              onChange={(value) => setProfileForm((p) => ({ ...p, drinking: value }))}
              options={BOOLEAN_OPTIONS}
              placeholder="请选择"
            />
            <FieldInput label="孩子情况补充" value={profileForm.children_notes} onChange={v => setProfileForm((p) => ({ ...p, children_notes: v }))} />
            <div className="col-span-2">
              <FieldInput label="兴趣爱好（逗号、顿号或换行分隔）" value={profileForm.hobbies} onChange={v => setProfileForm((p) => ({ ...p, hobbies: v }))} placeholder="旅行、徒步、羽毛球、看展" />
            </div>
            <div className="col-span-2">
              <FieldInput label="生活方式标签" value={profileForm.lifestyle_tags} onChange={v => setProfileForm((p) => ({ ...p, lifestyle_tags: v }))} placeholder="爱运动、规律、爱旅行" />
            </div>
            <div className="col-span-2">
              <FieldInput label="性格标签" value={profileForm.personality_tags} onChange={v => setProfileForm((p) => ({ ...p, personality_tags: v }))} placeholder="慢热、稳重、外向" />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="照片 URL（每行一条）" value={profileForm.photo_urls} onChange={v => setProfileForm((p) => ({ ...p, photo_urls: v }))} rows={3} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="家庭责任/压力说明" value={profileForm.family_burden_notes} onChange={v => setProfileForm((p) => ({ ...p, family_burden_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="父母介入程度" value={profileForm.parental_involvement} onChange={v => setProfileForm((p) => ({ ...p, parental_involvement: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="红娘推进建议" value={profileForm.followup_strategy} onChange={v => setProfileForm((p) => ({ ...p, followup_strategy: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="隐性期待 / 未明说诉求" value={profileForm.hidden_expectations} onChange={v => setProfileForm((p) => ({ ...p, hidden_expectations: v }))} rows={2} />
            </div>
            <FieldInput label="运动习惯" value={traitForm.exercise_habits} onChange={v => setTraitForm((p) => ({ ...p, exercise_habits: v }))} placeholder="每周跑步 2 次 / 几乎不运动" />
            <FieldInput label="饮食习惯" value={traitForm.diet_habits} onChange={v => setTraitForm((p) => ({ ...p, diet_habits: v }))} placeholder="清淡 / 健身餐 / 无忌口" />
            <FieldInput label="作息习惯" value={traitForm.sleep_schedule} onChange={v => setTraitForm((p) => ({ ...p, sleep_schedule: v }))} placeholder="早睡早起 / 经常熬夜" />
            <FieldInput label="吸烟习惯" value={traitForm.smoking_habit} onChange={v => setTraitForm((p) => ({ ...p, smoking_habit: v }))} placeholder="不吸烟 / 社交吸烟" />
            <FieldInput label="饮酒习惯" value={traitForm.drinking_habit} onChange={v => setTraitForm((p) => ({ ...p, drinking_habit: v }))} placeholder="偶尔饮酒 / 不饮酒" />
            <FieldInput label="社交偏好" value={traitForm.social_preference} onChange={v => setTraitForm((p) => ({ ...p, social_preference: v }))} placeholder="偏宅 / 平衡 / 爱社交" />
            <FieldInput label="消费方式" value={traitForm.spending_style} onChange={v => setTraitForm((p) => ({ ...p, spending_style: v }))} placeholder="理性 / 品质优先 / 愿意为体验花钱" />
            <FieldInput label="情绪稳定" value={traitForm.emotional_stability} onChange={v => setTraitForm((p) => ({ ...p, emotional_stability: v }))} placeholder="稳定 / 一般 / 敏感 / unknown" />
            <div className="col-span-2">
              <FieldTextarea label="AI 综合描述" value={profileForm.ai_summary} onChange={v => setProfileForm((p) => ({ ...p, ai_summary: v }))} rows={3} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="未结构化备注" value={profileForm.raw_notes} onChange={v => setProfileForm((p) => ({ ...p, raw_notes: v }))} rows={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="姓名" value={profile.name} />
              <InfoField label="性别" value={GENDER_LABELS[profile.gender]} />
              <InfoField label="状态" value={STATUS_LABELS[profile.status]} />
              <InfoField label="联系方式" value={profile.phone} />
              <InfoField label="年龄" value={profile.age ? `${profile.age} 岁` : ''} />
              <InfoField label="身高" value={profile.height ? `${profile.height} cm` : ''} />
              <InfoField label="体重" value={profile.weight ? `${profile.weight} kg` : ''} />
              <InfoField label="所在城市" value={profile.city} />
              <InfoField label="户籍/老家" value={profile.hometown} />
              <InfoField label="学历" value={profile.education ? EDUCATION_LABELS[profile.education] : ''} />
              <InfoField label="职业" value={profile.occupation} />
              <InfoField label="职位" value={profile.job_title} />
              <InfoField label="年薪" value={profile.annual_income ? `约 ${profile.annual_income} 万元` : ''} />
              <InfoField label="收入区间" value={profile.income_range} />
              <InfoField label="资产" value={profile.assets} />
              <InfoField label="颜值评分" value={profile.appearance_score ? `${profile.appearance_score} / 10` : ''} />
              <InfoField label="婚史" value={profile.marital_history} />
              <InfoField label="是否有孩子" value={formatBoolean(profile.has_children)} />
              <InfoField label="是否吸烟" value={formatBoolean(profile.smoking)} />
              <InfoField label="是否饮酒" value={formatBoolean(profile.drinking)} />
              <InfoField label="认真程度" value={profile.seriousness_score ? `${profile.seriousness_score} / 10` : ''} />
            </dl>

            <InfoTags label="兴趣爱好" items={profile.hobbies} tone="rose" />
            <InfoTags label="生活方式" items={profile.lifestyle_tags} tone="emerald" />
            <InfoTags label="性格标签" items={profile.personality_tags} tone="blue" />
            <PhotoGrid name={profile.name} urls={profile.photo_urls} />
            <InfoPanel label="孩子情况" value={profile.children_notes} tone="slate" />
            <InfoPanel label="家庭责任/压力" value={profile.family_burden_notes} tone="amber" />
            <InfoPanel label="父母介入程度" value={profile.parental_involvement} tone="orange" />
            <InfoPanel label="红娘推进建议" value={profile.followup_strategy} tone="green" />
            <InfoPanel label="隐性期待 / 未明说诉求" value={profile.hidden_expectations} tone="purple" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="运动习惯" value={traitProfile?.exercise_habits} />
              <InfoField label="饮食习惯" value={traitProfile?.diet_habits} />
              <InfoField label="作息习惯" value={traitProfile?.sleep_schedule} />
              <InfoField label="吸烟习惯" value={traitProfile?.smoking_habit} />
              <InfoField label="饮酒习惯" value={traitProfile?.drinking_habit} />
              <InfoField label="社交偏好" value={traitProfile?.social_preference} />
              <InfoField label="消费方式" value={traitProfile?.spending_style} />
              <InfoField label="情绪稳定" value={traitProfile?.emotional_stability} />
            </div>
            <InfoPanel label="AI 综合描述" value={profile.ai_summary} tone="gray" />
            <InfoPanel label="未结构化备注" value={profile.raw_notes} tone="amber" small />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">意图与偏好</h3>
          {editingIntent ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingIntent(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />取消
              </Button>
              <Button size="sm" onClick={saveIntent} disabled={saving} className="bg-rose-500 hover:bg-rose-600">
                <Save className="w-4 h-4 mr-1" />{saving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditingIntent(true)}>
              <Edit className="w-4 h-4 mr-1" />编辑
            </Button>
          )}
        </div>

        {editingIntent ? (
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="主意图"
              value={intentForm.primary_intent}
              onChange={(value) => setIntentForm((p) => ({ ...p, primary_intent: value as PrimaryIntent }))}
              options={Object.entries(INTENT_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择意图"
              className="col-span-2"
            />
            <div className="col-span-2">
              <FieldTextarea label="意图补充说明" value={intentForm.intent_notes} onChange={v => setIntentForm((p) => ({ ...p, intent_notes: v }))} rows={2} />
            </div>
            <FieldInput label="期望对方最小年龄" value={intentForm.preferred_age_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_age_min: v }))} type="number" />
            <FieldInput label="期望对方最大年龄" value={intentForm.preferred_age_max} onChange={v => setIntentForm((p) => ({ ...p, preferred_age_max: v }))} type="number" />
            <FieldInput label="期望对方最低身高(cm)" value={intentForm.preferred_height_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_height_min: v }))} type="number" />
            <FieldInput label="期望对方最低年薪(万)" value={intentForm.preferred_income_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_income_min: v }))} type="number" />
            <SelectField
              label="男方关系模式"
              value={intentForm.relationship_mode}
              onChange={(value) => setIntentForm((p) => ({ ...p, relationship_mode: value as RelationshipMode }))}
              options={[
                { value: 'marriage_standard', label: '奔着结婚去的标准婚恋' },
                { value: 'compensated_dating', label: '恋爱' },
                { value: 'fertility_asset_arrangement', label: '生育资产安排型' },
              ]}
              placeholder="选择关系模式"
              className="col-span-2"
            />
            <div className="col-span-2">
              <FieldInput label="可接受城市（逗号、顿号或换行分隔）" value={intentForm.preferred_cities} onChange={v => setIntentForm((p) => ({ ...p, preferred_cities: v }))} />
            </div>
            <div className="col-span-2">
              <div className="space-y-1">
                <Label className="text-sm text-gray-600">可接受学历</Label>
                <EducationChipSelect
                  value={intentForm.preferred_education}
                  onChange={(value) => setIntentForm((p) => ({ ...p, preferred_education: value }))}
                />
              </div>
            </div>
            <SelectField
              label="是否接受异地"
              value={intentForm.accepts_long_distance}
              onChange={(value) => setIntentForm((p) => ({ ...p, accepts_long_distance: value as TriState }))}
              options={TRI_STATE_OPTIONS}
              placeholder="请选择"
            />
            <SelectField
              label="是否愿意迁居"
              value={intentForm.relocation_willingness}
              onChange={(value) => setIntentForm((p) => ({ ...p, relocation_willingness: value as TriState }))}
              options={TRI_STATE_OPTIONS}
              placeholder="请选择"
            />
            <SelectField
              label="是否接受对方有孩子"
              value={intentForm.accepts_partner_children}
              onChange={(value) => setIntentForm((p) => ({ ...p, accepts_partner_children: value as TriState }))}
              options={TRI_STATE_OPTIONS}
              placeholder="请选择"
            />
            <FieldInput label="沟通风格 / 相处偏好" value={intentForm.communication_style} onChange={v => setIntentForm((p) => ({ ...p, communication_style: v }))} />
            <FieldInput label="推进节奏" value={intentForm.relationship_pace} onChange={v => setIntentForm((p) => ({ ...p, relationship_pace: v }))} placeholder="慢热 / 希望尽快见面" />
            <FieldInput label="生育意愿 / 时间窗口" value={intentForm.fertility_preference} onChange={v => setIntentForm((p) => ({ ...p, fertility_preference: v }))} />
            <div className="col-span-2">
              <FieldInput label="未来定居城市偏好" value={intentForm.settle_city_preferences} onChange={v => setIntentForm((p) => ({ ...p, settle_city_preferences: v }))} placeholder="上海、杭州、苏州" />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="硬性要求 / 绝对不接受（每行一条）" value={intentForm.dealbreakers} onChange={v => setIntentForm((p) => ({ ...p, dealbreakers: v }))} rows={3} placeholder="不接受离异&#10;不接受有孩子" />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="可接受但不理想条件（每行一条）" value={intentForm.acceptable_conditions} onChange={v => setIntentForm((p) => ({ ...p, acceptable_conditions: v }))} rows={3} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="可接受的对方婚史（每行一条）" value={intentForm.accepts_partner_marital_history} onChange={v => setIntentForm((p) => ({ ...p, accepts_partner_marital_history: v }))} rows={2} placeholder="未婚&#10;离异无孩" />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="当前最大顾虑（每行一条）" value={intentForm.biggest_concerns} onChange={v => setIntentForm((p) => ({ ...p, biggest_concerns: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="容忍边界说明" value={intentForm.tolerance_notes} onChange={v => setIntentForm((p) => ({ ...p, tolerance_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="异地补充说明" value={intentForm.long_distance_notes} onChange={v => setIntentForm((p) => ({ ...p, long_distance_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="隐性意图（AI/红娘判断）" value={intentForm.implicit_intent_notes} onChange={v => setIntentForm((p) => ({ ...p, implicit_intent_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600">偏好重要性</Label>
              <PreferenceImportanceEditor
                value={intentForm.preference_importance}
                onChange={(value) => setIntentForm((p) => ({ ...p, preference_importance: value }))}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="主意图" value={intention?.primary_intent ? INTENT_LABELS[intention.primary_intent] : ''} />
              <InfoField
                label="男方关系模式"
                value={intention?.relationship_mode ? ({
                  marriage_standard: '奔着结婚去的标准婚恋',
                  compensated_dating: '恋爱',
                  fertility_asset_arrangement: '生育资产安排型',
                }[intention.relationship_mode]) : ''}
              />
              <InfoField label="是否接受异地" value={formatTriState(intention?.accepts_long_distance)} />
              <InfoField label="是否愿意迁居" value={formatTriState(intention?.relocation_willingness)} />
              <InfoField label="是否接受对方有孩子" value={formatTriState(intention?.accepts_partner_children)} />
              <InfoField label="期望年龄" value={formatAgeRange(intention?.preferred_age_min, intention?.preferred_age_max)} />
              <InfoField label="期望最低年薪" value={intention?.preferred_income_min ? `${intention.preferred_income_min} 万元以上` : ''} />
              <InfoField label="推进节奏" value={intention?.relationship_pace} />
              <InfoField label="沟通风格" value={intention?.communication_style} />
              <InfoField label="生育意愿 / 时间窗口" value={intention?.fertility_preference} />
            </dl>

            <InfoPanel label="意图补充说明" value={intention?.intent_notes} tone="gray" />
            <InfoTags label="可接受城市" items={intention?.preferred_cities} tone="gray" />
            <InfoTags
              label="可接受学历"
              items={intention?.preferred_education?.map((item) => EDUCATION_LABELS[item])}
              tone="blue"
            />
            <InfoTags label="定居城市偏好" items={intention?.settle_city_preferences} tone="emerald" />
            <InfoTags label="可接受的对方婚史" items={intention?.accepts_partner_marital_history} tone="amber" />
            <InfoTags label="硬性要求" items={intention?.dealbreakers} tone="red" />
            <InfoTags label="可接受但不理想条件" items={intention?.acceptable_conditions} tone="slate" />
            <InfoTags label="当前最大顾虑" items={intention?.biggest_concerns} tone="orange" />
            <InfoTags
              label="偏好重要性"
              items={formatFieldValueLines('preference_importance', intention?.preference_importance)}
              tone="gray"
            />
            <InfoPanel label="容忍边界说明" value={intention?.tolerance_notes} tone="yellow" />
            <InfoPanel label="异地说明" value={intention?.long_distance_notes} tone="blue" />
            <InfoPanel label="隐性意图（AI/红娘判断）" value={intention?.implicit_intent_notes} tone="purple" />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return (
      <div>
        <dt className="text-gray-400 text-xs">{label}</dt>
        <dd className="text-gray-300 text-sm">-</dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-800 text-sm font-medium">{value}</dd>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-gray-600">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function FieldTextarea({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-gray-600">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  className?: string
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label className="text-sm text-gray-600">{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function InfoTags({
  label,
  items,
  tone,
}: {
  label: string
  items?: string[] | null
  tone: 'rose' | 'emerald' | 'blue' | 'amber' | 'red' | 'slate' | 'orange' | 'gray'
}) {
  if (!items?.length) return null

  const toneClass = {
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  }[tone]

  return (
    <div>
      <dt className="text-gray-400 text-xs mb-1">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>
            {item}
          </span>
        ))}
      </dd>
    </div>
  )
}

function InfoPanel({
  label,
  value,
  tone,
  small = false,
}: {
  label: string
  value?: string | null
  tone: 'gray' | 'amber' | 'orange' | 'green' | 'purple' | 'blue' | 'yellow' | 'slate'
  small?: boolean
}) {
  if (!value) return null

  const toneClass = {
    gray: 'bg-gray-50 text-gray-700',
    amber: 'bg-amber-50 text-amber-800',
    orange: 'bg-orange-50 text-orange-800',
    green: 'bg-emerald-50 text-emerald-800',
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-800',
    slate: 'bg-slate-50 text-slate-700',
  }[tone]

  return (
    <div>
      <dt className="text-gray-400 text-xs mb-1">{label}</dt>
      <dd className={`rounded p-2 whitespace-pre-wrap ${toneClass} ${small ? 'text-xs' : 'text-sm'}`}>{value}</dd>
    </div>
  )
}

function PhotoGrid({ name, urls }: { name: string; urls?: string[] | null }) {
  if (!urls?.length) return null

  return (
    <div>
      <dt className="text-gray-400 text-xs mb-1">资料照片</dt>
      <dd className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {urls.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${name} 照片`} className="h-28 w-full object-cover" />
          </a>
        ))}
      </dd>
    </div>
  )
}

function splitList(value: string) {
  const next = value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return next.length ? next : null
}

function parseOptionalNumber(value: string) {
  const cleaned = value.trim()
  if (!cleaned) return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalBoolean(value: string) {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function parseOptionalTriState(value: string): TriState {
  if (value === 'yes' || value === 'no' || value === 'unknown') return value
  return 'unknown'
}

function emptyToNull(value: string) {
  const cleaned = value.trim()
  return cleaned ? cleaned : null
}

function booleanToForm(value?: boolean | null) {
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
}

function triStateToForm(value?: TriState | null) {
  if (value === 'yes' || value === 'no' || value === 'unknown') return value
  return 'unknown'
}

function formatBoolean(value?: boolean | null) {
  if (value === true) return '是'
  if (value === false) return '否'
  return ''
}

function formatTriState(value?: TriState | null) {
  if (!value) return ''
  return TRI_STATE_LABELS[value]
}

function formatAgeRange(min?: number | null, max?: number | null) {
  if (!min && !max) return ''
  return `${min ?? '?'} - ${max ?? '?'} 岁`
}
