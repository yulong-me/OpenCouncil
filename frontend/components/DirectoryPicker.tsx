'use client'

interface DirectoryPickerProps {
  value: string
  onChange: (path: string) => void
  placeholder?: string
  className?: string
}

/**
 * 目录路径输入框（参考 clowder-ai LinkedRootsManager 风格）。
 * 用户手动输入绝对路径，不依赖浏览器文件选择器。
 */
export function DirectoryPicker({ value, onChange, placeholder = '/Users/.../project', className = '' }: DirectoryPickerProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-[14px] text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-accent/50 transition-colors ${className}`}
    />
  )
}
