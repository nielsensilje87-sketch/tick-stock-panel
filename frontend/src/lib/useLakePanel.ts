import { useQuery } from '@tanstack/react-query'
import { loadLakePanel } from './lakePanel'
import { QK } from './queryKeys'

/** 静态湖 status。不进报价 SSE 失效列表。旗标关闭时不请求。 */
export function useLakePanel(enabled: boolean) {
  return useQuery({
    queryKey: QK.dshLakePanel,
    queryFn: () => loadLakePanel(),
    enabled,
    staleTime: 15_000,
    retry: false,
  })
}
