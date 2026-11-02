import { cn } from '@/lib/cn'
import {
  chipTitle,
  formatChangePct,
  formatLast,
  STRIP_COPY,
  type StripSlot,
} from '@/lib/barsToStrip'
import { VIEW_LABEL, type ResearchMarketCode } from '@/lib/researchMarket'

export function GainsStrip({
  market,
  slots,
  selected,
  onSelect,
}: {
  market: ResearchMarketCode
  slots: readonly StripSlot[]
  selected: string | null
  onSelect: (symbol: string) => void
}) {
  return (
    <section
      data-testid="gains-strip"
      data-market={market}
      data-order={slots.map(slot => slot.symbol).join(',')}
      className="rounded-card border border-border bg-surface/80 p-2"
    >
      <header className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <h2 className="font-mono text-[11px] font-semibold text-foreground">{market}</h2>
        <span className="text-[10px] text-secondary">{VIEW_LABEL[market]} · {STRIP_COPY.daily}</span>
        {market === 'CN' && (
          <span data-testid="adjust-note" className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted">
            {STRIP_COPY.unadjusted}
          </span>
        )}
        {market === 'CRYPTO' && (
          <span data-testid="quote-chip" className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted">
            quote {STRIP_COPY.quoteUsdt}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-1">
        {slots.map(slot => {
          const active = selected === slot.symbol
          const up = slot.change_pct != null && slot.change_pct > 0
          const down = slot.change_pct != null && slot.change_pct < 0
          return (
            <button
              key={slot.symbol}
              type="button"
              data-testid="gain-chip"
              data-market={market}
              data-symbol={slot.symbol}
              data-state={slot.state}
              data-sample={slot.sample ? '1' : '0'}
              data-role={slot.role}
              data-last={slot.last == null ? '' : String(slot.last)}
              data-change={slot.change_pct == null ? '' : String(slot.change_pct)}
              data-asof={slot.asof ?? ''}
              data-source={slot.source ?? ''}
              aria-pressed={active}
              title={chipTitle(slot)}
              onClick={() => onSelect(slot.symbol)}
              className={cn(
                'flex w-full items-center gap-1 rounded border px-1.5 py-1 text-left text-[10px]',
                active ? 'border-accent/50 bg-accent/10' : 'border-border/80 bg-base/40 hover:border-accent/30',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-foreground">{slot.name}</span>
                  {slot.sample && (
                    <span data-testid="sample-badge" className="shrink-0 rounded bg-amber-500/15 px-1 font-mono text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                      SAMPLE
                    </span>
                  )}
                  {slot.role === 'benchmark' && (
                    <span className="shrink-0 font-mono text-[9px] text-muted">benchmark</span>
                  )}
                </span>
                <span className="block font-mono text-muted">{slot.symbol}</span>
              </span>
              <span className="shrink-0 text-right font-mono">
                <span className="block text-foreground">{formatLast(slot.last)}</span>
                <span className={cn('block', up ? 'text-bull' : down ? 'text-bear' : 'text-muted')}>
                  {formatChangePct(slot.change_pct)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
