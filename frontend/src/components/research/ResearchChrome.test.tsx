// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import statusJson from '../../../public/dsh-lake-panel-status.json'
import { normalizeLakePanel } from '@/lib/lakePanel'
import { LakeMarketSection } from './LakeBoard'
import {
  AllocationResearch,
  CnOnlyDrawer,
  GlobalHome,
  MarketDesk,
  MarketSwitch,
} from './ResearchChrome'

const signedBoard = normalizeLakePanel(statusJson, null)

const FORBIDDEN_ON_GLOBAL = ['连板', '涨停梯队', '龙虎榜', '炸板', '一字板', '北向', '应用到全球', '下单']

let root: Root | null = null
let host: HTMLDivElement | null = null

function render(node: React.ReactNode) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<MemoryRouter>{node}</MemoryRouter>)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
})

describe('global home', () => {
  it('四市卡片与配置字段在，A 股投机词不在', () => {
    const onOpen = vi.fn()
    const el = render(<GlobalHome onOpenMarket={onOpen} />)
    const text = el.textContent ?? ''
    for (const code of ['US', 'CN', 'CRYPTO', 'HK']) expect(text).toContain(code)
    expect(text).toContain('panel_us@1')
    expect(text).toContain('panel_cn@1')
    expect(text).toContain('panel_crypto@1')
    expect(text).toContain('panel_hk@1')
    expect(text).toContain('America/New_York')
    expect(text).toContain('Asia/Shanghai')
    expect(text).toContain('UTC')
    expect(text).toContain('Asia/Hong_Kong')
    expect(text).toContain('无独立窗')
    expect(text).toContain('35%')
    expect(text).toContain('10%')
    expect(text).toContain('1.5×')
    expect(text).toContain('POV')
    expect(text).toContain('层内现金垫')
    expect(text).toContain('现金短债')
    expect(text).toContain('再平衡窗')
    expect(text).toContain('live_trading=false')
    expect(text).toContain('orders=[]')
    expect(text).toContain('fill_underweight_layers')
    for (const word of FORBIDDEN_ON_GLOBAL) expect(text).not.toContain(word)

    const cushion = el.querySelector('[data-field="cash_cushion"]')
    const shortCash = el.querySelector('[data-layer-id="cash_short"]')
    expect(cushion).not.toBeNull()
    expect(shortCash).not.toBeNull()
    expect(cushion!.contains(shortCash)).toBe(false)
    expect(el.querySelector('[data-window-market="CRYPTO"]')).toBeNull()
    expect(el.querySelector('[data-window-market="JP"]')).toBeNull()
    expect(el.querySelectorAll('input, textarea, select')).toHaveLength(0)

    const cn = el.querySelector('[data-testid="market-card"][data-market="CN"]') as HTMLButtonElement
    act(() => cn.click())
    expect(onOpen).toHaveBeenCalledWith('CN')
  })

  it('签版 status 四市并排，eastmoney 不占 source_primary，成交量不加总', () => {
    const el = render(<GlobalHome onOpenMarket={vi.fn()} board={signedBoard} boardState="ready" />)
    const text = el.textContent ?? ''
    expect(el.querySelector('[data-view-id="global_overview@1"]')).not.toBeNull()
    expect(text).toContain('cnequity_local')
    expect(text).toContain('okx_public_candles_1d')
    expect(text).toContain('BARS_EMPTY · UNSIGNED · no primary')
    expect(text).toContain('unwired')
    expect(text).toContain('120')
    expect(text).toContain('58')
    expect(text).not.toContain('178')
    expect(el.querySelector('[data-testid="market-card"][data-market="CN"]')?.getAttribute('data-wiring')).toBe('SIGNED')
    expect(el.querySelector('[data-testid="market-card"][data-market="CRYPTO"]')?.getAttribute('data-source-primary')).toBe('okx_public_candles_1d')
    expect(el.querySelector('[data-testid="market-card"][data-market="US"]')?.getAttribute('data-wiring')).toBe('UNWIRED')
    expect(el.querySelector('[data-testid="market-card"][data-market="US"]')?.getAttribute('data-source-primary')).toBe('')
    expect(el.querySelector('[data-testid="market-card"][data-market="HK"]')?.getAttribute('data-symbol-count')).toBe('')
    expect(el.querySelector('[data-testid="ohlcv-table"]')).toBeNull()
    expect(el.querySelector('[data-testid="ohlcv-row"]')).toBeNull()
    const primaries = [...el.querySelectorAll('[data-source-primary]')].map(node => node.getAttribute('data-source-primary') ?? '')
    expect(primaries).toContain('cnequity_local')
    expect(primaries).toContain('okx_public_candles_1d')
    expect(primaries.join(' ')).not.toMatch(/eastmoney|yfinance|quarantine/i)
    for (const word of FORBIDDEN_ON_GLOBAL) expect(text).not.toContain(word)
    expect(el.querySelectorAll('[data-testid="global-summary-row"]')).toHaveLength(4)
    expect(el.querySelectorAll('input, textarea, select')).toHaveLength(0)
  })

  it('UNSIGNED eastmoney 与签版 primary 用不同徽章，且不锁成 source_primary', () => {
    const board = normalizeLakePanel({
      live_trading: true,
      orders: [{ id: 1 }],
      markets: {
        US: { wired: true, source_primary: 'eastmoney_push2his', symbol_count: 4, row_count: 10, data_asof: '2026-10-01', timezone: 'America/New_York' },
        HK: { wired: true, source_primary: 'eastmoney_push2his', symbol_count: 2, row_count: 2, timezone: 'Asia/Hong_Kong' },
      },
    }, {
      markets: {
        US: [{
          symbol: 'AAPL', market: 'US', date: '2026-10-01', open: 1, high: 1, low: 1, close: 1, volume: 5,
          source: 'eastmoney_push2his', data_version: 'x', timezone: 'America/New_York', asof_utc: '2026-10-01T20:00:00Z', content_hash: 'e',
        }],
      },
    })
    const el = render(<GlobalHome onOpenMarket={vi.fn()} board={board} boardState="ready" />)
    const us = el.querySelector('[data-testid="market-card"][data-market="US"]')
    expect(us?.getAttribute('data-wiring')).toBe('UNSIGNED')
    expect(us?.getAttribute('data-source-primary')).toBe('')
    expect(us?.getAttribute('data-payload-source')).toBe('eastmoney_push2his')
    expect(us?.textContent).toContain('not-catalog-primary')
    expect(el.querySelector('[data-testid="live-file-mismatch"]')).not.toBeNull()
    expect(el.textContent).toContain('live_trading=false')
    expect(el.textContent).toContain('orders=[]')
    expect(el.querySelector('[data-testid="ohlcv-row"]')).toBeNull()
  })
})

