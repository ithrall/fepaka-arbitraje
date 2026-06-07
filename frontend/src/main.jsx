import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Evaluar from './pages/Evaluar'
import './styles.css'

function PrivateRoute({ children, adminOnly }) {
  const { user, isAdmin } = useApp()
  if (!user) return <Navigate to="/" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/evaluar" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
      <Route path="/evaluar" element={<PrivateRoute><Evaluar /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
