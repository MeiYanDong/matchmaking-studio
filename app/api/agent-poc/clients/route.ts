import { NextResponse } from 'next/server'
import {
  createDraftProfile,
  initializeAgentDatabase,
  listProfileSummaries,
  openAgentDatabase,
} from '@/experiments/agent-worker/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const db = openAgentDatabase()

  try {
    initializeAgentDatabase(db)
    const profiles = listProfileSummaries(db)
    return NextResponse.json({ ok: true, profiles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取本地客户列表失败' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

export async function POST(request: Request) {
  const db = openAgentDatabase()

  try {
    initializeAgentDatabase(db)
    const body = (await request.json().catch(() => null)) as
      | {
          name?: string
          gender?: string
          phone?: string
          note?: string
        }
      | null

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const gender = body?.gender === 'male' || body?.gender === 'female' ? body.gender : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const note = typeof body?.note === 'string' ? body.note.trim() : ''

    if (!name) {
      return NextResponse.json({ error: '请先填写客户姓名' }, { status: 400 })
    }

    if (!gender) {
      return NextResponse.json({ error: '请先选择客户性别' }, { status: 400 })
    }

    const profile = createDraftProfile(db, { name, gender, phone, note })
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建草稿客户失败' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}
