"use client"

import type { User } from "@supabase/supabase-js"
import { ThemeProvider } from "next-themes"

import {
  AuthProvider,
  type Profile,
} from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"

export function Providers({
  children,
  initialUser,
  initialProfile,
  isConfigured,
}: {
  children: React.ReactNode
  initialUser: User | null
  initialProfile: Profile | null
  isConfigured: boolean
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider
        initialUser={initialUser}
        initialProfile={initialProfile}
        isConfigured={isConfigured}
      >
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}
