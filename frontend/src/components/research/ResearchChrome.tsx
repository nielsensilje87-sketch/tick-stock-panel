import { Link } from 'react-router-dom'
import {
  CALENDAR_RULES,
  FROZEN,
  FROZEN_DISPLAY,
  LAYERS,
  LIVE_TRADING,
  MARKET_META,
  NEW_CASH_PRIORITY,
  ORDERS,
  RESEARCH_MARKETS,
  RESEARCH_VIEWS,
  SLEEVE_INCOME_ENABLED,
  VIEW_LABEL,
  WINDOW_MARKETS,
  investableBudgetRatio,
  type ResearchMarketCode,
  type ResearchView,
} from '@/lib/researchMarket'
import { cn } from '@/lib/cn'

function LiveOffBadge() {
  return (
    <span
      data-testid="live-off"
      data-live-trading={String(LIVE_TRADING)}
      className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-400"
    >
      live_trading={String(LIVE_TRADING)}
    </span>
  )
}

function OrdersBadge() {
  return (
    <span
      data-testid="orders-empty"
      data-orders={String(ORDERS.length)}
      className="inline-flex items-center rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-secondary"
    >
      orders=[]
    </span>
  )
}

function FrozenChips() {
  const chips = [
    { id: 'max_asset_weight', label: '单票上限', value: FROZEN_DISPLAY.max_asset_weight },
    { id: 'cash_cushion', label: '层内现金垫', value: FROZEN_DISPLAY.cash_cushion },
    { id: 'lot_mult', label: 'lot_mult', value: FROZEN_DISPLAY.lot_mult },
    { id: 'pov', label: 'POV', value: '只读' },
  ]
  return (
    <div data-testid="frozen-params" className="flex flex-wrap items-center gap-1">
      {chips.map(chip => (
        <span
          key={chip.id}
          data-frozen={chip.id}
          className="inline-flex items-center gap-1 rounded border border-border/80 bg-base px-1.5 py-0.5 font-mono text-[10px] text-secondary"
        >
          <span className="text-muted">{chip.label}</span>
          <span className="text-foreground">{chip.value}</span>
        </span>
      ))}
    </div>
  )
}

