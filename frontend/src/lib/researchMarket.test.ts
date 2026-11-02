// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT } from '@/components/dashboard/registry'
import {
  CALENDAR_RULES,
  CN_ONLY_NAV_PATHS,
  FROZEN,
  FROZEN_DISPLAY,
  LAYERS,
  LIVE_TRADING,
  ORDERS,
  RESEARCH_MARKETS,
  SLEEVE_INCOME_ENABLED,
  WINDOW_MARKETS,
  investableBudgetRatio,
  isCnOnlyPath,
  navAllowed,
  parseResearchView,
  partitionMainBoard,
  researchMarketsEnabled,
} from './researchMarket'

describe('research market codes', () => {
  it('四市代码固定为 US|CN|CRYPTO|HK', () => {
    expect(RESEARCH_MARKETS).toEqual(['US', 'CN', 'CRYPTO', 'HK'])
  })

  it('解析视图：大小写归一，未知与 JP 回 GLOBAL', () => {
    expect(parseResearchView(null)).toBe('GLOBAL')
    expect(parseResearchView('')).toBe('GLOBAL')
    expect(parseResearchView(' us ')).toBe('US')
    expect(parseResearchView('crypto')).toBe('CRYPTO')
    expect(parseResearchView('HK')).toBe('HK')
    expect(parseResearchView('CN')).toBe('CN')
    expect(parseResearchView('JP')).toBe('GLOBAL')
    expect(parseResearchView('GLOBAL')).toBe('GLOBAL')
  })

  it('旗标默认开，显式 0/false 关闭', () => {
    expect(researchMarketsEnabled(undefined)).toBe(true)
    expect(researchMarketsEnabled('1')).toBe(true)
    expect(researchMarketsEnabled('0')).toBe(false)
    expect(researchMarketsEnabled('false')).toBe(false)
    expect(researchMarketsEnabled(false)).toBe(false)
  })
})

describe('user lock B frozen params', () => {
  it('35% / 10% / 1.5× / POV 保持冻结只读', () => {
    expect(FROZEN.max_asset_weight).toBe(0.35)
    expect(FROZEN.cash_cushion).toBe(0.10)
    expect(FROZEN.lot_mult).toBe(1.5)
    expect(FROZEN.pov_locked).toBe(true)
    expect(Object.isFrozen(FROZEN)).toBe(true)
    expect(FROZEN_DISPLAY).toEqual({
      max_asset_weight: '35%',
      cash_cushion: '10%',
      lot_mult: '1.5×',
      pov: 'POV',
    })
    expect(() => {
      ;(FROZEN as { cash_cushion: number }).cash_cushion = 0.2
    }).toThrow(TypeError)
  })

  it('LIVE OFF 且订单为空', () => {
    expect(LIVE_TRADING).toBe(false)
    expect(ORDERS).toEqual([])
    expect(Object.isFrozen(ORDERS)).toBe(true)
  })

  it('层内现金垫不是现金短债层，可投资预算为 90%', () => {
    expect(investableBudgetRatio()).toBeCloseTo(0.9)
    const cushion = LAYERS.find(layer => layer.id === 'cash_short')
    const emergency = LAYERS.find(layer => layer.id === 'emergency')
    expect(cushion?.name).toBe('现金短债')
    expect(cushion?.runs_inv_vol).toBe(false)
    expect(emergency?.in_investable_pool).toBe(false)
    expect(emergency?.runs_inv_vol).toBe(false)
    expect(LAYERS.find(layer => layer.id === 'core')?.runs_inv_vol).toBe(true)
  })

  it('再平衡窗不含 CRYPTO 法定窗，也不单列 JP', () => {
    expect(WINDOW_MARKETS).toEqual(['US', 'HK', 'CN'])
    expect(WINDOW_MARKETS).not.toContain('CRYPTO')
    expect(WINDOW_MARKETS).not.toContain('JP')
    expect(CALENDAR_RULES).toContain('CRYPTO 无独立窗')
    expect(SLEEVE_INCOME_ENABLED).toBe(false)
  })
})

describe('CN chrome gating', () => {
  it('连板 / 概念 / 复盘只在 CN 导航可见', () => {
    for (const path of CN_ONLY_NAV_PATHS) {
      expect(isCnOnlyPath(path)).toBe(true)
      expect(navAllowed(path, true, 'GLOBAL')).toBe(false)
      expect(navAllowed(path, true, 'US')).toBe(false)
      expect(navAllowed(path, true, 'CRYPTO')).toBe(false)
      expect(navAllowed(path, true, 'HK')).toBe(false)
      expect(navAllowed(path, true, 'CN')).toBe(true)
      expect(navAllowed(path, false, 'GLOBAL')).toBe(true)
    }
    expect(navAllowed('/watchlist', true, 'GLOBAL')).toBe(true)
    expect(navAllowed('/paper', true, 'US')).toBe(true)
    expect(navAllowed('/backtest', true, 'HK')).toBe(true)
    expect(isCnOnlyPath('/limit-ladder/extra')).toBe(true)
    expect(isCnOnlyPath('/')).toBe(false)
  })

  it('默认看板主网格拿掉涨停梯队和概念热力，其余仍在', () => {
    const { visible, hidden } = partitionMainBoard(DEFAULT_LAYOUT, true)
    expect(hidden.map(it => it.t).sort()).toEqual(['concept-rank', 'ladder'])
    expect(visible.map(it => it.t)).not.toContain('ladder')
    expect(visible.map(it => it.t)).not.toContain('concept-rank')
    expect(visible.map(it => it.t)).toEqual(
      DEFAULT_LAYOUT.map(it => it.t).filter(t => t !== 'ladder' && t !== 'concept-rank'),
    )
    expect(partitionMainBoard(DEFAULT_LAYOUT, false).hidden).toEqual([])
  })
})
