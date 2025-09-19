import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Use the types from the supabase client
type User = any // We'll use any for now to avoid import issues
type Session = any

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isConfigured: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured] = useState(isSupabaseConfigured())

  useEffect(() => {
    if (!isConfigured) {
      setError('Supabase is not properly configured. Please check your environment variables.')
      setLoading(false)
      return
    }

    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)
      setLoading(false)
    }).catch((error) => {
      console.error('Error getting session:', error)
      setError('Failed to connect to authentication service. Please check your network connection.')
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [isConfigured])

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { error }
    } catch (networkError) {
      return { error: { message: 'Network error: Unable to connect to authentication service' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (networkError) {
      return { error: { message: 'Network error: Unable to connect to authentication service' } }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (networkError) {
      console.error('Error signing out:', networkError)
    }
  }

  const value = {
    user,
    session,
    loading,
    error,
    isConfigured,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
