// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ResearchMarketProvider, useResearchView } from './useResearchMarket'

let root: Root | null = null
let host: HTMLDivElement | null = null

function Probe() {
  const api = useResearchView()
  const location = useLocation()
  return (
    <div>
      <div data-testid="loc">{location.search}</div>
      <div data-testid="view">{api.view}</div>
      <div data-testid="symbol">{api.symbol ?? ''}</div>
      <button type="button" data-testid="to-crypto" onClick={() => api.setView('CRYPTO')}>crypto</button>
      <button type="button" data-testid="pick-eth" onClick={() => api.setSymbol('ETH-USDT')}>eth</button>
      <button type="button" data-testid="open-maotai" onClick={() => api.setView('CN', '600519.SH')}>maotai</button>
    </div>
  )
}

function render(entry: string) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(
      <MemoryRouter initialEntries={[entry]}>
        <ResearchMarketProvider>
          <Routes>
            <Route path="*" element={<Probe />} />
          </Routes>
        </ResearchMarketProvider>
      </MemoryRouter>,
    )
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  sessionStorage.clear()
})

describe('research symbol query', () => {
  it('深链读出 market 与 symbol，切市清掉上一市代码', () => {
    const el = render('/?market=CN&symbol=600519.SH')
    expect(el.querySelector('[data-testid="view"]')?.textContent).toBe('CN')
    expect(el.querySelector('[data-testid="symbol"]')?.textContent).toBe('600519.SH')
    act(() => {
      (el.querySelector('[data-testid="to-crypto"]') as HTMLButtonElement).click()
    })
    expect(el.querySelector('[data-testid="view"]')?.textContent).toBe('CRYPTO')
    expect(el.querySelector('[data-testid="symbol"]')?.textContent).toBe('')
    expect(el.querySelector('[data-testid="loc"]')?.textContent).not.toContain('600519.SH')
    act(() => {
      (el.querySelector('[data-testid="pick-eth"]') as HTMLButtonElement).click()
    })
    expect(el.querySelector('[data-testid="symbol"]')?.textContent).toBe('ETH-USDT')
    act(() => {
      (el.querySelector('[data-testid="open-maotai"]') as HTMLButtonElement).click()
    })
    expect(el.querySelector('[data-testid="view"]')?.textContent).toBe('CN')
    expect(el.querySelector('[data-testid="symbol"]')?.textContent).toBe('600519.SH')
    expect(el.querySelector('[data-testid="loc"]')?.textContent).toContain('market=CN')
    expect(el.querySelector('[data-testid="loc"]')?.textContent).toContain('symbol=600519.SH')
  })
})
