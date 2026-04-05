import { redirect } from "next/navigation"

import { LobbyClient } from "@/components/game/lobby-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SearchParams = {
  mode?: string
  code?: string
}

function normalizeMode(value?: string): "quick" | "create" | "join" | null {
  if (value === "quick" || value === "create" || value === "join") {
    return value
  }

  return null
}

export default async function LobbyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  if (!isConfigured) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
              Supabase requis
            </Badge>
            <CardTitle className="text-3xl text-white">Configuration manquante</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Ajoute les variables Supabase pour activer le matchmaking en temps réel.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/lobby")
  }

  const resolvedSearchParams = await searchParams

  return (
    <LobbyClient
      initialMode={normalizeMode(resolvedSearchParams.mode)}
      initialCode={(resolvedSearchParams.code ?? "").toUpperCase().slice(0, 6)}
    />
  )
}
