import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AppContext = createContext(null)

const STORAGE_KEYS = {
  escudo: 'fepaka_escudo',
  fedNombre: 'fepaka_nombre',
  tituloApp: 'fepaka_titulo_app',
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fepaka_user')) } catch { return null }
  })

  // FIX: config se inicializa leyendo localStorage de forma segura,
  // y cada cambio se persiste inmediatamente — antes solo vivía en memoria
  // y se perdía al recargar la página o tras un nuevo deploy.
  const [config, setConfig] = useState(() => ({
    escudo: localStorage.getItem(STORAGE_KEYS.escudo) || null,
    fedNombre: localStorage.getItem(STORAGE_KEYS.fedNombre) || 'FEPAKA',
    tituloApp: localStorage.getItem(STORAGE_KEYS.tituloApp) || 'Gestión de Arbitraje',
  }))

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

  // FIX: updateConfig ahora persiste CADA campo individualmente en localStorage
  // de forma inmediata y confiable, sin depender de que React vuelva a renderizar.
  const updateConfig = useCallback((updates) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }

      if ('escudo' in updates) {
        if (updates.escudo) localStorage.setItem(STORAGE_KEYS.escudo, updates.escudo)
        else localStorage.removeItem(STORAGE_KEYS.escudo)
      }
      if ('fedNombre' in updates && updates.fedNombre) {
        localStorage.setItem(STORAGE_KEYS.fedNombre, updates.fedNombre)
      }
      if ('tituloApp' in updates && updates.tituloApp) {
        localStorage.setItem(STORAGE_KEYS.tituloApp, updates.tituloApp)
      }

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
