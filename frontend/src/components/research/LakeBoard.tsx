import type { ReactNode } from 'react'
import {
  resolveLakeModels,
  type LakeBarRow,
  type LakeBoard,
  type LakeBoardState,
  type MarketCardModel,
} from '@/lib/lakePanel'
import { VIEW_LABEL, type ResearchMarketCode } from '@/lib/researchMarket'
import { cn } from '@/lib/cn'

export interface LakeViewProps {
  board?: LakeBoard | null
  boardState?: LakeBoardState
  boardError?: string | null
}

function countText(value: number | null): string {
  return value == null ? '—' : String(value)
}

function Badge({ model }: { model: MarketCardModel }) {
  const tone = model.badge === 'SIGNED'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : model.badge === 'UNSIGNED'
      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-border bg-elevated text-muted'
  return (
    <span
      data-testid="source-badge"
      data-wiring={model.badge}
      data-catalog={model.catalog}
      className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-semibold', tone)}
    >
      {model.badge === 'UNSIGNED' ? 'UNSIGNED · not-catalog-primary' : model.badge}
    </span>
  )
}

function SourceValue({ model }: { model: MarketCardModel }) {
  if (model.source_primary) return <span className="text-foreground">{model.source_primary}</span>
  return <span>—</span>
}

export function MarketSummaryCard({
  model,
  onOpen,
}: {
  model: MarketCardModel
  onOpen: (code: ResearchMarketCode) => void
}) {
  return (
    <button
      type="button"
      data-testid="market-card"
      data-market={model.market}
      data-wiring={model.badge}
      data-catalog={model.catalog}
      data-source-primary={model.source_primary ?? ''}
      data-payload-source={model.payload_source ?? ''}
      data-symbol-count={model.symbol_count ?? ''}
      data-row-count={model.row_count ?? ''}
      onClick={() => onOpen(model.market)}
      className="rounded-card border border-border bg-surface/80 p-3 text-left transition-colors hover:border-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">{model.market}</span>
        <span className="text-[11px] text-secondary">{VIEW_LABEL[model.market]}</span>
      </div>
      <div className="mt-2">
        <Badge model={model} />
      </div>
      <dl className="mt-2 space-y-1 font-mono text-[10px] text-secondary">
        <Fact k="panel_id" v={model.panel_id} />
        <Fact k="wired" v={model.wired_payload == null ? '—' : String(model.wired_payload)} />
        <Fact k="signed" v={model.signed ? 'yes' : 'no'} />
        <Fact k="symbol_count" v={countText(model.symbol_count)} />
        <Fact k="row_count" v={countText(model.row_count)} />
        <Fact k="data_asof" v={model.data_asof ?? '—'} />
        <Fact k="timezone" v={model.timezone} />
        <Fact k="source_primary" v={<SourceValue model={model} />} />
        {model.payload_source && (
          <Fact k="payload_source" v={<span className="text-amber-700 dark:text-amber-300">{model.payload_source}</span>} />
        )}
        <Fact
          k="alert_count"
          v={model.alert_count == null ? '— · placeholder' : String(model.alert_count)}
        />
        <Fact k="window" v={`${model.windowNote} · ${model.window_flag ?? 'window_flag 未接线'}`} />
      </dl>
      {model.reason && (
        <p data-testid="empty-reason" className="mt-2 text-[10px] leading-relaxed text-muted">
          {model.reason}
        </p>
      )}
      <div className="mt-2 text-[10px] text-muted">LIVE OFF · 进入该市</div>
    </button>
  )
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0 break-all text-right text-foreground">{v}</dd>
    </div>
  )
}

