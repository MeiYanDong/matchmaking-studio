/**
 * 验证 resolveConversationReview 写入逻辑
 * 直接模拟红娘点「确认同步」时的完整执行路径，检查字段是否真正写入数据库
 *
 * 用法：npx tsx scripts/test-review-apply.ts
 */
process.loadEnvFile('.env')
process.loadEnvFile('.env.local')

import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../types/database'
import { applyExtractionContractToProfile } from '../lib/ai/apply-extraction'
import { V1_FIELD_SPEC_BY_KEY, type V1FieldKey } from '../lib/ai/field-spec'
import { isPlaceholderCandidateValue } from '../lib/ai/field-presentation'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // 1. 找一个有 review_required 的 done 状态会话
  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, profile_id, extracted_fields, status')
    .eq('status', 'done')
    .not('extracted_fields', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  if (convErr) {
    console.error('查询失败:', convErr)
    return
  }

  const target = conversations?.find((c) => {
    const ef = c.extracted_fields as any
    return Array.isArray(ef?.review_required) && ef.review_required.length > 0
  })

  if (!target) {
    console.log('没有找到带 review_required 的 done 状态会话')
    // 改为查所有状态
    const { data: all } = await supabase
      .from('conversations')
      .select('id, profile_id, extracted_fields, status')
      .not('extracted_fields', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30)
    const t2 = all?.find((c) => {
      const ef = c.extracted_fields as any
      return Array.isArray(ef?.review_required) && ef.review_required.length > 0
    })
    if (!t2) {
      console.log('所有会话均无 review_required，无法测试')
      return
    }
    console.log(`找到非 done 状态会话: ${t2.id} (status: ${t2.status})`)
    return
  }

  const ef = target.extracted_fields as any
  console.log(`\n找到会话: ${target.id}`)
  console.log(`Profile: ${target.profile_id}`)
  console.log(`review_required 字段数: ${ef.review_required.length}`)
  console.log('\n字段详情:')
  ef.review_required.forEach((item: any) => {
    console.log(`  [${item.field_key}]`)
    console.log(`    issue_type: ${item.issue_type}`)
    console.log(`    old_value: ${JSON.stringify(item.old_value)}`)
    console.log(`    candidate_value: ${JSON.stringify(item.candidate_value)}`)
  })

  // 2. 读取完整数据
  const [
    { data: profile, error: profileErr },
    { data: intention },
    { data: traitProfile },
    { data: conversation },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', target.profile_id).single(),
    supabase.from('intentions').select('*').eq('profile_id', target.profile_id).maybeSingle(),
    supabase.from('trait_profiles').select('*').eq('profile_id', target.profile_id).maybeSingle(),
    supabase.from('conversations').select('*').eq('id', target.id).single(),
  ])

  if (!profile || !conversation) {
    console.error('读取 profile/conversation 失败:', profileErr)
    return
  }

  // 3. 构建 fieldUpdates（同 resolveConversationReview 逻辑）
  const reviewRequired = ef.review_required as Array<Record<string, unknown>>

  const fieldUpdates = reviewRequired
    .map((item) => {
      const fieldKey = String(item.field_key ?? '')
      if (!(fieldKey in V1_FIELD_SPEC_BY_KEY)) {
        console.log(`  跳过未知字段: ${fieldKey}`)
        return null
      }

      const fallbackCandidateValue = item.candidate_value as Json | undefined
      const nextValue = isPlaceholderCandidateValue(fieldKey, fallbackCandidateValue)
        ? undefined
        : fallbackCandidateValue

      if (nextValue === undefined) {
        console.log(`  跳过 placeholder/空值字段: ${fieldKey}`)
        return null
      }

      return {
        field_key: fieldKey as V1FieldKey,
        field_label: String(item.field_label ?? fieldKey),
        action: 'replace' as const,
        new_value: nextValue,
        old_value: item.old_value as Json | undefined,
        confidence: 'high' as const,
        evidence_excerpt: typeof item.evidence_excerpt === 'string' ? item.evidence_excerpt : undefined,
        reason: '红娘已确认异常字段（测试脚本）',
        auto_apply: true,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  console.log(`\n将提交 ${fieldUpdates.length} 个字段更新 (action=replace, confidence=high)`)

  // 4. 分析每个字段的预期行为
  console.log('\n--- 字段 autoApply 分析 ---')
  for (const update of fieldUpdates) {
    const spec = V1_FIELD_SPEC_BY_KEY[update.field_key]
    console.log(`  ${update.field_key}: autoApply=${spec.autoApply}, targetTable=${spec.targetTable}`)
    if (spec.autoApply === 'review_on_conflict') {
      console.log(`    ⚠️  review_on_conflict — 修复前会被重新排入 review_required`)
      console.log(`    ✅  修复后 action=replace 短路，应直接写入`)
    }
  }

  // 5. 记录写入前的数据库值
  console.log('\n--- 写入前数据库当前值 ---')
  const beforeProfile = profile as Record<string, unknown>
  const beforeIntention = intention as Record<string, unknown> | null
  for (const update of fieldUpdates) {
    const spec = V1_FIELD_SPEC_BY_KEY[update.field_key]
    const source = spec.targetTable === 'profiles' ? beforeProfile
      : spec.targetTable === 'intentions' ? beforeIntention
      : null
    if (source) {
      console.log(`  ${update.field_key} (${spec.targetTable}): ${JSON.stringify(source[update.field_key])}`)
    }
  }

  // 6. 执行真实写入
  console.log('\n--- 执行 applyExtractionContractToProfile ---')
  const applyResult = await applyExtractionContractToProfile({
    supabase,
    profile,
    intention,
    traitProfile,
    conversation,
    contract: {
      field_updates: fieldUpdates,
      review_required: [],
      missing_critical_fields: ef.missing_critical_fields ?? [],
      suggested_followup_questions: ef.suggested_followup_questions ?? [],
      summary_updates: {},
      processing_notes: ['测试脚本验证写入'],
    },
    observationSourceType: 'matchmaker_summary',
  })

  console.log(`\napplied: ${applyResult.appliedFieldUpdates.length} 个`)
  console.log(`re-queued: ${applyResult.reviewRequired.length} 个`)

  if (applyResult.appliedFieldUpdates.length > 0) {
    console.log('\n✅ 成功写入:')
    applyResult.appliedFieldUpdates.forEach((u) => {
      console.log(`  ${u.field_key}: ${JSON.stringify(u.old_value)} → ${JSON.stringify(u.new_value)}`)
    })
  }

  if (applyResult.reviewRequired.length > 0) {
    console.log('\n❌ 仍被重新排入 review_required（BUG 未修复）:')
    applyResult.reviewRequired.forEach((u) => {
      console.log(`  ${u.field_key}: issue=${u.issue_type}`)
    })
  }

  // 7. 验证数据库实际写入值
  if (applyResult.appliedFieldUpdates.length > 0) {
    console.log('\n--- 验证数据库实际写入值 ---')
    const [{ data: updatedProfile }, { data: updatedIntention }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', target.profile_id).single(),
      supabase.from('intentions').select('*').eq('profile_id', target.profile_id).maybeSingle(),
    ])

    let allOk = true
    for (const update of applyResult.appliedFieldUpdates) {
      const fieldKey = update.field_key as string
      const spec = V1_FIELD_SPEC_BY_KEY[fieldKey as V1FieldKey]
      const source = spec.targetTable === 'profiles' ? updatedProfile
        : spec.targetTable === 'intentions' ? updatedIntention
        : null
      if (!source) continue
      const dbVal = (source as any)[fieldKey]
      const matched = JSON.stringify(dbVal) === JSON.stringify(update.new_value)
      if (!matched) allOk = false
      console.log(`  ${fieldKey}: ${matched ? '✅' : '❌'} DB=${JSON.stringify(dbVal)} 期望=${JSON.stringify(update.new_value)}`)
    }

    console.log(allOk ? '\n✅ 所有字段均已正确写入数据库' : '\n❌ 部分字段写入失败，需进一步排查')
  }
}

main().catch(console.error)
