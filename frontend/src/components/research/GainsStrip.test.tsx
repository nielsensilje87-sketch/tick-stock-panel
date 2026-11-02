// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import barsJson from '../../../public/dsh-lake-panel-bars.json'
import statusJson from '../../../public/dsh-lake-panel-status.json'
import { STRIP_COPY } from '@/lib/barsToStrip'
import { normalizeLakePanel } from '@/lib/lakePanel'
import { MAJORS_BY_MARKET } from '@/lib/majorsUniverse'
import { LIVE_TRADING, ORDERS } from '@/lib/researchMarket'
import { MarketTape } from './MarketTape'

const board = normalizeLakePanel(statusJson, barsJson)

let root: Root | null = null
let host: HTMLDivElement | null = null

function render(node: React.ReactNode) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(node)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
})

function symbols(el: ParentNode, market: string): string[] {
  return [...el.querySelectorAll(`[data-testid="gain-chip"][data-market="${market}"]`)].map(node => node.getAttribute('data-symbol') ?? '')
}

describe('market tape', () => {
  it('CN 条保持宇宙序，SAMPLE 只在三只有价样本上，点指数不画烛', () => {
    function Harness() {
      const [symbol, setSymbol] = useState<string | null>(null)
      return (
        <MarketTape
          code="CN"
          board={board}
          boardState="ready"
          showChart
          selectedSymbol={symbol}
          onSelectSymbol={setSymbol}
        />
      )
    }
    const el = render(<Harness />)
    expect(symbols(el, 'CN')).toEqual(MAJORS_BY_MARKET.CN.map(entry => entry.symbol))
    expect(el.querySelector('[data-testid="adjust-note"]')?.textContent).toContain(STRIP_COPY.unadjusted)
    const filled = ['600519.SH', '000001.SZ', '600000.SH']
    for (const symbol of filled) {
      const chip = el.querySelector(`[data-testid="gain-chip"][data-symbol="${symbol}"]`)
      expect(chip?.getAttribute('data-state')).toBe('FILLED')
      expect(chip?.getAttribute('data-sample')).toBe('1')
      expect(chip?.textContent).toContain('SAMPLE')
      expect(chip?.getAttribute('data-last')).not.toBe('')
    }
    expect(el.querySelector('[data-symbol="600519.SH"]')?.textContent).toContain('+1.75%')
    expect(el.querySelector('[data-symbol="000001.SZ"]')?.textContent).toContain('+2.03%')
    expect(el.querySelector('[data-symbol="600000.SH"]')?.textContent).toContain('+1.42%')
    const index = el.querySelector('[data-testid="gain-chip"][data-symbol="000300.SH"]')
    expect(index?.getAttribute('data-state')).toBe('EMPTY_PENDING_INGEST')
    expect(index?.getAttribute('data-last')).toBe('')
    expect(index?.getAttribute('data-change')).toBe('')
    expect(index?.textContent).toContain('—')
    expect(index?.getAttribute('title')).toBe(STRIP_COPY.pending)
    const sh = el.querySelector('[data-symbol="000001.SH"]')
    const sz = el.querySelector('[data-symbol="000001.SZ"]')
    expect(sh?.textContent).toContain('上证指数')
    expect(sh?.textContent).toContain('000001.SH')
    expect(sz?.textContent).toContain('平安银行')
    expect(sz?.textContent).toContain('000001.SZ')

    const chart = el.querySelector('[data-testid="chart-pane"]')
    expect(chart?.getAttribute('data-symbol')).toBe('600519.SH')
    expect(chart?.getAttribute('data-candles')).toBe('40')
    expect(chart?.getAttribute('data-timeframe')).toBe('1d')
    expect(chart?.getAttribute('data-chart-lib')).toBe('lightweight-charts')
    expect(el.querySelector('[data-testid="daily-candles"]')).not.toBeNull()
    expect(el.querySelector('[data-testid="ohlcv-table"]')).not.toBeNull()
    expect(el.textContent).not.toContain('下单')
    expect(LIVE_TRADING).toBe(false)
    expect(ORDERS).toEqual([])

    act(() => {
      (index as HTMLButtonElement).click()
    })
    expect(el.querySelector('[data-testid="chart-pane"]')?.getAttribute('data-symbol')).toBe('000300.SH')
    expect(el.querySelector('[data-testid="chart-pane"]')?.getAttribute('data-candles')).toBe('0')
    expect(el.querySelector('[data-testid="chart-empty"]')?.textContent).toBe(STRIP_COPY.pending)
    expect(el.querySelector('[data-testid="daily-candles"]')).toBeNull()
    expect(symbols(el, 'CN')).toEqual(MAJORS_BY_MARKET.CN.map(entry => entry.symbol))
  })

  it('CRYPTO 默认 BTC，SOL 占位，计价 USDT；US 整条空且无蜡烛', () => {
    const onSelect = vi.fn()
    const crypto = render(
      <MarketTape
        code="CRYPTO"
        board={board}
        boardState="ready"
        showChart
        selectedSymbol={null}
        onSelectSymbol={onSelect}
      />,
    )
    expect(symbols(crypto, 'CRYPTO')).toEqual(MAJORS_BY_MARKET.CRYPTO.map(entry => entry.symbol))
    expect(crypto.querySelector('[data-testid="quote-chip"]')?.textContent).toContain('USDT')
    expect(crypto.querySelector('[data-symbol="BTC-USDT"]')?.textContent).toContain('benchmark')
    expect(crypto.querySelector('[data-symbol="BTC-USDT"]')?.textContent).toContain('SAMPLE')
    expect(crypto.querySelector('[data-symbol="BTC-USDT"]')?.textContent).toContain('0.00%')
    expect(crypto.querySelector('[data-symbol="ETH-USDT"]')?.textContent).toContain('-0.51%')
    expect(crypto.querySelector('[data-symbol="SOL-USDT"]')?.getAttribute('data-state')).toBe('EMPTY_PENDING_INGEST')
    expect(crypto.querySelector('[data-testid="chart-pane"]')?.getAttribute('data-symbol')).toBe('BTC-USDT')
    expect(crypto.querySelector('[data-testid="chart-pane"]')?.getAttribute('data-candles')).toBe('29')
    act(() => root?.unmount())

    const us = render(
      <MarketTape
        code="US"
        board={board}
        boardState="ready"
        showChart
        selectedSymbol="AAPL"
        onSelectSymbol={vi.fn()}
      />,
    )
    expect(symbols(us, 'US')).toEqual(['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'])
    expect(us.querySelector('[data-testid="chart-empty"]')?.textContent).toBe(STRIP_COPY.unwired)
    expect(us.querySelector('[data-testid="chart-pane"]')?.getAttribute('data-candles')).toBe('0')
    expect(us.querySelector('[data-testid="daily-candles"]')).toBeNull()
    expect(us.querySelector('[data-testid="sample-badge"]')).toBeNull()
    expect(us.textContent).not.toContain('600519.SH')
    expect(us.textContent).not.toContain('80554.4')
  })
})
