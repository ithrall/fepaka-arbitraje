import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fepaka_user')) } catch { return null }
  })
  const [config, setConfig] = useState({
    escudo: localStorage.getItem('fepaka_escudo') || null,
    fedNombre: localStorage.getItem('fepaka_nombre') || 'FEPAKA',
  })
  const [eventoActivo, setEventoActivo] = useState(null)

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('fepaka_token', data.token)
    localStorage.setItem('fepaka_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fepaka_token')
    localStorage.removeItem('fepaka_user')
    setUser(null)
    setEventoActivo(null)
  }, [])

  const updateConfig = useCallback((updates) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }
      if (updates.escudo !== undefined) {
        if (updates.escudo) localStorage.setItem('fepaka_escudo', updates.escudo)
        else localStorage.removeItem('fepaka_escudo')
      }
      if (updates.fedNombre) localStorage.setItem('fepaka_nombre', updates.fedNombre)
      return next
    })
  }, [])

  const isAdmin = user?.rol === 'admin'

  return (
    <AppContext.Provider value={{
      user, login, logout, isAdmin,
      config, updateConfig,
      eventoActivo, setEventoActivo,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
