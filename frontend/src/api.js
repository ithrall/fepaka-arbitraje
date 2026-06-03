import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
})

// Adjuntar token automáticamente en cada petición
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fepaka_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expira, redirigir al login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fepaka_token')
      localStorage.removeItem('fepaka_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api
