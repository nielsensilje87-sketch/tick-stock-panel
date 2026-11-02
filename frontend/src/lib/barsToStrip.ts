/**
 * Signed daily bars → 涨幅条 / 日线蜡烛。
 *
 * change_pct 口径（PANEL-IA-TV-GAINS §3.1，百分数点，不是实时行情里的小数比）：
 *   change_pct = round(100 * (close_t / close_{t-1} - 1), 2)
 * 不足两根日线 close → null。CN 用未复权 close。CRYPTO 同一公式，计价 USDT。
 * 不跨市填价，不发明 OHLCV。
 */
import type { LakeBarRow, MarketCardModel } from './lakePanel'
import { MAJORS_BY_MARKET, SIGNED_SAMPLE_SYMBOLS, type UniverseEntry } from './majorsUniverse'
import type { ResearchMarketCode } from './researchMarket'

export const STRIP_COPY = {
  unwired: '未接线 · 无 primary · 无涨幅 / 无 K 线',
  pending: '宇宙占位 · 待 ingest',
  needTwo: '需 ≥2 根日线',
  noSignedBars: '无 signed bars',
  daily: '日线',
  unadjusted: '未复权',
  quoteUsdt: 'USDT',
} as const

export type SlotState = 'FILLED' | 'EMPTY_PENDING_INGEST' | 'UNWIRED'

export interface DailyCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export interface StripSlot {
  market: ResearchMarketCode
  symbol: string
  name: string
  role: UniverseEntry['role']
  last: number | null
  /** 百分数点，两位小数。不是 0.0366 这种小数比。 */
  change_pct: number | null
  asof: string | null
  source: string | null
  state: SlotState
  sample: boolean
  bars: LakeBarRow[]
}

export function round2(value: number): number {
  const magnitude = Math.round(Math.abs(value) * 100) / 100
  if (magnitude === 0) return 0
  return value < 0 ? -magnitude : magnitude
}

/** 两根已排序日线 close。prev 为 0 或非有限数时返回 null，不编造涨跌。 */
export function changePctFromCloses(prev: number, last: number): number | null {
  if (!Number.isFinite(prev) || !Number.isFinite(last) || prev === 0) return null
  return round2(100 * (last / prev - 1))
}

export function dedupeDailyBars(rows: LakeBarRow[]): LakeBarRow[] {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const byDate = new Map<string, LakeBarRow>()
  for (const row of sorted) byDate.set(row.date, row)
  return [...byDate.values()]
}

function barsForSymbol(model: MarketCardModel, symbol: string): LakeBarRow[] {
  const source = model.source_primary
  if (!source) return []
  return dedupeDailyBars(
    model.rows.filter(row => row.symbol === symbol && row.market === model.market && row.source === source),
  )
}

function emptySlot(entry: UniverseEntry, state: SlotState): StripSlot {
  return {
    market: entry.market,
    symbol: entry.symbol,
    name: entry.name,
    role: entry.role,
    last: null,
    change_pct: null,
    asof: null,
    source: null,
    state,
    sample: false,
    bars: [],
  }
}

/**
 * 宇宙固定序。US/HK 或 wired=false → 整条 UNWIRED。
 * 其余只有 3+2 样本且有 signed bars 才 FILLED，并带 SAMPLE。
 */
export function buildMarketStrip(model: MarketCardModel): StripSlot[] {
  const entries = MAJORS_BY_MARKET[model.market]
  const unwired = (model.market !== 'CN' && model.market !== 'CRYPTO') || model.wired_payload === false
  return entries.map(entry => {
    if (unwired || !model.signed || !SIGNED_SAMPLE_SYMBOLS.has(entry.symbol)) {
      return emptySlot(entry, unwired ? 'UNWIRED' : 'EMPTY_PENDING_INGEST')
    }
    const matched = barsForSymbol(model, entry.symbol)
    if (matched.length === 0) return emptySlot(entry, 'EMPTY_PENDING_INGEST')
    const lastBar = matched[matched.length - 1]
    const prevClose = matched.length >= 2 ? matched[matched.length - 2].close : null
    return {
      market: entry.market,
      symbol: entry.symbol,
      name: entry.name,
      role: entry.role,
      last: lastBar.close,
      change_pct: prevClose == null ? null : changePctFromCloses(prevClose, lastBar.close),
      asof: lastBar.date,
      source: model.source_primary,
      state: 'FILLED',
      sample: true,
      bars: matched,
    }
  })
}

export function defaultFilledSymbol(slots: readonly StripSlot[]): string | null {
  return slots.find(slot => slot.state === 'FILLED')?.symbol ?? null
}

/** 请求的代码必须在本宇宙内。否则落到第一个 FILLED；都没有则空，不画假烛。 */
export function resolveSelectedSymbol(
  slots: readonly StripSlot[],
  requested: string | null | undefined,
): string | null {
  if (requested && slots.some(slot => slot.symbol === requested)) return requested
  return defaultFilledSymbol(slots)
}

export function candlesForSlot(slot: StripSlot | null | undefined): DailyCandle[] {
  if (!slot || slot.state !== 'FILLED') return []
  return slot.bars.map(bar => ({
    time: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }))
}

export function formatLast(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return String(value)
}

export function formatChangePct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const rounded = round2(value)
  if (rounded === 0) return '0.00%'
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(2)}%`
}

export function chipTitle(slot: StripSlot): string {
  if (slot.state === 'UNWIRED') return STRIP_COPY.unwired
  if (slot.state === 'EMPTY_PENDING_INGEST') return STRIP_COPY.pending
  if (slot.change_pct == null) return STRIP_COPY.needTwo
  return `${slot.name} ${slot.symbol}`
}

export function chartEmptyCopy(slots: readonly StripSlot[], slot: StripSlot | null): string {
  if (slots.length === 0 || slots.every(item => item.state === 'UNWIRED') || slot?.state === 'UNWIRED') {
    return STRIP_COPY.unwired
  }
  if (!slot || slot.state === 'EMPTY_PENDING_INGEST') return STRIP_COPY.pending
  return STRIP_COPY.noSignedBars
}
