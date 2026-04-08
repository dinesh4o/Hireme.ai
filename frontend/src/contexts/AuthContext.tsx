import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  clearStoredAuthToken,
  fetchCurrentUser,
  getStoredAuthToken,
  storeAuthToken,
  type AuthUser,
} from '../services/authApi'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  status: 'checking' | 'signed-out' | 'signed-in'
  error: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setError: (msg: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthContextType['status']>('checking')
  const [error, setErrorState] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const initAuth = async () => {
      // Check URL hashes for oauth token
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const tokenFromHash = hashParams.get('token')
      const oauthErrorReason = new URLSearchParams(window.location.search).get('reason')

      if (oauthErrorReason && !isCancelled) {
        setErrorState('Google sign-in failed. Please try again.')
      }

      if (tokenFromHash) {
        try {
          const oauthUser = await fetchCurrentUser(tokenFromHash)
          if (!isCancelled) {
            storeAuthToken(tokenFromHash)
            setToken(tokenFromHash)
            setUser(oauthUser)
            setStatus('signed-in')
          }
        } catch {
          if (!isCancelled) {
            clearStoredAuthToken()
            setStatus('signed-out')
            setErrorState('Google sign-in could not be completed.')
          }
        } finally {
          const cleanUrl = window.location.pathname
          window.history.replaceState(null, document.title, cleanUrl)
        }
        return
      }

      // Check stored token
      const storedToken = getStoredAuthToken()
      if (!storedToken) {
        if (!isCancelled) setStatus('signed-out')
        return
      }

      try {
        const currentUser = await fetchCurrentUser(storedToken)
        if (!isCancelled) {
          setToken(storedToken)
          setUser(currentUser)
          setStatus('signed-in')
        }
      } catch {
        if (!isCancelled) {
          clearStoredAuthToken()
          setStatus('signed-out')
        }
      }
    }

    void initAuth()

    return () => {
      isCancelled = true
    }
  }, [])

  const login = (newToken: string, newUser: AuthUser) => {
    storeAuthToken(newToken)
    setToken(newToken)
    setUser(newUser)
    setStatus('signed-in')
    setErrorState(null)
  }

  const logout = () => {
    clearStoredAuthToken()
    setToken(null)
    setUser(null)
    setStatus('signed-out')
  }

  const setError = (msg: string | null) => setErrorState(msg)

  return (
    <AuthContext.Provider value={{ user, token, status, error, login, logout, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}