/**
 * Zoom Controls Component
 *
 * Floating zoom controls with zoom in/out/reset buttons and zoom indicator.
 */

import React, { memo } from 'react'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  minZoom?: number
  maxZoom?: number
}

export const ZoomControls: React.FC<ZoomControlsProps> = memo(
  ({ zoom, onZoomIn, onZoomOut, onZoomReset, minZoom = 0.1, maxZoom = 3 }) => {
    const zoomPercentage = Math.round(zoom * 100)
    const canZoomIn = zoom < maxZoom
    const canZoomOut = zoom > minZoom

    return (
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1"
        role="group"
        aria-label="Zoom controls"
      >
        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in (Ctrl + +)"
          aria-label="Zoom in"
        >
          <svg
            className="w-5 h-5 text-slate-700 dark:text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Zoom Indicator */}
        <button
          onClick={onZoomReset}
          className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Reset zoom (Ctrl + 0)"
          aria-label={`Current zoom ${zoomPercentage}%. Click to reset`}
        >
          {zoomPercentage}%
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out (Ctrl + -)"
          aria-label="Zoom out"
        >
          <svg
            className="w-5 h-5 text-slate-700 dark:text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    )
  }
)

ZoomControls.displayName = 'ZoomControls'
