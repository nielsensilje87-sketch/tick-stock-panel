/**
 * MAJORS-UNIVERSE-V0（SIGNED · 投机研究 · cite t387u）。
 * 涨幅条按本表固定序渲染，不按涨跌幅重排。
 * 只有 IN_SIGNED_SAMPLE 且 signed bars 真的在场时才能 FILLED。
 */
import type { ResearchMarketCode } from './researchMarket'

export type UniverseRole = 'index' | 'mega' | 'large' | 'benchmark'
export type IngestStatus = 'IN_SIGNED_SAMPLE' | 'PENDING_INGEST' | 'UNWIRED'

export interface UniverseEntry {
  market: ResearchMarketCode
  symbol: string
  name: string
  role: UniverseRole
  ingest: IngestStatus
}

export const MAJORS_UNIVERSE: readonly UniverseEntry[] = Object.freeze([
  { market: 'CN', symbol: '000300.SH', name: '沪深300', role: 'index', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '000016.SH', name: '上证50', role: 'index', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '399006.SZ', name: '创业板指', role: 'index', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '000001.SH', name: '上证指数', role: 'index', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '600519.SH', name: '贵州茅台', role: 'mega', ingest: 'IN_SIGNED_SAMPLE' },
  { market: 'CN', symbol: '000001.SZ', name: '平安银行', role: 'large', ingest: 'IN_SIGNED_SAMPLE' },
  { market: 'CN', symbol: '600000.SH', name: '浦发银行', role: 'large', ingest: 'IN_SIGNED_SAMPLE' },
  { market: 'CN', symbol: '601318.SH', name: '中国平安', role: 'mega', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '600036.SH', name: '招商银行', role: 'mega', ingest: 'PENDING_INGEST' },
  { market: 'CN', symbol: '000858.SZ', name: '五粮液', role: 'mega', ingest: 'PENDING_INGEST' },

  { market: 'CRYPTO', symbol: 'BTC-USDT', name: 'Bitcoin', role: 'benchmark', ingest: 'IN_SIGNED_SAMPLE' },
  { market: 'CRYPTO', symbol: 'ETH-USDT', name: 'Ethereum', role: 'mega', ingest: 'IN_SIGNED_SAMPLE' },
  { market: 'CRYPTO', symbol: 'SOL-USDT', name: 'Solana', role: 'large', ingest: 'PENDING_INGEST' },
  { market: 'CRYPTO', symbol: 'BNB-USDT', name: 'BNB', role: 'large', ingest: 'PENDING_INGEST' },
  { market: 'CRYPTO', symbol: 'XRP-USDT', name: 'XRP', role: 'large', ingest: 'PENDING_INGEST' },

  { market: 'US', symbol: 'SPY', name: 'S&P 500 ETF', role: 'index', ingest: 'UNWIRED' },
  { market: 'US', symbol: 'QQQ', name: 'Nasdaq 100 ETF', role: 'index', ingest: 'UNWIRED' },
  { market: 'US', symbol: 'AAPL', name: 'Apple', role: 'mega', ingest: 'UNWIRED' },
  { market: 'US', symbol: 'MSFT', name: 'Microsoft', role: 'mega', ingest: 'UNWIRED' },
  { market: 'US', symbol: 'NVDA', name: 'NVIDIA', role: 'mega', ingest: 'UNWIRED' },

  { market: 'HK', symbol: '0700.HK', name: '腾讯', role: 'mega', ingest: 'UNWIRED' },
  { market: 'HK', symbol: '9988.HK', name: '阿里巴巴-SW', role: 'mega', ingest: 'UNWIRED' },
  { market: 'HK', symbol: '1299.HK', name: '友邦', role: 'large', ingest: 'UNWIRED' },
  { market: 'HK', symbol: '2800.HK', name: '盈富基金', role: 'index', ingest: 'UNWIRED' },
])

/** 当前 3+2 样本。指数与其余 majors 不在此集合，即使误塞 bars 也不画价。 */
export const SIGNED_SAMPLE_SYMBOLS: ReadonlySet<string> = new Set(
  MAJORS_UNIVERSE.filter(entry => entry.ingest === 'IN_SIGNED_SAMPLE').map(entry => entry.symbol),
)

export const MAJORS_BY_MARKET: Record<ResearchMarketCode, readonly UniverseEntry[]> = {
  US: MAJORS_UNIVERSE.filter(entry => entry.market === 'US'),
  CN: MAJORS_UNIVERSE.filter(entry => entry.market === 'CN'),
  CRYPTO: MAJORS_UNIVERSE.filter(entry => entry.market === 'CRYPTO'),
  HK: MAJORS_UNIVERSE.filter(entry => entry.market === 'HK'),
}
