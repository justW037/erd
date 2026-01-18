/**
 * Persistence Utilities
 *
 * Save/load projects to:
 * - localStorage (auto-save)
 * - JSON file (manual export/import)
 */

import type { Graph } from '../core/graph/types'
import type { DatabaseSchema } from '../core/ir/types'
import type { Theme } from '../contexts/ThemeContext'
import type { SQLDialect } from './export'

// ─────────────────────────────────────────────────────────────
// Project structure
// ─────────────────────────────────────────────────────────────

export interface Project {
  version: string
  name: string
  dsl: string
  schema?: DatabaseSchema
  graph?: Graph
  createdAt: string
  updatedAt: string
}

const PROJECT_VERSION = '1.0.0'
const STORAGE_KEY = 'erd-tool-project'
const RECENT_PROJECTS_KEY = 'erd-tool-recent'
const MAX_RECENT = 10

// ─────────────────────────────────────────────────────────────
// Settings & Preferences
// ─────────────────────────────────────────────────────────────

export type ZoomSpeed = 'slow' | 'normal' | 'fast'

export interface AppSettings {
  general: {
    theme: Theme
    language: 'en' | 'vi'
    /**
     * Auto-save debounce interval in milliseconds.
     * Set to 0 to disable auto-save.
     */
    autoSaveIntervalMs: number
  }
  canvas: {
    showGrid: boolean
    snapToGrid: boolean
    gridSize: number
    zoomSpeed: ZoomSpeed
    showPerformanceOverlay: boolean
    curvature: number
  }
  layout: {
    /** Preferred sidebar width in pixels */
    sidebarWidth: number
    /** Preferred properties panel width in pixels */
    propertiesWidth: number
  }
  export: {
    defaultSQLDialect: SQLDialect
    /**
     * PNG export scale factor (1 = 1x, 2 = 2x, etc.)
     */
    imageScale: number
  }
}

const SETTINGS_KEY = 'erd-tool-settings'

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    theme: 'light',
    language: 'en',
    autoSaveIntervalMs: 1000,
  },
  canvas: {
    showGrid: true,
    snapToGrid: false,
    gridSize: 20,
    zoomSpeed: 'normal',
    showPerformanceOverlay: false,
    curvature: 1.0,
  },
  layout: {
    sidebarWidth: 250,
    propertiesWidth: 300,
  },
  export: {
    defaultSQLDialect: 'postgresql',
    imageScale: 2,
  },
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const parsed = JSON.parse(raw) as Partial<AppSettings>

    return {
      general: {
        ...DEFAULT_SETTINGS.general,
        ...(parsed.general ?? {}),
      },
      canvas: {
        ...DEFAULT_SETTINGS.canvas,
        ...(parsed.canvas ?? {}),
      },
      layout: {
        ...DEFAULT_SETTINGS.layout,
        ...(parsed.layout ?? {}),
      },
      export: {
        ...DEFAULT_SETTINGS.export,
        ...(parsed.export ?? {}),
      },
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage:', e)
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e)
  }
}

export function exportSettingsToJSON(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2)
}

export function importSettingsFromJSON(json: string): AppSettings {
  try {
    const parsed = JSON.parse(json) as Partial<AppSettings>
    const merged = {
      general: {
        ...DEFAULT_SETTINGS.general,
        ...(parsed.general ?? {}),
      },
      canvas: {
        ...DEFAULT_SETTINGS.canvas,
        ...(parsed.canvas ?? {}),
      },
      layout: {
        ...DEFAULT_SETTINGS.layout,
        ...(parsed.layout ?? {}),
      },
      export: {
        ...DEFAULT_SETTINGS.export,
        ...(parsed.export ?? {}),
      },
    }
    return merged
  } catch (e) {
    console.error('Failed to import settings from JSON:', e)
    return DEFAULT_SETTINGS
  }
}

// ─────────────────────────────────────────────────────────────
// localStorage Persistence
// ─────────────────────────────────────────────────────────────

export function saveToLocalStorage(dsl: string, graph?: Graph, schema?: DatabaseSchema): void {
  const project: Project = {
    version: PROJECT_VERSION,
    name: 'Untitled Project',
    dsl,
    schema,
    graph,
    createdAt: localStorage.getItem(STORAGE_KEY)
      ? JSON.parse(localStorage.getItem(STORAGE_KEY)!).createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export function loadFromLocalStorage(): Project | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    return JSON.parse(data) as Project
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
    return null
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ─────────────────────────────────────────────────────────────
// Recent projects
// ─────────────────────────────────────────────────────────────

interface RecentProject {
  name: string
  updatedAt: string
  preview: string // first 100 chars of DSL
}

export function addToRecentProjects(project: Project): void {
  try {
    const recent = getRecentProjects()
    const preview = project.dsl.slice(0, 100).replace(/\n/g, ' ')

    // Remove existing entry if present
    const filtered = recent.filter((p) => p.name !== project.name)

    // Add to front
    filtered.unshift({
      name: project.name,
      updatedAt: project.updatedAt,
      preview,
    })

    // Keep only MAX_RECENT
    const trimmed = filtered.slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('Failed to update recent projects:', e)
  }
}

export function getRecentProjects(): RecentProject[] {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY)
    if (!data) return []
    return JSON.parse(data) as RecentProject[]
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// File Export/Import
// ─────────────────────────────────────────────────────────────

export function exportProjectToJSON(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function downloadProject(project: Project, filename?: string): void {
  const json = exportProjectToJSON(project)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${project.name.replace(/\s+/g, '-').toLowerCase()}.erd.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importProjectFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const project = JSON.parse(content) as Project

        // Validate structure
        if (!project.version || !project.dsl) {
          throw new Error('Invalid project file format')
        }

        resolve(project)
      } catch (err) {
        reject(new Error('Failed to parse project file'))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ─────────────────────────────────────────────────────────────
// Auto-save hook
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react'

export function useAutoSave(
  dsl: string,
  graph: Graph | undefined,
  schema: DatabaseSchema | undefined,
  debounceMs = 1000
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Auto-save disabled
    if (debounceMs <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveToLocalStorage(dsl, graph, schema)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [dsl, graph, schema, debounceMs])
}

// ─────────────────────────────────────────────────────────────
// File picker helper
// ─────────────────────────────────────────────────────────────

export function openFilePicker(
  onFileSelect: (file: File) => void,
  accept = '.erd.json,.json'
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept

  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) onFileSelect(file)
  }

  input.click()
}

// ─────────────────────────────────────────────────────────────
// Create new project
// ─────────────────────────────────────────────────────────────

export function createNewProject(name = 'Untitled Project', dsl = ''): Project {
  const now = new Date().toISOString()
  return {
    version: PROJECT_VERSION,
    name,
    dsl,
    createdAt: now,
    updatedAt: now,
  }
}
