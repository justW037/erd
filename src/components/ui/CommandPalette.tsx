import React, { useEffect, useState, useMemo } from 'react'

export interface CommandItem {
  id: string
  label: string
  shortcut?: string
  group?: string
  action: () => void
}

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: CommandItem[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[activeIndex]
        if (cmd) {
          cmd.action()
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, activeIndex, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q))
  }, [commands, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
              No commands found
            </div>
          ) : (
            filtered.map((cmd, index) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  cmd.action()
                  onClose()
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between text-sm ${
                  index === activeIndex
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {cmd.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-1.5 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Enter to run • Esc to close • ↑/↓ to navigate</span>
          <span>Ctrl/Cmd+K</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette

