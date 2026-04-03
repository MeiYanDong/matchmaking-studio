import { inspectDatabase, openAgentDatabase } from '../experiments/agent-worker/db'

function main() {
  const db = openAgentDatabase()
  const snapshot = inspectDatabase(db)
  db.close()
  console.log(JSON.stringify(snapshot, null, 2))
}

main()
