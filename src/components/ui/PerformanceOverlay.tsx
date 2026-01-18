import React, { useEffect, useState } from 'react'

export interface PerformanceOverlayProps {
  nodeCount: number
  edgeCount: number
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  nodeCount,
  edgeCount,
}) => {
  const [fps, setFps] = useState(0)
  const [frameMs, setFrameMs] = useState(0)
  const [heapUsedMB, setHeapUsedMB] = useState<number | null>(null)
  const [heapTotalMB, setHeapTotalMB] = useState<number | null>(null)

  useEffect(() => {
    let frameId: number
    let lastTime = performance.now()
    let frameCount = 0
    let lastFpsUpdate = lastTime

    const loop = () => {
      const now = performance.now()
      const delta = now - lastTime
      lastTime = now
      frameCount += 1

      if (now - lastFpsUpdate >= 500) {
        const seconds = (now - lastFpsUpdate) / 1000
        setFps(Math.round(frameCount / seconds))
        setFrameMs(Math.round(delta * 10) / 10)
        frameCount = 0
        lastFpsUpdate = now

        const perf = (performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
        }).memory
        if (perf) {
          setHeapUsedMB(Math.round((perf.usedJSHeapSize / 1024 / 1024) * 10) / 10)
          setHeapTotalMB(Math.round((perf.totalJSHeapSize / 1024 / 1024) * 10) / 10)
        }
      }

      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-8 right-4 z-40 text-[11px]">
      <div className="inline-flex flex-col gap-0.5 rounded-md bg-slate-900/80 text-slate-100 px-2 py-1 border border-slate-700 shadow-lg">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">FPS</span>
          <span className="font-semibold text-emerald-400">{fps || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Frame</span>
          <span>{frameMs ? `${frameMs} ms` : '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Nodes / Edges</span>
          <span>
            {nodeCount} / {edgeCount}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Heap</span>
          <span>
            {heapUsedMB != null && heapTotalMB != null
              ? `${heapUsedMB} / ${heapTotalMB} MB`
              : 'n/a'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PerformanceOverlay