export function GlobalSummaryTable({
  models,
  onOpen,
}: {
  models: MarketCardModel[]
  onOpen: (code: ResearchMarketCode) => void
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table data-testid="global-summary" className="w-full min-w-[760px] border-collapse text-left text-[11px]">
        <caption className="mb-1 text-left text-[10px] text-muted">
          分市一行。不加总成交量，也不做跨市排序。
        </caption>
        <thead>
          <tr className="text-muted">
            <th className="py-1 pr-2 font-medium">market</th>
            <th className="py-1 pr-2 font-medium">wiring</th>
            <th className="py-1 pr-2 font-medium">symbol_count</th>
            <th className="py-1 pr-2 font-medium">row_count</th>
            <th className="py-1 pr-2 font-medium">panel_id</th>
            <th className="py-1 pr-2 font-medium">data_asof</th>
            <th className="py-1 pr-2 font-medium">timezone</th>
            <th className="py-1 pr-2 font-medium">source_primary</th>
            <th className="py-1 pr-2 font-medium">alert_count</th>
            <th className="py-1 font-medium">window_flag</th>
          </tr>
        </thead>
        <tbody>
          {models.map(model => (
            <tr
              key={model.market}
              data-testid="global-summary-row"
              data-market={model.market}
              data-source-primary={model.source_primary ?? ''}
              onClick={() => onOpen(model.market)}
              className="cursor-pointer border-t border-border/50 text-secondary hover:bg-elevated/40"
            >
              <td className="py-1 pr-2 font-mono text-foreground">{model.market}</td>
              <td className="py-1 pr-2"><Badge model={model} /></td>
              <td className="py-1 pr-2 font-mono">{countText(model.symbol_count)}</td>
              <td className="py-1 pr-2 font-mono">{countText(model.row_count)}</td>
              <td className="py-1 pr-2 font-mono">{model.panel_id}</td>
              <td className="py-1 pr-2 font-mono">{model.data_asof ?? '—'}</td>
              <td className="py-1 pr-2 font-mono">{model.timezone}</td>
              <td className="py-1 pr-2 font-mono">{model.source_primary ?? '—'}</td>
              <td className="py-1 pr-2 font-mono">{model.alert_count == null ? '— · placeholder' : model.alert_count}</td>
              <td className="py-1 font-mono">{model.window_flag ?? '未接线'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function emptyCopy(model: MarketCardModel): string {
  if (model.badge === 'UNSIGNED') {
    return `UNSIGNED · not-catalog-primary。payload 源 ${model.payload_source ?? '—'} 不是 source_primary，K 线不展示。`
  }
  if (model.badge === 'SIGNED') {
    const counts = `已签。symbol_count=${countText(model.symbol_count)} · row_count=${countText(model.row_count)}。`
    if (model.rows_omitted > 0) {
      return `${counts}载荷里的行没有通过拒闸（source / data_version / timezone / asof_utc / content_hash），不展示这些价格。`
    }
    return `${counts}OHLCV 行未附在面板载荷，不编造价格。`
  }
  const why = model.reason ? `${model.reason}。` : ''
  return `未接线。${why}不使用其他市场的行情填空。`
}

function hasNumber(rows: LakeBarRow[], key: 'amount' | 'annual_vol_20d' | 'weight'): boolean {
  return rows.some(row => row[key] != null)
}

function num(value: number | null): string {
  return value == null ? '—' : String(value)
}

export function LakeMarketSection({ code, board, boardState = 'unloaded', boardError = null }: { code: ResearchMarketCode } & LakeViewProps) {
  const { models } = resolveLakeModels(board, boardState, boardError)
  const model = models.find(item => item.market === code) ?? models[0]
  const showVol = hasNumber(model.rows, 'annual_vol_20d')
  const showWeight = hasNumber(model.rows, 'weight')
  const showAmount = hasNumber(model.rows, 'amount')
  return (
    <section data-testid="lake-market" data-market={code} className="rounded-card border border-border bg-surface/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">行情主表</h2>
        <Badge model={model} />
        <span className="font-mono text-[10px] text-muted">{model.panel_id} · {model.timezone}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-secondary">
        symbol_count {countText(model.symbol_count)} · row_count {countText(model.row_count)} · data_asof {model.data_asof ?? '—'} · source_primary {model.source_primary ?? '—'}
      </p>
      {model.rows.length > 0 ? (
        <div className="mt-2 overflow-x-auto">
          <table data-testid="ohlcv-table" data-market={code} className="w-full min-w-[880px] border-collapse text-left font-mono text-[10px]">
            <caption className="mb-1 text-left text-muted">
              本市场 {model.rows.length} 行
              {model.row_count != null && model.rows.length !== model.row_count ? ` · status row_count=${model.row_count}` : ''}
              。只含 {code}。
            </caption>
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-2 font-medium">symbol</th>
                <th className="py-1 pr-2 font-medium">date</th>
                <th className="py-1 pr-2 font-medium">open</th>
                <th className="py-1 pr-2 font-medium">high</th>
                <th className="py-1 pr-2 font-medium">low</th>
                <th className="py-1 pr-2 font-medium">close</th>
                <th className="py-1 pr-2 font-medium">volume</th>
                <th className="py-1 pr-2 font-medium">market</th>
                <th className="py-1 pr-2 font-medium">source</th>
                <th className="py-1 pr-2 font-medium">data_version</th>
                <th className="py-1 pr-2 font-medium">timezone</th>
                <th className="py-1 pr-2 font-medium">asof</th>
                {showAmount && <th className="py-1 pr-2 font-medium">amount</th>}
                {showVol && <th className="py-1 pr-2 font-medium">annual_vol_20d</th>}
                {showWeight && <th className="py-1 pr-2 font-medium">weight</th>}
              </tr>
            </thead>
            <tbody>
              {model.rows.map(row => (
                <tr key={`${row.symbol}-${row.date}-${row.content_hash}`} data-testid="ohlcv-row" data-symbol={row.symbol} data-market={row.market} className="border-t border-border/50 text-secondary">
                  <td className="py-1 pr-2 text-foreground">{row.symbol}</td>
                  <td className="py-1 pr-2">{row.date}</td>
                  <td className="py-1 pr-2">{row.open}</td>
                  <td className="py-1 pr-2">{row.high}</td>
                  <td className="py-1 pr-2">{row.low}</td>
                  <td className="py-1 pr-2">{row.close}</td>
                  <td className="py-1 pr-2">{row.volume}</td>
                  <td className="py-1 pr-2">{row.market}</td>
                  <td className="py-1 pr-2">{row.source}</td>
                  <td className="py-1 pr-2">{row.data_version}</td>
                  <td className="py-1 pr-2">{row.timezone}</td>
                  <td className="py-1 pr-2">{row.asof_utc}</td>
                  {showAmount && <td className="py-1 pr-2">{num(row.amount)}</td>}
                  {showVol && <td className="py-1 pr-2">{num(row.annual_vol_20d)}</td>}
                  {showWeight && <td className="py-1 pr-2">{num(row.weight)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p data-testid="ohlcv-empty" data-market={code} className="mt-2 text-[11px] leading-relaxed text-secondary">
          {emptyCopy(model)}
        </p>
      )}
      {model.rows_omitted_note && (
        <p data-testid="rows-omitted" className="mt-1 text-[10px] text-muted">{model.rows_omitted_note}</p>
      )}
      <div data-testid="secondary-unwired" className="mt-2 text-[10px] leading-relaxed text-muted">
        <div>weights（含 CASH）{showWeight ? '见主表 · strategy_id 仍未接线' : '— · 未接线'}</div>
        <div>annual_vol_20d {showVol ? '见主表' : '— · 未接线'}</div>
        <div>Capitals 比例 — · 未接线</div>
        <div>equal-weight 是对照，inv_vol 是主张。两者都未接线。</div>
      </div>
    </section>
  )
}
