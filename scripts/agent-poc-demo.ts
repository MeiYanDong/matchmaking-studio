import { inspectDatabase, openAgentDatabase } from '../experiments/agent-worker/db'
import { runAgentExtraction } from '../experiments/agent-worker/runner'

async function main() {
  const profileId = process.argv[2] || 'poc-profile-001'
  const conversationId = process.argv[3] || 'poc-conversation-001'
  const dryRun = process.argv.includes('--dry-run')

  const result = await runAgentExtraction({
    profileId,
    conversationId,
    dryRun,
  })

  const db = openAgentDatabase()
  const snapshot = inspectDatabase(db)
  db.close()

  console.log(JSON.stringify({ result, snapshot }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
