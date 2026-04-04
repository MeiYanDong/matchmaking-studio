'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildAudioStorageObjectKey } from '@/lib/storage/object-key'
import {
  uploadAudioToStorageWithFallback,
} from '@/lib/storage/resumable-upload'
import {
  ConversationFailedStage,
  getConversationProcessingStage,
} from '@/lib/conversations/processing'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Mic, Upload, CheckCircle, AlertCircle, Loader, X, RefreshCw } from 'lucide-react'

interface AudioUploaderProps {
  profileId: string
}

type UploadWorkflowStep =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'extracting'
  | 'done'
  | 'error'
const MAX_STATUS_POLLS = 32
const POLL_INTERVAL_MS = 3000
const EXTRACT_RECOVERY_POLL_THRESHOLD = 2
const TRANSCRIBED_RECOVERY_POLL_THRESHOLD = 1
const TRANSCRIBE_RECOVERY_POLL_THRESHOLD = 8
const UPLOADED_RECOVERY_POLL_THRESHOLD = 1
const PROCESSING_ENDPOINT_RESPONSE_GRACE_MS = 4000

const STEP_LABELS: Record<UploadWorkflowStep, string> = {
  idle: '选择文件',
  uploading: '上传到资料库中...',
  uploaded: '音频已上传',
  transcribing: '发送到转录服务中...',
  transcribed: '已转成文字稿',
  extracting: 'AI 提取信息中...',
  done: '处理完成',
  error: '处理失败',
}

const STEP_DESCRIPTIONS: Record<UploadWorkflowStep, string> = {
  idle: '选择一段录音，系统会自动完成转录与提取。',
  uploading: '先把原始音频上传到资料库，这一步还没有开始转文字。',
  uploaded: '音频已经安全入库，系统正在准备转录。',
  transcribing: '资料库里的音频正在发送到转录服务并识别为文字。',
  transcribed: '文字稿已生成，系统正在准备提取结构化字段。',
  extracting: '转录完成后，AI 正在抽取字段并写入数据库。',
  done: '录音已经完成转文字、AI 提取并写入数据库。',
  error: '当前这次处理失败了，可以直接重试当前处理。',
}

const STEP_PROGRESS: Record<UploadWorkflowStep, number> = {
  idle: 0,
  uploading: 25,
  uploaded: 35,
  transcribing: 50,
  transcribed: 65,
  extracting: 75,
  done: 100,
  error: 0,
}

function getStepFromConversationStatus(status: string | null | undefined): UploadWorkflowStep {
  switch (status) {
    case 'pending':
    case 'uploaded':
      return 'uploaded'
    case 'transcribing':
      return 'transcribing'
    case 'transcribed':
      return 'transcribed'
    case 'extracting':
      return 'extracting'
    case 'done':
      return 'done'
    case 'failed':
      return 'error'
    default:
      return 'error'
  }
}

