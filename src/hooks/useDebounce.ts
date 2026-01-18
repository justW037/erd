/**
 * Debounced Parsing Hook
 *
 * Debounces DSL parsing to prevent excessive computation
 * while typing in the editor.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DatabaseSchema } from '../core/ir/types'

interface ParseResult {
  schema: DatabaseSchema | null
  error: string | null
  isParsing: boolean
}

/**
 * Hook for debounced DSL parsing
 */
export function useDebouncedParse(
  input: string,
  parser: (input: string) => DatabaseSchema,
  delay = 300
): ParseResult {
  const [result, setResult] = useState<ParseResult>({
    schema: null,
    error: null,
    isParsing: false,
  })
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastInputRef = useRef<string>('')

  useEffect(() => {
    // Skip if input hasn't changed
    if (input === lastInputRef.current) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Mark as parsing
    setResult((prev) => ({ ...prev, isParsing: true }))

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        const schema = parser(input)
        lastInputRef.current = input
        setResult({
          schema,
          error: null,
          isParsing: false,
        })
      } catch (e) {
        setResult({
          schema: null,
          error: e instanceof Error ? e.message : 'Parse error',
          isParsing: false,
        })
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [input, parser, delay])

  return result
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay = 300
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  ) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Hook for throttled callback (fires at most once per delay)
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay = 100
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      } else {
        // Schedule a trailing call
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callbackRef.current(...args)
        }, delay - timeSinceLastCall)
      }
    },
    [delay]
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}
