"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { ArrowLeft, Loader2, LockKeyhole, Search, Sword, UserPlus2, Users } from "lucide-react"
import { toast } from "sonner"

import {
  cancelGame,
  createPrivateGame,
  findOrCreateQuickMatch,
  joinGameByCode,
} from "@/app/lobby/actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GAME_BUDGET_OPTIONS, GAME_TEAM_SIZE_OPTIONS } from "@/lib/constants/game"
import { createSupabaseClient } from "@/lib/supabase/client"
import { GAME_MODES, type GameConfig, type GameMode } from "@/lib/types/game"
import { cn } from "@/lib/utils"

type LobbyMode = "quick" | "create" | "join" | null

type QuickMatchState =
  | { phase: "idle" }
  | { phase: "searching"; gameId: string }
  | { phase: "timeout"; gameId: string | null }

const ENABLED_MODE: GameMode = "star_players"
const ROOM_CODE_LENGTH = 6

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH)
}

function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  )
}

export function LobbyClient({
  initialMode,
  initialCode,
}: {
  initialMode: LobbyMode
  initialCode: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [createConfig, setCreateConfig] = useState<GameConfig>({
    mode: ENABLED_MODE,
    budget: 250,
    teamSize: 5,
  })
  const [joinCode, setJoinCode] = useState(initialCode)
  const [quickState, setQuickState] = useState<QuickMatchState>({ phase: "idle" })
  const [activeMode, setActiveMode] = useState<LobbyMode>(initialMode)
  const [createPending, startCreateTransition] = useTransition()
  const [joinPending, startJoinTransition] = useTransition()
  const [quickPending, startQuickTransition] = useTransition()
  const quickBootRef = useRef(false)
  const redirectingRef = useRef(false)

  const resolveQuickMatch = useCallback(
    (gameId: string) => {
      if (redirectingRef.current) {
        return
      }

      redirectingRef.current = true
      toast.success("Adversaire trouvé. Redirection vers la partie...")
      router.push(`/game/${gameId}`)
      router.refresh()
    },
    [router],
  )

  const handleCreateGame = () => {
    setActiveMode("create")

    startCreateTransition(async () => {
      try {
        const result = await createPrivateGame(createConfig)
        toast.success(`Partie privée créée. Code ${result.roomCode}`)
        router.push(`/game/${result.gameId}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de créer la partie.")
      }
    })
  }

  const handleJoinGame = () => {
    const normalizedCode = normalizeCode(joinCode)

    if (normalizedCode.length !== ROOM_CODE_LENGTH) {
      toast.error("Entre un code valide de 6 caractères.")
      return
    }

    setActiveMode("join")

    startJoinTransition(async () => {
      try {
        const result = await joinGameByCode(normalizedCode)
        toast.success("Partie rejointe.")
        router.push(`/game/${result.gameId}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de rejoindre la partie.")
      }
    })
  }

  const handleStartQuickMatch = useCallback(() => {
    if (quickPending) {
      return
    }

    redirectingRef.current = false
    setActiveMode("quick")
    setQuickState({ phase: "idle" })

    startQuickTransition(async () => {
      try {
        const result = await findOrCreateQuickMatch()

        if (result.matched) {
          resolveQuickMatch(result.gameId)
          return
        }

        setQuickState({ phase: "searching", gameId: result.gameId })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de lancer la recherche.")
        setQuickState({ phase: "idle" })
      }
    })
  }, [quickPending, resolveQuickMatch])

  const handleCancelQuickSearch = useCallback(() => {
    if (quickState.phase !== "searching") {
      router.replace("/lobby")
      setActiveMode(null)
      setQuickState({ phase: "idle" })
      return
    }

    startQuickTransition(async () => {
      try {
        await cancelGame(quickState.gameId)
      } catch {}

      setQuickState({ phase: "idle" })
      setActiveMode(null)
      toast.info("Recherche arrêtée.")
      router.replace("/lobby")
    })
  }, [quickState, router])

  useEffect(() => {
    if (initialMode !== "quick" || quickBootRef.current) {
      return
    }

    quickBootRef.current = true
    handleStartQuickMatch()
  }, [handleStartQuickMatch, initialMode])

  useEffect(() => {
    if (quickState.phase !== "searching") {
      return
    }

    let active = true
    const gameId = quickState.gameId
    const channel = supabase
      .channel(`quick-match:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const nextGame = payload.new as { guest_id: string | null; status: string; id: string }

          if (!active) {
            return
          }

          if (nextGame.status === "ready" || nextGame.status === "in_progress" || Boolean(nextGame.guest_id)) {
            resolveQuickMatch(gameId)
          }
        },
      )
      .subscribe()

    const pollInterval = window.setInterval(async () => {
      const { data } = await supabase.from("games").select("guest_id, status").eq("id", gameId).maybeSingle()

      if (!active || !data) {
        return
      }

      if (data.status === "ready" || data.status === "in_progress" || Boolean(data.guest_id)) {
        resolveQuickMatch(gameId)
      }
    }, 3000)

    const timeout = window.setTimeout(async () => {
      if (!active || redirectingRef.current) {
        return
      }

      try {
        await cancelGame(gameId)
      } catch {}

      if (!active) {
        return
      }

      setQuickState({ phase: "timeout", gameId })
      toast.error("Aucun adversaire trouvé. Réessaie ou crée une partie privée.")
    }, 30000)

    return () => {
      active = false
      window.clearInterval(pollInterval)
      window.clearTimeout(timeout)
      void supabase.removeChannel(channel)
    }
  }, [quickState, resolveQuickMatch, supabase])

  if (quickState.phase === "searching") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader className="items-center text-center">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "self-start rounded-full border border-white/10 bg-white/5 px-3 text-muted-foreground hover:text-white",
              )}
            >
              <ArrowLeft className="size-4" />
              Retour
            </Link>
            <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
              Match rapide
            </Badge>
            <div className="mt-4 flex size-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-[0_0_60px_rgba(34,197,94,0.2)]">
              <Loader2 className="size-10 animate-spin" />
            </div>
            <CardTitle className="text-3xl text-white">Recherche en cours... ⏳</CardTitle>
            <CardDescription className="max-w-lg text-base">
              On te trouve un adversaire. Si personne n&apos;arrive vite, tu pourras relancer ou inviter un ami.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 text-sm text-muted-foreground">
              Mode {GAME_MODES.star_players.icon} {GAME_MODES.star_players.label} · 250M€ · 5 joueurs
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 flex-1 rounded-2xl"
                disabled={quickPending}
                onClick={handleCancelQuickSearch}
              >
                Arrêter la recherche
              </Button>
              <Link
                href="/lobby?mode=create"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 flex-1 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
                )}
              >
                Créer une partie privée
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  const showQuickTimeout = quickState.phase === "timeout"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full border border-white/10 bg-white/5 px-3 text-muted-foreground hover:text-white",
                )}
              >
                <ArrowLeft className="size-4" />
                Retour
              </Link>
              <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                Jouer
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold text-white">Choisis comment jouer</h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Match rapide, partie privée ou code partagé par un ami.
                </p>
              </div>
            </div>
            {showQuickTimeout ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                Aucun adversaire trouvé. Tu peux relancer une recherche ou créer une partie privée.
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr_0.95fr]">
          <Card
            className={cn(
              "border-white/10 bg-white/5 backdrop-blur-xl",
              activeMode === "quick" && "border-primary/30 shadow-[0_0_50px_rgba(34,197,94,0.12)]",
            )}
          >
            <CardHeader>
              <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
                🎮 Match rapide
              </Badge>
              <CardTitle className="text-2xl text-white">Trouve un adversaire</CardTitle>
              <CardDescription>On te trouve un adversaire !</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 text-sm text-muted-foreground">
                Mode {GAME_MODES.star_players.icon} {GAME_MODES.star_players.label} · 250M€ · 5 joueurs
              </div>
              <Button
                size="lg"
                className="h-12 w-full rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                disabled={quickPending}
                onClick={handleStartQuickMatch}
              >
                {quickPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Lancer la recherche
              </Button>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-white/10 bg-white/5 backdrop-blur-xl",
              activeMode === "create" && "border-primary/30 shadow-[0_0_50px_rgba(34,197,94,0.12)]",
            )}
          >
            <CardHeader>
              <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                🔒 Créer une partie privée
              </Badge>
              <CardTitle className="text-2xl text-white">Invite un ami</CardTitle>
              <CardDescription>Choisis les réglages puis partage le code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="game-mode">Mode</Label>
                <NativeSelect
                  id="game-mode"
                  value={createConfig.mode}
                  onChange={(event) =>
                    setCreateConfig((current) => ({
                      ...current,
                      mode: event.target.value as GameMode,
                    }))
                  }
                >
                  {Object.entries(GAME_MODES).map(([mode, meta]) => (
                    <option key={mode} value={mode} disabled={mode !== ENABLED_MODE}>
                      {meta.icon} {meta.label}
                      {mode !== ENABLED_MODE ? " · Bientôt" : ""}
                    </option>
                  ))}
                </NativeSelect>
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(GAME_MODES)
                    .filter(([mode]) => mode !== ENABLED_MODE)
                    .map(([mode, meta]) => (
                      <div
                        key={mode}
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        <span>
                          {meta.icon} {meta.label}
                        </span>
                        <Badge variant="secondary" className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px]">
                          Bientôt
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <NativeSelect
                    id="budget"
                    value={createConfig.budget}
                    onChange={(event) =>
                      setCreateConfig((current) => ({
                        ...current,
                        budget: Number(event.target.value),
                      }))
                    }
                  >
                    {GAME_BUDGET_OPTIONS.map((budget) => (
                      <option key={budget} value={budget}>
                        {budget}M€
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-size">Joueurs par équipe</Label>
                  <NativeSelect
                    id="team-size"
                    value={createConfig.teamSize}
                    onChange={(event) =>
                      setCreateConfig((current) => ({
                        ...current,
                        teamSize: Number(event.target.value),
                      }))
                    }
                  >
                    {GAME_TEAM_SIZE_OPTIONS.map((teamSize) => (
                      <option key={teamSize} value={teamSize}>
                        {teamSize} joueurs
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 w-full rounded-2xl"
                disabled={createPending}
                onClick={handleCreateGame}
              >
                {createPending ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
                Créer la partie
              </Button>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-white/10 bg-white/5 backdrop-blur-xl",
              activeMode === "join" && "border-primary/30 shadow-[0_0_50px_rgba(34,197,94,0.12)]",
            )}
          >
            <CardHeader>
              <Badge variant="secondary" className="w-fit rounded-full border border-white/10 bg-white/5">
                🔗 Rejoindre une partie
              </Badge>
              <CardTitle className="text-2xl text-white">Entre un code</CardTitle>
              <CardDescription>Entre le code partagé par ton ami.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-code">Code</Label>
                <Input
                  id="room-code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(normalizeCode(event.target.value))}
                  placeholder="ABC123"
                  maxLength={ROOM_CODE_LENGTH}
                  className="h-12 rounded-2xl border-white/10 bg-black/30 text-center text-lg tracking-[0.4em] uppercase"
                />
              </div>
              <Button
                size="lg"
                className="h-12 w-full rounded-2xl"
                disabled={joinPending || normalizeCode(joinCode).length !== ROOM_CODE_LENGTH}
                onClick={handleJoinGame}
              >
                {joinPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus2 className="size-4" />}
                Rejoindre la partie
              </Button>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 text-sm text-muted-foreground">
                Le code te fait rejoindre la partie en quelques secondes.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Sword,
              title: "Rapide",
              description: "Tu trouves une partie ou tu en crées une en quelques secondes.",
            },
            {
              icon: Users,
              title: "Entre amis",
              description: "Crée une partie privée et partage le code à ton ami.",
            },
            {
              icon: Search,
              title: "Simple",
              description: "Choisis ton budget, ton équipe et lance-toi.",
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <Card key={item.title} className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </main>
  )
}
