// ПОЛНЫЙ ФАЙЛ: client/src/App.jsx
// Изменения: добавлен import SchedulePage + Route для /schedule

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import PaymentsPage from './pages/PaymentsPage'
import UsersPage from './pages/UsersPage'
import RemindersPage from './pages/RemindersPage'
import SchedulePage from './pages/SchedulePage'

const API_URL = import.meta.env.VITE_API_URL || 'https://autoshkola-crm-production.up.railway.app/api'

function useWakeUpServer() {
  useEffect(() => {
    fetch(`${API_URL.replace('/api', '')}/ping`)
      .then(() => console.log('✅ Сервер проснулся'))
      .catch(() => console.log('⏳ Сервер просыпается...'))
  }, [])
}

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  useWakeUpServer()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  )
}
