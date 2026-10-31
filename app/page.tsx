'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Droplets,
  Download,
  Eye,
  Gauge,
  Leaf,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Upload,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
  Trash2,
} from 'lucide-react'

const initialRooms = ['Cold Room A', 'Cold Room B']
type QualityMode = 'manual'
type InventoryItem = { id: string; name: string; icon: string; room: string; quantity: number; score: number; daysLeft: number; storedAt?: string; qualityMode: QualityMode }
type UserProfile = { name: string; email: string; workspace: string; role: string; avatar: string | null }
type SensorPoint = SensorReading
type ThemeMode = 'system' | 'light' | 'dark'
type ViewName = 'Overview' | 'Cold Rooms' | 'Inventory' | 'Analytics' | 'AI Predictions' | 'Alerts' | 'Settings' | 'Profile'
type SensorReading = {
  temperature: number | null
  humidity: number | null
  gasRaw: number | null
  doorOpen: boolean | null
  doorWarning?: boolean
  sensorOK?: boolean
  updatedAt: string
}
type BatchForecast = {
  id: string
  source?: 'automatic' | 'manual'
  inventoryId?: string
  monitorId?: string
  batchName: string
  room: string
  vegetable: string
  quantity: number
  storageDays: number
  temperature: number
  humidity: number
  gasVocCo2Ppm: number
  lightLux: number
  maxShelfLifeDays: number
  extrapolated?: boolean
  quality: 'Good' | 'Bad'
  spoilageProbability: number
  remainingShelfLifeDays: number
  validationMaeDays: number
  withinTwoDayWindow: boolean
  predictedAt: string
}
type AutoBatchProfile = {
  id: string
  inventoryId?: string
  batchName: string
  vegetable: string
  room: string
  quantity: number
  storageDays: number
}
type ModelMetadata = {
  products: string[]
  trainedAt: string
  dataset: { rows: number; unique_rows: number; shelf_life_label_source: string }
  featureRanges: Record<string, [number, number]>
  featureDefaults: Record<string, number>
  qualityMetrics: { accuracy: number; balanced_accuracy: number; f1_bad: number }
  shelfLifeMetrics: { mae_days: number; rmse_days: number; r2: number }
  validation: { method: string; test_rows: number; warning: string }
  productMaxShelfLifeDays: Record<string, number>
}
type AutoPredictionStatus = { state: 'waiting' | 'current' | 'experimental' | 'blocked' | 'error'; message: string; updatedAt?: string }

const initialInventory: InventoryItem[] = [
  { id: 'avocado', name: 'Avocado', icon: '🥑', room: 'Cold Room A', quantity: 45, score: 82, daysLeft: 6, storedAt: new Date().toISOString(), qualityMode: 'manual' },
  { id: 'strawberries', name: 'Strawberries', icon: '🍓', room: 'Cold Room B', quantity: 120, score: 68, daysLeft: 3, storedAt: new Date().toISOString(), qualityMode: 'manual' },
  { id: 'spinach', name: 'Spinach', icon: '🥬', room: 'Cold Room A', quantity: 80, score: 91, daysLeft: 5, storedAt: new Date().toISOString(), qualityMode: 'manual' },
]

const defaultProfile: UserProfile = { name: 'Harsh Sharma', email: 'harsh@freshguard.ai', workspace: 'Harsh Sharma & Muskan', role: 'Admin', avatar: null }

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'FG'
}

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function getProduceArtDataUri(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z]/g, '')
  const palette: Record<string, { base: string; accent: string; label: string }> = {
    avocado: { base: '#7dbd73', accent: '#5f9856', label: 'A' },
    strawberry: { base: '#ff7e8a', accent: '#e14d66', label: 'S' },
    strawberries: { base: '#ff7e8a', accent: '#e14d66', label: 'S' },
    spinach: { base: '#62b86b', accent: '#3a964f', label: 'P' },
    banana: { base: '#f6d75b', accent: '#d7b431', label: 'B' },
    orange: { base: '#ffb44d', accent: '#f48c2b', label: 'O' },
    apple: { base: '#f26969', accent: '#d65050', label: 'A' },
    grapes: { base: '#8d80f8', accent: '#6f66db', label: 'G' },
    pineapple: { base: '#ffd45f', accent: '#e9b93d', label: 'P' },
    lettuce: { base: '#9ed46a', accent: '#64a84d', label: 'L' },
    tomato: { base: '#f86d6d', accent: '#d64343', label: 'T' },
    cucumber: { base: '#7ed6a0', accent: '#4aaf7a', label: 'C' },
    carrot: { base: '#ff9d5c', accent: '#de7c34', label: 'R' },
  }

  const found = palette[normalized] ?? { base: '#b9d3ff', accent: '#7ea8ff', label: name.trim().charAt(0).toUpperCase() || 'F' }
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${name}">
      <rect width="120" height="120" rx="24" fill="#f9fbff"/>
      <circle cx="60" cy="60" r="32" fill="${found.base}"/>
      <path d="M60 21c10 0 17 7 17 18-10 5-18 11-19 23C48 53 43 45 43 39c0-11 8-18 17-18Z" fill="${found.accent}"/>
      <circle cx="60" cy="60" r="25" fill="${found.base}" opacity="0.8"/>
      <path d="M45 82c7 8 22 11 34 2 8-7 12-16 12-26-6 6-17 10-28 8-11-2-20-9-21-18-9 9-9 25 3 34Z" fill="${found.accent}" opacity="0.3"/>
      <text x="60" y="72" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${found.label}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function ProduceVisual({ name, icon, small = false }: { name: string; icon: string; small?: boolean }) {
  const imageUrl = getProduceArtDataUri(name)
  return <img className={`produce-emoji ${small ? 'small' : ''}`} src={imageUrl} alt={name} loading="lazy" onError={(event) => { event.currentTarget.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="#f4f7ff"/><text x="60" y="72" text-anchor="middle" font-size="48" font-family="Arial, sans-serif">${(icon || '🍏').replace(/</g, '&lt;')}</text></svg>`)}` }} />
}

function isInventoryItem(value: unknown, roomNames: string[]): value is InventoryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.icon === 'string' &&
    typeof item.room === 'string' && roomNames.includes(item.room) &&
    typeof item.quantity === 'number' && Number.isSafeInteger(item.quantity) && item.quantity >= 0 &&
    typeof item.score === 'number' && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100 &&
    typeof item.daysLeft === 'number' && Number.isFinite(item.daysLeft) && item.daysLeft >= 0 && item.daysLeft <= 365 &&
    (item.storedAt === undefined || (typeof item.storedAt === 'string' && Number.isFinite(Date.parse(item.storedAt)))) &&
    (item.qualityMode === undefined || item.qualityMode === 'automatic' || item.qualityMode === 'manual')
}

function isSensorPoint(value: unknown): value is SensorPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Record<string, unknown>
  return (point.temperature === null || (typeof point.temperature === 'number' && Number.isFinite(point.temperature))) &&
    (point.humidity === null || (typeof point.humidity === 'number' && Number.isFinite(point.humidity))) &&
    (point.gasRaw === null || (typeof point.gasRaw === 'number' && Number.isInteger(point.gasRaw))) &&
    (point.doorOpen === null || typeof point.doorOpen === 'boolean') &&
    (point.doorWarning === undefined || typeof point.doorWarning === 'boolean') &&
    (point.sensorOK === undefined || typeof point.sensorOK === 'boolean') &&
    (point.temperature !== null && point.humidity !== null || point.temperature === null && point.humidity === null) &&
    typeof point.updatedAt === 'string' && Number.isFinite(new Date(point.updatedAt).getTime())
}

function isBatchForecast(value: unknown): value is BatchForecast {
  if (!value || typeof value !== 'object') return false
  const forecast = value as Record<string, unknown>
  return ['id', 'batchName', 'vegetable', 'predictedAt'].every((key) => typeof forecast[key] === 'string') &&
    (forecast.room === undefined || typeof forecast.room === 'string') &&
    ['quantity', 'storageDays', 'temperature', 'humidity', 'gasVocCo2Ppm', 'lightLux', 'maxShelfLifeDays', 'spoilageProbability', 'remainingShelfLifeDays', 'validationMaeDays'].every((key) => typeof forecast[key] === 'number' && Number.isFinite(forecast[key])) &&
    (forecast.source === undefined || forecast.source === 'automatic' || forecast.source === 'manual') &&
    (forecast.inventoryId === undefined || typeof forecast.inventoryId === 'string') &&
    (forecast.monitorId === undefined || typeof forecast.monitorId === 'string') &&
    (forecast.extrapolated === undefined || typeof forecast.extrapolated === 'boolean') &&
    (forecast.quality === 'Good' || forecast.quality === 'Bad') &&
    typeof forecast.withinTwoDayWindow === 'boolean' &&
    Number.isFinite(new Date(forecast.predictedAt as string).getTime())
}

function isAutoBatchProfile(value: unknown): value is AutoBatchProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  return typeof profile.id === 'string' && typeof profile.batchName === 'string' &&
    (profile.inventoryId === undefined || typeof profile.inventoryId === 'string') &&
    typeof profile.vegetable === 'string' && typeof profile.room === 'string' &&
    typeof profile.quantity === 'number' && Number.isSafeInteger(profile.quantity) && profile.quantity > 0 &&
    typeof profile.storageDays === 'number' && Number.isFinite(profile.storageDays) && profile.storageDays >= 0
}

function getSensorAlerts(reading: SensorReading | null, roomName = 'Cold Room A') {
  if (!reading) return []
  const alerts: { title: string }[] = []
  if (reading.sensorOK === false) alerts.push({ title: 'DHT temperature and humidity sensor is unavailable' })
  if (reading.doorWarning) alerts.push({ title: `${roomName} door has been open for over 10 seconds` })
  if (reading.doorOpen) alerts.push({ title: `${roomName} door is open` })
  if (reading.temperature !== null && reading.temperature > 8) alerts.push({ title: `Temperature is high (${reading.temperature.toFixed(1)}°C)` })
  if (reading.temperature !== null && reading.temperature < 0) alerts.push({ title: `Temperature is below freezing (${reading.temperature.toFixed(1)}°C)` })
  if (reading.humidity !== null && (reading.humidity > 95 || reading.humidity < 60)) alerts.push({ title: `Humidity is outside the 60–95% monitoring range (${reading.humidity.toFixed(1)}%)` })
  return alerts
}

function getInventoryForecast(item: InventoryItem, forecasts: BatchForecast[]) {
  const normalizedName = item.name.trim().toLowerCase()
  return forecasts.find((forecast) =>
    forecast.inventoryId === item.id ||
    (forecast.source === 'automatic' && forecast.monitorId === `inventory-${item.id}`) ||
    (forecast.source !== 'automatic' && forecast.inventoryId === undefined &&
      forecast.vegetable.trim().toLowerCase() === normalizedName))
}

function getInventoryRemainingDays(item: InventoryItem, forecasts: BatchForecast[], now = Date.now()) {
  const forecast = getInventoryForecast(item, forecasts)
  if (forecast) {
    const forecastAt = Date.parse(forecast.predictedAt)
    const elapsedSinceForecast = Number.isFinite(forecastAt) ? Math.max(0, (now - forecastAt) / 86_400_000) : 0
    return Math.max(0, forecast.remainingShelfLifeDays - elapsedSinceForecast)
  }
  const receivedAt = item.storedAt ? Date.parse(item.storedAt) : now
  const elapsedDays = Number.isFinite(receivedAt) ? Math.max(0, (now - receivedAt) / 86_400_000) : 0
  return Math.max(0, item.daysLeft - elapsedDays)
}

