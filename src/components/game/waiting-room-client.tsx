"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { ArrowLeft, Copy, Loader2, LogOut, Play, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { initializeGame, leaveGame, setPlayerReady } from "@/app/lobby/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types/database"
import { GAME_MODES } from "@/lib/types/game"
import { cn } from "@/lib/utils"

type GameRow = Database["public"]["Tables"]["games"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type WaitingRoomProfile = Pick<ProfileRow, "id" | "username" | "avatar_url" | "elo_rating">

type PresencePayload = {
  user_id: string
  ready: boolean
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "FD"
  }

  return value
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function buildPresenceMaps(state: Record<string, PresencePayload[]>) {
  const readyByUserId: Record<string, boolean> = {}
  const connectedUserIds = new Set<string>()

  Object.values(state)
    .flat()
    .forEach((entry) => {
      if (!entry.user_id) {
        return
      }

      connectedUserIds.add(entry.user_id)
      readyByUserId[entry.user_id] = Boolean(entry.ready)
    })

  return {
    readyByUserId,
    connectedUserIds,
  }
}

function PlayerPanel({
  label,
  subtitle,
  profile,
  online,
  ready,
  pending,
}: {
  label: string
  subtitle: string
  profile: WaitingRoomProfile | null
  online: boolean
  ready: boolean
  pending?: boolean
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {profile ? (
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full border",
              online
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground",
            )}
          >
            {online ? "En ligne" : "Hors ligne"}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Avatar size="lg" className="size-14">
          <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.username ?? label} />
          <AvatarFallback>{getInitials(profile?.username)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-white">{profile?.username ?? "En attente"}</p>
          <p className="text-sm text-muted-foreground">
            {profile ? `ELO ${profile.elo_rating ?? 1000}` : pending ? "Recherche du joueur..." : "Aucun joueur connecté"}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 rounded-2xl border px-4 py-3 text-sm font-medium",
          ready
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-white/10 bg-white/5 text-muted-foreground",
        )}
      >
        {ready ? "✅ Prêt" : "❌ Pas prêt"}
      </div>
    </div>
  )
}

