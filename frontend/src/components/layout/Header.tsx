import { ArrowLeft, ArrowRight, LogIn } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Pill } from '../reactbits/Pill'

export function Header() {
  const { user, status, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup')

  const isHome = location.pathname === '/'

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isAuthRoute && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] transition"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden
              className="h-7 w-7 rounded-lg object-contain shadow-[0_0_14px_rgba(255,255,255,0.22)]"
            />
            <span className="font-medium tracking-tight text-sm text-zinc-100 truncate">Hireme.ai</span>
          </Link>
        </div>

        {isHome && (
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/50" aria-label="Sections">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#features" className="hover:text-white transition-colors">Architecture</a>
            <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {status === 'signed-in' && user ? (
            <>
              <Pill text={user.name || user.email || 'You'} />
              {!location.pathname.startsWith('/workspace') && !location.pathname.startsWith('/interview') && (
                <Link
                  to="/workspace"
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-white transition-all hover:border-white/20"
                >
                  Workspace <ArrowRight size={14} />
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-white transition-all hover:border-white/20"
              >
                Sign out
              </button>
            </>
          ) : (
            !isAuthRoute && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-white transition-all hover:border-white/20"
              >
                <LogIn size={15} /> Login
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}