function getInventoryShelfLifeAlerts(inventory: InventoryItem[], forecasts: BatchForecast[], now = Date.now()) {
  return inventory.flatMap((item) => {
    const remainingDays = getInventoryRemainingDays(item, forecasts, now)
    if (remainingDays > 2) return []
    return [{
      id: `inventory-shelf-life-${item.id}`,
      title: remainingDays <= 0 ? `${item.name} estimated shelf life has ended` : `${item.name} shelf life is under 2 days`,
      room: item.room,
      time: `${remainingDays.toFixed(1)} days remaining · inventory estimate`,
    }]
  })
}

function downloadReport(inventory: InventoryItem[], history: SensorPoint[], sensorRoom: string, forecasts: BatchForecast[]) {
  const rows = [
    ['Type', 'Name', 'Room', 'Quantity', 'Manual quality rating', 'Estimated shelf life remaining (days)', 'Temperature C', 'Humidity %', 'Gas raw ADC', 'Door open', 'Recorded at'],
    ...inventory.map((item) => ['Inventory', item.name, item.room, item.quantity, item.score, getInventoryRemainingDays(item, forecasts).toFixed(1), '', '', '', '', '']),
    ...history.map((point) => ['Sensor', '', sensorRoom, '', '', '', point.temperature ?? '', point.humidity ?? '', point.gasRaw ?? '', point.doorOpen ?? '', point.updatedAt]),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'freshguard-report.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const navItems: { label: ViewName; icon: typeof Gauge }[] = [
  { label: 'Overview', icon: Gauge },
  { label: 'Cold Rooms', icon: Snowflake },
  { label: 'Inventory', icon: Package },
  { label: 'Analytics', icon: BarChart3 },
]

const manageItems: { label: Exclude<ViewName, 'Overview' | 'Cold Rooms' | 'Inventory' | 'Analytics'>; icon: typeof ShieldCheck }[] = [
  { label: 'AI Predictions', icon: ShieldCheck },
  { label: 'Alerts', icon: AlertTriangle },
  { label: 'Settings', icon: Settings },
]

const dashboardSearchPages: { label: string; description: string; view: ViewName; keywords: string }[] = [
  { label: 'Overview', description: 'Live conditions and room summary', view: 'Overview', keywords: 'home dashboard live' },
  { label: 'Cold Rooms', description: 'Room status and sensor assignment', view: 'Cold Rooms', keywords: 'storage room sensor' },
  { label: 'Inventory', description: 'Produce quantities and shelf life', view: 'Inventory', keywords: 'stock produce batch' },
  { label: 'Analytics', description: 'Sensor trends and reading history', view: 'Analytics', keywords: 'chart temperature humidity history' },
  { label: 'Shelf Life', description: 'AI estimates and batch monitors', view: 'AI Predictions', keywords: 'prediction forecast ai freshness' },
  { label: 'Alerts', description: 'Current sensor and stock alerts', view: 'Alerts', keywords: 'warning notification issue' },
  { label: 'Settings', description: 'Dashboard refresh and export options', view: 'Settings', keywords: 'preferences configuration' },
  { label: 'Profile', description: 'Your account and workspace details', view: 'Profile', keywords: 'account user workspace' },
]

function StatusDot({ tone = 'healthy' }: { tone?: 'healthy' | 'watch' | 'critical' }) {
  return <span className={`status-dot ${tone}`} aria-hidden="true" />
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue', trend, onMore }: { icon: typeof Thermometer; label: string; value: string; detail: string; tone?: string; trend?: 'up' | 'down'; onMore: () => void }) {
  return (
    <article className="metric-card">
      <div className="metric-icon" data-tone={tone}><Icon size={19} /></div>
      <div className="metric-copy">
        <p className="eyebrow">{label}</p>
        <p className="metric-value">{value}</p>
        <p className="metric-detail">{trend && <>{trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {detail}</>}{!trend && detail}</p>
      </div>
      <button className="icon-button subtle" aria-label={`View analytics for ${label}`} onClick={onMore}><MoreHorizontal size={17} /></button>
    </article>
  )
}

function SensorChart({ readings }: { readings: SensorPoint[] }) {
  const temperaturePoints = readings.flatMap((point, index) => point.temperature === null ? [] : [{ point, index }])
  const temperatureLine = temperaturePoints.map(({ point, index }) => {
    const x = readings.length === 1 ? 50 : (index / (readings.length - 1)) * 100
    const y = 65 - ((point.temperature + 10) / 60) * 60
    return `${x},${Math.min(65, Math.max(5, y))}`
  }).join(' ')
  const humidityPoints = readings.flatMap((point, index) => point.humidity === null ? [] : [{ point, index }])
  const humidityLine = humidityPoints.map(({ point, index }) => {
    const x = readings.length === 1 ? 50 : (index / (readings.length - 1)) * 100
    const y = 65 - (point.humidity / 100) * 60
    return `${x},${Math.min(65, Math.max(5, y))}`
  }).join(' ')
  const firstTime = readings[0] ? new Date(readings[0].updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const lastTime = readings.at(-1) ? new Date(readings.at(-1)!.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="chart-wrap">
      <div className="chart-legend"><span><i className="legend-line teal" />Temperature °C</span><span><i className="legend-line lavender" />Humidity %</span><span className="chart-period">Live readings</span></div>
      {readings.length === 0
        ? <div className="chart-empty">Waiting for live ESP32 readings. The graph will update as sensor data arrives.</div>
        : <div className="chart-area">
          <div className="y-labels"><div className="y-axis"><span>50°</span><span>30°</span><span>10°</span><span>-10°</span></div><div className="y-axis"><span>100%</span><span>66%</span><span>33%</span><span>0%</span></div></div>
          <div className="plot"><div className="grid-lines">{[0, 1, 2, 3, 4, 5].map((n) => <i key={n} />)}</div><svg viewBox="0 0 100 70" preserveAspectRatio="none" aria-label="Live temperature and humidity readings"><polyline points={temperatureLine} fill="none" stroke="var(--teal)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /><polyline points={humidityLine} fill="none" stroke="var(--lavender)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{readings.length === 1 && readings[0].temperature !== null && readings[0].humidity !== null && <><circle cx="50" cy={Math.min(65, Math.max(5, 65 - ((readings[0].temperature + 10) / 60) * 60))} r="2" fill="var(--teal)" /><circle cx="50" cy={Math.min(65, Math.max(5, 65 - (readings[0].humidity / 100) * 60))} r="2" fill="var(--lavender)" /></>}</svg><div className="x-labels"><span>{firstTime}</span><span>{lastTime}</span></div></div>
        </div>}
    </div>
  )
}

function OverviewView({ reading, inventory, forecasts, userName, sensorRoom, onNavigate, onRefresh, onExport }: { reading: SensorReading | null; inventory: InventoryItem[]; forecasts: BatchForecast[]; userName: string; sensorRoom: string; onNavigate: (view: ViewName) => void; onRefresh: () => void; onExport: () => void }) {
  const [noticeVisible, setNoticeVisible] = useState(true)
  const alerts = [
    ...getSensorAlerts(reading, sensorRoom).map((alert) => ({ title: alert.title, room: sensorRoom, detail: reading ? new Date(reading.updatedAt).toLocaleTimeString() : 'Sensor offline' })),
    ...getInventoryShelfLifeAlerts(inventory, forecasts).map((alert) => ({ title: alert.title, room: alert.room, detail: alert.time })),
    ...forecasts.filter((forecast) => forecast.withinTwoDayWindow && !forecast.inventoryId).map((forecast) => ({
      title: `${forecast.batchName} shelf life is under 2 days`,
      room: forecast.room,
      detail: `${forecast.remainingShelfLifeDays.toFixed(1)} days remaining`,
    })),
  ]

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">LIVE COLD STORAGE</p><h1>Welcome back, {userName.split(/\s+/)[0] || 'there'} <span>👋</span></h1><p className="subheading">Live cold storage monitoring and inventory overview.</p></div><div className="heading-actions"><button className="outline-button" onClick={onRefresh}><RefreshCw size={16} /> Refresh data</button><button className="primary-button" onClick={onExport}><Download size={16} /> Export report</button></div></div>
      {noticeVisible && alerts.length > 0 && <div className="notice" role="status"><AlertTriangle size={18} aria-hidden="true" /><span><strong>Sensor alert.</strong> {alerts[0].title}</span><button type="button" onClick={() => onNavigate('Alerts')}>View alerts <ChevronRight size={14} aria-hidden="true" /></button><button type="button" className="icon-button notice-close" onClick={() => setNoticeVisible(false)} aria-label="Dismiss sensor alert"><X size={16} /></button></div>}
      <section className="metrics-grid dashboard-sensor-metrics">
        <MetricCard icon={Thermometer} label="Temperature" value={reading?.temperature != null ? `${reading.temperature.toFixed(1)}°C` : '--'} detail={reading?.temperature != null ? `Updated ${new Date(reading.updatedAt).toLocaleTimeString()}` : 'DHT reading unavailable'} tone="teal" onMore={() => onNavigate('Analytics')} />
        <MetricCard icon={Droplets} label="Humidity" value={reading?.humidity != null ? `${reading.humidity.toFixed(1)}%` : '--'} detail={reading?.humidity != null ? 'Live sensor reading' : 'DHT reading unavailable'} tone="lavender" onMore={() => onNavigate('Analytics')} />
        <MetricCard icon={Waves} label="Gas sensor (raw ADC)" value={reading?.gasRaw !== null && reading?.gasRaw !== undefined ? String(reading.gasRaw) : '--'} detail={reading?.gasRaw !== null && reading?.gasRaw !== undefined ? 'Raw MQ-135 count · not ppm' : 'Waiting for ESP32'} tone="blue" onMore={() => onNavigate('Analytics')} />
        <MetricCard icon={DoorOpen} label="Door status" value={reading?.doorOpen == null ? '--' : reading.doorOpen ? 'Open' : 'Closed'} detail={reading?.doorOpen == null ? 'Waiting for door sensor' : `Updated ${new Date(reading.updatedAt).toLocaleTimeString()}`} tone={reading?.doorOpen === true ? 'yellow' : reading?.doorOpen === false ? 'green' : 'blue'} onMore={() => onNavigate('Alerts')} />
      </section>
      <section className="panel inventory-shelf-life"><div className="panel-header"><div><h2>Inventory shelf life</h2><p>Automatic countdowns with reminders at 2 days or less.</p></div><button className="text-button" type="button" onClick={() => onNavigate('Inventory')}>Manage inventory <ChevronRight size={14} /></button></div>{inventory.length ? <div className="shelf-life-list">{inventory.map((item) => { const forecast = getInventoryForecast(item, forecasts); const remainingDays = getInventoryRemainingDays(item, forecasts); const due = remainingDays <= 2; return <div className="shelf-life-row" key={item.id}><ProduceVisual name={item.name} icon={item.icon} small /><span className="shelf-life-item"><strong>{item.name}</strong><small>{item.room} · {item.quantity} units</small></span><span className={`status-badge ${due ? 'watch' : 'healthy'}`} title={forecast ? 'AI estimate from the latest sensor reading' : 'Countdown from the inventory shelf-life estimate'}>{remainingDays.toFixed(1)} days · {due ? remainingDays <= 0 ? 'Expired' : 'Use soon' : forecast ? 'AI estimate' : 'On track'}</span></div>})}</div> : <p className="chart-empty">Add produce and an estimated shelf life to start tracking.</p>}</section>
      <section className="panel alerts-panel dashboard-alerts"><div className="panel-header"><div><h2>Active alerts</h2></div><button className="text-button" onClick={() => onNavigate('Alerts')}>View all <ChevronRight size={14} /></button></div><div className="alert-list">{alerts.length ? alerts.map((alert) => <div className="alert-row" key={alert.title}><div className="alert-icon warning"><AlertTriangle size={16} /></div><div><strong>{alert.title}</strong><p>{alert.room} · {alert.detail}</p></div><span className="alert-badge warning">Active</span></div>) : <p className="chart-empty">No active alerts.</p>}</div></section>
    </>
  )
}

function ColdRoomsView({ reading, inventory, roomNames, sensorRoom, onNavigate, onRenameRoom, onRemoveRoom, onAddRoom, onAssignSensor }: {
  reading: SensorReading | null
  inventory: InventoryItem[]
  roomNames: string[]
  sensorRoom: string
  onNavigate: (view: ViewName) => void
  onRenameRoom: (oldName: string, newName: string) => void
  onRemoveRoom: (name: string, transferTo: string) => void
  onAddRoom: (name: string) => void
  onAssignSensor: (name: string) => void
}) {
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editedRoomName, setEditedRoomName] = useState('')
  const [removingRoom, setRemovingRoom] = useState<string | null>(null)
  const [transferRoom, setTransferRoom] = useState('')
  const [roomError, setRoomError] = useState('')
  const online = reading !== null && Date.now() - new Date(reading.updatedAt).getTime() < 15000
  const alertCount = getSensorAlerts(reading, sensorRoom).length
  const totalUnits = inventory.reduce((total, item) => total + item.quantity, 0)
  const connectedRooms = online ? 1 : 0
  const saveRoomName = (oldName: string, proposedName: string) => {
    const nextName = proposedName.trim()
    if (!nextName || (nextName.toLowerCase() !== oldName.toLowerCase() && roomNames.some((room) => room.toLowerCase() === nextName.toLowerCase()))) {
      setRoomError('Room names must be unique and cannot be empty.')
      return
    }
    onRenameRoom(oldName, nextName)
    setRoomError('')
    setEditingRoom(null)
  }
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">COLD STORAGE MONITORING</p><h1>Cold rooms</h1><p className="subheading">Monitor room conditions, sensor health, and stored produce.</p></div><div className="heading-actions"><button type="button" className="outline-button" onClick={() => setAddingRoom(!addingRoom)}><Plus size={15} /> Add room</button><button type="button" className="primary-button" onClick={() => onNavigate('Inventory')}><Package size={15} /> Manage inventory</button></div></div>
      {addingRoom && <form className="room-add-form" onSubmit={(event) => { event.preventDefault(); const name = newRoomName.trim(); if (!name || roomNames.some((room) => room.toLowerCase() === name.toLowerCase())) { setRoomError('Enter a unique room name.'); return }; onAddRoom(name); setNewRoomName(''); setRoomError(''); setAddingRoom(false) }}><label className="input-group">New room name<input autoFocus maxLength={40} value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} placeholder="e.g. Produce Room 3" /></label><button className="primary-button" type="submit">Add room</button><button className="outline-button" type="button" onClick={() => { setAddingRoom(false); setRoomError('') }}>Cancel</button></form>}
      {removingRoom && <form className="room-remove-confirm" onSubmit={(event) => { event.preventDefault(); onRemoveRoom(removingRoom, transferRoom); setRemovingRoom(null); setRoomError('') }}><div><strong>Remove {removingRoom}?</strong><p>Room inventory and ESP32 assignment, if any, will move to the selected room.</p></div><label className="input-group">Move contents to<select required value={transferRoom} onChange={(event) => setTransferRoom(event.target.value)}>{roomNames.filter((room) => room !== removingRoom).map((room) => <option key={room}>{room}</option>)}</select></label><button className="primary-button" type="submit">Move and remove</button><button className="outline-button" type="button" onClick={() => setRemovingRoom(null)}>Cancel</button></form>}
      {roomError && <p className="form-error" role="alert">{roomError}</p>}
      <section className="room-summary" aria-label="Cold storage summary">
        <div><span className="room-summary-icon"><Snowflake size={17} /></span><p><strong>{roomNames.length}</strong><small>Total rooms</small></p></div>
        <div><span className="room-summary-icon online"><Waves size={17} /></span><p><strong>{connectedRooms} / {roomNames.length}</strong><small>Rooms reporting live</small></p></div>
        <div><span className="room-summary-icon inventory"><Package size={17} /></span><p><strong>{totalUnits.toLocaleString()}</strong><small>Produce units stored</small></p></div>
        <label className="sensor-assignment">ESP32 assigned to<select aria-label="Assign ESP32 to room" value={sensorRoom} onChange={(event) => onAssignSensor(event.target.value)}>{roomNames.map((name) => <option key={name}>{name}</option>)}</select></label>
      </section>
      <div className="room-grid">{roomNames.map((name) => {
        const isConnectedRoom = name === sensorRoom
        const roomInventory = inventory.filter((item) => item.room === name)
        const roomHasAlerts = isConnectedRoom && alertCount > 0
        return <section className="panel room-card" key={name}>
          <div className="room-card-heading">
            <span className="room-card-icon"><Snowflake size={19} /></span>
            <div className="room-card-title">{editingRoom === name ? <form className="room-rename-form" onSubmit={(event) => { event.preventDefault(); saveRoomName(name, editedRoomName) }}><input aria-label="Room name" maxLength={40} value={editedRoomName} onChange={(event) => setEditedRoomName(event.target.value)} /><button className="text-button" type="submit">Save</button><button className="text-button muted" type="button" onClick={() => { setEditingRoom(null); setRoomError('') }}>Cancel</button></form> : <div><h3>{name}</h3><span className={`room-live-badge ${isConnectedRoom && online ? 'live' : ''}`}><i />{isConnectedRoom && online ? 'Live' : isConnectedRoom ? 'Waiting for sensor' : 'Not connected'}</span></div>}<p>{isConnectedRoom && online ? `Last updated ${new Date(reading.updatedAt).toLocaleTimeString()}` : isConnectedRoom ? 'Connect the ESP32 to begin monitoring.' : 'Assign a sensor to monitor this room.'}</p></div>
            <div className="room-management-actions"><button type="button" className="icon-button" aria-label={`Rename ${name}`} title="Rename room" onClick={() => { setEditingRoom(name); setEditedRoomName(name); setRoomError('') }}><Settings size={15} /></button><button type="button" className="icon-button remove-button" aria-label={`Remove ${name}`} title={roomNames.length <= 1 ? 'Keep at least one room' : 'Move contents and remove room'} disabled={roomNames.length <= 1} onClick={() => { setRemovingRoom(name); setTransferRoom(roomNames.find((room) => room !== name) ?? ''); setRoomError('') }}><Trash2 size={15} /></button></div>
          </div>
          <div className="room-metrics">
            <div><span className="label">Temperature</span><strong>{isConnectedRoom && reading?.temperature != null ? `${reading.temperature.toFixed(1)}°C` : '--'}</strong></div>
            <div><span className="label">Humidity</span><strong>{isConnectedRoom && reading?.humidity != null ? `${reading.humidity.toFixed(1)}%` : '--'}</strong></div>
            <div><span className="label">MQ-135 raw (ADC)</span><strong>{isConnectedRoom && reading && reading.gasRaw !== null ? reading.gasRaw : '--'}</strong></div>
            <div><span className="label">Door</span><strong>{isConnectedRoom && reading?.doorOpen !== null && reading?.doorOpen !== undefined ? reading.doorOpen ? 'Open' : 'Closed' : '--'}</strong></div>
          </div>
          <div className={`room-status ${!online && isConnectedRoom ? 'offline' : roomHasAlerts ? 'watch' : 'normal'}`}><StatusDot tone={!online && isConnectedRoom ? 'critical' : roomHasAlerts ? 'watch' : 'healthy'} />{!online && isConnectedRoom ? 'Sensor offline or stale' : roomHasAlerts ? `${alertCount} active alert${alertCount === 1 ? '' : 's'}` : isConnectedRoom ? 'All monitored conditions normal' : 'Monitoring unavailable'}</div>
          <div className="room-card-footer"><span><Package size={15} />{roomInventory.reduce((total, item) => total + item.quantity, 0).toLocaleString()} units stored</span><button type="button" onClick={() => onNavigate('Inventory')}>Manage stock <ChevronRight size={14} /></button></div>
        </section>
      })}</div>
    </>
  )
}

