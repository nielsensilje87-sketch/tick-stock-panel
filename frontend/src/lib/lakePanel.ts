/**
 * 四市湖面板只读展示模型。
 *
 * 运行时读 public/dsh-lake-panel-status.json（可覆盖，不进报价线程）。
 * K 线只在同目录可选的 dsh-lake-panel-bars.json 里、且该市为签版 primary 时逐行展示。
 * eastmoney / yfinance / quarantine 永远不写入 source_primary，也不进金标表。
 * 缺权重、波动率、行时保持空，不用 0 或别的市场补。
 */
import { MARKET_META, RESEARCH_MARKETS, type ResearchMarketCode } from './researchMarket'

export const LAKE_STATUS_URL = '/dsh-lake-panel-status.json'
export const LAKE_BARS_URL = '/dsh-lake-panel-bars.json'

export type CatalogRole = 'signed_primary' | 'unsigned' | 'none'
export type WiringBadge = 'SIGNED' | 'UNSIGNED' | 'UNWIRED'

const SIGNED_EXACT = new Set([
  'cnequity_local',
  'okx_public_candles_1d',
  'tiingo_eod_free',
  'stooq_filedrop',
])

export interface LakeBarRow {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  market: ResearchMarketCode
  source: string
  data_version: string
  timezone: string
  asof_utc: string
  content_hash: string
  amount: number | null
  annual_vol_20d: number | null
  weight: number | null
}

export interface MarketCardModel {
  market: ResearchMarketCode
  panel_id: string
  timezone: string
  windowNote: string
  wired_payload: boolean | null
  signed: boolean
  symbol_count: number | null
  row_count: number | null
  data_asof: string | null
  /** 只有签版 catalog id 会填到这里。UNSIGNED 源保持 null。 */
  source_primary: string | null
  payload_source: string | null
  catalog: CatalogRole
  reason: string | null
  alert_count: number | null
  window_flag: string | null
  badge: WiringBadge
  badge_detail: string
  rows: LakeBarRow[]
  rows_omitted: number
  rows_omitted_note: string | null
}

export interface LakeBoard {
  schema: string | null
  live_trading_file: boolean | null
  built_at_utc: string | null
  note: string | null
  orders_in_file: number | null
  markets: Record<ResearchMarketCode, MarketCardModel>
}

export function catalogRole(source: unknown): CatalogRole {
  if (typeof source !== 'string') return 'none'
  const id = source.trim()
  if (!id || id.toLowerCase() === 'null') return 'none'
  const lower = id.toLowerCase()
  if (lower.includes('eastmoney') || lower.includes('yfinance') || lower.includes('quarantine')) {
    return 'unsigned'
  }
  if (
    SIGNED_EXACT.has(lower)
    || lower.startsWith('tiingo')
    || lower.startsWith('stooq')
    || lower.startsWith('user_export')
  ) {
    return 'signed_primary'
  }
  return 'unsigned'
}

export function wiringBadge(wired: boolean | null, role: CatalogRole): WiringBadge {
  if (role === 'unsigned') return 'UNSIGNED'
  if (role === 'signed_primary' && wired === true) return 'SIGNED'
  return 'UNWIRED'
}

function asMarket(value: unknown): ResearchMarketCode | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toUpperCase()
  if (v === 'US' || v === 'CN' || v === 'CRYPTO' || v === 'HK') return v
  return null
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v ? v : null
}

function boolOrNull(value: unknown): boolean | null {
  if (value === true || value === false) return value
  return null
}

function intOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value))
  }
  return null
}

function numOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

export function unloadedMarket(code: ResearchMarketCode, reason: string): MarketCardModel {
  const meta = MARKET_META[code]
  return {
    market: code,
    panel_id: meta.panel,
    timezone: meta.tz,
    windowNote: meta.windowNote,
    wired_payload: null,
    signed: false,
    symbol_count: null,
    row_count: null,
    data_asof: null,
    source_primary: null,
    payload_source: null,
    catalog: 'none',
    reason,
    alert_count: null,
    window_flag: null,
    badge: 'UNWIRED',
    badge_detail: reason,
    rows: [],
    rows_omitted: 0,
    rows_omitted_note: null,
  }
}

