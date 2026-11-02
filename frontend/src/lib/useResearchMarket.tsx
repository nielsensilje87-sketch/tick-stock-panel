import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  parseResearchView,
  researchMarketsEnabled,
  type ResearchView,
} from './researchMarket'

const STORAGE_KEY = 'dsh.research.market'

export interface ResearchMarketApi {
  enabled: boolean
  view: ResearchView
  /** `?symbol=` 原文。是否落在当前宇宙由涨幅条自己判断。 */
  symbol: string | null
  /**
   * 第二个参数省略或空时清掉 symbol。
   * 切市不沿用上一市代码，避免 000001.SZ 留在 CRYPTO 的查询串里。
   */
  setView: (next: ResearchView, symbol?: string | null) => void
  setSymbol: (symbol: string | null) => void
}

const DISABLED: ResearchMarketApi = {
  enabled: false,
  view: 'GLOBAL',
  symbol: null,
  setView: () => {},
  setSymbol: () => {},
}

const ResearchMarketContext = createContext<ResearchMarketApi | null>(null)

function readStoredView(): ResearchView {
  try {
    return parseResearchView(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return 'GLOBAL'
  }
}

function writeStoredView(view: ResearchView) {
  try {
    sessionStorage.setItem(STORAGE_KEY, view)
  } catch {
    // 隐私模式写不进 session 时，仍以 URL 为准。
  }
}

/**
 * URL `?market=` 优先，否则用本次会话记住的视图，再否则 GLOBAL。
 * 只写查询参数，不碰偏好、纸面账户或冻结参数。
 */
export function useResearchMarket(): ResearchMarketApi {
  const enabled = researchMarketsEnabled()
  const [params, setParams] = useSearchParams()
  const urlRaw = params.get('market')
  const symbolRaw = params.get('symbol')
  const view = enabled ? (urlRaw ? parseResearchView(urlRaw) : readStoredView()) : 'GLOBAL'
  const symbol = enabled && symbolRaw && symbolRaw.trim() ? symbolRaw.trim() : null

  useEffect(() => {
    if (!enabled || !urlRaw) return
    const parsed = parseResearchView(urlRaw)
    writeStoredView(parsed)
    if (urlRaw !== parsed) {
      const next = new URLSearchParams(params)
      next.set('market', parsed)
      setParams(next, { replace: true })
    }
  }, [enabled, urlRaw, params, setParams])

  const setSymbol = useCallback((next: string | null) => {
    if (!enabled) return
    const q = new URLSearchParams(params)
    if (next && next.trim()) q.set('symbol', next.trim())
    else q.delete('symbol')
    setParams(q, { replace: true })
  }, [enabled, params, setParams])

  const setView = useCallback((next: ResearchView, nextSymbol?: string | null) => {
    if (!enabled) return
    const parsed = parseResearchView(next)
    writeStoredView(parsed)
    const q = new URLSearchParams(params)
    q.set('market', parsed)
    if (nextSymbol && nextSymbol.trim()) q.set('symbol', nextSymbol.trim())
    else q.delete('symbol')
    setParams(q, { replace: true })
  }, [enabled, params, setParams])

  return { enabled, view, symbol, setView, setSymbol }
}

export function ResearchMarketProvider({ children }: { children: ReactNode }) {
  const api = useResearchMarket()
  return <ResearchMarketContext.Provider value={api}>{children}</ResearchMarketContext.Provider>
}

/** 壳层之外的页面读取同一视图。没有 Provider 时视为旗标关闭，看板保持原样。 */
export function useResearchView(): ResearchMarketApi {
  return useContext(ResearchMarketContext) ?? DISABLED
}
