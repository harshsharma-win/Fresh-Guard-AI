import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import path from 'node:path'

type DashboardInventoryItem = {
  id: string
  name: string
  icon: string
  room: string
  quantity: number
  score: number
  daysLeft: number
  storedAt?: string
  qualityMode?: 'manual'
}

type DashboardState = {
  rooms: string[]
  inventory: DashboardInventoryItem[]
  updatedAt: string
}

const statePath = path.join(process.cwd(), '.freshguard', 'dashboard-state.json')

function isString(value: unknown, maximumLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength
}

function validateState(value: unknown): DashboardState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { rooms?: unknown; inventory?: unknown }
  if (!Array.isArray(candidate.rooms) || candidate.rooms.length < 1 || candidate.rooms.length > 50 ||
    !candidate.rooms.every((room) => isString(room, 40)) ||
    new Set(candidate.rooms.map((room) => (room as string).trim().toLowerCase())).size !== candidate.rooms.length ||
    !Array.isArray(candidate.inventory) || candidate.inventory.length > 1000) return null

  const rooms = candidate.rooms.map((room) => (room as string).trim())
  const inventory = candidate.inventory as DashboardInventoryItem[]
  const itemIds = new Set<string>()
  for (const item of inventory) {
    if (!item || typeof item !== 'object' ||
      !isString(item.id, 100) || itemIds.has(item.id) ||
      !isString(item.name, 50) || !isString(item.icon, 20) ||
      typeof item.room !== 'string' || !rooms.includes(item.room) ||
      typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity < 0 ||
      typeof item.score !== 'number' || !Number.isInteger(item.score) || item.score < 0 || item.score > 100 ||
      typeof item.daysLeft !== 'number' || !Number.isFinite(item.daysLeft) || item.daysLeft < 0 || item.daysLeft > 365 ||
      (item.storedAt !== undefined && (typeof item.storedAt !== 'string' || !Number.isFinite(Date.parse(item.storedAt)))) ||
      (item.qualityMode !== undefined && item.qualityMode !== 'manual')) return null
    itemIds.add(item.id)
  }

  return {
    rooms,
    inventory: inventory.map((item) => ({
      ...item,
      room: item.room.trim(),
      storedAt: item.storedAt ?? new Date().toISOString(),
      qualityMode: 'manual',
    })),
    updatedAt: new Date().toISOString(),
  }
}

async function readState(): Promise<DashboardState | null> {
  try {
    const stored: unknown = JSON.parse(await readFile(statePath, 'utf8'))
    const state = validateState(stored)
    if (!state || typeof (stored as { updatedAt?: unknown }).updatedAt !== 'string') {
      throw new Error('Shared dashboard state has an invalid format.')
    }
    return { ...state, updatedAt: (stored as DashboardState).updatedAt }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

async function saveState(state: DashboardState) {
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(temporaryPath, JSON.stringify(state), 'utf8')
  try {
    await rename(temporaryPath, statePath)
  } catch (error) {
    const { unlink } = await import('node:fs/promises')
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const state = await readState()
    return NextResponse.json(
      { state },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Could not read shared FreshGuard dashboard state:', error)
    return NextResponse.json({ error: 'Shared dashboard data is unavailable on this server.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const state = validateState(payload)
  if (!state) {
    return NextResponse.json({ error: 'Provide valid room and inventory data.' }, { status: 400 })
  }

  try {
    await saveState(state)
    return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Could not save shared FreshGuard dashboard state:', error)
    return NextResponse.json({ error: 'Dashboard data could not be stored by this server.' }, { status: 500 })
  }
}
