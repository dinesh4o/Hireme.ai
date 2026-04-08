import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/layout/Header'
import LandingPage from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  const location = useLocation()
  const hideHeader =
    location.pathname.startsWith('/workspace') ||
    location.pathname.startsWith('/interview')

  return (
    <>
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/interview" element={<WorkspacePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
      </Routes>
    </>
  )
}
