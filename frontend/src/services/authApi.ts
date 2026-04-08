const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
const authTokenStorageKey = 'interview_auth_token'

export interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  user: AuthUser
}

interface AuthErrorPayload {
  detail?: string
}

interface SignUpRequest {
  name: string
  email: string
  password: string
}

interface LoginRequest {
  email: string
  password: string
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as AuthErrorPayload
    if (payload.detail && payload.detail.trim()) {
      return payload.detail
    }
  } catch {
    // Ignore JSON parsing errors and fall back to status text.
  }

  return response.statusText || 'Request failed'
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, init)
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  return (await response.json()) as T
}

export async function signUpUser(payload: SignUpRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function signInUser(payload: LoginRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  return requestJson<AuthUser>('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export function getStoredAuthToken(): string | null {
  return window.localStorage.getItem(authTokenStorageKey)
}

export function storeAuthToken(token: string): void {
  window.localStorage.setItem(authTokenStorageKey, token)
}

export function clearStoredAuthToken(): void {
  window.localStorage.removeItem(authTokenStorageKey)
}

export function getAuthApiBaseUrl(): string {
  return apiBaseUrl
}

export function getGoogleLoginUrl(): string {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return `${apiBaseUrl}/api/auth/google/login`
}
