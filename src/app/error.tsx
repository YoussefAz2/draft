"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center justify-center px-4 py-12">
      <div className="w-full space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-red-400">Erreur {error.digest ? `· ${error.digest}` : ""}</p>
        <h1 className="text-3xl font-semibold text-white">Oups, erreur</h1>
        <p className="text-muted-foreground">
          Quelque chose a mal tourné. Essaie de recharger la page.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset} className="rounded-2xl">
            Réessayer
          </Button>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
            )}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