function badgeDetail(badge: WiringBadge, reason: string | null): string {
  if (badge === 'SIGNED') return 'catalog primary'
  if (badge === 'UNSIGNED') return 'not-catalog-primary'
  return reason ?? '未接线'
}

interface ParsedRow {
  row: LakeBarRow | null
  market: ResearchMarketCode | null
  reject: string | null
}

function parseBar(raw: unknown, fallbackMarket: ResearchMarketCode | null): ParsedRow {
  if (!raw || typeof raw !== 'object') return { row: null, market: fallbackMarket, reject: '缺拒闸字段' }
  const obj = raw as Record<string, unknown>
  const market = asMarket(obj.market) ?? fallbackMarket
  const source = textOrNull(obj.source)
  const missing: string[] = []
  const symbol = textOrNull(obj.symbol)
  const date = textOrNull(obj.date)
  const open = numOrNull(obj.open)
  const high = numOrNull(obj.high)
  const low = numOrNull(obj.low)
  const close = numOrNull(obj.close)
  const volume = numOrNull(obj.volume)
  const dataVersion = textOrNull(obj.data_version)
  const timezone = textOrNull(obj.timezone)
  const asof = textOrNull(obj.asof_utc) ?? textOrNull(obj.asof)
  const hash = textOrNull(obj.content_hash)
  if (!symbol) missing.push('symbol')
  if (!date) missing.push('date')
  if (open == null) missing.push('open')
  if (high == null) missing.push('high')
  if (low == null) missing.push('low')
  if (close == null) missing.push('close')
  if (volume == null) missing.push('volume')
  if (!market) missing.push('market')
  if (!source) missing.push('source')
  if (!dataVersion) missing.push('data_version')
  if (!timezone) missing.push('timezone')
  if (!asof) missing.push('asof_utc')
  if (!hash) missing.push('content_hash')
  if (missing.length || !market || !source || !symbol || !date || open == null || high == null || low == null || close == null || volume == null || !dataVersion || !timezone || !asof || !hash) {
    return { row: null, market, reject: '缺拒闸字段' }
  }
  if (catalogRole(source) !== 'signed_primary') {
    return { row: null, market, reject: 'source 不是签版 primary' }
  }
  return {
    market,
    reject: null,
    row: {
      symbol,
      date,
      open,
      high,
      low,
      close,
      volume,
      market,
      source,
      data_version: dataVersion,
      timezone,
      asof_utc: asof,
      content_hash: hash,
      amount: numOrNull(obj.amount),
      annual_vol_20d: numOrNull(obj.annual_vol_20d),
      weight: numOrNull(obj.weight),
    },
  }
}

function collectRawRows(bars: unknown): Array<{ raw: unknown; fallback: ResearchMarketCode | null }> {
  if (!bars || typeof bars !== 'object') return []
  const obj = bars as Record<string, unknown>
  const out: Array<{ raw: unknown; fallback: ResearchMarketCode | null }> = []
  const markets = obj.markets
  if (markets && typeof markets === 'object' && Object.keys(markets).length > 0) {
    for (const [key, value] of Object.entries(markets as Record<string, unknown>)) {
      const fallback = asMarket(key)
      const list = Array.isArray(value)
        ? value
        : value && typeof value === 'object' && Array.isArray((value as { rows?: unknown }).rows)
          ? (value as { rows: unknown[] }).rows
          : []
      for (const raw of list) out.push({ raw, fallback })
    }
    return out
  }
  if (Array.isArray(obj.rows)) {
    for (const raw of obj.rows) out.push({ raw, fallback: null })
  }
  return out
}

function emptyBoardShell(status: Record<string, unknown> | null): Omit<LakeBoard, 'markets'> {
  const orders = status && Array.isArray(status.orders) ? status.orders.length : null
  return {
    schema: status ? textOrNull(status.schema) : null,
    live_trading_file: status ? boolOrNull(status.live_trading) : null,
    built_at_utc: status ? textOrNull(status.built_at_utc) : null,
    note: status ? textOrNull(status.note) : null,
    orders_in_file: orders,
  }
}

