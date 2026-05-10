'use client'

import type { InvocationUsage } from '../lib/agents'
import { formatCompactTokenCount, formatInvocationTokenFlow, formatLatencyMs, formatUsd } from '../lib/telemetry'

interface MetadataBadgeProps {
  usage?: InvocationUsage
}

export function MetadataBadge({ usage }: MetadataBadgeProps) {
  if (!usage) return null

  const providerLabel = usage.provider ?? usage.model
  const providerTitle = usage.provider && usage.model
    ? `${usage.provider} · ${usage.model}`
    : usage.provider ?? usage.model
  const tokenFlow = formatInvocationTokenFlow(usage)
  const latencyLabel = typeof usage.latencyMs === 'number' && usage.latencyMs > 0
    ? formatLatencyMs(usage.latencyMs)
    : undefined
  const inputLabel = typeof usage.inputTokens === 'number' && usage.inputTokens > 0
    ? formatCompactTokenCount(usage.inputTokens)
    : undefined
  const outputLabel = typeof usage.outputTokens === 'number' && usage.outputTokens > 0
    ? formatCompactTokenCount(usage.outputTokens)
    : undefined
  const costLabel = typeof usage.costUsd === 'number' && usage.costUsd > 0
    ? formatUsd(usage.costUsd)
    : undefined

  if (!providerLabel && !tokenFlow && !latencyLabel && !costLabel) return null

  const ariaParts = [
    providerLabel,
    '已结束',
    inputLabel ? `输入 ${inputLabel}` : undefined,
    outputLabel ? `输出 ${outputLabel}` : undefined,
    latencyLabel ? `耗时 ${latencyLabel}` : undefined,
    costLabel ? `费用 ${costLabel}` : undefined,
  ].filter(Boolean)

  return (
    <div
      aria-label={`运行摘要：${ariaParts.join('，')}`}
      title={providerTitle}
      className="mt-2 flex max-w-fit flex-wrap items-center gap-2 font-mono text-[10.5px] text-ink-faint sm:text-[11px]"
    >
      <span>已结束</span>
      {tokenFlow ? (
        <>
          <span aria-hidden>·</span>
          <span>{tokenFlow}</span>
        </>
      ) : null}
      {latencyLabel ? (
        <>
          <span aria-hidden>·</span>
          <span>{latencyLabel}</span>
        </>
      ) : null}
    </div>
  )
}
