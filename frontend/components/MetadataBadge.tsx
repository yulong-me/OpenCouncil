'use client'

import type { InvocationUsage } from '../lib/agents'
import { formatCompactTokenCount, formatLatencyMs, formatUsd } from '../lib/telemetry'

interface MetadataBadgeProps {
  usage?: InvocationUsage
}

export function MetadataBadge({ usage }: MetadataBadgeProps) {
  if (!usage) return null

  const providerLabel = usage.provider ?? usage.model
  const providerTitle = usage.provider && usage.model
    ? `${usage.provider} · ${usage.model}`
    : usage.provider ?? usage.model

  const metricSegments: Array<{
    key: string
    value: string
    title?: string
  }> = []

  if (typeof usage?.inputTokens === 'number' && usage.inputTokens > 0) {
    metricSegments.push({
      key: 'input',
      title: `Input ${formatCompactTokenCount(usage.inputTokens)}`,
      value: formatCompactTokenCount(usage.inputTokens),
    })
  }

  if (typeof usage?.outputTokens === 'number' && usage.outputTokens > 0) {
    metricSegments.push({
      key: 'output',
      title: `Output ${formatCompactTokenCount(usage.outputTokens)}`,
      value: formatCompactTokenCount(usage.outputTokens),
    })
  }

  if (typeof usage?.latencyMs === 'number' && usage.latencyMs > 0) {
    metricSegments.push({
      key: 'latency',
      title: formatLatencyMs(usage.latencyMs),
      value: formatLatencyMs(usage.latencyMs),
    })
  }

  if (typeof usage?.costUsd === 'number' && usage.costUsd > 0) {
    metricSegments.push({
      key: 'cost',
      value: formatUsd(usage.costUsd),
    })
  }

  if (!providerLabel && metricSegments.length === 0) return null

  return (
    <div className="mt-2.5 flex max-w-full flex-wrap items-center text-[10.5px] sm:text-[11px]">
      <span
        title={providerTitle}
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-ink-soft shadow-sm"
      >
        {providerLabel ? (
          <span className="max-w-[10rem] truncate font-semibold text-ink">{providerLabel}</span>
        ) : null}
        {metricSegments.map(segment => (
          <span key={segment.key} title={segment.title} className="font-mono tabular-nums">
            {segment.value}
          </span>
        ))}
      </span>
    </div>
  )
}
