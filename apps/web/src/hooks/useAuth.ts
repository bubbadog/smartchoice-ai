'use client'

import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  name?: string
  preferences?: {
    categories: string[]
    priceRange: { min?: number; max?: number }
    brands: string[]
  }
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        // Verify token and get user data
        const response = await api.getProfile()
        if (response.success) {
          setUser(response.data)
        } else {
          localStorage.removeItem('auth_token')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password })
      if (response.success) {
        localStorage.setItem('auth_token', response.data.token)
        setUser(response.data.user)
        
        // Track login event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'login', {
            method: 'email'
          })
        }
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await api.register({ email, password, name })
      if (response.success) {
        localStorage.setItem('auth_token', response.data.token)
        setUser(response.data.user)
        
        // Track signup event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'sign_up', {
            method: 'email'
          })
        }
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    
    // Track logout event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'logout')
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}