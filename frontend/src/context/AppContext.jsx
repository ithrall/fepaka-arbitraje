import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fepaka_user')) } catch { return null }
  })

  // FIX: la configuración (logo, nombre, título) ahora vive en el servidor
  // (PostgreSQL) en lugar de localStorage, así es la misma en cualquier
  // dispositivo o navegador que entre a la aplicación.
  const [config, setConfig] = useState({
    escudo: null,
    fedNombre: 'FEPAKA',
    tituloApp: 'Gestión de Arbitraje',
  })
  const [configLoaded, setConfigLoaded] = useState(false)

  const [eventoActivo, setEventoActivo] = useState(null)

  // Cargar configuración del servidor al iniciar la app (es pública, no requiere login)
  useEffect(() => {
    cargarConfig()
  }, [])

  async function cargarConfig() {
    try {
      const { data } = await api.get('/config')
      setConfig({
        escudo: data.escudo || null,
        fedNombre: data.fedNombre || 'FEPAKA',
        tituloApp: data.tituloApp || 'Gestión de Arbitraje',
      })
    } catch (err) {
      console.error('No se pudo cargar la configuración del servidor:', err.message)
    } finally {
      setConfigLoaded(true)
    }
  }

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

  // FIX: updateConfig ahora guarda en el servidor mediante PUT /api/config,
  // y solo actualiza el estado local tras confirmar éxito en el backend.
  const updateConfig = useCallback(async (updates) => {
    // Actualización optimista en pantalla
    setConfig(prev => ({ ...prev, ...updates }))
    try {
      const { data } = await api.put('/config', updates)
      setConfig({
        escudo: data.escudo || null,
        fedNombre: data.fedNombre || 'FEPAKA',
        tituloApp: data.tituloApp || 'Gestión de Arbitraje',
      })
      return data
    } catch (err) {
      console.error('Error al guardar configuración en el servidor:', err.message)
      // Revertir recargando desde el servidor si falló
      cargarConfig()
      throw err
    }
  }, [])

  const isAdmin = user?.rol === 'admin'

  return (
    <AppContext.Provider value={{
      user, login, logout, isAdmin,
      config, configLoaded, updateConfig,
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
