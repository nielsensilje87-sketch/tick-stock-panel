// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AllocationResearch,
  CnOnlyDrawer,
  GlobalHome,
  MarketDesk,
  MarketSwitch,
} from './ResearchChrome'

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