function InventoryView({ inventory, forecasts, onChange, roomNames }: { inventory: InventoryItem[]; forecasts: BatchForecast[]; onChange: (items: InventoryItem[]) => void; roomNames: string[] }) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [newItem, setNewItem] = useState({ name: '', room: roomNames[0] ?? '', quantity: '0', daysLeft: '7' })
  const filtered = inventory.filter((item) => `${item.name} ${item.room}`.toLowerCase().includes(search.toLowerCase()))
  const totalUnits = inventory.reduce((total, item) => total + item.quantity, 0)
  const addItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newItem.name.trim()
    const quantity = Number(newItem.quantity)
    const daysLeft = Number(newItem.daysLeft)
    if (!name || inventory.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setFormError('Enter a unique produce name.')
      return
    }
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setFormError('Enter a whole-number quantity of 0 or more.')
      return
    }
    if (!Number.isFinite(daysLeft) || daysLeft < 0 || daysLeft > 365) {
      setFormError('Enter an estimated shelf life from 0 to 365 days.')
      return
    }
    if (!roomNames.includes(newItem.room)) {
      setFormError('Choose an existing cold room.')
      return
    }
    onChange([...inventory, { id: createLocalId(), name, icon: '📦', room: newItem.room, quantity, score: 100, daysLeft, storedAt: new Date().toISOString(), qualityMode: 'manual' }])
    setNewItem({ name: '', room: roomNames[0] ?? '', quantity: '0', daysLeft: '7' })
    setFormError('')
    setAdding(false)
  }
  const updateItem = (id: string, patch: Partial<InventoryItem>) => onChange(inventory.map((item) => item.id === id ? { ...item, ...patch } : item))
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">INVENTORY MANAGEMENT</p><h1>Inventory</h1><p className="subheading">{inventory.length} items · {totalUnits.toLocaleString()} total units</p></div><button className="primary-button" onClick={() => { setAdding(!adding); setFormError('') }}><Plus size={15} /> Add produce</button></div>
      {adding && <form className="panel inventory-form" onSubmit={addItem}><div className="panel-header"><div><h2>Add produce</h2><p>Set an estimated shelf life to start the automatic countdown.</p></div></div><div className="inventory-form-grid"><label className="input-group">Produce name<input required maxLength={50} value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} placeholder="e.g. Apples" /></label><label className="input-group">Room<select required value={newItem.room} onChange={(event) => setNewItem({ ...newItem, room: event.target.value })}>{roomNames.map((room) => <option key={room}>{room}</option>)}</select></label><label className="input-group">Quantity<input required type="number" min="0" step="1" value={newItem.quantity} onChange={(event) => setNewItem({ ...newItem, quantity: event.target.value })} /></label><label className="input-group">Estimated shelf life (days)<input required type="number" min="0" max="365" step="0.5" value={newItem.daysLeft} onChange={(event) => setNewItem({ ...newItem, daysLeft: event.target.value })} /></label></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="heading-actions"><button type="submit" className="primary-button">Save produce</button><button type="button" className="outline-button" onClick={() => setAdding(false)}>Cancel</button></div></form>}
      <div className="search-box"><Search size={16} /><input type="text" placeholder="Search produce..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search inventory" /></div>
      <div className="inventory-table"><table><thead><tr><th>Produce</th><th>Room</th><th>Quantity (units)</th><th>Shelf life</th><th>Remove</th></tr></thead><tbody>{filtered.map((item) => { const forecast = getInventoryForecast(item, forecasts); const remainingDays = getInventoryRemainingDays(item, forecasts); const due = remainingDays <= 2; return <tr key={item.id}><td><span className="produce-name-wrap"><ProduceVisual name={item.name} icon={item.icon} small /> {item.name}</span></td><td><select className="table-select" aria-label={`${item.name} room`} value={item.room} onChange={(event) => updateItem(item.id, { room: event.target.value })}>{roomNames.map((room) => <option key={room}>{room}</option>)}</select></td><td><input className="quantity-input" aria-label={`${item.name} quantity`} type="number" min="0" step="1" value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); if (Number.isSafeInteger(quantity) && quantity >= 0) updateItem(item.id, { quantity }) }} /></td><td><span className={`status-badge ${due ? 'watch' : 'healthy'}`} title={forecast ? 'AI estimate from the latest sensor reading' : 'Countdown from the inventory shelf-life estimate'}>{remainingDays.toFixed(1)} days · {due ? remainingDays <= 0 ? 'Expired' : 'Use soon' : forecast ? 'AI estimate' : 'On track'}</span></td><td><button type="button" className="icon-button remove-button" aria-label={`Remove ${item.name}`} onClick={() => onChange(inventory.filter((entry) => entry.id !== item.id))}><Trash2 size={16} /></button></td></tr>})}{filtered.length === 0 && <tr><td colSpan={5}>{inventory.length ? 'No matching inventory items.' : 'Inventory is empty. Add produce to get started.'}</td></tr>}</tbody></table></div>
    </>
  )
}

