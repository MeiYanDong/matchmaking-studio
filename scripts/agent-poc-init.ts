import {
  getAgentDatabasePath,
  initializeAgentDatabase,
  openAgentDatabase,
  resetAgentDatabase,
  seedDemoConversation,
} from '../experiments/agent-worker/db'

function main() {
  const dbPath = getAgentDatabasePath()
  resetAgentDatabase(dbPath)

  const db = openAgentDatabase(dbPath)
  initializeAgentDatabase(db)
  const seeded = seedDemoConversation(db)
  db.close()

  console.log(`已初始化本地 Agent POC 数据库：${dbPath}`)
  console.log(`profileId: ${seeded.profileId}`)
  console.log(`conversationId: ${seeded.conversationId}`)
}

main()
