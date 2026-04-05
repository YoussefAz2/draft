"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Trophy, UserCircle2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/lobby", label: "Jouer" },
  { href: "/#features", label: "Classement" },
]

function getInitials(value?: string | null) {
  if (!value) {
    return "FD"
  }

  return value
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function AuthControls({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()

  const wrapperClassName = mobile
    ? "flex flex-col gap-3"
    : "hidden items-center gap-3 md:flex"

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Déconnexion effectuée.")
    } catch {
      toast.error("Impossible de se déconnecter pour le moment.")
    }
  }

  if (loading) {
    return (
      <div className={wrapperClassName}>
        <Skeleton className="h-10 w-40 rounded-full bg-white/10" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={wrapperClassName}>
        <Link
          href="/auth/login"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "justify-center")}
        >
          Login
        </Link>
        <Link
          href="/auth/signup"
          className={cn(buttonVariants({ size: "lg" }), "justify-center shadow-[0_0_30px_rgba(34,197,94,0.25)]")}
        >
          Signup
        </Link>
      </div>
    )
  }

  const username = profile?.username ?? user.email?.split("@")[0] ?? "Coach"

  if (mobile) {
    return (
      <div className={wrapperClassName}>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <Avatar size="lg">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={username} />
            <AvatarFallback>{getInitials(username)}</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" size="lg" onClick={() => router.push("/dashboard")}>
          <UserCircle2 className="size-4" />
          Profil
        </Button>
        <Button variant="ghost" size="lg" onClick={handleSignOut}>
          Déconnexion
        </Button>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-left transition hover:border-primary/40 hover:bg-white/10">
          <Avatar>
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={username} />
            <AvatarFallback>{getInitials(username)}</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <div className="space-y-0.5 pr-2">
            <p className="text-sm font-medium text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl border border-white/10 bg-zinc-950/95 p-2 backdrop-blur-xl">
          <DropdownMenuLabel className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={username} />
                <AvatarFallback>{getInitials(username)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activePath = useMemo(() => pathname ?? "/", [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Football Auction
            </p>
            <p className="text-base font-semibold text-foreground">Draft</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? activePath === "/" : activePath.startsWith(item.href.replace("/#features", ""))

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <AuthControls />

        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/30 px-4 py-4 md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <Separator className="bg-white/10" />
            <AuthControls mobile />
            <Badge variant="secondary" className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
              Live auction · 1v1 · stratégie
            </Badge>
          </div>
        </div>
      )}
    </header>
  )
}