function AnalyticsView({ history }: { history: SensorPoint[] }) {
  const [dateRange, setDateRange] = useState('7days')
  const cutoff = Date.now() - (dateRange === '24h' ? 24 : dateRange === '30days' ? 24 * 30 : 24 * 7) * 60 * 60 * 1000
  const filtered = history.filter((reading) => new Date(reading.updatedAt).getTime() >= cutoff)
  const temperatureReadings = filtered.flatMap((item) => item.temperature === null ? [] : [item.temperature])
  const humidityReadings = filtered.flatMap((item) => item.humidity === null ? [] : [item.humidity])
  const completeReadings = filtered.filter((item): item is SensorPoint & { temperature: number; humidity: number } =>
    item.temperature !== null && item.humidity !== null)
  const averageHumidity = humidityReadings.length ? humidityReadings.reduce((sum, value) => sum + value, 0) / humidityReadings.length : null
  const peakHumidity = humidityReadings.length ? Math.max(...humidityReadings) : null
  const lowestHumidity = humidityReadings.length ? Math.min(...humidityReadings) : null
  const averageTemperature = temperatureReadings.length ? temperatureReadings.reduce((sum, value) => sum + value, 0) / temperatureReadings.length : null
  const minTemperature = temperatureReadings.length ? Math.min(...temperatureReadings) : null
  const maxTemperature = temperatureReadings.length ? Math.max(...temperatureReadings) : null
  const inRangeCount = completeReadings.filter((item) =>
    item.temperature >= 2 && item.temperature <= 8 && item.humidity >= 60 && item.humidity <= 95).length
  const rangePercent = completeReadings.length ? Math.round((inRangeCount / completeReadings.length) * 100) : null
  const recent = filtered.slice(-6).reverse()
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">SENSOR INSIGHTS</p><h1>Analytics</h1><p className="subheading">Explore temperature and humidity trends, coverage, and recent ESP32 readings.</p></div><select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="chart-period" aria-label="Analytics time range"><option value="24h">Last 24 hours</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option></select></div>
      <section className="analytics-summary">
        <article className="analytics-kpi"><span className="analytics-kpi-icon temp"><Thermometer size={17} /></span><p><small>Average temperature</small><strong>{averageTemperature === null ? '--' : `${averageTemperature.toFixed(1)}°C`}</strong><span>{minTemperature === null ? 'No sensor samples' : `Range ${minTemperature.toFixed(1)}° to ${maxTemperature!.toFixed(1)}°C`}</span></p></article>
        <article className="analytics-kpi"><span className="analytics-kpi-icon humidity"><Droplets size={17} /></span><p><small>Average humidity</small><strong>{averageHumidity === null ? '--' : `${averageHumidity.toFixed(1)}%`}</strong><span>{lowestHumidity === null ? 'No sensor samples' : `Range ${lowestHumidity.toFixed(1)}–${peakHumidity!.toFixed(1)}%`}</span></p></article>
        <article className="analytics-kpi"><span className="analytics-kpi-icon range"><ShieldCheck size={17} /></span><p><small>Readings in target range</small><strong>{rangePercent === null ? '--' : `${rangePercent}%`}</strong><span>2–8°C · 60–95% humidity</span></p></article>
        <article className="analytics-kpi"><span className="analytics-kpi-icon samples"><Waves size={17} /></span><p><small>Samples captured</small><strong>{filtered.length}</strong><span>Saved locally in this browser</span></p></article>
      </section>
      <div className="analytics-grid analytics-main-grid">
        <section className="panel"><div className="panel-header"><div><h2>Temperature and humidity trends</h2><p>Actual ESP32 readings in the selected time range.</p></div></div><SensorChart readings={filtered} /></section>
        <section className="panel analytics-range-panel"><div className="panel-header"><div><h2>At a glance</h2><p>Thresholds are monitoring guides, not food-safety advice.</p></div></div><div className="range-meter"><div className="range-meter-top"><span>Conditions in target band</span><strong>{rangePercent === null ? '--' : `${rangePercent}%`}</strong></div><div className="progress-track"><div style={{ width: `${rangePercent ?? 0}%` }} /></div><p>{inRangeCount} of {filtered.length} samples were between 2–8°C and 60–95% humidity.</p></div><div className="range-extremes"><div><span>Lowest temperature</span><strong>{minTemperature === null ? '--' : `${minTemperature.toFixed(1)}°C`}</strong></div><div><span>Highest temperature</span><strong>{maxTemperature === null ? '--' : `${maxTemperature.toFixed(1)}°C`}</strong></div><div><span>Lowest humidity</span><strong>{lowestHumidity === null ? '--' : `${lowestHumidity.toFixed(1)}%`}</strong></div><div><span>Highest humidity</span><strong>{peakHumidity === null ? '--' : `${peakHumidity.toFixed(1)}%`}</strong></div></div></section>
      </div>
      <section className="panel recent-readings-panel"><div className="panel-header"><div><h2>Recent readings</h2><p>Latest {recent.length} captured samples</p></div><span className="sample-count">{filtered.length} samples</span></div>{recent.length ? <div className="recent-readings-table"><table><thead><tr><th>Recorded at</th><th>Temperature</th><th>Humidity</th><th>MQ-135 raw</th><th>Door</th></tr></thead><tbody>{recent.map((item) => <tr key={item.updatedAt}><td>{new Date(item.updatedAt).toLocaleString()}</td><td>{item.temperature?.toFixed(1) ?? '--'}{item.temperature !== null ? '°C' : ''}</td><td>{item.humidity?.toFixed(1) ?? '--'}{item.humidity !== null ? '%' : ''}</td><td>{item.gasRaw ?? '--'}</td><td>{item.doorOpen === null ? '--' : item.doorOpen ? 'Open' : 'Closed'}</td></tr>)}</tbody></table></div> : <p className="chart-empty">No readings in this range yet. Keep the dashboard open while your ESP32 sends data to build a history.</p>}</section>
    </>
  )
}