export function WaitingRoomClient({
  currentUserId,
  initialGame,
  profiles,
}: {
  currentUserId: string
  initialGame: GameRow
  profiles: WaitingRoomProfile[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [game, setGame] = useState(initialGame)
  const [playerProfiles, setPlayerProfiles] = useState<WaitingRoomProfile[]>(profiles)
  const [readyByUserId, setReadyByUserId] = useState<Record<string, boolean>>({})
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set())
  const [isReady, setIsReady] = useState(false)
  const [readyPending, startReadyTransition] = useTransition()
  const [launchPending, startLaunchTransition] = useTransition()
  const [leavePending, startLeaveTransition] = useTransition()
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const readyStateRef = useRef(isReady)

  useEffect(() => {
    readyStateRef.current = isReady
  }, [isReady])

  const currentUserRole = game.host_id === currentUserId ? "host" : "guest"
  const hostProfile = playerProfiles.find((profile) => profile.id === game.host_id) ?? null
  const guestProfile = playerProfiles.find((profile) => profile.id === game.guest_id) ?? null
  const bothPlayersJoined = Boolean(game.host_id && game.guest_id)
  const bothPlayersReady = Boolean(
    game.host_id &&
      game.guest_id &&
      readyByUserId[game.host_id] &&
      readyByUserId[game.guest_id],
  )

  const syncProfiles = useCallback(async () => {
    const ids = [game.host_id, game.guest_id].filter((value): value is string => Boolean(value))

    if (!ids.length) {
      setPlayerProfiles([])
      return
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, elo_rating")
      .in("id", ids)

    if (data) {
      setPlayerProfiles(data)
    }
  }, [game.guest_id, game.host_id, supabase])

  useEffect(() => {
    setGame(initialGame)
    setPlayerProfiles(profiles)
  }, [initialGame, profiles])

  useEffect(() => {
    const gameChannel = supabase
      .channel(`game:${initialGame.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${initialGame.id}`,
        },
        (payload) => {
          const nextGame = payload.new as GameRow
          setGame(nextGame)
          void syncProfiles()

          if (nextGame.status === "cancelled") {
            toast.error("Le salon a été annulé.")
          }

          if (nextGame.status === "in_progress") {
            toast.success("La partie démarre.")
          }

          router.refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(gameChannel)
    }
  }, [initialGame.id, router, supabase, syncProfiles])

  useEffect(() => {
    const presenceChannel = supabase.channel(`game-presence:${initialGame.id}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    const syncPresence = () => {
      const state = presenceChannel.presenceState<PresencePayload>()
      const { readyByUserId: nextReadyState, connectedUserIds: nextConnectedUserIds } = buildPresenceMaps(state)
      setReadyByUserId(nextReadyState)
      setConnectedUserIds(nextConnectedUserIds)
    }

    presenceChannel.on("presence", { event: "sync" }, syncPresence)
    presenceChannel.on("presence", { event: "join" }, syncPresence)
    presenceChannel.on("presence", { event: "leave" }, syncPresence)
    presenceChannel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        return
      }

      presenceChannelRef.current = presenceChannel
      await presenceChannel.track({ user_id: currentUserId, ready: readyStateRef.current })
    })

    return () => {
      void presenceChannel.untrack()
      void supabase.removeChannel(presenceChannel)
      presenceChannelRef.current = null
      setReadyByUserId({})
      setConnectedUserIds(new Set())
    }
  }, [currentUserId, initialGame.id, supabase])

  useEffect(() => {
    if (!presenceChannelRef.current) {
      return
    }

    void presenceChannelRef.current.track({ user_id: currentUserId, ready: isReady })
  }, [currentUserId, isReady])

  const handleToggleReady = () => {
    if (!bothPlayersJoined && currentUserRole === "host") {
      toast.info("Attends qu'un adversaire rejoigne le salon.")
      return
    }

    if (!isReady) {
      startReadyTransition(async () => {
        try {
          await setPlayerReady(game.id)
          setIsReady(true)
          toast.success("Tu es marqué comme prêt.")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Impossible de te marquer prêt.")
        }
      })

      return
    }

    setIsReady(false)
    toast.info("Statut ready retiré.")
  }

  const handleLaunchGame = () => {
    startLaunchTransition(async () => {
      try {
        await initializeGame(game.id)
        toast.success("Partie initialisée.")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de lancer la partie.")
      }
    })
  }

  const handleLeaveGame = () => {
    startLeaveTransition(async () => {
      try {
        await leaveGame(game.id)
        toast.success(currentUserRole === "host" ? "Salon annulé." : "Tu as quitté le salon.")
        router.push("/lobby")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de quitter le salon.")
      }
    })
  }

  const handleCopyRoomCode = async () => {
    if (!game.room_code) {
      return
    }

    try {
      await navigator.clipboard.writeText(game.room_code)
      toast.success("Code copié.")
    } catch {
      toast.error("Copie impossible.")
    }
  }

  if (game.status === "cancelled") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge variant="destructive" className="w-fit rounded-full">
              Salon annulé
            </Badge>
            <CardTitle className="text-3xl text-white">Cette partie n&apos;est plus disponible</CardTitle>
            <CardDescription>
              Un des joueurs a quitté le lobby avant le lancement. Retourne au lobby pour recréer un match.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/lobby" className={cn(buttonVariants({ size: "lg" }), "h-12 flex-1 rounded-2xl")}>
              Retour au lobby
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 flex-1 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10",
              )}
            >
              Dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (game.status === "in_progress") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
              Partie lancée
            </Badge>
            <CardTitle className="text-3xl text-white">{GAME_MODES[game.mode].icon} {GAME_MODES[game.mode].label}</CardTitle>
            <CardDescription>
              Draft initialisé avec {game.total_rounds ?? game.team_size * 2} rounds et budgets à {game.budget}M€.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
              La waiting room a validé les deux joueurs. La suite de l&apos;interface d&apos;enchères peut désormais consommer l&apos;état live du jeu sur cette route.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/lobby" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 flex-1 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10")}>
                Nouveau lobby
              </Link>
              <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "h-12 flex-1 rounded-2xl")}>
                Retour dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link
                href="/lobby"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full border border-white/10 bg-white/5 px-3 text-muted-foreground hover:text-white",
                )}
              >
                <ArrowLeft className="size-4" />
                Retour
              </Link>
              <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                Salon de jeu
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold text-white">Prépare le lancement de la draft</h1>
                <p className="text-base leading-7 text-muted-foreground">
                  {GAME_MODES[game.mode].icon} {GAME_MODES[game.mode].label} · {game.budget}M€ · {game.team_size} joueurs
                </p>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Code</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.3em] text-white">
                {game.room_code ?? "RAPIDE"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Joueurs</CardTitle>
              <CardDescription>
                Le lancement est possible quand les deux présences temps réel passent en ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <PlayerPanel
                label="Joueur 1"
                subtitle="Host"
                profile={hostProfile}
                online={connectedUserIds.has(game.host_id)}
                ready={Boolean(readyByUserId[game.host_id])}
              />
              <PlayerPanel
                label="Joueur 2"
                subtitle="Guest"
                profile={guestProfile}
                online={Boolean(game.guest_id && connectedUserIds.has(game.guest_id))}
                ready={Boolean(game.guest_id && readyByUserId[game.guest_id])}
                pending={!game.guest_id}
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Contrôles du lobby</CardTitle>
              <CardDescription>
                Ready via Presence, lancement par l&apos;hôte, abandon géré côté serveur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Ton statut</p>
                    <p className="text-sm text-muted-foreground">
                      {isReady ? "Tu es prêt pour le lancement." : "Confirme quand ton setup est prêt."}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full border",
                      isReady
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/5 text-muted-foreground",
                    )}
                  >
                    {isReady ? "Ready" : "Standby"}
                  </Badge>
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 w-full rounded-2xl"
                disabled={readyPending}
                onClick={handleToggleReady}
              >
                {readyPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {isReady ? "Retirer mon ready" : "Je suis prêt"}
              </Button>

              {currentUserRole === "host" ? (
                <Button
                  size="lg"
                  className="h-12 w-full rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                  disabled={!bothPlayersReady || launchPending}
                  onClick={handleLaunchGame}
                >
                  {launchPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Lancer la partie
                </Button>
              ) : (
                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 text-sm text-muted-foreground">
                  {bothPlayersReady
                    ? "Le host peut lancer la partie à tout moment."
                    : "Attends que les deux joueurs soient ready pour permettre le lancement."}
                </div>
              )}

              {game.room_code ? (
                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                  <p className="text-sm font-medium text-white">Partage ce code</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-mono text-2xl tracking-[0.3em] text-white">{game.room_code}</p>
                    <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10" onClick={handleCopyRoomCode}>
                      <Copy className="size-4" />
                      Copier
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 text-sm text-muted-foreground">
                  Match rapide actif. Aucun code à partager.
                </div>
              )}

              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
                disabled={leavePending}
                onClick={handleLeaveGame}
              >
                {leavePending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                Quitter
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
