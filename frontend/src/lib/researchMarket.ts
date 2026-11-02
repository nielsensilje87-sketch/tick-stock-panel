/**
 * 四市场研究壳（DSH-PANEL-4MKT-IMPL-V0）。
 * 用户锁 B：LIVE OFF、无券商、不下单；冻结参数 35% / 10% / 1.5× / POV 只读，不提供写回。
 *
 * 市场代码只有 US | CN | CRYPTO | HK。GLOBAL 是默认首页视图（分市摘要并排），不是第五个可交易市场。
 * 旗标默认开。构建时 VITE_DSH_4MKT=0 或 false 时壳层不挂载，看板与侧栏保持原 A 股行为。
 * 不接线、不灌数、不另起再平衡日历。缺数显示为未接线，不用 0 冒充仓位。
 */

export const RESEARCH_MARKETS = ['US', 'CN', 'CRYPTO', 'HK'] as const
export type ResearchMarketCode = (typeof RESEARCH_MARKETS)[number]

export const RESEARCH_VIEWS = ['GLOBAL', ...RESEARCH_MARKETS] as const
export type ResearchView = (typeof RESEARCH_VIEWS)[number]

export const VIEW_LABEL: Record<ResearchView, string> = {
  GLOBAL: '全球',
  US: '美股',
  CN: 'A股',
  CRYPTO: '加密',
  HK: '港股',
}

export const MARKET_META: Record<ResearchMarketCode, {
  panel: string
  tz: string
  windowNote: string
}> = {
  US: { panel: 'panel_us@1', tz: 'America/New_York', windowNote: '美日隔月末' },
  CN: { panel: 'panel_cn@1', tz: 'Asia/Shanghai', windowNote: '港A季末' },
  CRYPTO: { panel: 'panel_crypto@1', tz: 'UTC', windowNote: '无独立窗' },
  HK: { panel: 'panel_hk@1', tz: 'Asia/Hong_Kong', windowNote: '港A季末' },
}

/** 用户锁 B：与 CAPITALS 签字一致的冻结键。对象冻结，模块不提供写入口。 */
export const FROZEN = Object.freeze({
  max_asset_weight: 0.35,
  cash_cushion: 0.10,
  lot_mult: 1.5,
  pov_locked: true as const,
})

export const FROZEN_DISPLAY = Object.freeze({
  max_asset_weight: '35%',
  cash_cushion: '10%',
  lot_mult: '1.5×',
  pov: 'POV',
})

export const LIVE_TRADING = false as const
/** 明示空订单。保持只读空数组，不提供下单入口。 */
export const ORDERS: readonly never[] = Object.freeze([])

/** 层内可投资预算 = 1 − 层内现金垫。与层间「现金短债」不是同一字段。 */
export function investableBudgetRatio(): number {
  return 1 - FROZEN.cash_cushion
}

export const LAYERS = Object.freeze([
  { id: 'emergency', name: '应急金', runs_inv_vol: false, in_investable_pool: false },
  { id: 'cash_short', name: '现金短债', runs_inv_vol: false, in_investable_pool: true },
  { id: 'core', name: '核心', runs_inv_vol: true, in_investable_pool: true },
  { id: 'income', name: '收入增强', runs_inv_vol: true, in_investable_pool: true },
  { id: 'spec', name: '投机', runs_inv_vol: true, in_investable_pool: true },
  { id: 'creator', name: '创作者再投入', runs_inv_vol: false, in_investable_pool: true },
] as const)

/** 法定窗只列权益市场。CRYPTO 不单列；JP 本刀无层内引用则省略。 */
export const WINDOW_MARKETS = ['US', 'HK', 'CN'] as const

export const CALENDAR_RULES = '美日隔月末 / 港A（HK∪CN）季末；CRYPTO 无独立窗。未接线，不另起日历。'

export const NEW_CASH_PRIORITY = 'fill_underweight_layers'
export const SLEEVE_INCOME_ENABLED = false as const

/**
 * A 股投机页：默认首页与非 CN 视图不进入导航，直链也被壳层挡住。
 * 连板梯队、概念热力、复盘（含龙虎榜与涨停结构）。
 */
export const CN_ONLY_NAV_PATHS = ['/limit-ladder', '/concept-analysis', '/review'] as const

/** 主看板不挂载的组件。连板梯队与概念热力改由 CN 抽屉里的页面入口进入。 */
export const MAIN_BOARD_HIDDEN_WIDGETS = ['ladder', 'concept-rank'] as const

const HIDDEN_WIDGET_SET = new Set<string>(MAIN_BOARD_HIDDEN_WIDGETS)

export function researchMarketsEnabled(
  env: string | boolean | undefined = import.meta.env.VITE_DSH_4MKT,
): boolean {
  if (env === '0' || env === 'false' || env === false) return false
  return true
}

export function parseResearchView(raw: string | null | undefined): ResearchView {
  if (!raw) return 'GLOBAL'
  const v = raw.trim().toUpperCase()
  if (v === 'GLOBAL' || v === 'US' || v === 'CN' || v === 'CRYPTO' || v === 'HK') return v
  return 'GLOBAL'
}

export function isCnOnlyPath(pathname: string): boolean {
  return CN_ONLY_NAV_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export function navAllowed(path: string, enabled: boolean, view: ResearchView): boolean {
  if (!enabled) return true
  if (!isCnOnlyPath(path)) return true
  return view === 'CN'
}

export function partitionMainBoard<T extends { t: string }>(
  items: T[],
  enabled: boolean,
): { visible: T[]; hidden: T[] } {
  if (!enabled) return { visible: items, hidden: [] }
  const visible: T[] = []
  const hidden: T[] = []
  for (const it of items) {
    if (HIDDEN_WIDGET_SET.has(it.t)) hidden.push(it)
    else visible.push(it)
  }
  return { visible, hidden }
}
