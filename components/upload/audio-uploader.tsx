'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Mic, Upload, CheckCircle, AlertCircle, Loader, X, RefreshCw } from 'lucide-react'

interface AudioUploaderProps {
  profileId: string
}

type UploadStep = 'idle' | 'uploading' | 'transcribing' | 'extracting' | 'done' | 'error'

const MAX_STATUS_POLLS = 30
const POLL_INTERVAL_MS = 3000
const EXTRACT_RECOVERY_POLL_THRESHOLD = 2

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '选择文件',
  uploading: '上传音频中...',
  transcribing: '语音转文字中...',
  extracting: 'AI 提取信息中...',
  done: '处理完成',
  error: '处理失败',
}

const STEP_PROGRESS: Record<UploadStep, number> = {
  idle: 0,
  uploading: 25,
  transcribing: 50,
  extracting: 75,
  done: 100,
  error: 0,
}

export function AudioUploader({ profileId }: AudioUploaderProps) {
  const router = useRouter()
  const [step, setStep] = useState<UploadStep>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [successRedirectPath, setSuccessRedirectPath] = useState<string>('')
  const [successRedirectLabel, setSuccessRedirectLabel] = useState<string>('返回客户详情')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
  const MAX_SIZE = 100 * 1024 * 1024 // 100MB

  async function callProcessingEndpoint(
    endpoint: '/api/transcribe' | '/api/extract',
    targetConversationId: string
  ) {
    const nextStep = endpoint === '/api/transcribe' ? 'transcribing' : 'extracting'
    setStep(nextStep)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: targetConversationId }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        payload?.error || (endpoint === '/api/transcribe' ? '转录失败' : 'AI 提取失败')
      )
    }

    return payload
  }

  async function requestProcessing(targetConversationId: string) {
    const supabase = createClient()
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('transcript')
      .eq('id', targetConversationId)
      .single()

    if (conversationError) {
      throw new Error('读取处理状态失败: ' + conversationError.message)
    }

    const endpoint = conversation?.transcript ? '/api/extract' : '/api/transcribe'
    const payload = await callProcessingEndpoint(endpoint, targetConversationId)

    if (payload?.status === 'done') {
      setStep('done')
      return payload
    }

    setStep(payload?.status === 'transcribing' ? 'transcribing' : 'extracting')
    return payload
  }

  async function waitForCompletion(targetConversationId: string) {
    const supabase = createClient()
    let done = false
    let retries = 0
    let extractRecoveryTriggered = false

    while (!done && retries < MAX_STATUS_POLLS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      const { data: updated, error: pollError } = await supabase
        .from('conversations')
        .select('status, error_message, transcript, extracted_fields')
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

      if (updated?.status === 'transcribing') {
        setStep('transcribing')
      }

      if (updated?.status === 'extracting') {
        setStep('extracting')

        const transcriptReady =
          typeof updated.transcript === 'string' && updated.transcript.trim().length > 0
        const extractedReady = Boolean(updated.extracted_fields)

        if (
          transcriptReady
          && !extractedReady
          && !extractRecoveryTriggered
          && retries >= EXTRACT_RECOVERY_POLL_THRESHOLD
        ) {
          extractRecoveryTriggered = true

          try {
            await callProcessingEndpoint('/api/extract', targetConversationId)
          } catch (recoveryError) {
            console.error('Recover extract request failed:', recoveryError)
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
      const fileName = `${user.id}/${profileId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file)

      if (uploadError) throw new Error('文件上传失败: ' + uploadError.message)

      // 2. 创建 conversation 记录
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          profile_id: profileId,
          matchmaker_id: user.id,
          audio_url: fileName,
          audio_duration: duration,
          status: 'pending',
        })
        .select()
        .single()

      if (convError || !conv) throw new Error('创建记录失败')
      setConversationId(conv.id)

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
      const msg = (err as Error).message
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
    return (
      <div className="py-8 space-y-6">
        <div className="text-center">
          <Loader className="w-12 h-12 text-rose-400 mx-auto mb-3 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-900">{STEP_LABELS[step]}</h3>
          <p className="text-gray-500 text-sm mt-1">请耐心等待，不要关闭页面</p>
        </div>
        <Progress value={STEP_PROGRESS[step]} className="h-2" />
        <div className="flex justify-center gap-8 text-sm">
          {(['uploading', 'transcribing', 'extracting'] as UploadStep[]).map((s) => (
            <div key={s} className={`flex items-center gap-1.5 ${step === s ? 'text-rose-600 font-medium' : STEP_PROGRESS[step] > STEP_PROGRESS[s] ? 'text-green-600' : 'text-gray-400'}`}>
              {STEP_PROGRESS[step] > STEP_PROGRESS[s] ? <CheckCircle className="w-4 h-4" /> : step === s ? <Loader className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-current" />}
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
                    await requestProcessing(conversationId)
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
          <Button variant="outline" onClick={() => { setFile(null); setDuration(null); setError('') }} className="flex-1">
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
