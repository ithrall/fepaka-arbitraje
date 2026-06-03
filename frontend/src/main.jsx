import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Evaluar from './pages/Evaluar'
import './styles.css'

function PrivateRoute({ children, adminOnly }) {
  const user = JSON.parse(localStorage.getItem('fepaka_user') || 'null')
  if (!user) return <Navigate to="/" replace />
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/evaluar" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
      <Route path="/evaluar" element={<PrivateRoute><Evaluar /></PrivateRoute>} />
    </Routes>
  </BrowserRouter>
)
