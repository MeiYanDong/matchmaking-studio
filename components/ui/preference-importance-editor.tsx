'use client'

import { Badge } from '@/components/ui/badge'
import { IMPORTANCE_LEVEL_LABELS } from '@/types/app'
import { type ImportanceLevel, type Json } from '@/types/database'
import { IMPORTANCE_LEVEL_VALUES } from '@/lib/ai/field-spec'
import {
  formatFieldValueLines,
  getFieldDisplayLabel,
  getImportancePreviewKeys,
  parseEditableFieldValue,
  toEditableFieldValue,
} from '@/lib/ai/field-presentation'

interface PreferenceImportanceEditorProps {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function PreferenceImportanceEditor({
  value,
  disabled,
  onChange,
}: PreferenceImportanceEditorProps) {
  const parsed = parseEditableFieldValue('preference_importance', 'json', value)
  const importanceMap = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, ImportanceLevel>)
    : {}

  const previewKeys = getImportancePreviewKeys(value)

  function updateField(fieldKey: string, nextLevel: string) {
    const nextMap = { ...importanceMap }

    if (!nextLevel) delete nextMap[fieldKey]
    else nextMap[fieldKey] = nextLevel as ImportanceLevel

    onChange(
      toEditableFieldValue(
        'preference_importance',
        Object.keys(nextMap).length ? (nextMap as Json) : undefined
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {previewKeys.map((fieldKey) => (
          <div
            key={fieldKey}
            className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[1fr_180px]"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">{getFieldDisplayLabel(fieldKey)}</p>
              <p className="mt-1 text-xs text-gray-500">
                决定这个条件在匹配里是硬筛选，还是只是加分项。
              </p>
            </div>
            <select
              value={importanceMap[fieldKey] ?? ''}
              disabled={disabled}
              onChange={(event) => updateField(fieldKey, event.target.value)}
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
            >
              <option value="">未设置</option>
              {IMPORTANCE_LEVEL_VALUES.map((option) => (
                <option key={option} value={option}>
                  {IMPORTANCE_LEVEL_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">红娘视角预览</p>
        <div className="flex flex-wrap gap-2">
          {formatFieldValueLines(
            'preference_importance',
            parseEditableFieldValue('preference_importance', 'json', value)
          ).map((line) => (
            <Badge key={line} variant="outline" className="bg-white text-gray-700">
              {line}
            </Badge>
          ))}
          {!formatFieldValueLines(
            'preference_importance',
            parseEditableFieldValue('preference_importance', 'json', value)
          ).length && (
            <span className="text-xs text-gray-400">先不设也可以，后面听客户表达再补。</span>
          )}
        </div>
      </div>
    </div>
  )
}