describe('market switch and desks', () => {
  it('切换按钮使用 US|CN|CRYPTO|HK|GLOBAL', () => {
    const onChange = vi.fn()
    const el = render(<MarketSwitch view="GLOBAL" onChange={onChange} />)
    const codes = [...el.querySelectorAll('[data-market]')].map(n => n.getAttribute('data-market'))
    expect(codes).toEqual(['GLOBAL', 'US', 'CN', 'CRYPTO', 'HK'])
    const hk = el.querySelector('[data-market="HK"]') as HTMLButtonElement
    act(() => hk.click())
    expect(onChange).toHaveBeenCalledWith('HK')
  })

  it('非 CN 工作台不渲染 A 股抽屉', () => {
    const el = render(<MarketDesk code="CRYPTO" />)
    expect(el.querySelector('[data-market="CRYPTO"]')).not.toBeNull()
    expect(el.textContent).toContain('UTC')
    expect(el.textContent).toContain('无独立窗')
    expect(el.querySelector('[data-testid="cn-only-drawer"]')).toBeNull()
    expect(el.textContent).not.toContain('连板')
    expect(el.querySelectorAll('input, textarea, select')).toHaveLength(0)
  })

  it('已签市场展示全部过闸行，未接线市场不借用这些行', () => {
    const board = normalizeLakePanel(statusJson, {
      markets: {
        CN: [
          {
            symbol: '000001.SZ', market: 'CN', date: '2026-10-28', open: 10, high: 11, low: 9.5, close: 10.5, volume: 1000,
            source: 'cnequity_local', data_version: 'r2', timezone: 'Asia/Shanghai', asof_utc: '2026-10-28T07:00:00Z', content_hash: 'a',
          },
          {
            symbol: '600000.SH', market: 'CN', date: '2026-10-29', open: 8, high: 8.2, low: 7.9, close: 8.1, volume: 2000,
            source: 'cnequity_local', data_version: 'r2', timezone: 'Asia/Shanghai', asof_utc: '2026-10-29T07:00:00Z', content_hash: 'b',
          },
        ],
        US: [{
          symbol: 'AAPL', market: 'US', date: '2026-10-29', open: 1, high: 1, low: 1, close: 1, volume: 3,
          source: 'cnequity_local', data_version: 'r2', timezone: 'America/New_York', asof_utc: '2026-10-29T20:00:00Z', content_hash: 'c',
        }],
      },
    })
    const cn = render(<LakeMarketSection code="CN" board={board} boardState="ready" />)
    const rows = [...cn.querySelectorAll('[data-testid="ohlcv-row"]')]
    expect(rows.map(row => row.getAttribute('data-symbol'))).toEqual(['000001.SZ', '600000.SH'])
    expect(cn.textContent).toContain('10.5')
    expect(cn.textContent).toContain('8.1')
    expect(cn.textContent).toContain('annual_vol_20d — · 未接线')
    expect(cn.textContent).toContain('weights（含 CASH）— · 未接线')
    expect(cn.textContent).not.toContain('AAPL')
    expect(cn.textContent).not.toContain('连板')
    act(() => root?.unmount())

    const us = render(<MarketDesk code="US" board={board} boardState="ready" />)
    expect(us.querySelector('[data-testid="ohlcv-table"]')).toBeNull()
    expect(us.querySelector('[data-testid="ohlcv-empty"]')?.textContent).toContain('未接线')
    expect(us.textContent).not.toContain('000001.SZ')
    expect(us.textContent).not.toContain('AAPL')
    expect(us.textContent).not.toContain('连板')
  })

  it('CN 抽屉默认收起，且没有应用到全球', () => {
    const el = render(<CnOnlyDrawer />)
    const details = el.querySelector('details')
    expect(details).not.toBeNull()
    expect(details!.open).toBe(false)
    expect(el.textContent).toContain('连板梯队')
    expect(el.textContent).toContain('龙虎榜')
    expect(el.textContent).not.toContain('应用到全球')
    expect(el.textContent).not.toContain('炸板')
    expect(el.textContent).not.toContain('一字板')
  })

  it('配置区重复挂载时仍无表单控件', () => {
    const el = render(<AllocationResearch />)
    expect(el.querySelector('[data-live-trading="false"]')).not.toBeNull()
    expect(el.querySelector('[data-orders="0"]')).not.toBeNull()
    expect(el.querySelectorAll('input, textarea, select, [role="switch"]')).toHaveLength(0)
  })
})