function AIPredictionsView({ metadata, forecasts, monitors, inventory, roomNames, autoStatus, onAddMonitor, onRemoveMonitor, onRemoveForecast }: { metadata: ModelMetadata | null; forecasts: BatchForecast[]; monitors: AutoBatchProfile[]; inventory: InventoryItem[]; roomNames: string[]; autoStatus: AutoPredictionStatus; onAddMonitor: (profile: AutoBatchProfile) => void; onRemoveMonitor: (id: string) => void; onRemoveForecast: (id: string) => void }) {
  const [fields, setFields] = useState({ batchName: '', vegetable: '', room: roomNames[0] ?? '', quantity: '1', storageDays: '0' })
  const [error, setError] = useState('')
  const inventoryAlerts = getInventoryShelfLifeAlerts(inventory, forecasts)
  const standaloneDueForecasts = forecasts.filter((forecast) => forecast.withinTwoDayWindow && !forecast.inventoryId)
  const dueSoonCount = inventoryAlerts.length + standaloneDueForecasts.length
  useEffect(() => {
    if (metadata?.products.length && !fields.vegetable) {
      const vegetable = metadata.products[0]
      setFields((current) => ({ ...current, vegetable }))
    }
  }, [metadata, fields.vegetable])
  useEffect(() => {
    if (!roomNames.includes(fields.room)) setFields((current) => ({ ...current, room: roomNames[0] ?? '' }))
  }, [fields.room, roomNames])
  const addMonitor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!metadata) {
      setError('Prediction model metadata is unavailable. Please retry after the model has loaded.')
      return
    }
    const quantity = Number(fields.quantity)
    const storageDays = Number(fields.storageDays)
    if (!fields.vegetable || !Number.isSafeInteger(quantity) || quantity < 1 ||
      !Number.isFinite(storageDays) || storageDays < 0 || storageDays > metadata.featureRanges.Storage_Time_Days[1]) {
      setError(`Enter a valid positive quantity and storage age from 0 to ${metadata.featureRanges.Storage_Time_Days[1]} days.`)
      return
    }
    onAddMonitor({
      id: createLocalId(),
      batchName: fields.batchName.trim() || `${fields.vegetable} batch`,
      vegetable: fields.vegetable,
      room: fields.room,
      quantity,
      storageDays,
    })
    setFields({ batchName: '', vegetable: fields.vegetable, room: fields.room, quantity: '1', storageDays: '0' })
    setError('')
  }
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">INVENTORY MONITORING</p><h1>Shelf life</h1><p className="subheading">See which batches need attention and how much estimated time remains.</p></div></div>
      <section className="shelf-life-summary" aria-label="Shelf-life summary">
        <article className="shelf-summary-card"><span className="shelf-summary-icon monitored"><Package size={18} /></span><div><strong>{inventory.length + monitors.length}</strong><span>Tracked batches</span></div></article>
        <article className="shelf-summary-card"><span className="shelf-summary-icon due"><AlertTriangle size={18} /></span><div><strong>{dueSoonCount}</strong><span>Within 2 days</span></div></article>
      </section>
      <section className={`panel auto-prediction-status ${autoStatus.state}`}><span className="prediction-status-indicator"><i /></span><div className="prediction-status-copy"><div><strong>{autoStatus.state === 'current' || autoStatus.state === 'experimental' ? 'Automatic estimates are up to date' : autoStatus.state === 'error' ? 'Automatic update failed' : autoStatus.state === 'blocked' ? 'Some batches need attention' : 'Waiting for live sensor data'}</strong><span>{autoStatus.message}</span></div></div><span className={`status-badge ${autoStatus.state === 'current' || autoStatus.state === 'experimental' ? 'healthy' : autoStatus.state === 'blocked' || autoStatus.state === 'error' ? 'watch' : ''}`}>{autoStatus.state === 'current' || autoStatus.state === 'experimental' ? 'Live' : autoStatus.state[0].toUpperCase() + autoStatus.state.slice(1)}</span></section>
      <form className="panel prediction-form" onSubmit={addMonitor}><div className="panel-header"><div><h2>Monitor a batch</h2><p>Add a supported produce batch; new sensor readings refresh its estimate.</p></div><span className="form-step">AUTO</span></div><div className="prediction-form-grid">
        <label className="input-group">Batch name (optional)<input maxLength={60} value={fields.batchName} onChange={(event) => setFields({ ...fields, batchName: event.target.value })} placeholder="e.g. Receiving lot 12" /></label>
        <label className="input-group">Produce<select required disabled={!metadata} value={fields.vegetable} onChange={(event) => setFields({ ...fields, vegetable: event.target.value })}>{metadata?.products.map((product) => <option key={product} value={product}>{product}</option>)}</select></label>
        <label className="input-group">Cold room<select value={fields.room} onChange={(event) => setFields({ ...fields, room: event.target.value })}>{roomNames.map((room) => <option key={room}>{room}</option>)}</select></label>
        <label className="input-group">Batch quantity (units)<input required type="number" min="1" step="1" value={fields.quantity} onChange={(event) => setFields({ ...fields, quantity: event.target.value })} /></label>
        <label className="input-group">Storage age (days)<span className="field-range">Enter once when the batch is received</span><input required type="number" min="0" step="0.1" value={fields.storageDays} onChange={(event) => setFields({ ...fields, storageDays: event.target.value })} /></label>
      </div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={!metadata}><Plus size={15} /> Add batch to monitoring</button></form>
      {monitors.length > 0 && <section className="panel auto-monitor-panel"><div className="panel-header auto-monitor-heading"><div><h2>Automatic monitoring</h2><p>Each batch is refreshed when its cold-room sensor sends new readings.</p></div><span className={`auto-monitor-live ${autoStatus.state === 'current' || autoStatus.state === 'experimental' ? 'live' : ''}`}><i />{autoStatus.state === 'current' || autoStatus.state === 'experimental' ? 'Sensor updates active' : autoStatus.state === 'error' || autoStatus.state === 'blocked' ? 'Check update status' : 'Waiting for sensor'}</span></div><div className="auto-monitor-list">{monitors.map((monitor) => {
        const forecast = forecasts.find((entry) => entry.monitorId === monitor.id)
        const monitorStatus = forecast?.extrapolated ? 'experimental' : forecast && forecast.remainingShelfLifeDays <= 0 ? 'expired' : forecast?.withinTwoDayWindow ? 'due' : forecast ? 'ready' : autoStatus.state === 'error' || autoStatus.state === 'blocked' ? 'issue' : 'waiting'
        const monitorStatusLabel = monitorStatus === 'experimental' ? 'Estimate ready' : monitorStatus === 'expired' ? 'Past estimate' : monitorStatus === 'due' ? 'Reminder window' : monitorStatus === 'ready' ? 'Estimate ready' : monitorStatus === 'issue' ? 'Update issue' : 'Waiting for estimate'
        return <article className={`auto-monitor-card ${monitorStatus}`} key={monitor.id}>
          <span className="auto-monitor-icon"><Package size={17} /><i /></span>
          <div className="auto-monitor-info"><strong>{monitor.batchName}</strong><span>{monitor.vegetable} <i /> {monitor.room} <i /> {monitor.quantity} units</span><small>{forecast ? `Last estimate ${new Date(forecast.predictedAt).toLocaleTimeString()}` : monitorStatus === 'waiting' ? 'Estimate appears after a live sensor reading.' : autoStatus.message}</small></div>
          <div className="auto-monitor-result">{forecast ? <><strong>{Math.max(0, forecast.remainingShelfLifeDays).toFixed(1)} <small>days</small></strong><span>{monitorStatusLabel}</span></> : <span className={`auto-monitor-badge ${monitorStatus}`}>{monitorStatusLabel}</span>}</div>
          <button type="button" className="icon-button remove-button auto-monitor-remove" aria-label={`Stop monitoring ${monitor.batchName}`} title={`Stop monitoring ${monitor.batchName}`} onClick={() => onRemoveMonitor(monitor.id)}><Trash2 size={15} /></button>
        </article>
      })}</div></section>}
      <section className="panel shelf-outlook"><div className="panel-header shelf-outlook-heading"><div><h2>Batch outlook</h2><p>Sorted by the least estimated time remaining.</p></div><span className="forecast-count">{forecasts.length} {forecasts.length === 1 ? 'batch' : 'batches'}</span></div>{forecasts.length ? <div className="forecast-card-list">{forecasts.slice().sort((a, b) => a.remainingShelfLifeDays - b.remainingShelfLifeDays).map((forecast) => {
        const status = forecast.extrapolated ? 'experimental' : forecast.remainingShelfLifeDays <= 0 ? 'expired' : forecast.withinTwoDayWindow ? 'due' : 'healthy'
        const remainingPercent = Math.max(0, Math.min(100, forecast.remainingShelfLifeDays / Math.max(forecast.maxShelfLifeDays, 1) * 100))
        return <article className={`forecast-card ${status}`} key={forecast.id}>
          <div className="forecast-card-top"><span className="forecast-produce-icon">{forecast.vegetable.slice(0, 1).toUpperCase()}</span><div className="forecast-product"><strong>{forecast.batchName}</strong><span>{forecast.vegetable} · {forecast.room} · {forecast.quantity} units</span></div><button type="button" className="icon-button remove-button" aria-label={`Remove ${forecast.batchName} forecast`} onClick={() => onRemoveForecast(forecast.id)}><Trash2 size={15} /></button></div>
          <div className="forecast-remaining"><div><span>Estimated time remaining</span><strong>{forecast.remainingShelfLifeDays <= 0 ? '0' : forecast.remainingShelfLifeDays.toFixed(1)} <small>days</small></strong></div><span className={`status-badge ${status === 'healthy' ? 'healthy' : 'watch'}`}>{status === 'experimental' ? 'On track' : status === 'expired' ? 'Past estimate' : status === 'due' ? 'Use soon' : 'On track'}</span></div>
          <div className="forecast-progress" role="meter" aria-label={`${forecast.batchName} estimated shelf life remaining`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(remainingPercent)}><span style={{ width: `${remainingPercent}%` }} /></div>
          <div className="forecast-card-bottom"><span>{status === 'experimental' ? `${Math.round(remainingPercent)}% of estimated shelf life` : status === 'expired' ? 'Estimated shelf-life window has passed' : status === 'due' ? 'Reminder window: 2 days or less' : `${Math.round(remainingPercent)}% of estimated shelf life`}</span><small>Updated {new Date(forecast.predictedAt).toLocaleTimeString()}</small></div>
        </article>
      })}</div> : <div className="forecast-empty"><span className="forecast-empty-icon"><Package size={20} /></span><strong>No batches are being monitored</strong><p>Add a supported batch above to see its estimated remaining life here.</p></div>}</section>
    </>
  )
}

function AlertsView({ reading, roomName, forecasts, inventory }: { reading: SensorReading | null; roomName: string; forecasts: BatchForecast[]; inventory: InventoryItem[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const isOnline = reading !== null && Date.now() - new Date(reading.updatedAt).getTime() < 15000
  const alerts = [
    ...(!isOnline ? [{ id: 'offline', title: 'ESP32 sensor is offline or has stale data', room: roomName, time: reading ? `Last update ${new Date(reading.updatedAt).toLocaleString()}` : 'No reading received', type: 'warning' }] : []),
    ...getSensorAlerts(reading, roomName).map((alert) => ({ id: alert.title, title: alert.title, room: roomName, time: reading ? new Date(reading.updatedAt).toLocaleString() : '', type: 'warning' })),
    ...getInventoryShelfLifeAlerts(inventory, forecasts).map((alert) => ({
      ...alert,
      time: alert.time,
      type: 'inventory',
    })),
    ...forecasts.filter((forecast) => forecast.withinTwoDayWindow && !forecast.inventoryId).map((forecast) => ({
      id: `shelf-life-${forecast.id}`,
      title: `${forecast.batchName} shelf life is under 2 days`,
      room: forecast.room,
      time: `${forecast.remainingShelfLifeDays.toFixed(1)} days remaining · ${new Date(forecast.predictedAt).toLocaleString()}`,
      type: 'prototype',
    })),
  ]
  const openAlerts = alerts.filter((alert) => !dismissed.includes(alert.id))
  const filtered = alerts.filter((alert) => filter === 'all' || (filter === 'open' && !dismissed.includes(alert.id)) || (filter === 'resolved' && dismissed.includes(alert.id)))
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">ALERT MANAGEMENT</p><h1>Alerts</h1><p className="subheading">Sensor warnings and two-day shelf-life reminders.</p></div><div className="filter-buttons"><button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({alerts.length})</button><button className={`filter-btn ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open ({openAlerts.length})</button><button className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>Acknowledged ({dismissed.length})</button></div></div>
      <div className="alerts-full">{filtered.map((alert) => <div className="alert-item" key={alert.id}><div className="alert-icon warning"><AlertTriangle size={18} /></div><div className="alert-content"><strong>{alert.title}</strong><p>{alert.room} · {alert.time}{alert.type === 'prototype' ? ' · Estimate only, not a safety alert' : ''}</p></div><button className={`resolve-btn ${dismissed.includes(alert.id) ? 'resolved' : ''}`} onClick={() => setDismissed(dismissed.includes(alert.id) ? dismissed.filter((id) => id !== alert.id) : [...dismissed, alert.id])}>{dismissed.includes(alert.id) ? 'Undo' : 'Acknowledge'}</button></div>)}{filtered.length === 0 && <p className="chart-empty">No alerts in this view.</p>}</div>
    </>
  )
}

function SettingsView({ autoRefresh, setAutoRefresh, onExport }: { autoRefresh: boolean; setAutoRefresh: (enabled: boolean) => void; onExport: () => void }) {
  const [notifications, setNotifications] = useState(true)
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">PREFERENCES</p><h1>Settings</h1><p className="subheading">Manage system and notification preferences.</p></div></div>
      <div className="settings-group"><h3>Notifications</h3><label className="setting-row"><input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} /><span>Enable alert notifications</span></label></div>
      <div className="settings-group"><h3>Data refresh</h3><label className="setting-row"><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /><span>Auto-refresh sensor data every 3 seconds</span></label></div>
      <div className="settings-group"><h3>Export data</h3><button className="primary-button" onClick={onExport}><Download size={14} /> Download inventory and sensor CSV</button></div>
    </>
  )
}

