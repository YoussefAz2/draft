"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Bolt,
  CircleDollarSign,
  Crown,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const steps = [
  {
    title: "Rejoins une partie",
    description: "Lance un match rapide ou invite un ami avec un code.",
    icon: Users,
  },
  {
    title: "Enchéris sur les joueurs",
    description: "Mise au bon moment pour garder les meilleurs joueurs.",
    icon: CircleDollarSign,
  },
  {
    title: "Construis ton équipe",
    description: "Compose une équipe solide avec ton budget.",
    icon: Shield,
  },
  {
    title: "Remporte la partie",
    description: "Gagne, progresse et montre qui connaît le mieux le foot.",
    icon: Trophy,
  },
]

const modes = [
  "⭐ Star Players",
  "🏆 Legends",
  "🚀 Future Stars",
  "🌍 Africa Only",
  "💸 Low Budget",
  "🎲 Random Draft",
]

const features = [
  { title: "Simple à lancer", icon: Bolt },
  { title: "Fun à jouer", icon: Swords },
  { title: "Classement", icon: Crown },
  { title: "Duel 1v1", icon: Sparkles },
]

export function LandingPage({ ctaHref }: { ctaHref: string }) {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.16),transparent_20%)]" />
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-8">
            <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm text-primary">
              Foot, enchères et duel entre amis
            </Badge>
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary/90">
                🏆 Football Auction Draft
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Monte ton équipe de rêve et bats ton adversaire.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Choisis bien tes joueurs, gère ton budget et vis une partie rapide, simple et intense.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={ctaHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full px-6 text-base shadow-[0_0_40px_rgba(34,197,94,0.28)]",
                )}
              >
                Jouer maintenant
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#modes"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 rounded-full border-white/15 bg-white/5 px-6 text-base hover:bg-white/10",
                )}
              >
                Voir les modes
              </Link>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5 backdrop-blur-2xl">
            <CardHeader>
              <Badge variant="secondary" className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
                Star Players
              </Badge>
              <CardTitle className="text-2xl text-white sm:text-3xl">
                Le duel peut commencer.
              </CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                Garde ton budget, vise les bons joueurs et prends l’avantage au bon moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ["Face-à-face", "2 joueurs"],
                ["Budget", "Décisions rapides"],
                ["Partie privée", "Code à partager"],
                ["Classement", "Progression"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-between border-t border-white/10 bg-white/5 text-sm text-muted-foreground">
              <span>Prêt pour ta prochaine partie ?</span>
              <span className="text-primary">On joue</span>
            </CardFooter>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          <div className="space-y-3 text-center">
            <Badge variant="secondary" className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Quatre étapes pour te lancer.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={step.title} className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Icon className="size-5" />
                    </div>
                    <CardDescription>Étape {index + 1}</CardDescription>
                    <CardTitle className="text-white">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    {step.description}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.div>
      </section>

      <section id="modes" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        >
          <div className="space-y-3 text-center">
            <Badge variant="secondary" className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1 text-sm text-amber-300">
              Modes de jeu
            </Badge>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Plusieurs façons de jouer.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modes.map((mode) => (
              <div
                key={mode}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center text-base font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5"
              >
                {mode}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm">
                Pourquoi c&apos;est fun
              </Badge>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Une interface pensée pour jouer vite.
              </h2>
            </div>
            <Separator className="hidden h-px w-32 bg-white/10 sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </motion.div>
      </section>
    </main>
  )
}
