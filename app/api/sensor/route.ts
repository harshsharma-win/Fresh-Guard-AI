import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import path from 'node:path'

type SensorReading = {
  temperature: number | null
  humidity: number | null
  gasRaw: number | null
  doorOpen: boolean | null
  doorWarning: boolean
  sensorOK: boolean
  updatedAt: string
}

const statePath = path.join(process.cwd(), '.freshguard', 'sensor-state.json')

async function readLatestReading(): Promise<SensorReading | null> {
  try {
    const content = await readFile(statePath, 'utf8')
    const value: unknown = JSON.parse(content)
    if (!value || typeof value !== 'object') throw new Error('Sensor state has an invalid format.')
    const reading = (value as { reading?: unknown }).reading
    if (!reading || typeof reading !== 'object') throw new Error('Sensor state has an invalid format.')
    const candidate = reading as Partial<SensorReading>
    if (
      (candidate.temperature !== null && (typeof candidate.temperature !== 'number' || !Number.isFinite(candidate.temperature))) ||
      (candidate.humidity !== null && (typeof candidate.humidity !== 'number' || !Number.isFinite(candidate.humidity))) ||
      (candidate.gasRaw !== null && (typeof candidate.gasRaw !== 'number' || !Number.isInteger(candidate.gasRaw))) ||
      (candidate.doorOpen !== null && typeof candidate.doorOpen !== 'boolean') ||
      (candidate.doorWarning !== undefined && typeof candidate.doorWarning !== 'boolean') ||
      (candidate.sensorOK !== undefined && typeof candidate.sensorOK !== 'boolean') ||
      typeof candidate.updatedAt !== 'string' || !Number.isFinite(Date.parse(candidate.updatedAt))
    ) {
      throw new Error('Sensor state has an invalid reading.')
    }
    return {
      ...candidate,
      doorWarning: candidate.doorWarning ?? false,
      sensorOK: candidate.sensorOK ?? true,
    } as SensorReading
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

async function saveLatestReading(reading: SensorReading) {
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(temporaryPath, JSON.stringify({ reading }), 'utf8')
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
    const reading = await readLatestReading()
    const connected = reading !== null && Date.now() - Date.parse(reading.updatedAt) < 15000
    return NextResponse.json(
      { reading, connected, serverTime: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Could not read FreshGuard sensor state:', error)
    return NextResponse.json({ error: 'Sensor state is unavailable on this server.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Provide valid temperature and humidity readings' }, { status: 400 })
  }

  const {
    temperature,
    humidity,
    gasRaw: legacyGasRaw,
    gas_voc_raw: gasVocRaw,
    doorOpen,
    doorStatus,
    door,
    door_warning: doorWarning,
    sensor_ok: sensorOK,
  } = payload as {
    temperature?: unknown
    humidity?: unknown
    gasRaw?: unknown
    gas_voc_raw?: unknown
    doorOpen?: unknown
    doorStatus?: unknown
    door?: unknown
    door_warning?: unknown
    sensor_ok?: unknown
  }
  const gasRaw = gasVocRaw ?? legacyGasRaw
  const incomingDoorStatus = door ?? doorStatus
  const normalizedDoorStatus = typeof incomingDoorStatus === 'string' ? incomingDoorStatus.trim().toUpperCase() : null
  const isValidDoorStatus = (value: unknown) =>
    typeof value === 'string' && ['OPEN', 'CLOSED'].includes(value.trim().toUpperCase())
  const hasTemperature = typeof temperature === 'number' && Number.isFinite(temperature) && temperature >= -40 && temperature <= 80
  const hasHumidity = typeof humidity === 'number' && Number.isFinite(humidity) && humidity >= 0 && humidity <= 100
  const validSensorStatus = sensorOK === undefined || typeof sensorOK === 'boolean'
  const isSensorOK = typeof sensorOK === 'boolean' ? sensorOK : hasTemperature && hasHumidity
  const validMeasurementPair = isSensorOK
    ? hasTemperature && hasHumidity
    : sensorOK === false && temperature === undefined && humidity === undefined
  if (
    !validSensorStatus || !validMeasurementPair ||
    (gasRaw !== undefined && (typeof gasRaw !== 'number' || !Number.isInteger(gasRaw) || gasRaw < 0 || gasRaw > 4095)) ||
    (doorOpen !== undefined && typeof doorOpen !== 'boolean') ||
    (door !== undefined && !isValidDoorStatus(door)) ||
    (doorStatus !== undefined && !isValidDoorStatus(doorStatus)) ||
    (typeof door === 'string' && typeof doorStatus === 'string' && door.trim().toUpperCase() !== doorStatus.trim().toUpperCase()) ||
    (typeof gasVocRaw === 'number' && typeof legacyGasRaw === 'number' && gasVocRaw !== legacyGasRaw) ||
    (doorWarning !== undefined && typeof doorWarning !== 'boolean') ||
    (typeof doorOpen === 'boolean' && normalizedDoorStatus !== null &&
      doorOpen !== (normalizedDoorStatus === 'OPEN'))
  ) {
    return NextResponse.json({ error: 'Provide valid sensor status, temperature/humidity, MQ-135 ADC, and door readings' }, { status: 400 })
  }

  const parsedDoorOpen = typeof doorOpen === 'boolean'
    ? doorOpen
    : normalizedDoorStatus === null ? null : normalizedDoorStatus === 'OPEN'
  const reading = {
    temperature: hasTemperature ? temperature as number : null,
    humidity: hasHumidity ? humidity as number : null,
    gasRaw: typeof gasRaw === 'number' ? gasRaw : null,
    doorOpen: parsedDoorOpen,
    doorWarning: typeof doorWarning === 'boolean' ? doorWarning : false,
    sensorOK: isSensorOK,
    updatedAt: new Date().toISOString(),
  }
  try {
    await saveLatestReading(reading)
    return NextResponse.json({ ok: true, reading }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Could not save FreshGuard sensor reading:', error)
    return NextResponse.json({ error: 'Sensor reading could not be stored by this server.' }, { status: 500 })
  }
}