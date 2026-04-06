"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"

import { createSupabaseClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
  initialUser: User | null
  initialProfile: Profile | null
  isConfigured: boolean
}

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
  isConfigured,
}: AuthProviderProps) {
  const supabase = useMemo(
    () => (isConfigured ? createSupabaseClient() : null),
    [isConfigured],
  )
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [loading, setLoading] = useState(isConfigured)

  const loadProfile = useCallback(
    async (userId: string) => {
      if (!supabase) {
        return null
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data
    },
    [supabase],
  )

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    const syncUser = async (nextUser: User | null) => {
      if (!mounted) {
        return
      }

      setUser(nextUser)

      if (!nextUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const nextProfile = await loadProfile(nextUser.id)
        if (mounted) {
          setProfile(nextProfile)
        }
      } catch {
        if (mounted) {
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const initialize = async () => {
      setLoading(true)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      await syncUser(currentUser ?? null)
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile, supabase])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    setLoading(true)

    // Always attempt sign out but don't block on failure
    // (e.g. when the account was deleted server-side, the API returns an error
    // but we still need to clear local state and cookies)
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore — we clear local state regardless
    }

    setUser(null)
    setProfile(null)
    setLoading(false)

    // Hard redirect to ensure server sees cleared cookies
    window.location.href = "/"
  }, [supabase])

  const value = useMemo(
    () => ({ user, profile, loading, isConfigured, signOut }),
    [isConfigured, loading, profile, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

export type { Profile }
