import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useAsync — Generic data fetching hook
 * Handles loading, error, empty states + abort on unmount.
 *
 * @param {Function} fetcher - async function returning data
 * @param {Array} deps - dependencies to re-fetch on change
 * @param {Object} options - { immediate: bool, initialData: any }
 */
export function useAsync(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const execute = useCallback(async (...args) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher(...args)
      setData(result)
      return result
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.error || err.message || 'Error inesperado')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute()
    return () => abortRef.current?.abort()
  }, [execute]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => execute(), [execute])
  const mutate = useCallback((updater) => {
    setData(prev => typeof updater === 'function' ? updater(prev) : updater)
  }, [])

  return { data, loading, error, execute, refresh, mutate }
}

/**
 * useDebounce — Debounce a value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * useDisclosure — Toggle open/close state (modals, panels, dropdowns)
 */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial)
  return {
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(v => !v), []),
  }
}

/**
 * useToast — Toast notification system
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return {
    toasts,
    toast: {
      success: (msg) => add(msg, 'success'),
      error: (msg) => add(msg, 'error'),
      info: (msg) => add(msg, 'info'),
    },
  }
}
