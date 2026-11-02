import { describe, expect, it } from 'vitest'
import barsJson from '../../public/dsh-lake-panel-bars.json'
import statusJson from '../../public/dsh-lake-panel-status.json'
import {
  buildMarketStrip,
  candlesForSlot,
  changePctFromCloses,
  formatChangePct,
  resolveSelectedSymbol,
} from './barsToStrip'
import { normalizeLakePanel, unloadedMarket, type MarketCardModel } from './lakePanel'
import { MAJORS_BY_MARKET, MAJORS_UNIVERSE, SIGNED_SAMPLE_SYMBOLS } from './majorsUniverse'
import type { ResearchMarketCode } from './researchMarket'

const gate = {
  data_version: 'sample',
  timezone: 'Asia/Shanghai',
  asof_utc: '2026-10-29T07:00:00Z',
  content_hash: 'abc',
  amount: null,
  annual_vol_20d: null,
  weight: null,
}

function signedBoard() {
  return normalizeLakePanel(statusJson, barsJson)
}

function closes(market: 'CN' | 'CRYPTO', symbol: string): number[] {
  const rows = (barsJson.markets[market] as Array<{ symbol: string; date: string; close: number }>)
    .filter(row => row.symbol === symbol)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return rows.map(row => row.close)
}

describe('majors universe', () => {
  it('固定序与 3+2 样本闸，指数不在可画价集合', () => {
    expect(MAJORS_BY_MARKET.CN.map(entry => entry.symbol)).toEqual([
      '000300.SH', '000016.SH', '399006.SZ', '000001.SH',
      '600519.SH', '000001.SZ', '600000.SH', '601318.SH', '600036.SH', '000858.SZ',
    ])
    expect(MAJORS_BY_MARKET.CN.map(entry => entry.name)).toEqual([
      '沪深300', '上证50', '创业板指', '上证指数',
      '贵州茅台', '平安银行', '浦发银行', '中国平安', '招商银行', '五粮液',
    ])
    expect(MAJORS_BY_MARKET.CRYPTO.map(entry => entry.symbol)).toEqual([
      'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT',
    ])
    expect(MAJORS_BY_MARKET.US.map(entry => entry.symbol)).toEqual(['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'])
    expect(MAJORS_BY_MARKET.HK.map(entry => entry.symbol)).toEqual(['0700.HK', '9988.HK', '1299.HK', '2800.HK'])
    expect([...SIGNED_SAMPLE_SYMBOLS]).toEqual([
      '600519.SH', '000001.SZ', '600000.SH', 'BTC-USDT', 'ETH-USDT',
    ])
    expect(MAJORS_UNIVERSE.filter(entry => entry.ingest === 'PENDING_INGEST').map(entry => entry.symbol)).toEqual([
      '000300.SH', '000016.SH', '399006.SZ', '000001.SH', '601318.SH', '600036.SH', '000858.SZ',
      'SOL-USDT', 'BNB-USDT', 'XRP-USDT',
    ])
    expect(MAJORS_BY_MARKET.CN.find(entry => entry.symbol === '000001.SH')?.name).toBe('上证指数')
    expect(MAJORS_BY_MARKET.CN.find(entry => entry.symbol === '000001.SZ')?.name).toBe('平安银行')
    expect(MAJORS_BY_MARKET.CRYPTO[0].role).toBe('benchmark')
  })
})