function ProfileView({ profile, onSave }: { profile: UserProfile; onSave: (profile: UserProfile) => void }) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.email.trim() || !draft.workspace.trim() || !draft.role.trim()) {
      setError('Please complete all profile fields before saving.')
      return
    }
    onSave({ ...draft, name: draft.name.trim(), email: draft.email.trim(), workspace: draft.workspace.trim(), role: draft.role.trim() })
    setSaved(true)
    setError('')
    window.setTimeout(() => setSaved(false), 2500)
  }
  const updateAvatar = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
      setError('Choose an image smaller than 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((current) => ({ ...current, avatar: reader.result as string }))
        setError('')
      } else {
        setError('Could not read this image. Please choose another file.')
      }
    }
    reader.onerror = () => setError('Could not read this image. Please choose another file.')
    reader.readAsDataURL(file)
  }
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow accent">YOUR ACCOUNT</p><h1>Profile</h1><p className="subheading">Edit your profile and workspace details. Changes are saved in this browser.</p></div></div>
      <form className="panel profile-card" onSubmit={saveProfile}>
        <div className="profile-hero">
          <div className="profile-upload-wrap"><div className="profile-avatar">{draft.avatar ? <img src={draft.avatar} alt="" /> : getInitials(draft.name)}</div><label className="profile-upload" title="Choose profile photo"><Upload size={14} /><span>Photo</span><input type="file" accept="image/*" aria-label="Upload profile photo" onChange={(event) => updateAvatar(event.target.files?.[0])} /></label>{draft.avatar && <button type="button" className="remove-photo" onClick={() => setDraft({ ...draft, avatar: null })}>Remove photo</button>}</div>
          <div className="profile-identity"><span className="profile-role">Profile settings</span><h2>{draft.name || 'Your name'}</h2><p>{draft.email || 'Your email address'}</p></div>
          <span className="profile-member-badge"><ShieldCheck size={15} /> {draft.role || 'Role'}</span>
        </div>
        <div className="profile-form profile-edit-form">
          <label className="form-group">Full name<input required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="form-group">Email address<input required type="email" maxLength={120} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
          <label className="form-group">Workspace name<input required maxLength={80} value={draft.workspace} onChange={(event) => setDraft({ ...draft, workspace: event.target.value })} /></label>
          <label className="form-group">Role<input required maxLength={40} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
        </div>
        {error && <p className="form-error profile-error" role="alert">{error}</p>}
        <div className="profile-form-actions"><span>{saved ? 'Profile saved.' : 'Profile changes are local to this browser.'}</span><button type="submit" className="primary-button">Save profile</button></div>
      </form>
    </>
  )
}

