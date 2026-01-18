import { useEffect } from 'react'

export interface KeyboardShortcutHandlers {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onResetZoom?: () => void
  onToggleSidebar?: () => void
  onToggleProperties?: () => void
  onSetThemeLight?: () => void
  onSetThemeDark?: () => void
  onOpenCommandPalette?: () => void
  onOpenShortcutsHelp?: () => void
  // Group operations
  onCreateGroup?: () => void
  onDeleteGroup?: () => void
  onToggleGroupCollapse?: () => void
  onAddToGroup?: () => void
  onRemoveFromGroup?: () => void
}

function isFormElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  const editable = target.getAttribute('contenteditable')
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    editable === '' ||
    editable === 'true'
  )
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in editors/inputs
      if (isFormElement(e.target)) return

      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Command palette: Ctrl/Cmd + K
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (handlers.onOpenCommandPalette) {
          e.preventDefault()
          handlers.onOpenCommandPalette()
          return
        }
      }

      // Shortcuts help: ? key (Shift + /)
      if (!modKey && e.shiftKey && e.key === '?') {
        if (handlers.onOpenShortcutsHelp) {
          e.preventDefault()
          handlers.onOpenShortcutsHelp()
          return
        }
      }

      // Zoom with Ctrl/Cmd + +/-
      if (modKey && !e.shiftKey && (e.key === '+' || e.key === '=')) {
        if (handlers.onZoomIn) {
          e.preventDefault()
          handlers.onZoomIn()
          return
        }
      }

      if (modKey && !e.shiftKey && e.key === '-') {
        if (handlers.onZoomOut) {
          e.preventDefault()
          handlers.onZoomOut()
          return
        }
      }

      // Fit view: F (no modifier) – already handled in canvas, but expose here for completeness
      if (!modKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        if (handlers.onFitView) {
          e.preventDefault()
          handlers.onFitView()
          return
        }
      }

      // Reset zoom: 0 (no modifier) – already handled in canvas, but expose here for completeness
      if (!modKey && !e.shiftKey && e.key === '0') {
        if (handlers.onResetZoom) {
          e.preventDefault()
          handlers.onResetZoom()
          return
        }
      }

      // Layout toggles
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        if (handlers.onToggleSidebar) {
          e.preventDefault()
          handlers.onToggleSidebar()
          return
        }
      }

      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'p') {
        if (handlers.onToggleProperties) {
          e.preventDefault()
          handlers.onToggleProperties()
          return
        }
      }

      // Theme switch Ctrl/Cmd+Shift+L/D
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        if (handlers.onSetThemeLight) {
          e.preventDefault()
          handlers.onSetThemeLight()
          return
        }
      }

      if (modKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        if (handlers.onSetThemeDark) {
          e.preventDefault()
          handlers.onSetThemeDark()
          return
        }
      }

      // Group operations
      // Create group: Ctrl/Cmd + G
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'g') {
        if (handlers.onCreateGroup) {
          e.preventDefault()
          handlers.onCreateGroup()
          return
        }
      }

      // Delete group: Ctrl/Cmd + Shift + Delete (when group is selected)
      if (modKey && e.shiftKey && e.key === 'Delete') {
        if (handlers.onDeleteGroup) {
          e.preventDefault()
          handlers.onDeleteGroup()
          return
        }
      }

      // Toggle group collapse: Ctrl/Cmd + E
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        if (handlers.onToggleGroupCollapse) {
          e.preventDefault()
          handlers.onToggleGroupCollapse()
          return
        }
      }

      // Add to group: Ctrl/Cmd + Shift + G
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'g') {
        if (handlers.onAddToGroup) {
          e.preventDefault()
          handlers.onAddToGroup()
          return
        }
      }

      // Remove from group: Ctrl/Cmd + Shift + R
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        if (handlers.onRemoveFromGroup) {
          e.preventDefault()
          handlers.onRemoveFromGroup()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handlers])
}
