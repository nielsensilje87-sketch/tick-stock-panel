import { describe, expect, it, vi } from 'vitest'
import statusJson from '../../public/dsh-lake-panel-status.json'
import {
  catalogRole,
  loadLakePanel,
  normalizeLakePanel,
  wiringBadge,
} from './lakePanel'

const gate = {
  data_version: 'sample',
  timezone: 'Asia/Shanghai',
  asof_utc: '2026-10-29T07:00:00Z',
  content_hash: 'abc123',
}

describe('signed status fixture', () => {
  const board = normalizeLakePanel(statusJson, null)

  it('只把 CN 与 CRYPTO 标成签版 primary，US/HK 保持空', () => {
    expect(board.live_trading_file).toBe(false)
    expect(board.markets.CN.badge).toBe('SIGNED')
    expect(board.markets.CN.source_primary).toBe('cnequity_local')
    expect(board.markets.CN.symbol_count).toBe(3)
    expect(board.markets.CN.row_count).toBe(120)
    expect(board.markets.CN.data_asof).toBe('2026-10-29')
    expect(board.markets.CN.rows).toEqual([])
    expect(board.markets.CRYPTO.badge).toBe('SIGNED')
    expect(board.markets.CRYPTO.source_primary).toBe('okx_public_candles_1d')
    expect(board.markets.CRYPTO.symbol_count).toBe(2)
    expect(board.markets.CRYPTO.row_count).toBe(58)
    expect(board.markets.CRYPTO.data_asof).toBe('2026-10-27')
    expect(board.markets.US.badge).toBe('UNWIRED')
    expect(board.markets.US.source_primary).toBeNull()
    expect(board.markets.US.payload_source).toBeNull()
    expect(board.markets.US.symbol_count).toBeNull()
    expect(board.markets.US.reason).toBe('BARS_EMPTY · UNSIGNED · no primary')
    expect(board.markets.HK.badge).toBe('UNWIRED')
    expect(board.markets.HK.source_primary).toBeNull()
    expect(board.markets.HK.reason).toBe('unwired')
    expect(board.markets.HK.data_asof).toBeNull()
    for (const market of Object.values(board.markets)) {
      expect(market.source_primary ?? '').not.toMatch(/eastmoney|yfinance|quarantine/i)
      expect(market.alert_count).toBeNull()
      expect(market.window_flag).toBeNull()
    }
  })
})

describe('catalog role', () => {
  it('签版 id 与 UNSIGNED 源分开', () => {
    for (const id of ['cnequity_local', 'okx_public_candles_1d', 'tiingo_eod_free', 'stooq_filedrop', 'user_export_us', 'user_export_cn', 'Tiingo_EOD']) {
      expect(catalogRole(id)).toBe('signed_primary')
    }
    expect(catalogRole('eastmoney_push2his')).toBe('unsigned')
    expect(catalogRole('yfinance_cache')).toBe('unsigned')
    expect(catalogRole(null)).toBe('none')
    expect(wiringBadge(true, 'unsigned')).toBe('UNSIGNED')
    expect(wiringBadge(true, 'signed_primary')).toBe('SIGNED')
    expect(wiringBadge(false, 'none')).toBe('UNWIRED')
    expect(wiringBadge(true, 'none')).toBe('UNWIRED')
  })

  it('eastmoney 即使 wired=true 也不进 source_primary，K 线不进表', () => {
    const board = normalizeLakePanel({
      live_trading: false,
      markets: {
        US: {
          wired: true,
          source_primary: 'eastmoney_push2his',
          panel_id: 'panel_us@1',
          timezone: 'America/New_York',
          symbol_count: 1,
          row_count: 1,
          data_asof: '2026-10-29',
        },
        CN: {
          wired: true,
          source_primary: 'cnequity_local',
          panel_id: 'panel_cn@1',
          timezone: 'Asia/Shanghai',
          symbol_count: 1,
          row_count: 2,
          data_asof: '2026-10-29',
        },
      },
    }, {
      markets: {
        US: [{
          symbol: 'AAPL', market: 'US', date: '2026-10-29',
          open: 1, high: 1, low: 1, close: 1, volume: 9,
          source: 'eastmoney_push2his', ...gate,
        }],
        CN: [
          {
            symbol: '000001.SZ', market: 'CN', date: '2026-10-28',
            open: 10, high: 11, low: 9, close: 10.5, volume: 100,
            source: 'cnequity_local', ...gate, content_hash: 'h1',
          },
          {
            symbol: '600519.SH', market: 'CN', date: '2026-10-29',
            open: 20, high: 21, low: 19, close: 20.5, volume: 50,
            source: 'cnequity_local', ...gate, content_hash: 'h2', annual_vol_20d: null,
          },
          {
            symbol: 'BAD', market: 'CN', date: '2026-10-29',
            open: 1, high: 1, low: 1, close: 1, volume: 1,
            source: 'yfinance_cache', ...gate, content_hash: 'nope',
          },
        ],
      },
    })
    expect(board.markets.US.badge).toBe('UNSIGNED')
    expect(board.markets.US.source_primary).toBeNull()
    expect(board.markets.US.payload_source).toBe('eastmoney_push2his')
    expect(board.markets.US.rows).toEqual([])
    expect(board.markets.US.rows_omitted).toBe(1)
    expect(board.markets.CN.rows.map(row => row.symbol)).toEqual(['000001.SZ', '600519.SH'])
    expect(board.markets.CN.rows_omitted).toBe(1)
    expect(board.markets.CN.rows[0].annual_vol_20d).toBeNull()
    expect(board.markets.HK.badge).toBe('UNWIRED')
    expect(board.markets.HK.data_asof).toBeNull()
    expect(board.markets.HK.symbol_count).toBeNull()
    expect(board.markets.CRYPTO.rows).toEqual([])
    expect(board.markets.CRYPTO.data_asof).toBeNull()
  })

  it('缺拒闸字段的行不展示，也不补 0', () => {
    const board = normalizeLakePanel({
      live_trading: false,
      markets: {
        CN: { wired: true, source_primary: 'cnequity_local', symbol_count: 1, row_count: 1, timezone: 'Asia/Shanghai' },
      },
    }, {
      rows: [{ symbol: '000001.SZ', market: 'CN', date: '2026-10-29', open: 10, high: 11, low: 9, close: 10, volume: 1, source: 'cnequity_local' }],
    })
    expect(board.markets.CN.rows).toEqual([])
    expect(board.markets.CN.rows_omitted).toBe(1)
    expect(board.markets.CN.symbol_count).toBe(1)
  })
})

describe('loadLakePanel', () => {
  it('status 失败时抛错，bars 缺失不当成已接线', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('bars')) return { ok: false, status: 404, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => statusJson }
    })
    const board = await loadLakePanel(fetchImpl as unknown as typeof fetch)
    expect(board.markets.CN.badge).toBe('SIGNED')
    expect(board.markets.CN.rows).toEqual([])
    expect(board.markets.US.badge).toBe('UNWIRED')
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const failing = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    await expect(loadLakePanel(failing as unknown as typeof fetch)).rejects.toThrow(/HTTP 500/)
  })
})
