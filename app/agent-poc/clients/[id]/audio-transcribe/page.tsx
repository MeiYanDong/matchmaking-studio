import { notFound } from 'next/navigation'
import { AudioTranscribeLab } from '@/components/agent-poc/audio-transcribe-lab'
import { getProfileBundle, getProfileSummary, initializeAgentDatabase, openAgentDatabase } from '@/experiments/agent-worker/db'

export const dynamic = 'force-dynamic'

export default async function AgentPocProfileAudioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = openAgentDatabase()

  try {
    initializeAgentDatabase(db)
    const profile = getProfileSummary(db, id)
    if (!profile) {
      notFound()
    }
    const snapshot = JSON.parse(JSON.stringify(getProfileBundle(db, id)))

    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <AudioTranscribeLab
          profileId={profile.id}
          profileName={profile.name}
          backHref="/agent-poc/clients"
          initialSnapshot={snapshot}
        />
      </div>
    )
  } finally {
    db.close()
  }
}
