/**
 * Toolbar Component
 *
 * Main application toolbar with actions and export options.
 */

import React, { memo, useCallback, useRef, useState } from 'react'
import type { SQLDialect } from '../../utils/export'

// ─────────────────────────────────────────────────────────────
// Icons (inline SVG for simplicity)
// ─────────────────────────────────────────────────────────────

const icons = {
  play: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  undo: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  ),
  redo: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
      />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  ),
  save: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  ),
  open: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
      />
    </svg>
  ),
  layout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  ),
  zoomIn: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
      />
    </svg>
  ),
  zoomOut: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
      />
    </svg>
  ),
  fit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────
// Button Components
// ─────────────────────────────────────────────────────────────

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  title?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = memo(
  ({ onClick, disabled = false, title, variant = 'secondary', children }) => {
    const baseClasses =
      'px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors'
    const variantClasses = {
      primary:
        'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700',
      secondary:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50',
      ghost:
        'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50',
    }

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`${baseClasses} ${variantClasses[variant]}`}
        aria-label={title}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ─────────────────────────────────────────────────────────────
// Dropdown Menu
// ─────────────────────────────────────────────────────────────

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

interface DropdownProps {
  label: React.ReactNode
  items: DropdownItem[]
}

const Dropdown: React.FC<DropdownProps> = memo(({ label, items }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((item: DropdownItem) => {
    item.onClick()
    setOpen(false)
  }, [])

  // Close on outside click
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-sm font-medium flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 left-auto mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[140px] z-50"
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => handleClick(item)}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              role="menuitem"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

Dropdown.displayName = 'Dropdown'

// ─────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────

const Divider = memo(() => (
  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" aria-hidden="true" />
))

Divider.displayName = 'Divider'

// ─────────────────────────────────────────────────────────────
// Toolbar Props
// ─────────────────────────────────────────────────────────────

export interface ToolbarProps {
  onParse: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onExportSVG: () => void
  onExportPNG: () => void
  onExportSQL: (dialect: SQLDialect) => void
  onSaveProject: () => void
  onOpenProject: () => void
  onLayoutChange: (layout: 'dagre' | 'grid') => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onResetZoom: () => void
  currentLayout: 'dagre' | 'grid'
  zoom: number
  theme?: 'light' | 'dark'
  onThemeToggle?: () => void
}

// ─────────────────────────────────────────────────────────────
// Toolbar Component
// ─────────────────────────────────────────────────────────────

export const Toolbar: React.FC<ToolbarProps> = memo(
  ({
    onParse,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onExportSVG,
    onExportPNG,
    onExportSQL,
    onSaveProject,
    onOpenProject,
    onLayoutChange,
    onZoomIn,
    onZoomOut,
    onFitView,
    onResetZoom,
    currentLayout,
    zoom,
    theme = 'light',
    onThemeToggle,
  }) => {
    const exportItems: DropdownItem[] = [
      { label: 'SVG', onClick: onExportSVG },
      { label: 'PNG', onClick: onExportPNG },
      { label: 'PostgreSQL', onClick: () => onExportSQL('postgresql') },
      { label: 'MySQL', onClick: () => onExportSQL('mysql') },
      { label: 'SQLite', onClick: () => onExportSQL('sqlite') },
    ]

    const layoutItems: DropdownItem[] = [
      {
        label: 'Hierarchical (Dagre)',
        onClick: () => onLayoutChange('dagre'),
      },
      {
        label: 'Grid',
        onClick: () => onLayoutChange('grid'),
      },
    ]

    return (
      <header
        className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 shrink-0 shadow-sm"
        role="banner"
        aria-label="Main toolbar"
      >
        {/* Logo & Title */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <h1 className="font-semibold text-slate-800 dark:text-slate-200">ERD Designer</h1>
        </div>

        <Divider />

        {/* File actions */}
        <Button onClick={onOpenProject} variant="ghost" title="Open project (Cmd+O)">
          {icons.open}
          <span className="hidden sm:inline">Open</span>
        </Button>
        <Button onClick={onSaveProject} variant="ghost" title="Save project (Cmd+S)">
          {icons.save}
          <span className="hidden sm:inline">Save</span>
        </Button>

        <Divider />

        {/* Parse */}
        <Button onClick={onParse} variant="primary" title="Parse DSL and render diagram">
          {icons.play}
          <span>Parse</span>
        </Button>

        <Divider />

        {/* History */}
        <Button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)" variant="ghost">
          {icons.undo}
        </Button>
        <Button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" variant="ghost">
          {icons.redo}
        </Button>

        <Divider />

        {/* Layout */}
        <Dropdown
          label={
            <>
              {icons.layout}
              <span className="hidden md:inline">Layout</span>
            </>
          }
          items={layoutItems}
        />

        <Divider />

        {/* Zoom controls */}
        <Button onClick={onZoomOut} variant="ghost" title="Zoom out">
          {icons.zoomOut}
        </Button>
        <span className="text-sm text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button onClick={onZoomIn} variant="ghost" title="Zoom in">
          {icons.zoomIn}
        </Button>
        <Button onClick={onFitView} variant="ghost" title="Fit to view (F)">
          {icons.fit}
        </Button>
        <Button onClick={onResetZoom} variant="ghost" title="Reset zoom (0)">
          100%
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        {onThemeToggle && (
          <>
            <Button
              onClick={onThemeToggle}
              variant="ghost"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? icons.moon : icons.sun}
            </Button>
            <Divider />
          </>
        )}

        {/* Export dropdown */}
        <Dropdown
          label={
            <>
              {icons.download}
              <span>Export</span>
            </>
          }
          items={exportItems}
        />
      </header>
    )
  }
)

Toolbar.displayName = 'Toolbar'

export default Toolbar
