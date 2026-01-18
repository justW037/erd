import React from 'react'

export interface ShortcutsHelpModalProps {
  open: boolean
  onClose: () => void
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ open, onClose }) => {
  if (!open) return null

  const Row = ({ keys, description }: { keys: string; description: string }) => (
    <tr>
      <td className="py-1 pr-4 align-top text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {keys}
      </td>
      <td className="py-1 text-xs text-slate-200">{description}</td>
    </tr>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-slate-900 rounded-lg shadow-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-100">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Esc
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Press <span className="font-mono text-slate-300">?</span> anywhere to toggle this help.
        </p>
        <table className="w-full">
          <tbody>
            <Row keys="F" description="Fit diagram to view" />
            <Row keys="0" description="Reset zoom" />
            <Row keys="Ctrl/Cmd + +" description="Zoom in" />
            <Row keys="Ctrl/Cmd + -" description="Zoom out" />
            <Row keys="Ctrl/Cmd + B" description="Toggle sidebar" />
            <Row keys="Ctrl/Cmd + P" description="Toggle properties panel" />
            <Row keys="Ctrl/Cmd + Shift + L" description="Switch to light theme" />
            <Row keys="Ctrl/Cmd + Shift + D" description="Switch to dark theme" />
            <Row keys="Ctrl/Cmd + K" description="Open command palette" />
            <Row keys="Cmd + Z / Shift+Cmd + Z" description="Undo / Redo" />
            {/* Group operations */}
            <tr>
              <td colSpan={2} className="pt-2 pb-1 text-xs font-medium text-slate-300">
                Group Operations
              </td>
            </tr>
            <Row keys="Ctrl/Cmd + G" description="Create group from selected tables" />
            <Row keys="Ctrl/Cmd + Shift + Delete" description="Delete selected group" />
            <Row keys="Ctrl/Cmd + E" description="Toggle group collapse/expand" />
            <Row keys="Ctrl/Cmd + Shift + G" description="Add selected tables to group" />
            <Row keys="Ctrl/Cmd + Shift + R" description="Remove selected tables from group" />
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ShortcutsHelpModal
