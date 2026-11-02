import { useMemo } from 'react'
import { buildMarketStrip, resolveSelectedSymbol } from '@/lib/barsToStrip'
import { resolveLakeModels, type LakeBoard, type LakeBoardState } from '@/lib/lakePanel'
import type { ResearchMarketCode } from '@/lib/researchMarket'
import { ChartPane } from './ChartPane'
import { GainsStrip } from './GainsStrip'
import { LakeMarketSection } from './LakeBoard'

export function MarketTape({
  code,
  board = null,
  boardState = 'unloaded',
  boardError = null,
  showChart,
  selectedSymbol,
  onSelectSymbol,
}: {
  code: ResearchMarketCode
  board?: LakeBoard | null
  boardState?: LakeBoardState
  boardError?: string | null
  showChart: boolean
  selectedSymbol: string | null
  onSelectSymbol: (symbol: string) => void
}) {
  const { models } = resolveLakeModels(board, boardState, boardError)
  const model = models.find(item => item.market === code) ?? models[0]
  const slots = useMemo(() => buildMarketStrip(model), [model])
  const selected = showChart ? resolveSelectedSymbol(slots, selectedSymbol) : null
  const slot = slots.find(item => item.symbol === selected) ?? null
  return (
    <div data-testid="market-tape" data-market={code} className={showChart ? 'space-y-2' : undefined}>
      <GainsStrip market={code} slots={slots} selected={selected} onSelect={onSelectSymbol} />
      {showChart && <ChartPane market={code} slots={slots} slot={slot} />}
      {showChart && (
        <LakeMarketSection code={code} board={board} boardState={boardState} boardError={boardError} />
      )}
    </div>
  )
}
