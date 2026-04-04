import { ConversationStatus } from '@/types/database'

export type ConversationFailedStage = 'upload' | 'transcribe' | 'extract'
export type ConversationProcessingStage = 'transcribe' | 'extract'

export function normalizeConversationStatus(status: ConversationStatus): Exclude<ConversationStatus, 'pending'> | 'uploaded' {
  return status === 'pending' ? 'uploaded' : status
}

export function getConversationProcessingStage(input: {
  status: ConversationStatus
  failedStage?: ConversationFailedStage | null
  allowRecovery?: boolean
}) {
  const normalizedStatus = normalizeConversationStatus(input.status)

  if (normalizedStatus === 'uploaded') {
    return 'transcribe' as const
  }

  if (normalizedStatus === 'transcribed') {
    return 'extract' as const
  }

  if (input.allowRecovery && normalizedStatus === 'transcribing') {
    return 'transcribe' as const
  }

  if (input.allowRecovery && normalizedStatus === 'extracting') {
    return 'extract' as const
  }

  if (normalizedStatus === 'failed' && input.allowRecovery) {
    if (input.failedStage === 'transcribe') {
      return 'transcribe' as const
    }

    if (input.failedStage === 'extract') {
      return 'extract' as const
    }
  }

  return null
}
