import { useEffect, useRef } from 'react'
import {
  candlesForSlot,
  chartEmptyCopy,
  STRIP_COPY,
  type DailyCandle,
  type StripSlot,
} from '@/lib/barsToStrip'
import { useChartTheme } from '@/lib/theme'
import type { ResearchMarketCode } from '@/lib/researchMarket'

const BULL = '#F04438'
const BEAR = '#12B76A'

function DailyCandles({ candles }: { candles: readonly DailyCandle[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ct = useChartTheme()
  const signature = candles.map(bar => `${bar.time}:${bar.open}:${bar.high}:${bar.low}:${bar.close}`).join('|')

  useEffect(() => {
    const el = containerRef.current
    if (!el || candles.length === 0) return
    let dead = false
    let remove = () => {}
    const snapshot = candles
    void import('lightweight-charts').then(mod => {
      if (dead) return
      try {
        const chart = mod.createChart(el, {
          width: el.clientWidth || 640,
          height: 320,
          layout: {
            attributionLogo: false,
            background: { color: 'transparent' },
            textColor: ct.text,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: ct.grid },
            horzLines: { color: ct.grid },
          },
          rightPriceScale: { borderColor: ct.border },
          timeScale: { borderColor: ct.border, timeVisible: false, secondsVisible: false },
        })
        const series = chart.addCandlestickSeries({
          upColor: BULL,
          downColor: BEAR,
          borderUpColor: BULL,
          borderDownColor: BEAR,
          wickUpColor: BULL,
          wickDownColor: BEAR,
          priceLineVisible: false,
        })
        series.setData(snapshot.map(bar => ({
          time: bar.time as never,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        })))
        chart.timeScale().fitContent()
        let ro: ResizeObserver | null = null
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            chart.applyOptions({ width: el.clientWidth || 640 })
          })
          ro.observe(el)
        }
        remove = () => {
          ro?.disconnect()
          chart.remove()
        }
      } catch {
        // 库挂载失败时不补假蜡烛。
      }
    }).catch(() => {
      // 动态导入失败同样不补假蜡烛。
    })
    return () => {
      dead = true
      remove()
    }
    // signature 已覆盖 OHLCV；不要把 candles 数组身份放进依赖，否则父级重渲染会拆掉图表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ct.text, ct.grid, ct.border])

  return <div ref={containerRef} data-testid="daily-candles" className="mt-2 h-[320px] w-full" />
}

export function ChartPane({
  market,
  slots,
  slot,
}: {
  market: ResearchMarketCode
  slots: readonly StripSlot[]
  slot: StripSlot | null
}) {
  const candles = candlesForSlot(slot)
  const empty = candles.length === 0
  const state = slot?.state ?? (slots.every(item => item.state === 'UNWIRED') ? 'UNWIRED' : 'EMPTY_PENDING_INGEST')
  return (
    <section
      data-testid="chart-pane"
      data-market={market}
      data-symbol={slot?.symbol ?? ''}
      data-state={state}
      data-candles={String(candles.length)}
      data-timeframe="1d"
      data-chart-lib="lightweight-charts"
      className="rounded-card border border-border bg-surface/80 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{STRIP_COPY.daily}</h2>
        {slot && <span className="font-mono text-[11px] text-foreground">{slot.symbol}</span>}
        {slot && <span className="text-[11px] text-secondary">{slot.name}</span>}
        {slot?.sample && (
          <span data-testid="sample-badge" className="rounded bg-amber-500/15 px-1 font-mono text-[9px] font-semibold text-amber-700 dark:text-amber-300">
            SAMPLE
          </span>
        )}
        {market === 'CN' && (
          <span data-testid="adjust-note" className="font-mono text-[10px] text-muted">{STRIP_COPY.unadjusted}</span>
        )}
        {market === 'CRYPTO' && (
          <span data-testid="quote-chip" className="font-mono text-[10px] text-muted">quote {STRIP_COPY.quoteUsdt}</span>
        )}
        <span className="font-mono text-[10px] text-muted">lightweight-charts</span>
      </div>
      {empty ? (
        <p data-testid="chart-empty" className="mt-2 text-[11px] leading-relaxed text-secondary">
          {chartEmptyCopy(slots, slot)}
        </p>
      ) : (
        <DailyCandles candles={candles} />
      )}
    </section>
  )
}