export function MarketSwitch({
  view,
  onChange,
}: {
  view: ResearchView
  onChange: (next: ResearchView) => void
}) {
  return (
    <div role="tablist" aria-label="市场" data-testid="market-switch" className="flex flex-wrap gap-1">
      {RESEARCH_VIEWS.map(code => {
        const selected = view === code
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={selected}
            data-market={code}
            onClick={() => onChange(code)}
            className={cn(
              'inline-flex items-center gap-1 rounded-btn border px-2 py-1 text-[11px] transition-colors',
              selected
                ? 'border-accent/50 bg-accent/10 font-medium text-accent'
                : 'border-border bg-elevated text-secondary hover:text-foreground',
            )}
          >
            <span className="font-mono">{code}</span>
            <span>{VIEW_LABEL[code]}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 顶栏：市场切换 + LIVE OFF + 冻结参数。全局只读，各页都在。 */
export function ResearchShellBar({
  view,
  onChange,
}: {
  view: ResearchView
  onChange: (next: ResearchView) => void
}) {
  return (
    <div
      data-testid="research-shell"
      className="sticky top-0 z-20 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <LiveOffBadge />
        <OrdersBadge />
        <MarketSwitch view={view} onChange={onChange} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted">冻结只读</span>
        <FrozenChips />
      </div>
    </div>
  )
}

function Unwired() {
  return <span className="text-muted">— · 未接线</span>
}

/** 资金层交界与执行门。只展示签字字段，没有输入框，也没有下单。 */
export function AllocationResearch() {
  const investablePct = `${Math.round(investableBudgetRatio() * 100)}%`
  return (
    <section data-testid="allocation-research" className="rounded-card border border-border bg-surface/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">配置研究</h2>
        <span className="text-[10px] text-muted">纸面 · 未接线 · 只读</span>
        <LiveOffBadge />
        <OrdersBadge />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-secondary">
        分层仓位、层内现金垫、再平衡窗、lot / ADV$ / POV 只读门保留在全球视图。
        单票上限对照等权；逆波动（inv_vol）是主张，动量卫星不是主干。
        strategy_id / strategy_source 未接线。证据与回测入口本刀不接线。
      </p>

      <div className="mt-2">
        <FrozenChips />
      </div>

      <div
        data-field="cash_cushion"
        data-cash-cushion={String(FROZEN.cash_cushion)}
        className="mt-3 rounded border border-border/70 bg-base/60 px-2 py-1.5 text-[11px] text-secondary"
      >
        <span className="font-medium text-foreground">层内现金垫</span>
        <span className="mx-1 font-mono text-foreground">{FROZEN_DISPLAY.cash_cushion}</span>
        <span className="text-muted">cash_cushion={FROZEN.cash_cushion} · 可投资预算 {investablePct} · 与「现金短债」不同列</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
          <caption className="mb-1 text-left text-[10px] text-muted">
            层间 4 元组：target_pct · deviation_pp · budget_cap_readonly · window_flag。比例未接线，不写 0。
          </caption>
          <thead>
            <tr className="text-muted">
              <th className="py-1 pr-2 font-medium">layer_id</th>
              <th className="py-1 pr-2 font-medium">层</th>
              <th className="py-1 pr-2 font-medium">target_pct</th>
              <th className="py-1 pr-2 font-medium">actual_pct</th>
              <th className="py-1 pr-2 font-medium">deviation_pp</th>
              <th className="py-1 pr-2 font-medium">alert_pm5</th>
              <th className="py-1 pr-2 font-medium">预算帽</th>
              <th className="py-1 pr-2 font-medium">inv_vol</th>
              <th className="py-1 font-medium">可投资池</th>
            </tr>
          </thead>
          <tbody>
            {LAYERS.map(layer => (
              <tr key={layer.id} data-testid="layer-row" data-layer-id={layer.id} className="border-t border-border/50 text-secondary">
                <td className="py-1 pr-2 font-mono text-foreground">{layer.id}</td>
                <td className="py-1 pr-2">{layer.name}</td>
                <td className="py-1 pr-2"><Unwired /></td>
                <td className="py-1 pr-2"><Unwired /></td>
                <td className="py-1 pr-2"><Unwired /></td>
                <td className="py-1 pr-2"><Unwired /></td>
                <td className="py-1 pr-2">只读 · <Unwired /></td>
                <td className="py-1 pr-2">{layer.runs_inv_vol ? '是' : '否'}</td>
                <td className="py-1">{layer.in_investable_pool ? '是' : '否'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="rebalance-window" className="mt-3 rounded border border-border/70 bg-base/60 px-2 py-1.5 text-[11px] text-secondary">
        <div className="font-medium text-foreground">再平衡窗</div>
        <div className="mt-1">window_flag <Unwired /> · as_of_date <Unwired /> · next_window <Unwired /></div>
        <div className="mt-1">
          window_by_market
          {WINDOW_MARKETS.map(code => (
            <span key={code} data-window-market={code} className="ml-2 font-mono">
              {code}: —
            </span>
          ))}
        </div>
        <div className="mt-1 text-muted">{CALENDAR_RULES}</div>
        <div className="mt-1">
          sleeve_income_enabled={String(SLEEVE_INCOME_ENABLED)} · new_cash_priority={NEW_CASH_PRIORITY}（声明，不划转）
          · layer_rebalance_due <Unwired /> · silence_exception 仅 P0，未接线
        </div>
      </div>

      <div data-testid="execution-gates" className="mt-3 rounded border border-border/70 bg-base/60 px-2 py-1.5 text-[11px] text-secondary">
        <div className="font-medium text-foreground">执行门 · 只读</div>
        <div className="mt-1 font-mono">
          lot_mult {FROZEN_DISPLAY.lot_mult} · ADV$ <Unwired /> · POV 只读 · allow_list <Unwired />
        </div>
        <div className="mt-1 text-muted">告警不生成订单。lot / ADV$ / POV 只展示合同，不改冻结值。</div>
      </div>
    </section>
  )
}

function MarketSummaryCard({
  code,
  onOpen,
}: {
  code: ResearchMarketCode
  onOpen: (code: ResearchMarketCode) => void
}) {
  const meta = MARKET_META[code]
  return (
    <button
      type="button"
      data-testid="market-card"
      data-market={code}
      onClick={() => onOpen(code)}
      className="rounded-card border border-border bg-surface/80 p-3 text-left transition-colors hover:border-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">{code}</span>
        <span className="text-[11px] text-secondary">{VIEW_LABEL[code]}</span>
      </div>
      <dl className="mt-2 space-y-1 font-mono text-[10px] text-secondary">
        <div className="flex justify-between gap-2"><dt className="text-muted">panel_id</dt><dd>{meta.panel}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">timezone</dt><dd>{meta.tz}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">symbol_count</dt><dd>— · 未接线</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">data_asof</dt><dd>— · 未接线</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">source_primary</dt><dd>— · 未接线</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">alert_count</dt><dd>— · 点入该市</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted">window</dt><dd>{meta.windowNote}</dd></div>
      </dl>
      <div className="mt-2 text-[10px] text-muted">LIVE OFF · 进入该市</div>
    </button>
  )
}

/** 默认首页：四市摘要并排，不含跨市混动量，也不挂 A 股投机组件。 */
export function GlobalHome({ onOpenMarket }: { onOpenMarket: (code: ResearchMarketCode) => void }) {
  return (
    <div data-testid="global-home" className="min-h-full bg-base p-3">
      <header className="mb-3">
        <h1 className="text-base font-semibold text-foreground">全球摘要</h1>
        <p className="mt-1 text-[11px] leading-relaxed text-secondary">
          分市卡片并排，不是跨市合成排序。行情与权重未接线，不用别的市场快照填空。
        </p>
      </header>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {RESEARCH_MARKETS.map(code => (
          <MarketSummaryCard key={code} code={code} onOpen={onOpenMarket} />
        ))}
      </div>
      <div className="mt-3">
        <AllocationResearch />
      </div>
    </div>
  )
}

/** US / CRYPTO / HK 工作台骨架。不渲染 A 股总览。 */
export function MarketDesk({ code }: { code: Exclude<ResearchMarketCode, 'CN'> }) {
  const meta = MARKET_META[code]
  return (
    <div data-testid="market-desk" data-market={code} className="min-h-full bg-base p-3">
      <header className="mb-3">
        <h1 className="text-base font-semibold text-foreground">
          {VIEW_LABEL[code]}
          <span className="ml-2 font-mono text-sm text-accent">{code}</span>
        </h1>
        <p className="mt-1 font-mono text-[11px] text-secondary">
          {meta.panel} · {meta.tz} · {meta.windowNote}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-secondary">
          行情主表（symbol / date / OHLC / volume / annual_vol_20d）未接线。
          weights（含 CASH）未接线。不把其他市场的行情套进本表。
        </p>
      </header>
      <AllocationResearch />
    </div>
  )
}

/** 仅 market=CN 挂载。默认收起；卸载即丢弃展开状态。 */
export function CnOnlyDrawer() {
  return (
    <details data-testid="cn-only-drawer" className="mb-2 rounded-card border border-border bg-surface/80">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-secondary [&::-webkit-details-marker]:hidden">
        A股研究抽屉 · 默认收起 · 仅 CN
      </summary>
      <div className="space-y-1.5 border-t border-border/70 px-3 py-2 text-[11px] leading-relaxed text-secondary">
        <p>只读研究入口。离开 CN 后抽屉卸载。不提供应用到其他市场的开关。</p>
        <p>
          <Link to="/limit-ladder" className="text-accent hover:underline">连板梯队</Link>
          <span> · 连板天数与当日涨跌停旗</span>
        </p>
        <p>
          <Link to="/review" className="text-accent hover:underline">龙虎榜</Link>
          <span> · 是否上榜，明细在复盘页</span>
        </p>
        <p>
          <Link to="/concept-analysis" className="text-accent hover:underline">概念板块</Link>
          <span> · 不作为全球默认主视图</span>
        </p>
        <p>ST / *ST 仅作 CN 筛选，不是全球主入口。</p>
        <p>两融标的旗未接线。</p>
        <p>北向持股占比未接线，不驱动再平衡。</p>
      </div>
    </details>
  )
}

export function CnOnlyBlocked({ onOpenCn }: { onOpenCn: () => void }) {
  return (
    <div data-testid="cn-only-blocked" className="m-3 rounded-card border border-border bg-surface p-4">
      <h1 className="text-sm font-semibold text-foreground">此页只在 CN 打开</h1>
      <p className="mt-1 text-[11px] leading-relaxed text-secondary">
        连板、概念热力和龙虎榜不进入全球首页，也不进入 US / CRYPTO / HK。
      </p>
      <button
        type="button"
        onClick={onOpenCn}
        className="mt-3 rounded-btn bg-accent px-3 py-1.5 text-xs font-medium text-white"
      >
        切换到 CN
      </button>
    </div>
  )
}