export function AudioUploader({ profileId }: AudioUploaderProps) {
  const router = useRouter()
  const [step, setStep] = useState<UploadWorkflowStep>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [pendingObjectKey, setPendingObjectKey] = useState('')
  const [successRedirectPath, setSuccessRedirectPath] = useState<string>('')
  const [successRedirectLabel, setSuccessRedirectLabel] = useState<string>('返回客户详情')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
  const MAX_SIZE = 100 * 1024 * 1024 // 100MB

  async function callProcessingEndpoint(
    targetConversationId: string,
    options?: {
      allowRecovery?: boolean
    }
  ) {
    const response = await fetch('/api/process-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: targetConversationId,
        ...(options?.allowRecovery ? { allowRecovery: true } : {}),
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error || '处理失败')
    }

    return payload
  }

  async function startProcessingEndpoint(
    targetConversationId: string,
    options?: {
      allowRecovery?: boolean
      fallbackStep: UploadWorkflowStep
    }
  ) {
    setStep(options?.fallbackStep ?? 'transcribing')

    const requestPromise = callProcessingEndpoint(targetConversationId, options)
      .then((payload) => ({ kind: 'payload' as const, payload }))
      .catch((error: Error) => ({ kind: 'error' as const, error }))

    const earlyResult = await Promise.race([
      requestPromise,
      new Promise<{ kind: 'pending' }>((resolve) =>
        setTimeout(() => resolve({ kind: 'pending' }), PROCESSING_ENDPOINT_RESPONSE_GRACE_MS)
      ),
    ])

    if (earlyResult.kind === 'error') {
      throw earlyResult.error
    }

    if (earlyResult.kind === 'payload') {
      return earlyResult.payload
    }

    return {
      success: true,
      accepted: true,
      status: options?.fallbackStep === 'extracting' ? 'extracting' : 'transcribing',
    }
  }

  async function requestProcessing(
    targetConversationId: string,
    options?: {
      allowRecovery?: boolean
    }
  ) {
    const supabase = createClient()
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('status, failed_stage')
      .eq('id', targetConversationId)
      .single()

    if (conversationError) {
      throw new Error('读取处理状态失败: ' + conversationError.message)
    }

    const nextStage = getConversationProcessingStage({
      status: conversation.status,
      failedStage: (conversation.failed_stage as ConversationFailedStage | null | undefined) ?? null,
      allowRecovery: options?.allowRecovery,
    })

    if (!nextStage) {
      const normalizedStep = getStepFromConversationStatus(conversation.status)
      setStep(normalizedStep)
      return {
        success: true,
        accepted: false,
        status: conversation.status,
      }
    }

    const payload = await startProcessingEndpoint(targetConversationId, {
      ...options,
      fallbackStep: nextStage === 'extract' ? 'extracting' : 'transcribing',
    })

    if (payload?.status === 'done') {
      setStep('done')
      return payload
    }

    setStep(getStepFromConversationStatus(payload?.status))
    return payload
  }

  async function waitForCompletion(targetConversationId: string) {
    const supabase = createClient()
    let done = false
    let retries = 0

    while (!done && retries < MAX_STATUS_POLLS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      const { data: updated, error: pollError } = await supabase
        .from('conversations')
        .select('status, failed_stage, error_message, transcript, extracted_fields')
        .eq('id', targetConversationId)
        .single()

      if (pollError) {
        throw new Error('查询处理结果失败: ' + pollError.message)
      }

      if (updated?.status === 'done') {
        done = true
        setStep('done')
        break
      }

      if (updated?.status === 'failed') {
        throw new Error(updated.error_message || 'AI 提取失败')
      }

      if (updated?.status === 'pending' || updated?.status === 'uploaded') {
        setStep('uploaded')

        if (retries >= UPLOADED_RECOVERY_POLL_THRESHOLD && retries % 3 === 0) {
          try {
            void callProcessingEndpoint(targetConversationId, {
              allowRecovery: true,
            }).catch((recoveryError) => {
              console.error('Recover workflow request failed:', recoveryError)
            })
          } catch (recoveryError) {
            console.error('Recover workflow request failed:', recoveryError)
          }
        }
      }

      if (updated?.status === 'transcribing') {
        setStep('transcribing')

        const transcriptReady =
          typeof updated.transcript === 'string' && updated.transcript.trim().length > 0

        if (
          !transcriptReady
          && retries >= TRANSCRIBE_RECOVERY_POLL_THRESHOLD
          && retries % 4 === 0
        ) {
          try {
            void callProcessingEndpoint(targetConversationId, {
              allowRecovery: true,
            }).catch((recoveryError) => {
              console.error('Recover workflow request failed:', recoveryError)
            })
          } catch (recoveryError) {
            console.error('Recover workflow request failed:', recoveryError)
          }
        }
      }

      if (updated?.status === 'transcribed') {
        setStep('transcribed')

        if (retries >= TRANSCRIBED_RECOVERY_POLL_THRESHOLD && retries % 2 === 0) {
          try {
            void callProcessingEndpoint(targetConversationId, {
              allowRecovery: true,
            }).catch((recoveryError) => {
              console.error('Recover workflow request failed:', recoveryError)
            })
          } catch (recoveryError) {
            console.error('Recover workflow request failed:', recoveryError)
          }
        }
      }

      if (updated?.status === 'extracting') {
        setStep('extracting')

        const extractedReady = Boolean(updated.extracted_fields)

        if (!extractedReady && retries >= EXTRACT_RECOVERY_POLL_THRESHOLD && retries % 4 === 0) {
          try {
            void callProcessingEndpoint(targetConversationId, {
              allowRecovery: true,
            }).catch((recoveryError) => {
              console.error('Recover workflow request failed:', recoveryError)
            })
          } catch (recoveryError) {
            console.error('Recover workflow request failed:', recoveryError)
          }
        }
      }

      retries++
    }

    if (!done) {
      throw new Error('处理超时，请点击“重试当前处理”继续执行。')
    }
  }

  function validateFile(f: File) {
    if (!ACCEPTED_TYPES.some(t => f.type.includes(t.split('/')[1]) || f.name.match(/\.(mp3|m4a|wav|ogg)$/i))) {
      return '请上传 MP3、M4A、WAV 或 OGG 格式的音频文件'
    }
    if (f.size > MAX_SIZE) {
      return '文件大小不能超过 100MB'
    }
    return null
  }

  async function readDuration(f: File) {
    return new Promise<number | null>((resolve) => {
      const url = URL.createObjectURL(f)
      const audio = document.createElement('audio')

      const cleanup = () => {
        URL.revokeObjectURL(url)
        audio.remove()
      }

      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        const nextDuration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null
        cleanup()
        resolve(nextDuration)
      }
      audio.onerror = () => {
        cleanup()
        resolve(null)
      }
      audio.src = url
    })
  }

  async function handleFileSelect(f: File) {
    const err = validateFile(f)
    if (err) { toast.error(err); return }
    const nextDuration = await readDuration(f)
    setFile(f)
    setDuration(nextDuration)
    setConversationId('')
    setPendingObjectKey('')
    setUploadProgress(0)
    setError('')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  async function handleUpload() {
    if (!file) return
    setStep('uploading')
    setError('')
    setConversationId('')
    setUploadProgress(0)

    try {
      const supabase = createClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const user = session?.user
      if (!user) throw new Error('未登录')

      // 1. Upload to Supabase Storage
      const fileName = pendingObjectKey || buildAudioStorageObjectKey({
        userId: user.id,
        profileId,
        originalFileName: file.name,
      })
      setPendingObjectKey(fileName)

      await uploadAudioToStorageWithFallback({
        supabase,
        accessToken: session.access_token,
        bucketName: 'audio-files',
        objectName: fileName,
        file,
        onProgress: (nextProgress) => {
          setUploadProgress((previousProgress) => Math.max(previousProgress, nextProgress))
        },
      })

      // 2. 创建 conversation 记录
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          profile_id: profileId,
          matchmaker_id: user.id,
          audio_url: fileName,
          audio_duration: duration,
          status: 'uploaded',
          failed_stage: null,
        })
        .select()
        .single()

      if (convError || !conv) throw new Error('创建记录失败')
      setConversationId(conv.id)
      setStep('uploaded')

      // 3. 触发处理，并等待提取完成
      await requestProcessing(conv.id)
      await waitForCompletion(conv.id)

      const { data: completedConversation } = await supabase
        .from('conversations')
        .select('extracted_fields')
        .eq('id', conv.id)
        .single()

      const reviewRequiredCount =
        ((completedConversation?.extracted_fields as { review_required?: unknown[] } | null)?.review_required?.length) ?? 0

      setSuccessRedirectPath(
        reviewRequiredCount > 0
          ? `/matchmaker/clients/${profileId}/conversations/${conv.id}/review`
          : `/matchmaker/clients/${profileId}`
      )
      setSuccessRedirectLabel(reviewRequiredCount > 0 ? '去处理异常' : '返回客户详情')
      toast.success('录音处理完成！')
      setStep('done')
    } catch (err) {
      setStep('error')
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(msg)
    }
  }

  if (step === 'done') {
    return (
      <div className="py-12 space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">处理完成！</h3>
          <p className="text-gray-500">语音已经完成转文字、AI 提取并写入数据库。</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            className="bg-rose-500 hover:bg-rose-600"
            onClick={() => router.push(successRedirectPath || `/matchmaker/clients/${profileId}`)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {successRedirectLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/matchmaker/clients/${profileId}`)}
          >
            返回客户详情
          </Button>
        </div>
      </div>
    )
  }

  if (step !== 'idle' && step !== 'error') {
    const workflowProgress =
      step === 'uploading'
        ? Math.max(4, Math.round(uploadProgress * 0.4))
        : STEP_PROGRESS[step]
    const stageOrder: UploadWorkflowStep[] = ['uploading', 'uploaded', 'transcribing', 'transcribed', 'extracting']
    const currentStageIndex = stageOrder.indexOf(step)
    const headlineIcon =
      step === 'uploaded' || step === 'transcribed'
        ? <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        : <Loader className="w-12 h-12 text-rose-400 mx-auto mb-3 animate-spin" />

    return (
      <div className="py-8 space-y-6">
        <div className="text-center">
          {headlineIcon}
          <h3 className="text-lg font-semibold text-gray-900">{STEP_LABELS[step]}</h3>
          <p className="text-gray-500 text-sm mt-1">{STEP_DESCRIPTIONS[step]}</p>
          {step === 'uploading' && (
            <p className="mt-2 text-sm font-medium text-rose-600">资料库上传进度 {uploadProgress}%</p>
          )}
        </div>
        <Progress value={workflowProgress} className="h-2" />
        <div className="flex justify-center gap-8 text-sm">
          {stageOrder.map((s, index) => (
            <div key={s} className={`flex items-center gap-1.5 ${step === s ? 'text-rose-600 font-medium' : index < currentStageIndex ? 'text-green-600' : 'text-gray-400'}`}>
              {index < currentStageIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : step === s ? (
                s === 'uploaded' || s === 'transcribed'
                  ? <CheckCircle className="w-4 h-4" />
                  : <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-current" />
              )}
              {STEP_LABELS[s]}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragging ? 'border-rose-400 bg-rose-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-rose-300 hover:bg-gray-50'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.m4a,.wav,.ogg"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        {file ? (
          <div>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">{file.name}</p>
            <p className="text-sm text-green-500">
              {(file.size / 1024 / 1024).toFixed(1)} MB
              {duration !== null && ` · ${Math.floor(duration / 60)}分${duration % 60}秒`}
            </p>
          </div>
        ) : (
          <div>
            <Mic className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700">拖拽音频文件到这里，或点击选择</p>
            <p className="text-sm text-gray-400 mt-1">支持 MP3、M4A、WAV、OGG，最大 100MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div>{error}</div>
            {conversationId && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-red-200 text-red-600 hover:bg-red-100"
                onClick={async () => {
                  setError('')
                  try {
                    await requestProcessing(conversationId, { allowRecovery: true })
                    await waitForCompletion(conversationId)
                  } catch (err) {
                    setStep('error')
                    setError((err as Error).message)
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重试当前处理
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {file && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setFile(null); setDuration(null); setError(''); setConversationId(''); setPendingObjectKey(''); setUploadProgress(0) }} className="flex-1">
            <X className="w-4 h-4 mr-2" />重新选择
          </Button>
          <Button onClick={handleUpload} className="flex-1 bg-rose-500 hover:bg-rose-600">
            <Upload className="w-4 h-4 mr-2" />开始上传
          </Button>
        </div>
      )}
    </div>
  )
}