describe('signed bars fixture', () => {
  const board = signedBoard()

  it('只含五只样本，行数与 status 一致，来源是签版 primary', () => {
    expect(board.markets.CN.rows).toHaveLength(120)
    expect(board.markets.CRYPTO.rows).toHaveLength(58)
    expect(board.markets.US.rows).toHaveLength(0)
    expect(board.markets.HK.rows).toHaveLength(0)
    const symbols = new Set([
      ...board.markets.CN.rows.map(row => row.symbol),
      ...board.markets.CRYPTO.rows.map(row => row.symbol),
    ])
    expect([...symbols].sort()).toEqual(['000001.SZ', '600000.SH', '600519.SH', 'BTC-USDT', 'ETH-USDT'].sort())
    expect(new Set(board.markets.CN.rows.map(row => row.source))).toEqual(new Set(['cnequity_local']))
    expect(new Set(board.markets.CRYPTO.rows.map(row => row.source))).toEqual(new Set(['okx_public_candles_1d']))
    for (const row of [...board.markets.CN.rows, ...board.markets.CRYPTO.rows]) {
      expect(row.source).not.toMatch(/eastmoney|yfinance|quarantine/i)
    }
  })

  it('change_pct 用未复权日线 close，两位小数；BTC 不足 0.005 个百分点则为 0.00', () => {
    const cases: Array<[ResearchMarketCode, string, number]> = [
      ['CN', '600519.SH', 1.75],
      ['CN', '000001.SZ', 2.03],
      ['CN', '600000.SH', 1.42],
      ['CRYPTO', 'BTC-USDT', 0],
      ['CRYPTO', 'ETH-USDT', -0.51],
    ]
    for (const [market, symbol, expected] of cases) {
      const series = closes(market === 'CRYPTO' ? 'CRYPTO' : 'CN', symbol)
      expect(series.length).toBeGreaterThan(1)
      const prev = series[series.length - 2]
      const last = series[series.length - 1]
      expect(changePctFromCloses(prev, last)).toBe(expected)
      const slot = buildMarketStrip(board.markets[market]).find(item => item.symbol === symbol)
      expect(slot?.state).toBe('FILLED')
      expect(slot?.sample).toBe(true)
      expect(slot?.last).toBe(last)
      expect(slot?.change_pct).toBe(expected)
      expect(slot?.asof).toBe(market === 'CN' ? '2026-10-29' : '2026-10-27')
      expect(formatChangePct(expected)).toBe(expected > 0 ? `+${expected.toFixed(2)}%` : expected < 0 ? `${expected.toFixed(2)}%` : '0.00%')
    }
  })

  it('条内顺序是宇宙序，不是涨跌幅序', () => {
    const cn = buildMarketStrip(board.markets.CN)
    expect(cn.map(slot => slot.symbol)).toEqual(MAJORS_BY_MARKET.CN.map(entry => entry.symbol))
    const filled = cn.filter(slot => slot.state === 'FILLED').map(slot => slot.symbol)
    expect(filled).toEqual(['600519.SH', '000001.SZ', '600000.SH'])
    const byChange = [...cn.filter(slot => slot.change_pct != null)].sort((a, b) => (b.change_pct! - a.change_pct!))
    expect(byChange.map(slot => slot.symbol)).toEqual(['000001.SZ', '600519.SH', '600000.SH'])
    expect(filled).not.toEqual(byChange.map(slot => slot.symbol))
    for (const symbol of ['000300.SH', '000016.SH', '399006.SZ', '000001.SH', '601318.SH', '600036.SH', '000858.SZ']) {
      const slot = cn.find(item => item.symbol === symbol)
      expect(slot?.state).toBe('EMPTY_PENDING_INGEST')
      expect(slot?.last).toBeNull()
      expect(slot?.change_pct).toBeNull()
      expect(slot?.sample).toBe(false)
    }
    const crypto = buildMarketStrip(board.markets.CRYPTO)
    expect(crypto.map(slot => slot.state)).toEqual([
      'FILLED', 'FILLED', 'EMPTY_PENDING_INGEST', 'EMPTY_PENDING_INGEST', 'EMPTY_PENDING_INGEST',
    ])
    expect(crypto[0].source).toBe('okx_public_candles_1d')
    expect(buildMarketStrip(board.markets.US).every(slot => slot.state === 'UNWIRED' && slot.last == null)).toBe(true)
    expect(buildMarketStrip(board.markets.HK).every(slot => slot.state === 'UNWIRED' && slot.last == null)).toBe(true)
  })
})

describe('strip gates', () => {
  it('不足两根、前收为 0、指数 bars、别市 bars、US 误灌都不画价', () => {
    expect(changePctFromCloses(0, 10)).toBeNull()
    expect(changePctFromCloses(Number.NaN, 10)).toBeNull()

    const one = {
      ...unloadedMarket('CN', 'x'),
      wired_payload: true,
      signed: true,
      badge: 'SIGNED' as const,
      source_primary: 'cnequity_local',
      rows: [{
        symbol: '600519.SH', market: 'CN' as const, date: '2026-10-29',
        open: 1, high: 2, low: 1, close: 1354, volume: 1,
        source: 'cnequity_local', ...gate,
      }],
    }
    const single = buildMarketStrip(one).find(slot => slot.symbol === '600519.SH')
    expect(single?.state).toBe('FILLED')
    expect(single?.last).toBe(1354)
    expect(single?.change_pct).toBeNull()
    expect(formatChangePct(single?.change_pct ?? null)).toBe('—')
    expect(candlesForSlot(single).map(bar => bar.close)).toEqual([1354])

    const index: MarketCardModel = {
      ...one,
      rows: [{
        symbol: '000300.SH', market: 'CN', date: '2026-10-29',
        open: 4000, high: 4010, low: 3990, close: 4001, volume: 9,
        source: 'cnequity_local', ...gate, content_hash: 'idx',
      }],
    }
    const hs300 = buildMarketStrip(index).find(slot => slot.symbol === '000300.SH')
    expect(hs300?.state).toBe('EMPTY_PENDING_INGEST')
    expect(hs300?.last).toBeNull()
    expect(candlesForSlot(hs300)).toEqual([])

    const crossed: MarketCardModel = {
      ...one,
      rows: [{
        symbol: '600519.SH', market: 'CRYPTO', date: '2026-10-29',
        open: 1, high: 1, low: 1, close: 999, volume: 1,
        source: 'cnequity_local', ...gate, content_hash: 'x',
      }],
    }
    expect(buildMarketStrip(crossed).find(slot => slot.symbol === '600519.SH')?.last).toBeNull()

    const us = {
      ...unloadedMarket('US', 'unwired'),
      wired_payload: true,
      signed: true,
      badge: 'SIGNED' as const,
      source_primary: 'tiingo_eod_free',
      rows: [{
        symbol: 'AAPL', market: 'US' as const, date: '2026-10-29',
        open: 100, high: 110, low: 90, close: 105, volume: 5,
        source: 'tiingo_eod_free', ...gate, timezone: 'America/New_York',
      }],
    }
    const aapl = buildMarketStrip(us).find(slot => slot.symbol === 'AAPL')
    expect(aapl?.state).toBe('UNWIRED')
    expect(aapl?.last).toBeNull()
    expect(candlesForSlot(aapl)).toEqual([])

    const pending = buildMarketStrip(one)
    expect(resolveSelectedSymbol(pending, null)).toBe('600519.SH')
    expect(resolveSelectedSymbol(pending, '000300.SH')).toBe('000300.SH')
    expect(resolveSelectedSymbol(pending, 'AAPL')).toBe('600519.SH')
    expect(candlesForSlot(pending.find(slot => slot.symbol === '000300.SH') ?? null)).toEqual([])
  })
})
