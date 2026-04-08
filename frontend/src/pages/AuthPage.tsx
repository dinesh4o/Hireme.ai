import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGoogleLoginUrl, signInUser, signUpUser } from '../services/authApi'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, error, setError } = useAuth()

  const [mode, setMode] = useState<AuthMode>(
    location.pathname === '/signup' ? 'signup' : 'login',
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login')
  }, [location.pathname])

  const isLogin = mode === 'login'

  const switchMode = (nextMode: AuthMode) => {
    setError(null)
    setMode(nextMode)
    navigate(nextMode === 'login' ? '/login' : '/signup')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isLogin) {
        const { access_token, user } = await signInUser({ email, password })
        login(access_token, user)
      } else {
        const { access_token, user } = await signUpUser({ name, email, password })
        login(access_token, user)
      }
      navigate('/workspace')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleAuth = () => {
    window.location.href = getGoogleLoginUrl()
  }

  return (
    <div
      className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden"
      onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
    >
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ x: mousePosition.x * 0.04, y: mousePosition.y * 0.04 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] rounded-full bg-blue-500/10 blur-[140px]"
        />
        <div className="absolute top-[20%] right-[-10%] w-[42%] h-[42%] rounded-full bg-violet-500/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[58%] h-[58%] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:3px_3px]" />
      </div>

      <main className="relative z-10 px-6 pt-20 pb-6">
        <div className="mx-auto max-w-7xl min-h-[calc(100vh-5rem)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex rounded-[28px] border border-white/[0.08] bg-black/35 backdrop-blur-xl p-10 flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] p-1 shadow-[0_0_18px_rgba(255,255,255,0.12)]">
              <img src="/logo.svg" alt="Hireme.ai logo" className="h-full w-full object-contain" />
            </div>

            <div>
              <p className="text-4xl leading-tight font-semibold max-w-[520px] text-zinc-100">
                "This platform transformed how we evaluate engineering talent with consistency and depth."
              </p>

              <div className="mt-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-xs font-bold">
                  SN
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Saranya Nair</p>
                  <p className="text-xs text-zinc-500">Research Lead at TechCorp</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 grid grid-cols-3 gap-6">
              <div>
                <p className="text-4xl font-bold tracking-tight">50K+</p>
                <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Active users</p>
              </div>
              <div>
                <p className="text-4xl font-bold tracking-tight">99.9%</p>
                <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Uptime</p>
              </div>
              <div>
                <p className="text-4xl font-bold tracking-tight">4.9/5</p>
                <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">User rating</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[24px] border border-white/10 bg-black/45 backdrop-blur-xl p-6 sm:p-8 w-full max-w-lg lg:max-w-none mx-auto"
          >
            <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {isLogin
                ? 'Enter your credentials to access your account'
                : 'Create your account to start interview practice'}
            </p>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="mt-6 w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06] transition"
            >
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-zinc-600">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-[0.16em]">or continue with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-xs uppercase tracking-[0.16em] text-zinc-500 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/30"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-[0.16em] text-zinc-500 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Password
                  </label>
                  {isLogin && (
                    <span className="text-xs text-zinc-500 hover:text-zinc-300 transition cursor-default">
                      Forgot password?
                    </span>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
              </div>

              {isLogin && (
                <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-black/40" />
                  Remember me for 30 days
                </label>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-zinc-100 text-zinc-950 py-3.5 text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-zinc-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : isLogin ? 'Sign in' : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-zinc-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                className="text-zinc-100 font-semibold hover:text-white transition"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  )
}