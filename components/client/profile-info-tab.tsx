'use client'

import { useState } from 'react'
import { Profile, Intention, EducationLevel, EducationLevelV2, GenderType, PrimaryIntent, ProfileStatus, RelationshipMode, TraitProfile, TriState, MaritalHistoryType, HasChildrenType, LifestyleYnType, UrgencyLevelType, FrequencyType, IncomeSourceCategory, FamilyAssetBandType, ParentsMaritalStatusType, HasAssetType, CustodyStatusType, FinancialTiesType } from '@/types/database'
import { EDUCATION_LABELS, EDUCATION_LEVEL_V2_LABELS, GENDER_LABELS, INTENT_LABELS, STATUS_LABELS, TRI_STATE_LABELS, MARITAL_HISTORY_LABELS, HAS_CHILDREN_LABELS, LIFESTYLE_YN_LABELS, URGENCY_LEVEL_LABELS, FREQUENCY_LABELS, INCOME_SOURCE_LABELS, FAMILY_ASSET_BAND_LABELS, PARENTS_MARITAL_STATUS_LABELS, HAS_ASSET_LABELS, CUSTODY_STATUS_LABELS, FINANCIAL_TIES_LABELS } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { EducationChipSelect } from '@/components/ui/education-chip-select'
import { PreferenceImportanceEditor } from '@/components/ui/preference-importance-editor'
import { toast } from 'sonner'
import { updateProfile, updateIntention, updateTraitProfile } from '@/actions/clients'
import { Edit, Save, X } from 'lucide-react'
import { formatFieldValueLines, parseEditableFieldValue, toEditableFieldValue } from '@/lib/ai/field-presentation'
import { ProfilePhotoManager } from '@/components/client/profile-photo-manager'
import { AppearanceScoreField } from '@/components/client/appearance-score-field'

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
  const [withdrawConfirm, setWithdrawConfirm] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    gender: profile.gender,
    status: profile.status,
    paused_reason: '',
    age: profile.age?.toString() ?? '',
    height: profile.height?.toString() ?? '',
    weight: profile.weight?.toString() ?? '',
    city: profile.city ?? '',
    hometown: profile.hometown ?? '',
    education: profile.education ?? '',
    occupation: profile.occupation ?? '',
    job_title: profile.job_title ?? '',
    phone: profile.phone ?? '',
    assets: profile.assets ?? '',
    appearance_score: profile.appearance_score?.toString() ?? '',
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
    followup_strategy: profile.followup_strategy ?? '',
    hidden_expectations: profile.hidden_expectations ?? '',
    ai_summary: profile.ai_summary ?? '',
    raw_notes: profile.raw_notes ?? '',
    // Phase-1 新字段
    full_name: profile.full_name ?? '',
    wechat_id: profile.wechat_id ?? '',
    birth_year_month: profile.birth_year_month ?? '',
    current_city: profile.current_city ?? '',
    hukou_city: profile.hukou_city ?? '',
    native_place: profile.native_place ?? '',
    height_cm: profile.height_cm?.toString() ?? '',
    weight_kg: profile.weight_kg?.toString() ?? '',
    education_level_v2: profile.education_level_v2 ?? '',
    bachelor_school: profile.bachelor_school ?? '',
    master_school: profile.master_school ?? '',
    doctor_school: profile.doctor_school ?? '',
    major: profile.major ?? '',
    company_name: profile.company_name ?? '',
    monthly_income: profile.monthly_income?.toString() ?? '',
    marital_history_enum: profile.marital_history_enum ?? '',
    marital_history_notes: profile.marital_history_notes ?? '',
    has_children_enum: profile.has_children_enum ?? '',
    children_count: profile.children_count?.toString() ?? '',
    children_age_notes: profile.children_age_notes ?? profile.children_notes ?? '',
    smokes: profile.smokes ?? '',
    smoking_frequency: profile.smoking_frequency ?? '',
    drinks: profile.drinks ?? '',
    drinking_frequency: profile.drinking_frequency ?? '',
    urgency_level: profile.urgency_level ?? '',
    personality_summary: profile.personality_summary ?? '',
    self_description: profile.self_description ?? '',
    mbti: profile.mbti ?? '',
    siblings_summary: profile.siblings_summary ?? '',
    parents_occupation: profile.parents_occupation ?? '',
    parents_marital_status: profile.parents_marital_status ?? '',
    custody_status: profile.custody_status ?? '',
    financial_ties_with_ex_partner: profile.financial_ties_with_ex_partner ?? '',
    letter_to_partner: profile.letter_to_partner ?? '',
    property_notes: profile.property_notes ?? '',
    property_count: profile.property_count?.toString() ?? '',
    family_asset_band: profile.family_asset_band ?? '',
    has_property: profile.has_property ?? '',
    has_vehicle: profile.has_vehicle ?? '',
    vehicle_brand: profile.vehicle_brand ?? '',
    vehicle_model: profile.vehicle_model ?? '',
    vehicle_notes: profile.vehicle_notes ?? '',
    financial_assets_notes: profile.financial_assets_notes ?? '',
    insurance_notes: profile.insurance_notes ?? '',
    income_source_type: profile.income_source_type ?? '',
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
    preferred_net_worth_min: intention?.preferred_net_worth_min ?? '',
    preferred_industry_tags: intention?.preferred_industry_tags?.join('、') ?? '',
    preferred_cities: intention?.preferred_cities?.join('、') ?? '',
    preferred_education: toEditableFieldValue('preferred_education', intention?.preferred_education ?? undefined),
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
    dating_frequency_expectation: intention?.dating_frequency_expectation ?? '',
    monthly_date_budget: intention?.monthly_date_budget ?? '',
    wedding_scale_preference: intention?.wedding_scale_preference ?? '',
    accepts_parents_cohabitation: intention?.accepts_parents_cohabitation ?? '',
    financial_arrangement_expectation: intention?.financial_arrangement_expectation ?? '',
    desired_children_count: intention?.desired_children_count?.toString() ?? '',
    co_parenting_expectation: intention?.co_parenting_expectation ?? '',
    biological_child_requirement: intention?.biological_child_requirement?.toString() ?? '',
    fertility_timeline: intention?.fertility_timeline ?? '',
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
          assets: emptyToNull(profileForm.assets),
          appearance_score: parseOptionalNumber(profileForm.appearance_score),
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
          followup_strategy: emptyToNull(profileForm.followup_strategy),
          hidden_expectations: emptyToNull(profileForm.hidden_expectations),
          ai_summary: emptyToNull(profileForm.ai_summary),
          raw_notes: emptyToNull(profileForm.raw_notes),
          // Phase-1 新字段
          full_name: emptyToNull(profileForm.full_name),
          wechat_id: emptyToNull(profileForm.wechat_id),
          birth_year_month: emptyToNull(profileForm.birth_year_month),
          current_city: emptyToNull(profileForm.current_city),
          hukou_city: emptyToNull(profileForm.hukou_city),
          native_place: emptyToNull(profileForm.native_place),
          height_cm: parseOptionalNumber(profileForm.height_cm),
          weight_kg: parseOptionalNumber(profileForm.weight_kg),
          education_level_v2: profileForm.education_level_v2 as EducationLevelV2 || null,
          bachelor_school: emptyToNull(profileForm.bachelor_school),
          master_school: emptyToNull(profileForm.master_school),
          doctor_school: emptyToNull(profileForm.doctor_school),
          major: emptyToNull(profileForm.major),
          company_name: emptyToNull(profileForm.company_name),
          monthly_income: parseOptionalNumber(profileForm.monthly_income),
          marital_history_enum: profileForm.marital_history_enum as MaritalHistoryType || null,
          marital_history_notes: emptyToNull(profileForm.marital_history_notes),
          has_children_enum: profileForm.has_children_enum as HasChildrenType || null,
          children_count: parseOptionalNumber(profileForm.children_count),
          children_age_notes: emptyToNull(profileForm.children_age_notes),
          smokes: profileForm.smokes as LifestyleYnType || null,
          smoking_frequency: profileForm.smoking_frequency as FrequencyType || null,
          drinks: profileForm.drinks as LifestyleYnType || null,
          drinking_frequency: profileForm.drinking_frequency as FrequencyType || null,
          urgency_level: profileForm.urgency_level as UrgencyLevelType || null,
          personality_summary: emptyToNull(profileForm.personality_summary),
          self_description: emptyToNull(profileForm.self_description),
          mbti: emptyToNull(profileForm.mbti),
          siblings_summary: emptyToNull(profileForm.siblings_summary),
          parents_occupation: emptyToNull(profileForm.parents_occupation),
          parents_marital_status: profileForm.parents_marital_status as ParentsMaritalStatusType || null,
          custody_status: profileForm.custody_status as CustodyStatusType || null,
          financial_ties_with_ex_partner: profileForm.financial_ties_with_ex_partner as FinancialTiesType || null,
          letter_to_partner: emptyToNull(profileForm.letter_to_partner),
          property_notes: emptyToNull(profileForm.property_notes),
          property_count: parseOptionalNumber(profileForm.property_count),
          family_asset_band: profileForm.family_asset_band as FamilyAssetBandType || null,
          has_property: profileForm.has_property as HasAssetType || null,
          has_vehicle: profileForm.has_vehicle as HasAssetType || null,
          vehicle_brand: emptyToNull(profileForm.vehicle_brand),
          vehicle_model: emptyToNull(profileForm.vehicle_model),
          vehicle_notes: emptyToNull(profileForm.vehicle_notes),
          financial_assets_notes: emptyToNull(profileForm.financial_assets_notes),
          insurance_notes: emptyToNull(profileForm.insurance_notes),
          income_source_type: profileForm.income_source_type as IncomeSourceCategory || null,
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
        preferred_net_worth_min: emptyToNull(intentForm.preferred_net_worth_min),
        preferred_industry_tags: splitList(intentForm.preferred_industry_tags),
        preferred_cities: splitList(intentForm.preferred_cities),
        preferred_education: (parseEditableFieldValue('preferred_education', 'education_array', intentForm.preferred_education) ?? null) as EducationLevel[] | null,
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
        dating_frequency_expectation: emptyToNull(intentForm.dating_frequency_expectation),
        monthly_date_budget: emptyToNull(intentForm.monthly_date_budget),
        wedding_scale_preference: emptyToNull(intentForm.wedding_scale_preference),
        accepts_parents_cohabitation: emptyToNull(intentForm.accepts_parents_cohabitation),
        financial_arrangement_expectation: emptyToNull(intentForm.financial_arrangement_expectation),
        desired_children_count: parseOptionalNumber(intentForm.desired_children_count),
        co_parenting_expectation: emptyToNull(intentForm.co_parenting_expectation),
        biological_child_requirement: intentForm.biological_child_requirement === 'true' ? true : intentForm.biological_child_requirement === 'false' ? false : null,
        fertility_timeline: emptyToNull(intentForm.fertility_timeline),
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
      <div className="rounded-[28px] border border-border/80 bg-white/84 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-foreground">基础信息</h3>
          {editingProfile ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />取消
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={saving} className="bg-primary hover:bg-[color:var(--primary-strong)]">
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
            <div className="col-span-2">
              <ProfilePhotoManager
                profileId={profile.id}
                name={profile.name}
                avatarUrl={profile.avatar_url}
                lifestylePhotoUrls={profile.lifestyle_photo_urls ?? profile.photo_urls}
              />
            </div>

            {/* ── 身份 ── */}
            <FieldInput label="姓名" value={profileForm.full_name || profileForm.name} onChange={v => setProfileForm((p) => ({ ...p, full_name: v, name: v }))} />
            {/* 所在城市：匹配关键因素，提前至姓名之后 */}
            <FieldInput label="所在城市" value={profileForm.current_city} onChange={v => setProfileForm((p) => ({ ...p, current_city: v }))} />
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
              onChange={(value) => {
                if (value === 'withdrawn') {
                  setWithdrawConfirm(true)
                } else {
                  setProfileForm((p) => ({ ...p, status: value as ProfileStatus }))
                }
              }}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择状态"
            />
            {/* 退档确认弹窗 */}
            {withdrawConfirm && (
              <div className="col-span-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-destructive">确认将此客户标记为「退档」？此操作表示客户永久离开平台。</p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setWithdrawConfirm(false)}>取消</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    setProfileForm((p) => ({ ...p, status: 'withdrawn' }))
                    setWithdrawConfirm(false)
                  }}>确认退档</Button>
                </div>
              </div>
            )}
            {/* 暂停：展开备注框 */}
            {profileForm.status === 'paused' && (
              <div className="col-span-2">
                <FieldTextarea
                  label="暂停原因（如：备考 / 出国 / 工作繁忙）"
                  value={profileForm.paused_reason}
                  onChange={v => setProfileForm((p) => ({ ...p, paused_reason: v }))}
                  rows={2}
                  placeholder="请填写暂时搁置的具体原因"
                />
              </div>
            )}
            <FieldInput label="联系方式" value={profileForm.phone} onChange={v => setProfileForm((p) => ({ ...p, phone: v }))} placeholder="手机号 / 备注" />
            <FieldInput label="微信号" value={profileForm.wechat_id} onChange={v => setProfileForm((p) => ({ ...p, wechat_id: v }))} />
            <FieldInput label="出生年月 (YYYY-MM)" value={profileForm.birth_year_month} onChange={v => setProfileForm((p) => ({ ...p, birth_year_month: v }))} placeholder="1992-06" />
            <FieldInput label="年龄" value={profileForm.age} onChange={v => setProfileForm((p) => ({ ...p, age: v }))} type="number" />

            {/* ── 身体 ── */}
            <FieldInput label="身高 (cm)" value={profileForm.height_cm} onChange={v => setProfileForm((p) => ({ ...p, height_cm: v }))} type="number" />
            <FieldInput label="体重 (kg)" value={profileForm.weight_kg} onChange={v => setProfileForm((p) => ({ ...p, weight_kg: v }))} type="number" />

            {/* ── 地点（户籍相关，优先级低于所在城市）── */}
            <FieldInput label="户籍城市" value={profileForm.hukou_city} onChange={v => setProfileForm((p) => ({ ...p, hukou_city: v }))} />
            <FieldInput label="祖籍" value={profileForm.native_place} onChange={v => setProfileForm((p) => ({ ...p, native_place: v }))} />

            {/* ── 学历（条件展开院校）── */}
            <SelectField
              label="学历"
              value={profileForm.education_level_v2}
              onChange={(value) => setProfileForm((p) => ({ ...p, education_level_v2: value }))}
              options={Object.entries(EDUCATION_LEVEL_V2_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择学历"
            />
            {/* 专业：任何非 unknown 级别都显示 */}
            {profileForm.education_level_v2 && profileForm.education_level_v2 !== 'unknown' && (
              <FieldInput label="专业" value={profileForm.major} onChange={v => setProfileForm((p) => ({ ...p, major: v }))} />
            )}
            {/* 本科院校：≥ bachelor */}
            {['bachelor', 'master', 'doctor'].includes(profileForm.education_level_v2) && (
              <FieldInput label="本科院校" value={profileForm.bachelor_school} onChange={v => setProfileForm((p) => ({ ...p, bachelor_school: v }))} />
            )}
            {/* 硕士院校：≥ master */}
            {['master', 'doctor'].includes(profileForm.education_level_v2) && (
              <FieldInput label="硕士院校" value={profileForm.master_school} onChange={v => setProfileForm((p) => ({ ...p, master_school: v }))} />
            )}
            {/* 博士院校：仅 doctor */}
            {profileForm.education_level_v2 === 'doctor' && (
              <FieldInput label="博士院校" value={profileForm.doctor_school} onChange={v => setProfileForm((p) => ({ ...p, doctor_school: v }))} />
            )}

            {/* ── 职业 ── */}
            <FieldInput label="职业/行业" value={profileForm.occupation} onChange={v => setProfileForm((p) => ({ ...p, occupation: v }))} />
            <FieldInput label="具体职位" value={profileForm.job_title} onChange={v => setProfileForm((p) => ({ ...p, job_title: v }))} />
            <FieldInput label="公司名称" value={profileForm.company_name} onChange={v => setProfileForm((p) => ({ ...p, company_name: v }))} />

            {/* ── 收入 ── */}
            <FieldInput label="月收入 (万元)" value={profileForm.monthly_income} onChange={v => setProfileForm((p) => ({ ...p, monthly_income: v }))} type="number" />
            <SelectField
              label="收入来源"
              value={profileForm.income_source_type ?? ''}
              onChange={(value) => setProfileForm((p) => ({ ...p, income_source_type: value }))}
              options={Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择收入来源"
            />

            {/* ── 婚育 ── */}
            <SelectField
              label="婚史"
              value={profileForm.marital_history_enum}
              onChange={(value) => setProfileForm((p) => ({ ...p, marital_history_enum: value }))}
              options={Object.entries(MARITAL_HISTORY_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择婚史"
            />
            <FieldInput label="婚史补充" value={profileForm.marital_history_notes} onChange={v => setProfileForm((p) => ({ ...p, marital_history_notes: v }))} />
            <SelectField
              label="是否有孩子"
              value={profileForm.has_children_enum}
              onChange={(value) => setProfileForm((p) => ({ ...p, has_children_enum: value }))}
              options={Object.entries(HAS_CHILDREN_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            {profileForm.has_children_enum === 'yes' && (
              <>
                <FieldInput label="孩子数量" value={profileForm.children_count} onChange={v => setProfileForm((p) => ({ ...p, children_count: v }))} type="number" />
                <FieldInput label="孩子年龄情况" value={profileForm.children_age_notes} onChange={v => setProfileForm((p) => ({ ...p, children_age_notes: v }))} />
                <SelectField
                  label="孩子抚养权"
                  value={profileForm.custody_status}
                  onChange={(value) => setProfileForm((p) => ({ ...p, custody_status: value }))}
                  options={Object.entries(CUSTODY_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                  placeholder="选择"
                />
                <SelectField
                  label="与前任是否有金融往来"
                  value={profileForm.financial_ties_with_ex_partner}
                  onChange={(value) => setProfileForm((p) => ({ ...p, financial_ties_with_ex_partner: value }))}
                  options={Object.entries(FINANCIAL_TIES_LABELS).map(([value, label]) => ({ value, label }))}
                  placeholder="选择"
                />
              </>
            )}

            {/* ── 资产 ── */}
            <SelectField
              label="是否有房"
              value={profileForm.has_property}
              onChange={(value) => setProfileForm((p) => ({ ...p, has_property: value }))}
              options={Object.entries(HAS_ASSET_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            {profileForm.has_property === 'yes' && (
              <>
                <FieldInput label="房产套数" value={profileForm.property_count} onChange={v => setProfileForm((p) => ({ ...p, property_count: v }))} type="number" placeholder="0" />
                <div className="col-span-2">
                  <FieldInput label="房产情况" value={profileForm.property_notes} onChange={v => setProfileForm((p) => ({ ...p, property_notes: v }))} placeholder="如：上海徐汇 2 室，自住" />
                </div>
              </>
            )}
            <SelectField
              label="家庭总资产"
              value={profileForm.family_asset_band}
              onChange={(value) => setProfileForm((p) => ({ ...p, family_asset_band: value }))}
              options={Object.entries(FAMILY_ASSET_BAND_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择资产量级"
            />
            <SelectField
              label="是否有车"
              value={profileForm.has_vehicle}
              onChange={(value) => setProfileForm((p) => ({ ...p, has_vehicle: value }))}
              options={Object.entries(HAS_ASSET_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            {profileForm.has_vehicle === 'yes' && (
              <>
                <FieldInput label="车辆品牌" value={profileForm.vehicle_brand} onChange={v => setProfileForm((p) => ({ ...p, vehicle_brand: v }))} placeholder="如：宝马" />
                <FieldInput label="车辆型号" value={profileForm.vehicle_model} onChange={v => setProfileForm((p) => ({ ...p, vehicle_model: v }))} placeholder="如：5系 530i" />
                <FieldInput label="车辆补充" value={profileForm.vehicle_notes} onChange={v => setProfileForm((p) => ({ ...p, vehicle_notes: v }))} />
              </>
            )}
            <div className="col-span-2">
              <FieldTextarea label="金融资产说明" value={profileForm.financial_assets_notes} onChange={v => setProfileForm((p) => ({ ...p, financial_assets_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="保险情况" value={profileForm.insurance_notes} onChange={v => setProfileForm((p) => ({ ...p, insurance_notes: v }))} rows={2} />
            </div>

            {/* ── 综合评估 ── */}
            <div className="col-span-2">
              <AppearanceScoreField
                value={profileForm.appearance_score}
                onChange={v => setProfileForm((p) => ({ ...p, appearance_score: v }))}
                profileName={profile.full_name || profile.name}
                avatarUrl={profile.avatar_url}
                gender={profile.gender as 'male' | 'female'}
              />
            </div>
            <SelectField
              label="成婚紧迫程度"
              value={profileForm.urgency_level}
              onChange={(value) => setProfileForm((p) => ({ ...p, urgency_level: value }))}
              options={Object.entries(URGENCY_LEVEL_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择紧迫程度"
            />
            <FieldInput label="MBTI" value={profileForm.mbti} onChange={v => setProfileForm((p) => ({ ...p, mbti: v }))} placeholder="INFJ / ENFP ..." />

            {/* ── 生活习惯（烟酒条件展开）── */}
            <SelectField
              label="吸烟"
              value={profileForm.smokes}
              onChange={(value) => setProfileForm((p) => ({ ...p, smokes: value }))}
              options={Object.entries(LIFESTYLE_YN_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            {profileForm.smokes === 'yes' && (
              <SelectField
                label="吸烟频率"
                value={profileForm.smoking_frequency}
                onChange={(value) => setProfileForm((p) => ({ ...p, smoking_frequency: value }))}
                options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                placeholder="选择频率"
              />
            )}
            <SelectField
              label="饮酒"
              value={profileForm.drinks}
              onChange={(value) => setProfileForm((p) => ({ ...p, drinks: value }))}
              options={Object.entries(LIFESTYLE_YN_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            {profileForm.drinks === 'yes' && (
              <SelectField
                label="饮酒频率"
                value={profileForm.drinking_frequency}
                onChange={(value) => setProfileForm((p) => ({ ...p, drinking_frequency: value }))}
                options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                placeholder="选择频率"
              />
            )}
            <FieldInput label="运动习惯" value={traitForm.exercise_habits} onChange={v => setTraitForm((p) => ({ ...p, exercise_habits: v }))} placeholder="每周跑步 2 次 / 几乎不运动" />
            <FieldInput label="饮食习惯" value={traitForm.diet_habits} onChange={v => setTraitForm((p) => ({ ...p, diet_habits: v }))} placeholder="清淡 / 健身餐 / 无忌口" />
            <FieldInput label="作息习惯" value={traitForm.sleep_schedule} onChange={v => setTraitForm((p) => ({ ...p, sleep_schedule: v }))} placeholder="早睡早起 / 经常熬夜" />
            <FieldInput label="社交偏好" value={traitForm.social_preference} onChange={v => setTraitForm((p) => ({ ...p, social_preference: v }))} placeholder="偏宅 / 平衡 / 爱社交" />
            <FieldInput label="消费方式" value={traitForm.spending_style} onChange={v => setTraitForm((p) => ({ ...p, spending_style: v }))} placeholder="理性 / 品质优先 / 愿意为体验花钱" />
            <FieldInput label="情绪稳定" value={traitForm.emotional_stability} onChange={v => setTraitForm((p) => ({ ...p, emotional_stability: v }))} placeholder="稳定 / 一般 / 敏感" />

            {/* ── 家庭背景 ── */}
            <FieldInput label="父母职业" value={profileForm.parents_occupation} onChange={v => setProfileForm((p) => ({ ...p, parents_occupation: v }))} />
            <SelectField
              label="父母婚姻状况"
              value={profileForm.parents_marital_status}
              onChange={(value) => setProfileForm((p) => ({ ...p, parents_marital_status: value }))}
              options={Object.entries(PARENTS_MARITAL_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="选择"
            />
            <div className="col-span-2">
              <FieldInput label="兄弟姐妹情况" value={profileForm.siblings_summary} onChange={v => setProfileForm((p) => ({ ...p, siblings_summary: v }))} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="家庭责任/压力说明" value={profileForm.family_burden_notes} onChange={v => setProfileForm((p) => ({ ...p, family_burden_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="父母介入程度" value={profileForm.parental_involvement} onChange={v => setProfileForm((p) => ({ ...p, parental_involvement: v }))} rows={2} />
            </div>

            {/* ── 标签与描述 ── */}
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
              <FieldTextarea label="性格描述" value={profileForm.personality_summary} onChange={v => setProfileForm((p) => ({ ...p, personality_summary: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="自我描述" value={profileForm.self_description} onChange={v => setProfileForm((p) => ({ ...p, self_description: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="想对未来另一半说的话" value={profileForm.letter_to_partner} onChange={v => setProfileForm((p) => ({ ...p, letter_to_partner: v }))} rows={2} placeholder="匹配推介时展示给对方看" />
            </div>

            {/* ── 红娘视角 ── */}
            <div className="col-span-2">
              <FieldTextarea label="红娘推进建议" value={profileForm.followup_strategy} onChange={v => setProfileForm((p) => ({ ...p, followup_strategy: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="隐性期待 / 未明说诉求" value={profileForm.hidden_expectations} onChange={v => setProfileForm((p) => ({ ...p, hidden_expectations: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="AI 综合描述" value={profileForm.ai_summary} onChange={v => setProfileForm((p) => ({ ...p, ai_summary: v }))} rows={3} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="未结构化备注" value={profileForm.raw_notes} onChange={v => setProfileForm((p) => ({ ...p, raw_notes: v }))} rows={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <ProfilePhotoManager
              profileId={profile.id}
              name={profile.name}
              avatarUrl={profile.avatar_url}
              lifestylePhotoUrls={profile.lifestyle_photo_urls ?? profile.photo_urls}
            />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="姓名" value={profile.full_name || profile.name} />
              <InfoField label="所在城市" value={profile.current_city || profile.city} />
              <InfoField label="性别" value={GENDER_LABELS[profile.gender]} />
              <InfoField label="状态" value={STATUS_LABELS[profile.status]} />
              <InfoField label="联系方式" value={profile.phone} />
              {profile.wechat_id && <InfoField label="微信" value={profile.wechat_id} />}
              <InfoField label="出生年月" value={profile.birth_year_month || (profile.age ? `${profile.age} 岁` : '')} />
              {profile.birth_year_month && <InfoField label="星座" value={getZodiac(profile.birth_year_month)} />}
              <InfoField label="身高" value={(profile.height_cm || profile.height) ? `${profile.height_cm || profile.height} cm` : ''} />
              <InfoField label="体重" value={(profile.weight_kg || profile.weight) ? `${profile.weight_kg || profile.weight} kg` : ''} />
              <InfoField label="户籍城市" value={profile.hukou_city || profile.hometown} />
              {profile.native_place && <InfoField label="祖籍" value={profile.native_place} />}
              <InfoField label="学历" value={profile.education_level_v2 ? EDUCATION_LEVEL_V2_LABELS[profile.education_level_v2] : (profile.education ? EDUCATION_LABELS[profile.education] : '')} />
              {(profile.bachelor_school || profile.master_school || profile.doctor_school) && (
                <InfoField label="毕业院校" value={[profile.bachelor_school, profile.master_school, profile.doctor_school].filter(Boolean).join(' / ')} />
              )}
              {profile.major && <InfoField label="专业" value={profile.major} />}
              <InfoField label="职业" value={profile.occupation} />
              <InfoField label="职位" value={profile.job_title} />
              {profile.company_name && <InfoField label="公司" value={profile.company_name} />}
              <InfoField label="月收入" value={profile.monthly_income ? `约 ${profile.monthly_income} 万元/月` : (profile.annual_income ? `约 ${profile.annual_income} 万元/年` : profile.income_range || '')} />
              <InfoField label="资产" value={profile.assets} />
              {profile.has_property === 'yes' && (profile.property_notes || profile.property_count) && (
                <InfoField
                  label="房产"
                  value={[profile.property_notes, profile.property_count ? `${profile.property_count} 套` : ''].filter(Boolean).join(' · ')}
                />
              )}
              {profile.family_asset_band && <InfoField label="家庭总资产" value={FAMILY_ASSET_BAND_LABELS[profile.family_asset_band as FamilyAssetBandType]} />}
              {profile.has_vehicle === 'yes' && profile.vehicle_brand && <InfoField label="车辆" value={[profile.vehicle_brand, profile.vehicle_model, profile.vehicle_notes].filter(Boolean).join(' ')} />}
              {profile.financial_assets_notes && <InfoField label="金融���产" value={profile.financial_assets_notes} />}
              <InfoField label="颜值评分" value={profile.appearance_score ? `${profile.appearance_score} / 10` : ''} />
              <InfoField label="婚史" value={profile.marital_history_enum ? MARITAL_HISTORY_LABELS[profile.marital_history_enum] : (profile.marital_history || '')} />
              <InfoField label="是否有孩子" value={profile.has_children_enum ? HAS_CHILDREN_LABELS[profile.has_children_enum] : formatBoolean(profile.has_children)} />
              <InfoField label="是否吸烟" value={profile.smokes ? LIFESTYLE_YN_LABELS[profile.smokes] : formatBoolean(profile.smoking)} />
              <InfoField label="是否饮酒" value={profile.drinks ? LIFESTYLE_YN_LABELS[profile.drinks] : formatBoolean(profile.drinking)} />
              {profile.urgency_level && <InfoField label="紧迫程度" value={URGENCY_LEVEL_LABELS[profile.urgency_level]} />}
              {profile.mbti && <InfoField label="MBTI" value={profile.mbti} />}
            </dl>

            <InfoTags label="兴趣爱好" items={profile.hobbies} tone="rose" />
            <InfoTags label="生活方式" items={profile.lifestyle_tags} tone="emerald" />
            <InfoTags label="性格标签" items={profile.personality_tags} tone="blue" />
            <InfoPanel label="孩子情况" value={profile.children_age_notes || profile.children_notes} tone="slate" />
            {profile.custody_status && <InfoPanel label="孩子抚养权" value={CUSTODY_STATUS_LABELS[profile.custody_status as CustodyStatusType]} tone="slate" />}
            {profile.financial_ties_with_ex_partner && <InfoPanel label="与前任金融往来" value={FINANCIAL_TIES_LABELS[profile.financial_ties_with_ex_partner as FinancialTiesType]} tone="amber" />}
            {profile.marital_history_notes && <InfoPanel label="婚史补充" value={profile.marital_history_notes} tone="slate" />}
            {profile.personality_summary && <InfoPanel label="性格描述" value={profile.personality_summary} tone="blue" />}
            {profile.self_description && <InfoPanel label="自我描述" value={profile.self_description} tone="blue" />}
            {profile.letter_to_partner && <InfoPanel label="想对未来另一半说的话" value={profile.letter_to_partner} tone="orange" />}
            {profile.siblings_summary && <InfoPanel label="兄弟姐妹" value={profile.siblings_summary} tone="slate" />}
            {profile.parents_occupation && <InfoPanel label="父母职业" value={profile.parents_occupation} tone="slate" />}
            {profile.parents_marital_status && <InfoPanel label="父母婚姻状况" value={PARENTS_MARITAL_STATUS_LABELS[profile.parents_marital_status as ParentsMaritalStatusType]} tone="slate" />}
            {profile.insurance_notes && <InfoPanel label="保险情况" value={profile.insurance_notes} tone="slate" />}
            <InfoPanel label="家庭责任/压力" value={profile.family_burden_notes} tone="amber" />
            <InfoPanel label="父母介入程度" value={profile.parental_involvement} tone="orange" />
            <InfoPanel label="红娘推进建议" value={profile.followup_strategy} tone="green" />
            <InfoPanel label="隐性期待 / 未明说诉求" value={profile.hidden_expectations} tone="purple" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="运动习惯" value={traitProfile?.exercise_habits} />
              <InfoField label="饮食习惯" value={traitProfile?.diet_habits} />
              <InfoField label="作息习惯" value={traitProfile?.sleep_schedule} />
              <InfoField label="社交偏好" value={traitProfile?.social_preference} />
              <InfoField label="消费方式" value={traitProfile?.spending_style} />
              <InfoField label="情绪稳定" value={traitProfile?.emotional_stability} />
            </div>
            <InfoPanel label="AI 综合描述" value={profile.ai_summary} tone="gray" />
            <InfoPanel label="未结构化备注" value={profile.raw_notes} tone="amber" small />
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-border/80 bg-white/84 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-foreground">意图与偏好</h3>
          {editingIntent ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingIntent(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />取消
              </Button>
              <Button size="sm" onClick={saveIntent} disabled={saving} className="bg-primary hover:bg-[color:var(--primary-strong)]">
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

            {/* ── 恋爱意图专属 ── */}
            {intentForm.primary_intent === 'dating' && (
              <div className="col-span-2 rounded-xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-400/12 dark:bg-rose-400/[0.05]">
                <p className="mb-3 text-sm font-medium text-rose-900 dark:text-rose-200">恋爱意图专属</p>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="是否接受异地"
                    value={intentForm.accepts_long_distance}
                    onChange={(value) => setIntentForm((p) => ({ ...p, accepts_long_distance: value as TriState }))}
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
                  <FieldInput label="约会频率期望" value={intentForm.dating_frequency_expectation} onChange={v => setIntentForm((p) => ({ ...p, dating_frequency_expectation: v }))} placeholder="如：每周见面 1-2 次" />
                  <FieldInput label="付出意愿 / 月约会预算" value={intentForm.monthly_date_budget} onChange={v => setIntentForm((p) => ({ ...p, monthly_date_budget: v }))} placeholder="如：3000元以内，重视仪式感" />
                  <div className="col-span-2">
                    <FieldTextarea label="异地补充说明" value={intentForm.long_distance_notes} onChange={v => setIntentForm((p) => ({ ...p, long_distance_notes: v }))} rows={2} />
                  </div>
                </div>
              </div>
            )}

            {/* ── 结婚意图专属 ── */}
            {intentForm.primary_intent === 'marriage' && (
              <div className="col-span-2 rounded-xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-400/12 dark:bg-violet-400/[0.05]">
                <p className="mb-3 text-sm font-medium text-violet-900 dark:text-violet-200">结婚意图专属</p>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="是否愿意迁居"
                    value={intentForm.relocation_willingness}
                    onChange={(value) => setIntentForm((p) => ({ ...p, relocation_willingness: value as TriState }))}
                    options={TRI_STATE_OPTIONS}
                    placeholder="请选择"
                  />
                  <FieldInput label="婚礼规模偏好" value={intentForm.wedding_scale_preference} onChange={v => setIntentForm((p) => ({ ...p, wedding_scale_preference: v }))} placeholder="如：小型婚礼 / 传统大婚 / 不在意" />
                  <FieldInput label="财务安排期望" value={intentForm.financial_arrangement_expectation} onChange={v => setIntentForm((p) => ({ ...p, financial_arrangement_expectation: v }))} placeholder="如：AA 制 / 男方主导 / 婚前公证" />
                  <FieldInput label="是否接受父母同住" value={intentForm.accepts_parents_cohabitation} onChange={v => setIntentForm((p) => ({ ...p, accepts_parents_cohabitation: v }))} placeholder="如：接受 / 不接受 / 视情况" />
                  <div className="col-span-2">
                    <FieldInput label="未来定居城市偏好" value={intentForm.settle_city_preferences} onChange={v => setIntentForm((p) => ({ ...p, settle_city_preferences: v }))} placeholder="上海、杭州、苏州" />
                  </div>
                </div>
              </div>
            )}

            {/* ── 生育意图专属 ── */}
            {intentForm.primary_intent === 'fertility' && (
              <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-400/12 dark:bg-emerald-400/[0.05]">
                <p className="mb-3 text-sm font-medium text-emerald-900 dark:text-emerald-200">生育意图专属</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="期望生育数量" value={intentForm.desired_children_count} onChange={v => setIntentForm((p) => ({ ...p, desired_children_count: v }))} type="number" placeholder="如：1" />
                  <FieldInput label="生育时间规划" value={intentForm.fertility_timeline} onChange={v => setIntentForm((p) => ({ ...p, fertility_timeline: v }))} placeholder="如：2 年内 / 越快越好" />
                  <FieldInput label="育儿分工期望" value={intentForm.co_parenting_expectation} onChange={v => setIntentForm((p) => ({ ...p, co_parenting_expectation: v }))} placeholder="如：双方共同承担" />
                  <SelectField
                    label="是否要求对方有生育能力"
                    value={intentForm.biological_child_requirement}
                    onChange={(value) => setIntentForm((p) => ({ ...p, biological_child_requirement: value }))}
                    options={BOOLEAN_OPTIONS}
                    placeholder="请选择"
                  />
                </div>
              </div>
            )}

            {/* ── 通用偏好 ── */}
            <FieldInput label="期望对方最小年龄" value={intentForm.preferred_age_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_age_min: v }))} type="number" />
            <FieldInput label="期望对方最大年龄" value={intentForm.preferred_age_max} onChange={v => setIntentForm((p) => ({ ...p, preferred_age_max: v }))} type="number" />
            <FieldInput label="期望对方最低身高(cm)" value={intentForm.preferred_height_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_height_min: v }))} type="number" />
            <FieldInput label="期望对方最低年薪(万)" value={intentForm.preferred_income_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_income_min: v }))} type="number" />
            <FieldInput label="期望对方最低净资产" value={intentForm.preferred_net_worth_min} onChange={v => setIntentForm((p) => ({ ...p, preferred_net_worth_min: v }))} placeholder="如：500万以上" />
            <FieldInput label="沟通风格 / 相处偏好" value={intentForm.communication_style} onChange={v => setIntentForm((p) => ({ ...p, communication_style: v }))} />
            <FieldInput label="推进节奏" value={intentForm.relationship_pace} onChange={v => setIntentForm((p) => ({ ...p, relationship_pace: v }))} placeholder="慢热 / 希望尽快见面" />
            <FieldInput label="生育意愿" value={intentForm.fertility_preference} onChange={v => setIntentForm((p) => ({ ...p, fertility_preference: v }))} placeholder="想要 / 不想要 / 随缘" />
            <div className="col-span-2">
              <FieldInput label="期望对方行业（逗号分隔）" value={intentForm.preferred_industry_tags} onChange={v => setIntentForm((p) => ({ ...p, preferred_industry_tags: v }))} placeholder="如：金融、科技、医疗" />
            </div>
            <div className="col-span-2">
              <FieldInput label="可接受城市（逗号、顿号或换行分隔）" value={intentForm.preferred_cities} onChange={v => setIntentForm((p) => ({ ...p, preferred_cities: v }))} />
            </div>
            <div className="col-span-2">
              <div className="space-y-1">
                <Label className="text-sm text-gray-600 dark:text-foreground/62">可接受学历</Label>
                <EducationChipSelect
                  value={intentForm.preferred_education}
                  onChange={(value) => setIntentForm((p) => ({ ...p, preferred_education: value }))}
                />
              </div>
            </div>
            <div className="col-span-2">
              <FieldTextarea label="硬性要求 / 绝对不接受（每行一条）" value={intentForm.dealbreakers} onChange={v => setIntentForm((p) => ({ ...p, dealbreakers: v }))} rows={3} placeholder={"不接受离异\n不接受有孩子"} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="可接受但不理想条件（每行一条）" value={intentForm.acceptable_conditions} onChange={v => setIntentForm((p) => ({ ...p, acceptable_conditions: v }))} rows={3} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="可接受的对方婚史（每行一条）" value={intentForm.accepts_partner_marital_history} onChange={v => setIntentForm((p) => ({ ...p, accepts_partner_marital_history: v }))} rows={2} placeholder={"未婚\n离异无孩"} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="当前最大顾虑（每行一条）" value={intentForm.biggest_concerns} onChange={v => setIntentForm((p) => ({ ...p, biggest_concerns: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="容忍边界说明" value={intentForm.tolerance_notes} onChange={v => setIntentForm((p) => ({ ...p, tolerance_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="意图补充说明" value={intentForm.intent_notes} onChange={v => setIntentForm((p) => ({ ...p, intent_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2">
              <FieldTextarea label="隐性意图（AI/红娘判断）" value={intentForm.implicit_intent_notes} onChange={v => setIntentForm((p) => ({ ...p, implicit_intent_notes: v }))} rows={2} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm text-gray-600 dark:text-foreground/62">偏好重要性</Label>
              <PreferenceImportanceEditor
                value={intentForm.preference_importance}
                onChange={(value) => setIntentForm((p) => ({ ...p, preference_importance: value }))}
              />
            </div>
            {profile.gender === 'male' && (
              <div className="col-span-2 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-300/12 dark:bg-amber-400/[0.06]">
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">特殊模式（V1 后置）</p>
                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-100/72">
                    仅在男方明确表达特殊关系模式时才填写。该字段不作为 V1 常规信息补全主视图的默认项。
                  </p>
                </div>
                <SelectField
                  label="男方关系模式"
                  value={intentForm.relationship_mode}
                  onChange={(value) => setIntentForm((p) => ({ ...p, relationship_mode: value as RelationshipMode }))}
                  options={[
                    { value: 'marriage_standard', label: '奔着结婚去的标准婚恋' },
                    { value: 'compensated_dating', label: '恋爱' },
                    { value: 'fertility_asset_arrangement', label: '生育资产安排型' },
                  ]}
                  placeholder="请选择"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* 主意图 + 通用字段 */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoField label="主意图" value={intention?.primary_intent ? INTENT_LABELS[intention.primary_intent] : ''} />
              <InfoField label="期望年龄" value={formatAgeRange(intention?.preferred_age_min, intention?.preferred_age_max)} />
              <InfoField label="期望最低年薪" value={intention?.preferred_income_min ? `${intention.preferred_income_min} 万元以上` : ''} />
              {intention?.preferred_net_worth_min && <InfoField label="期望对方最低净资产" value={intention.preferred_net_worth_min} />}
              <InfoField label="推进节奏" value={intention?.relationship_pace} />
              <InfoField label="沟通风格" value={intention?.communication_style} />
              <InfoField label="生育意愿" value={intention?.fertility_preference} />
            </dl>

            {/* 恋爱专属 */}
            {intention?.primary_intent === 'dating' && (
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-400/12 dark:bg-rose-400/[0.05]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-300">恋爱意图专属</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <InfoField label="是否接受异地" value={formatTriState(intention.accepts_long_distance)} />
                  <InfoField label="是否接受对方有孩子" value={formatTriState(intention.accepts_partner_children)} />
                  {intention.dating_frequency_expectation && <InfoField label="约会频率期望" value={intention.dating_frequency_expectation} />}
                  {intention.monthly_date_budget && <InfoField label="付出意愿 / 月约会预算" value={intention.monthly_date_budget} />}
                </dl>
                {intention.long_distance_notes && <InfoPanel label="异地补充说明" value={intention.long_distance_notes} tone="blue" />}
              </div>
            )}

            {/* 结婚专属 */}
            {intention?.primary_intent === 'marriage' && (
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-400/12 dark:bg-violet-400/[0.05]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-300">结婚意图专属</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <InfoField label="是否愿意迁居" value={formatTriState(intention.relocation_willingness)} />
                  {intention.wedding_scale_preference && <InfoField label="婚礼规模偏好" value={intention.wedding_scale_preference} />}
                  {intention.financial_arrangement_expectation && <InfoField label="财务安排期望" value={intention.financial_arrangement_expectation} />}
                  {intention.accepts_parents_cohabitation && <InfoField label="是否接受父母同住" value={intention.accepts_parents_cohabitation} />}
                </dl>
                {intention.settle_city_preferences && intention.settle_city_preferences.length > 0 && (
                  <InfoTags label="未来定居城市偏好" items={intention.settle_city_preferences} tone="emerald" />
                )}
              </div>
            )}

            {/* 生育专属 */}
            {intention?.primary_intent === 'fertility' && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-400/12 dark:bg-emerald-400/[0.05]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-300">生育意图专属</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {intention.desired_children_count != null && <InfoField label="期望生育数量" value={`${intention.desired_children_count} 个`} />}
                  {intention.fertility_timeline && <InfoField label="生育时间规划" value={intention.fertility_timeline} />}
                  {intention.co_parenting_expectation && <InfoField label="育儿分工期望" value={intention.co_parenting_expectation} />}
                  {intention.biological_child_requirement != null && <InfoField label="是否要求对方有生育能力" value={intention.biological_child_requirement ? '是' : '否'} />}
                </dl>
              </div>
            )}

            {/* 通用偏好 */}
            <InfoPanel label="意图补充说明" value={intention?.intent_notes} tone="gray" />
            <InfoTags label="可接受城市" items={intention?.preferred_cities} tone="gray" />
            {intention?.preferred_industry_tags && intention.preferred_industry_tags.length > 0 && (
              <InfoTags label="期望对方行业" items={intention.preferred_industry_tags} tone="blue" />
            )}
            <InfoTags
              label="可接受学历"
              items={intention?.preferred_education?.map((item) => EDUCATION_LABELS[item])}
              tone="blue"
            />
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
            <InfoPanel label="隐性意图（AI/红娘判断）" value={intention?.implicit_intent_notes} tone="purple" />
            {profile.gender === 'male' && intention?.relationship_mode && (
              <InfoPanel
                label="特殊模式（V1 后置）"
                value={{
                  marriage_standard: '奔着结婚去的标准婚恋',
                  compensated_dating: '恋爱',
                  fertility_asset_arrangement: '生育资产安排型',
                }[intention.relationship_mode]}
                tone="amber"
              />
            )}
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
        <dt className="text-gray-400 text-xs dark:text-foreground/44">{label}</dt>
        <dd className="text-gray-300 text-sm dark:text-foreground/38">未填写</dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-gray-400 text-xs dark:text-foreground/44">{label}</dt>
      <dd className="text-gray-800 text-sm font-medium dark:text-foreground/84">{value}</dd>
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
      <Label className="text-sm text-gray-600 dark:text-foreground/62">{label}</Label>
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
      <Label className="text-sm text-gray-600 dark:text-foreground/62">{label}</Label>
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
      <Label className="text-sm text-gray-600 dark:text-foreground/62">{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
        <SelectTrigger>
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {options.find((option) => option.value === value)?.label ?? placeholder}
          </span>
        </SelectTrigger>
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
    rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-400/[0.08] dark:text-rose-100 dark:border-rose-300/12',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-400/[0.08] dark:text-emerald-100 dark:border-emerald-300/12',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-400/[0.08] dark:text-blue-100 dark:border-blue-300/12',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-400/[0.08] dark:text-amber-100 dark:border-amber-300/12',
    red: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-400/[0.08] dark:text-red-100 dark:border-red-300/12',
    slate: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-white/[0.045] dark:text-foreground/80 dark:border-white/10',
    orange: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-400/[0.08] dark:text-orange-100 dark:border-orange-300/12',
    gray: 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-white/[0.045] dark:text-foreground/78 dark:border-white/10',
  }[tone]

  return (
    <div>
      <dt className="text-gray-400 text-xs mb-1 dark:text-foreground/44">{label}</dt>
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
    gray: 'bg-gray-50 text-gray-700 dark:bg-white/[0.045] dark:text-foreground/78',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-400/[0.08] dark:text-amber-100',
    orange: 'bg-orange-50 text-orange-800 dark:bg-orange-400/[0.08] dark:text-orange-100',
    green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/[0.08] dark:text-emerald-100',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-400/[0.08] dark:text-purple-100',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-400/[0.08] dark:text-blue-100',
    yellow: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-400/[0.08] dark:text-yellow-100',
    slate: 'bg-slate-50 text-slate-700 dark:bg-white/[0.045] dark:text-foreground/78',
  }[tone]

  return (
    <div>
      <dt className="text-gray-400 text-xs mb-1 dark:text-foreground/44">{label}</dt>
      <dd className={`rounded p-2 whitespace-pre-wrap ${toneClass} ${small ? 'text-xs' : 'text-sm'}`}>{value}</dd>
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
  if (value === 'yes' || value === 'no') return value
  return ''
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

function getZodiac(birthYearMonth?: string | null): string {
  if (!birthYearMonth) return ''
  const match = birthYearMonth.match(/(\d{4})[^\d]?(\d{1,2})/)
  if (!match) return ''
  const month = parseInt(match[2], 10)
  const day = 15 // 用月中作为近似
  const signs = [
    { name: '摩羯座', start: [12, 22] },
    { name: '水瓶座', start: [1, 20] },
    { name: '双鱼座', start: [2, 19] },
    { name: '白羊座', start: [3, 21] },
    { name: '金牛座', start: [4, 20] },
    { name: '双子座', start: [5, 21] },
    { name: '巨蟹座', start: [6, 22] },
    { name: '狮子座', start: [7, 23] },
    { name: '处女座', start: [8, 23] },
    { name: '天秤座', start: [9, 23] },
    { name: '天蝎座', start: [10, 24] },
    { name: '射手座', start: [11, 23] },
    { name: '摩羯座', start: [12, 22] },
  ]
  for (let i = signs.length - 2; i >= 0; i--) {
    const [m, d] = signs[i].start
    if (month > m || (month === m && day >= d)) return signs[i].name
  }
  return '摩羯座'
}
