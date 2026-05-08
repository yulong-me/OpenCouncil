'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function DepthSwitcher({ value, onChange, currentDepth, maxDepth }: {
  value: number | null
  onChange: (v: number | null) => void
  currentDepth: number
  maxDepth: number
}) {
  const [open, setOpen] = useState(false)
  const maxDepthLabel = maxDepth === 0 ? '∞' : `${maxDepth}层`
  const options: { label: string; value: number | null; title: string }[] = [
    { label: `跟随 Team (${maxDepthLabel})`, value: null, title: `使用当前 Team 默认协作深度：${maxDepthLabel}` },
    { label: '浅 (3层)', value: 3, title: '协作深度 3 层' },
    { label: '中 (5层)', value: 5, title: '协作深度 5 层' },
    { label: '深 (10层)', value: 10, title: '协作深度 10 层' },
    { label: '∞ 无限', value: 0, title: '无深度限制' },
  ]
  const remaining = maxDepth === 0 ? '∞' : Math.max(0, maxDepth - currentDepth)

  return (
    <div className="relative flex items-center" title="A2A 协作深度">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`A2A 协作深度：剩余 ${remaining}，上限 ${maxDepth === 0 ? '无限' : maxDepth}`}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface-muted px-2 text-[11px] font-semibold transition-colors hover:bg-surface-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <span className="text-ink-soft">A2A</span>
        <span className="text-accent font-bold">{remaining}</span>
        <span className="text-ink-soft">/</span>
        <span className="text-ink">{maxDepth === 0 ? '∞' : maxDepth}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 layer-dropdown min-w-[120px] overflow-hidden rounded-lg border border-border bg-surface shadow-lg" role="menu">
          {options.map(option => (
            <button
              key={String(option.value)}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              title={option.title}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`min-h-9 w-full px-3 text-left text-[11px] font-semibold transition-colors ${
                value === option.value
                  ? 'bg-accent text-white'
                  : 'text-ink hover:bg-surface-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