export function normalizeLakePanel(status: unknown, bars: unknown): LakeBoard {
  const root = status && typeof status === 'object' ? status as Record<string, unknown> : null
  const marketsRaw = root && root.markets && typeof root.markets === 'object'
    ? root.markets as Record<string, unknown>
    : null
  const parsed = collectRawRows(bars).map(item => parseBar(item.raw, item.fallback))

  const markets = {} as Record<ResearchMarketCode, MarketCardModel>
  for (const code of RESEARCH_MARKETS) {
    const meta = MARKET_META[code]
    const raw = marketsRaw?.[code]
    if (!raw || typeof raw !== 'object') {
      const base = unloadedMarket(code, marketsRaw ? 'status 无此市' : 'status 无 markets')
      const ignored = parsed.filter(p => p.market === code).length
      markets[code] = ignored
        ? { ...base, rows_omitted: ignored, rows_omitted_note: `该市不是签版 primary，K 线不展示（${ignored} 行已忽略）` }
        : base
      continue
    }
    const obj = raw as Record<string, unknown>
    const payloadSource = textOrNull(obj.source_primary)
    const role = catalogRole(payloadSource)
    const wired = boolOrNull(obj.wired)
    const badge = wiringBadge(wired, role)
    const reason = textOrNull(obj.reason)
    const sourcePrimary = role === 'signed_primary' ? payloadSource : null
    const belonging = parsed.filter(p => p.market === code)
    let rows: LakeBarRow[] = []
    let omitted = 0
    const notes = new Set<string>()
    if (badge !== 'SIGNED') {
      omitted = belonging.length
      if (omitted > 0) notes.add('该市不是签版 primary，K 线不展示')
    } else {
      for (const item of belonging) {
        if (!item.row || item.reject) {
          omitted += 1
          notes.add(item.reject ?? '缺拒闸字段')
          continue
        }
        if (item.row.source !== sourcePrimary) {
          omitted += 1
          notes.add('source 与 source_primary 不一致')
          continue
        }
        rows.push(item.row)
      }
    }
    markets[code] = {
      market: code,
      panel_id: textOrNull(obj.panel_id) ?? meta.panel,
      timezone: textOrNull(obj.timezone) ?? meta.tz,
      windowNote: meta.windowNote,
      wired_payload: wired,
      signed: badge === 'SIGNED',
      symbol_count: intOrNull(obj.symbol_count),
      row_count: intOrNull(obj.row_count),
      data_asof: textOrNull(obj.data_asof),
      source_primary: sourcePrimary,
      payload_source: role === 'unsigned' ? payloadSource : null,
      catalog: role,
      reason,
      alert_count: intOrNull(obj.alert_count),
      window_flag: textOrNull(obj.window_flag),
      badge,
      badge_detail: badgeDetail(badge, reason),
      rows,
      rows_omitted: omitted,
      rows_omitted_note: omitted > 0 ? `已省略 ${omitted} 行：${[...notes].join('；')}` : null,
    }
  }
  return { ...emptyBoardShell(root), markets }
}

export async function loadLakePanel(fetchImpl: typeof fetch = fetch): Promise<LakeBoard> {
  const statusRes = await fetchImpl(LAKE_STATUS_URL, { cache: 'no-store' })
  if (!statusRes.ok) {
    throw new Error(`dsh-lake-panel-status.json HTTP ${statusRes.status}`)
  }
  const status = await statusRes.json()
  let bars: unknown = null
  try {
    const barsRes = await fetchImpl(LAKE_BARS_URL, { cache: 'no-store' })
    if (barsRes.ok) bars = await barsRes.json()
  } catch {
    bars = null
  }
  return normalizeLakePanel(status, bars)
}

export type LakeBoardState = 'unloaded' | 'loading' | 'error' | 'ready'

export function resolveLakeModels(
  board: LakeBoard | null | undefined,
  state: LakeBoardState,
  error: string | null | undefined,
): { board: LakeBoard | null; models: MarketCardModel[] } {
  if (state === 'ready' && board) {
    return { board, models: RESEARCH_MARKETS.map(code => board.markets[code]) }
  }
  const reason = state === 'loading'
    ? '读取 status…'
    : state === 'error'
      ? (error || 'status 未读到')
      : 'status 未载入'
  return {
    board: null,
    models: RESEARCH_MARKETS.map(code => unloadedMarket(code, reason)),
  }
}
