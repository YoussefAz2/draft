"use client"

import Link from "next/link"

import { useAuth } from "@/components/providers/auth-provider"

export function Footer() {
  const { user } = useAuth()

  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Football Auction Draft © 2025</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="transition-colors hover:text-foreground">
            Accueil
          </Link>
          {!user ? (
            <>
              <Link href="/auth/login" className="transition-colors hover:text-foreground">
                Connexion
              </Link>
              <Link href="/auth/signup" className="transition-colors hover:text-foreground">
                Inscription
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