export default function Page() {
  const [active, setActive] = useState<ViewName>('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [sensorReading, setSensorReading] = useState<SensorReading | null>(null)
  const [sensorHistory, setSensorHistory] = useState<SensorPoint[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [roomNames, setRoomNames] = useState<string[]>(initialRooms)
  const [sensorRoom, setSensorRoom] = useState(initialRooms[0])
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  const [inventoryApiError, setInventoryApiError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  const [sensorApiError, setSensorApiError] = useState<string | null>(null)
  const [clock, setClock] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [forecasts, setForecasts] = useState<BatchForecast[]>([])
  const [forecastsLoaded, setForecastsLoaded] = useState(false)
  const [autoMonitors, setAutoMonitors] = useState<AutoBatchProfile[]>([])
  const [autoMonitorsLoaded, setAutoMonitorsLoaded] = useState(false)
  const [autoPredictionStatus, setAutoPredictionStatus] = useState<AutoPredictionStatus>({
    state: 'waiting',
    message: 'Waiting for a live ESP32 reading and a supported produce item in inventory.',
  })
  const lastAutoPredictionKey = useRef<string | null>(null)
  const lastRemoteInventoryJson = useRef<string | null>(null)
  const lastRemoteInventoryUpdatedAt = useRef<string | null>(null)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      } else if (event.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/predict', { cache: 'no-store' })
      .then(async (response) => {
        const data: unknown = await response.json()
        if (!response.ok) throw new Error((data as { error?: string }).error ?? `Model metadata request failed (${response.status}).`)
        return data as ModelMetadata
      })
      .then((data) => {
        if (active) {
          setModelMetadata(data)
          setModelError(null)
        }
      })
      .catch((error: unknown) => {
        if (active) setModelError(error instanceof Error ? error.message : 'Could not load prediction model metadata.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('freshguard-batch-forecasts')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (!Array.isArray(parsed) || !parsed.every(isBatchForecast)) throw new Error('Saved batch forecasts have an invalid format.')
        setForecasts(parsed.slice(-100).map((forecast) => ({
          ...forecast,
          room: forecast.room ?? initialRooms[0],
          source: forecast.source ?? 'manual',
        })))
      }
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not load saved forecasts: ${error.message}` : 'Could not load saved forecasts.')
    } finally {
      setForecastsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!forecastsLoaded) return
    try {
      window.localStorage.setItem('freshguard-batch-forecasts', JSON.stringify(forecasts.slice(-100)))
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not save batch forecasts: ${error.message}` : 'Could not save batch forecasts to this browser.')
    }
  }, [forecasts, forecastsLoaded])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('freshguard-auto-monitors')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (!Array.isArray(parsed) || !parsed.every(isAutoBatchProfile)) throw new Error('Saved automatic batch monitors have an invalid format.')
        setAutoMonitors(parsed)
      }
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not load automatic monitors: ${error.message}` : 'Could not load automatic monitors.')
    } finally {
      setAutoMonitorsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!autoMonitorsLoaded) return
    try {
      window.localStorage.setItem('freshguard-auto-monitors', JSON.stringify(autoMonitors))
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not save automatic monitors: ${error.message}` : 'Could not save automatic monitors to this browser.')
    }
  }, [autoMonitors, autoMonitorsLoaded])

  useEffect(() => {
    let active = true
    const fetchReading = async () => {
      try {
        const response = await fetch('/api/sensor', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Sensor API returned HTTP ${response.status}`)
        const data: { reading: (Omit<SensorReading, 'gasRaw' | 'doorOpen'> & { gasRaw?: number | null; doorOpen?: boolean | null }) | null } = await response.json()
        if (!active) return
        setSensorApiError(null)
        setClock(Date.now())
        const reading = data.reading
          ? { ...data.reading, gasRaw: data.reading.gasRaw ?? null, doorOpen: data.reading.doorOpen ?? null }
          : null
        setSensorReading(reading)
        if (reading) {
          setSensorHistory((previous) => previous.some((point) => point.updatedAt === reading.updatedAt)
            ? previous
            : [...previous, reading].slice(-500))
        }
      } catch (error) {
        if (active) setSensorApiError(error instanceof Error ? error.message : 'Sensor API request failed')
      }
    }

    void fetchReading()
    if (autoRefresh) {
      const interval = window.setInterval(fetchReading, 3000)
      return () => {
        active = false
        window.clearInterval(interval)
      }
    }
    return () => { active = false }
  }, [autoRefresh, refreshToken])

  useEffect(() => {
    if (!autoMonitorsLoaded || !forecastsLoaded || !modelMetadata) return
    const automaticForecasts = forecasts.filter((forecast) => forecast.source === 'automatic')
    if (!sensorReading || Date.now() - Date.parse(sensorReading.updatedAt) >= 15000) {
      if (automaticForecasts.length) setForecasts((previous) => previous.filter((forecast) => forecast.source !== 'automatic'))
      setAutoPredictionStatus({
        state: 'waiting',
        message: sensorReading ? 'Sensor reading is stale. Waiting for the ESP32 to reconnect.' : 'Waiting for a live ESP32 reading.',
      })
      return
    }

    if (sensorReading.sensorOK === false || sensorReading.temperature === null || sensorReading.humidity === null) {
      if (automaticForecasts.length) setForecasts((previous) => previous.filter((forecast) => forecast.source !== 'automatic'))
      setAutoPredictionStatus({
        state: 'blocked',
        message: 'Automatic predictions are paused because temperature and humidity readings are unavailable.',
        updatedAt: sensorReading.updatedAt,
      })
      return
    }

    const inventoryMonitors: AutoBatchProfile[] = inventory
      .filter((item) => modelMetadata.products.includes(item.name))
      .map((item) => ({
        id: `inventory-${item.id}`,
        inventoryId: item.id,
        batchName: item.name,
        vegetable: item.name,
        room: item.room,
        quantity: item.quantity,
        storageDays: Math.max(0, (Date.parse(sensorReading.updatedAt) - Date.parse(item.storedAt ?? sensorReading.updatedAt)) / 86_400_000),
      }))
      const monitors = [...inventoryMonitors, ...autoMonitors]

    if (!monitors.length) {
      if (automaticForecasts.length) setForecasts((previous) => previous.filter((forecast) => forecast.source !== 'automatic'))
      setAutoPredictionStatus({
        state: 'waiting',
        message: `No supported inventory yet. Add a batch of ${modelMetadata.products.join(', ')} to enable forecasts.`,
        updatedAt: sensorReading.updatedAt,
      })
      return
    }

    const predictionKey = `${sensorReading.updatedAt}|${monitors.map((monitor) => `${monitor.id}:${monitor.vegetable}:${monitor.room}:${monitor.quantity}:${monitor.storageDays}`).join('|')}`
    if (lastAutoPredictionKey.current === predictionKey) return
    lastAutoPredictionKey.current = predictionKey
    const controller = new AbortController()
    const updatePredictions = async () => {
      const outcomes = await Promise.all(monitors.map(async (monitor) => {
        const vegetable = monitor.vegetable
        const maxShelfLifeDays = modelMetadata.productMaxShelfLifeDays[vegetable]
        const input = {
          vegetable,
          temperature: sensorReading.temperature,
          humidity: sensorReading.humidity,
          gasVocCo2Ppm: modelMetadata.featureDefaults.Gas_VOC_CO2ppm,
          lightLux: modelMetadata.featureDefaults.Light_Lux,
          storageDays: monitor.storageDays,
          maxShelfLifeDays,
          allowExtrapolation: true,
        }
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        })
        const result: unknown = await response.json()
        if (!response.ok) {
          const payload = result as { error?: string; outOfRange?: { feature: string; value: number; minimum: number; maximum: number }[] }
          const details = payload.outOfRange?.map((entry) => `${entry.feature} ${entry.value} is outside ${entry.minimum}–${entry.maximum}`).join('; ')
          return { monitor, error: [payload.error ?? `Prediction failed (${response.status}).`, details].filter(Boolean).join(' ') }
        }
        const prediction = result as Omit<BatchForecast, 'id' | 'source' | 'inventoryId' | 'monitorId' | 'batchName' | 'room' | 'quantity' | 'storageDays' | 'temperature' | 'humidity' | 'gasVocCo2Ppm' | 'lightLux' | 'maxShelfLifeDays' | 'predictedAt'>
        const forecast: BatchForecast = {
          ...prediction,
          id: `auto-${monitor.id}`,
          source: 'automatic',
          inventoryId: monitor.inventoryId,
          monitorId: monitor.id,
          batchName: monitor.batchName,
          room: monitor.room,
          vegetable,
          quantity: monitor.quantity,
          storageDays: monitor.storageDays,
          temperature: sensorReading.temperature,
          humidity: sensorReading.humidity,
          gasVocCo2Ppm: input.gasVocCo2Ppm,
          lightLux: input.lightLux,
          maxShelfLifeDays,
          predictedAt: new Date().toISOString(),
        }
        return { monitor, forecast }
      }))
      if (controller.signal.aborted) return
      const successes: BatchForecast[] = []
      const failures: { monitor: AutoBatchProfile; error: string }[] = []
      for (const outcome of outcomes) {
        if ('forecast' in outcome && outcome.forecast) successes.push(outcome.forecast)
        if ('error' in outcome && outcome.error) failures.push(outcome)
      }
      setForecasts((previous) => [
        ...previous.filter((forecast) => forecast.source !== 'automatic' || !monitors.some((monitor) => monitor.id === forecast.monitorId)),
        ...successes,
      ].slice(-100))
      if (successes.length) {
        const extrapolatedCount = successes.filter((forecast) => forecast.extrapolated).length
        const blockedNote = failures.length ? ` ${failures.length} batch${failures.length === 1 ? ' was' : 'es were'} blocked: ${failures.map((failure) => `${failure.monitor.batchName}: ${failure.error}`).join(' | ')}` : ''
        setAutoPredictionStatus({
          state: extrapolatedCount ? 'experimental' : 'current',
          message: `${successes.length} shelf-life forecast${successes.length === 1 ? '' : 's'} updated.${blockedNote}`,
          updatedAt: sensorReading.updatedAt,
        })
      } else {
        setAutoPredictionStatus({
          state: 'blocked',
          message: failures.map((failure) => `${failure.monitor.batchName}: ${failure.error}`).join(' | '),
          updatedAt: sensorReading.updatedAt,
        })
      }
    }

    void updatePredictions().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setAutoPredictionStatus({
          state: 'error',
          message: error instanceof Error ? `Automatic prediction failed: ${error.message}` : 'Automatic prediction failed.',
          updatedAt: sensorReading.updatedAt,
        })
      }
    })
    return () => controller.abort()
  }, [sensorReading, autoMonitors, autoMonitorsLoaded, inventory, forecasts, forecastsLoaded, modelMetadata])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('freshguard-sensor-history')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (!Array.isArray(parsed) || !parsed.every(isSensorPoint)) throw new Error('Saved sensor history has an invalid format.')
        setSensorHistory(parsed.slice(-500))
      }
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not load sensor history: ${error.message}` : 'Could not load saved sensor history.')
    } finally {
      setHistoryLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!historyLoaded) return
    try {
      window.localStorage.setItem('freshguard-sensor-history', JSON.stringify(sensorHistory.slice(-500)))
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not save sensor history: ${error.message}` : 'Could not save sensor history to this browser.')
    }
  }, [sensorHistory, historyLoaded])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 3000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    const loadInventory = async () => {
      let configuredRooms = initialRooms
      let localInventory = initialInventory
      try {
      const storedRooms = window.localStorage.getItem('freshguard-rooms')
      if (storedRooms) {
        const parsedRooms: unknown = JSON.parse(storedRooms)
        if (!Array.isArray(parsedRooms) || parsedRooms.length === 0 || !parsedRooms.every((room) => typeof room === 'string' && room.trim()) || new Set(parsedRooms.map((room) => room.toLowerCase())).size !== parsedRooms.length) {
          throw new Error('Saved room list has an invalid format.')
        }
        configuredRooms = parsedRooms
      }
      const storedSensorRoom = window.localStorage.getItem('freshguard-sensor-room')
      if (storedSensorRoom && configuredRooms.includes(storedSensorRoom)) setSensorRoom(storedSensorRoom)
      const stored = window.localStorage.getItem('freshguard-inventory')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (!Array.isArray(parsed) || !parsed.every((item) => isInventoryItem(item, configuredRooms))) throw new Error('Saved inventory data has an invalid format.')
        localInventory = parsed.map((item) => ({ ...item, storedAt: item.storedAt ?? new Date().toISOString(), qualityMode: 'manual' }))
      }
      } catch (error) {
        setStorageError(error instanceof Error ? `${error.message} Inventory is using the default list until you save changes.` : 'Could not load saved inventory.')
      }

      if (!active) return
      setRoomNames(configuredRooms)
      setInventory(localInventory)

      try {
        const response = await fetch('/api/dashboard-state', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Shared dashboard API returned HTTP ${response.status}`)
        const payload: unknown = await response.json()
        const remoteState = payload && typeof payload === 'object'
          ? (payload as { state?: unknown }).state
          : undefined
        if (remoteState && typeof remoteState === 'object') {
          const state = remoteState as { rooms?: unknown; inventory?: unknown; updatedAt?: unknown }
          if (!Array.isArray(state.rooms) || !state.rooms.length ||
            !state.rooms.every((room) => typeof room === 'string' && room.trim()) ||
            !Array.isArray(state.inventory) || !state.inventory.every((item) => isInventoryItem(item, state.rooms as string[])) ||
            typeof state.updatedAt !== 'string' || !Number.isFinite(Date.parse(state.updatedAt))) {
            throw new Error('Shared dashboard API returned invalid room or inventory data.')
          }
          const remoteRooms = state.rooms as string[]
          const remoteInventory = (state.inventory as InventoryItem[]).map((item) => ({
            ...item,
            storedAt: item.storedAt ?? new Date().toISOString(),
            qualityMode: 'manual' as const,
          }))
          setRoomNames(remoteRooms)
          setInventory(remoteInventory)
          setSensorRoom((current) => remoteRooms.includes(current) ? current : remoteRooms[0])
          lastRemoteInventoryJson.current = JSON.stringify({ rooms: remoteRooms, inventory: remoteInventory })
          lastRemoteInventoryUpdatedAt.current = state.updatedAt
        } else {
          lastRemoteInventoryJson.current = null
          lastRemoteInventoryUpdatedAt.current = null
        }
        setInventoryApiError(null)
      } catch (error) {
        setInventoryApiError(error instanceof Error ? error.message : 'Could not load shared inventory from the server.')
      } finally {
        if (active) setInventoryLoaded(true)
      }
    }
    void loadInventory()
    return () => { active = false }
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('freshguard-profile')
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          const candidate = parsed as Partial<UserProfile>
          if (typeof candidate.name === 'string' && typeof candidate.email === 'string' && typeof candidate.workspace === 'string' && typeof candidate.role === 'string' && (candidate.avatar === null || typeof candidate.avatar === 'string')) {
            setProfile(candidate as UserProfile)
          } else {
            throw new Error('Saved profile data has an invalid format.')
          }
        }
      }
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not load saved profile: ${error.message}` : 'Could not load saved profile.')
    }
  }, [])

  useEffect(() => {
    if (!inventoryLoaded) return
    try {
      window.localStorage.setItem('freshguard-inventory', JSON.stringify(inventory))
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not save inventory: ${error.message}` : 'Could not save inventory to this browser.')
    }
  }, [inventory, inventoryLoaded])

  useEffect(() => {
    if (!inventoryLoaded) return
    const state = { rooms: roomNames, inventory }
    const serialized = JSON.stringify(state)
    if (serialized === lastRemoteInventoryJson.current) return
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/dashboard-state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: serialized,
        })
        const payload: unknown = await response.json()
        if (!response.ok) {
          const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : `Shared dashboard API returned HTTP ${response.status}`
          throw new Error(message)
        }
        const savedState = payload && typeof payload === 'object'
          ? (payload as { state?: { updatedAt?: unknown } }).state
          : undefined
        if (typeof savedState?.updatedAt !== 'string') throw new Error('Shared dashboard API returned an invalid save confirmation.')
        lastRemoteInventoryJson.current = serialized
        lastRemoteInventoryUpdatedAt.current = savedState.updatedAt
        setInventoryApiError(null)
      } catch (error) {
        setInventoryApiError(error instanceof Error ? error.message : 'Could not save shared inventory to the server.')
      }
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [inventory, roomNames, inventoryLoaded])

  useEffect(() => {
    if (!inventoryLoaded) return
    let active = true
    const syncSharedInventory = async () => {
      try {
        const response = await fetch('/api/dashboard-state', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Shared dashboard API returned HTTP ${response.status}`)
        const payload: unknown = await response.json()
        const remoteState = payload && typeof payload === 'object'
          ? (payload as { state?: unknown }).state
          : undefined
        if (!remoteState || typeof remoteState !== 'object') return
        const state = remoteState as { rooms?: unknown; inventory?: unknown; updatedAt?: unknown }
        if (!Array.isArray(state.rooms) || !state.rooms.length ||
          !state.rooms.every((room) => typeof room === 'string' && room.trim()) ||
          !Array.isArray(state.inventory) || !state.inventory.every((item) => isInventoryItem(item, state.rooms as string[])) ||
          typeof state.updatedAt !== 'string' || !Number.isFinite(Date.parse(state.updatedAt))) {
          throw new Error('Shared dashboard API returned invalid room or inventory data.')
        }
        if (active && state.updatedAt !== lastRemoteInventoryUpdatedAt.current) {
          const remoteRooms = state.rooms as string[]
          const remoteInventory = (state.inventory as InventoryItem[]).map((item) => ({
            ...item,
            storedAt: item.storedAt ?? new Date().toISOString(),
            qualityMode: 'manual' as const,
          }))
          lastRemoteInventoryJson.current = JSON.stringify({ rooms: remoteRooms, inventory: remoteInventory })
          lastRemoteInventoryUpdatedAt.current = state.updatedAt
          setRoomNames(remoteRooms)
          setInventory(remoteInventory)
          setSensorRoom((current) => remoteRooms.includes(current) ? current : remoteRooms[0])
        }
        if (active) setInventoryApiError(null)
      } catch (error) {
        if (active) setInventoryApiError(error instanceof Error ? error.message : 'Could not sync shared inventory.')
      }
    }
    const interval = window.setInterval(syncSharedInventory, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [inventoryLoaded])

  useEffect(() => {
    if (!inventoryLoaded) return
    try {
      window.localStorage.setItem('freshguard-rooms', JSON.stringify(roomNames))
      window.localStorage.setItem('freshguard-sensor-room', sensorRoom)
      window.localStorage.setItem('freshguard-profile', JSON.stringify(profile))
    } catch (error) {
      setStorageError(error instanceof Error ? `Could not save dashboard settings: ${error.message}` : 'Could not save dashboard settings to this browser.')
    }
  }, [inventoryLoaded, roomNames, sensorRoom, profile])

  useEffect(() => {
    const saved = window.localStorage.getItem('freshguard-theme') as ThemeMode | null
    if (saved === 'light' || saved === 'dark' || saved === 'system') setThemeMode(saved)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => document.documentElement.classList.toggle('dark', themeMode === 'dark' || (themeMode === 'system' && media.matches))
    applyTheme()
    if (themeMode === 'system') media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [themeMode])

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode)
    window.localStorage.setItem('freshguard-theme', mode)
  }

  const exportReport = () => downloadReport(inventory, sensorHistory, sensorRoom, forecasts)
  const sensorOnline = sensorReading !== null && clock - new Date(sensorReading.updatedAt).getTime() < 15000
  const currentAlerts = [
    ...(!sensorOnline ? [{ title: 'ESP32 sensor is offline or has stale data', source: sensorRoom, time: sensorReading ? `Last update ${new Date(sensorReading.updatedAt).toLocaleTimeString()}` : 'No reading received' }] : []),
    ...getSensorAlerts(sensorReading, sensorRoom).map((alert) => ({ title: alert.title, source: sensorRoom, time: sensorReading ? new Date(sensorReading.updatedAt).toLocaleTimeString() : '' })),
    ...getInventoryShelfLifeAlerts(inventory, forecasts).map((alert) => ({ title: alert.title, source: alert.room, time: alert.time })),
    ...forecasts.filter((forecast) => forecast.withinTwoDayWindow && !forecast.inventoryId).map((forecast) => ({
      title: `${forecast.batchName} shelf life is under 2 days`,
      source: forecast.room,
      time: `${forecast.remainingShelfLifeDays.toFixed(1)} days remaining`,
    })),
  ]
  const searchTerm = searchQuery.trim().toLowerCase()
  const searchResults = [
    ...dashboardSearchPages
      .filter((item) => `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(searchTerm))
      .map((item) => ({ label: item.label, description: item.description, view: item.view })),
    ...inventory
      .filter((item) => `${item.name} ${item.room}`.toLowerCase().includes(searchTerm))
      .map((item) => ({ label: item.name, description: `${item.room} · ${item.quantity} units`, view: 'Inventory' as ViewName })),
  ].slice(0, 8)
  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setSelectedSearchIndex(0)
  }
  const addAutoMonitor = (profile: AutoBatchProfile) => setAutoMonitors((previous) => [...previous, profile])
  const removeAutoMonitor = (id: string) => {
    setAutoMonitors((previous) => previous.filter((monitor) => monitor.id !== id))
    setForecasts((previous) => previous.filter((forecast) => forecast.monitorId !== id))
  }
  const renameRoom = (oldName: string, newName: string) => {
    setRoomNames((rooms) => rooms.map((room) => room === oldName ? newName : room))
    setInventory((items) => items.map((item) => item.room === oldName ? { ...item, room: newName } : item))
    setAutoMonitors((monitors) => monitors.map((monitor) => monitor.room === oldName ? { ...monitor, room: newName } : monitor))
    setSensorRoom((room) => room === oldName ? newName : room)
  }
  const removeRoom = (name: string, transferTo: string) => {
    if (roomNames.length <= 1 || name === transferTo || !roomNames.includes(name) || !roomNames.includes(transferTo)) return
    setInventory((items) => items.map((item) => item.room === name ? { ...item, room: transferTo } : item))
    setAutoMonitors((monitors) => monitors.map((monitor) => monitor.room === name ? { ...monitor, room: transferTo } : monitor))
    if (sensorRoom === name) setSensorRoom(transferTo)
    setRoomNames((rooms) => rooms.filter((room) => room !== name))
  }

  const renderView = () => {
    switch (active) {
      case 'Overview': return <OverviewView reading={sensorReading} inventory={inventory} forecasts={forecasts} userName={profile.name} sensorRoom={sensorRoom} onNavigate={setActive} onRefresh={() => setRefreshToken((token) => token + 1)} onExport={exportReport} />
      case 'Cold Rooms': return <ColdRoomsView reading={sensorReading} inventory={inventory} roomNames={roomNames} sensorRoom={sensorRoom} onNavigate={setActive} onRenameRoom={renameRoom} onRemoveRoom={removeRoom} onAddRoom={(name) => setRoomNames((rooms) => [...rooms, name])} onAssignSensor={setSensorRoom} />
      case 'Inventory': return <InventoryView inventory={inventory} forecasts={forecasts} onChange={setInventory} roomNames={roomNames} />
      case 'Analytics': return <AnalyticsView history={sensorHistory} />
      case 'AI Predictions': return <AIPredictionsView metadata={modelMetadata} forecasts={forecasts} monitors={autoMonitors} inventory={inventory} roomNames={roomNames} autoStatus={autoPredictionStatus} onAddMonitor={addAutoMonitor} onRemoveMonitor={removeAutoMonitor} onRemoveForecast={(id) => setForecasts((previous) => previous.filter((forecast) => forecast.id !== id))} />
      case 'Alerts': return <AlertsView reading={sensorOnline ? sensorReading : null} roomName={sensorRoom} forecasts={forecasts} inventory={inventory} />
      case 'Settings': return <SettingsView autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} onExport={exportReport} />
      case 'Profile': return <ProfileView profile={profile} onSave={setProfile} />
      default: return <OverviewView reading={sensorReading} inventory={inventory} forecasts={forecasts} userName={profile.name} sensorRoom={sensorRoom} onNavigate={setActive} onRefresh={() => setRefreshToken((token) => token + 1)} onExport={exportReport} />
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Leaf size={20} /></div><span>FreshGuard <b>AI</b></span><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="workspace"><div className="workspace-avatar">{profile.workspace.slice(0, 2).toUpperCase()}</div><div><small>Workspace</small><strong>{profile.workspace}</strong></div><ChevronDown size={15} /></div>
        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-label">MAIN MENU</p>
          {navItems.map(({ label, icon: Icon }) => <button key={label} type="button" aria-current={active === label ? 'page' : undefined} onClick={() => { setActive(label); setMobileOpen(false) }} className={`nav-item ${active === label ? 'active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{label === 'AI Predictions' ? 'Shelf Life' : label}</span>{active === label && <span className="nav-active-bar" aria-hidden="true" />}</button>)}
          <p className="nav-label space-top">MANAGE</p>
          {manageItems.map(({ label, icon: Icon }) => <button key={label} type="button" aria-current={active === label ? 'page' : undefined} onClick={() => { setActive(label); setMobileOpen(false) }} className={`nav-item ${active === label ? 'active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{label === 'AI Predictions' ? 'Shelf Life' : label}</span>{active === label && <span className="nav-active-bar" aria-hidden="true" />}</button>)}
        </nav>
        <div className="sidebar-footer"><button type="button" aria-current={active === 'Profile' ? 'page' : undefined} className={`user-row profile-nav-button ${active === 'Profile' ? 'active' : ''}`} onClick={() => { setActive('Profile'); setMobileOpen(false) }}><span className="user-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : getInitials(profile.name)}</span><span className="user-meta"><strong>{profile.name}</strong><small>Profile · {profile.role}</small></span><Settings size={16} aria-hidden="true" /></button></div>
      </aside>
      {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <section className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Dashboard</span><ChevronRight size={15} /><strong>{active === 'AI Predictions' ? 'Shelf Life' : active}</strong></div>
          <div className="top-actions">
            <span className={`connection-status ${sensorOnline ? 'online' : 'offline'}`} title={sensorApiError ?? undefined}><i />{sensorOnline ? 'ESP32 connected' : 'ESP32 offline'}</span>
            <div className="theme-toggle" role="group" aria-label="Theme mode"><button type="button" className={themeMode === 'system' ? 'selected' : ''} onClick={() => changeTheme('system')} aria-pressed={themeMode === 'system'}>System</button><button type="button" className={themeMode === 'light' ? 'selected' : ''} onClick={() => changeTheme('light')} aria-pressed={themeMode === 'light'}>Light</button><button type="button" className={themeMode === 'dark' ? 'selected' : ''} onClick={() => changeTheme('dark')} aria-pressed={themeMode === 'dark'}>Dark</button></div>
            <button type="button" className="search-button" aria-label="Search dashboard" onClick={() => setSearchOpen(true)}><Search size={17} aria-hidden="true" /><span>Search</span><kbd aria-hidden="true">⌘ K</kbd></button>
            <div className="notification-wrap">
              <button type="button" className="icon-button notification" aria-label={`Notifications${currentAlerts.length ? `, ${currentAlerts.length} active` : ''}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={19} />{currentAlerts.length > 0 && <i />}</button>
              {notificationsOpen && <section className="notification-popover" aria-label="Notifications"><div className="notification-popover-heading"><div><strong>Notifications</strong><small>{currentAlerts.length ? `${currentAlerts.length} active` : 'All clear'}</small></div><button type="button" className="icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16} /></button></div>{currentAlerts.length ? <div className="notification-items">{currentAlerts.map((alert) => <button type="button" className="notification-item" key={alert.title} onClick={() => { setActive('Alerts'); setNotificationsOpen(false) }}><span className="notification-alert-icon"><AlertTriangle size={15} /></span><span><strong>{alert.title}</strong><small>{alert.source} · {alert.time}</small></span><ChevronRight size={15} /></button>)}</div> : <p className="notification-clear"><ShieldCheck size={17} />{sensorOnline ? 'No active alerts.' : 'No active alerts. Sensor is waiting to connect.'}</p>}<button type="button" className="notification-view-all" onClick={() => { setActive('Alerts'); setNotificationsOpen(false) }}>Open alert center <ChevronRight size={14} /></button></section>}
            </div>
            <button type="button" className="top-avatar top-avatar-button" onClick={() => setActive('Profile')} aria-label={`Open ${profile.name} profile`}>{profile.avatar ? <img src={profile.avatar} alt="" /> : getInitials(profile.name)}</button>
          </div>
        </header>
        {searchOpen && <div className="search-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch() }}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search dashboard">
            <div className="search-dialog-input"><Search size={19} aria-hidden="true" /><input autoFocus value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSelectedSearchIndex(0) }} onKeyDown={(event) => {
              if (!searchResults.length) return
              if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedSearchIndex((index) => (index + 1) % searchResults.length) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedSearchIndex((index) => (index - 1 + searchResults.length) % searchResults.length) }
              if (event.key === 'Enter') { event.preventDefault(); setActive(searchResults[selectedSearchIndex]?.view ?? 'Overview'); closeSearch() }
            }} placeholder="Search pages, produce, and tools..." aria-label="Search pages and inventory" /><kbd>ESC</kbd><button className="icon-button" type="button" onClick={closeSearch} aria-label="Close search"><X size={17} /></button></div>
            <div className="search-results" role="listbox" aria-label="Search results">
              {searchResults.length ? searchResults.map((result, index) => <button type="button" role="option" aria-selected={selectedSearchIndex === index} className={`search-result ${selectedSearchIndex === index ? 'selected' : ''}`} key={`${result.view}-${result.label}`} onMouseEnter={() => setSelectedSearchIndex(index)} onClick={() => { setActive(result.view); closeSearch() }}><span className="search-result-icon"><Search size={15} /></span><span><strong>{result.label}</strong><small>{result.description}</small></span><ChevronRight size={15} /></button>) : <p className="search-no-results">No matching pages or produce found.</p>}
            </div>
            <div className="search-dialog-footer"><span>Navigate anywhere in FreshGuard</span><span><kbd>↑</kbd><kbd>↓</kbd> Select a result</span></div>
          </section>
        </div>}
        <div className="page-content">
          {storageError && <p className="storage-error" role="alert">{storageError}</p>}
          {inventoryApiError && <p className="storage-error" role="alert">Shared inventory is not syncing with other devices: {inventoryApiError} Launch FreshGuard on the PC with <code>npm run dev:lan</code> and keep it running.</p>}
          {sensorApiError && <p className="storage-error" role="status">Live sensor updates are unavailable: {sensorApiError}. Check that the ESP32 and phone can reach this PC on the same Wi-Fi.</p>}
          {active === 'AI Predictions' && modelError && <p className="form-error" role="alert">Prediction service unavailable: {modelError}</p>}
          {renderView()}
          <footer className="disclaimer"><Eye size={14} /> <span>Shelf-life forecasts are estimates, not food-safety decisions.</span></footer>
        </div>
      </section>
    </main>
  )
}
