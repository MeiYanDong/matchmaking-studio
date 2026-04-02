'use client'

import { EDUCATION_LABELS } from '@/types/app'
import { type EducationLevel } from '@/types/database'
import { EDUCATION_VALUES } from '@/lib/ai/field-spec'
import { parseEditableFieldValue, toggleEducationSelection } from '@/lib/ai/field-presentation'

interface EducationChipSelectProps {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function EducationChipSelect({
  value,
  disabled,
  onChange,
}: EducationChipSelectProps) {
  const parsed = parseEditableFieldValue('preferred_education', 'education_array', value)
  const selected = new Set(Array.isArray(parsed) ? (parsed as EducationLevel[]) : [])

  return (
    <div className="flex flex-wrap gap-2">
      {EDUCATION_VALUES.map((option) => {
        const active = selected.has(option)

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleEducationSelection(value, option))}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? 'border-rose-300 bg-rose-100 text-rose-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {EDUCATION_LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
