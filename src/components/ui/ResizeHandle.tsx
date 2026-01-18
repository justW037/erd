import React from 'react'
import { Separator } from 'react-resizable-panels'

interface ResizeHandleProps {
  className?: string
  id?: string
  children?: React.ReactNode
}

export function ResizeHandle({ className = '', id, children }: ResizeHandleProps) {
  return (
    <Separator
      className={`group relative flex w-1.5 items-center justify-center bg-slate-100 dark:bg-slate-900 data-[resize-handle-state="hover"]:bg-blue-500/20 data-[resize-handle-state="drag"]:bg-blue-500/40 transition-colors outline-none cursor-col-resize z-50 ${className}`}
      id={id}
    >
      <div className="h-8 w-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
      {children}
    </Separator>
  )
}
