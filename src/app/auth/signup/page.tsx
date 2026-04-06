"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Shield, Sparkles, Target } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(20, "Le pseudo doit contenir au maximum 20 caractères.")
    .regex(/^[a-zA-Z0-9_]+$/, "Utilise uniquement lettres, chiffres et _ ."),
  email: z.email("Adresse email invalide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
})

type SignupValues = z.infer<typeof signupSchema>
type UsernameState = "idle" | "checking" | "available" | "taken"

function mapSignupError(message: string) {
  if (message.includes("already registered")) {
    return "Cet email est déjà utilisé."
  }

  if (message.includes("Password should be at least 6 characters")) {
    return "Le mot de passe doit contenir au moins 6 caractères."
  }

  return "Inscription impossible pour le moment."
}

export default function SignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameState, setUsernameState] = useState<UsernameState>("idle")
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  const usernameValue = form.watch("username")
  const usernameHint = useMemo(() => {
    if (!usernameValue.trim() || usernameValue.trim().length < 3) {
      return "Choisis un pseudo unique pour apparaître dans les drafts."
    }

    if (usernameState === "checking") {
      return "Vérification du pseudo..."
    }

    if (usernameState === "available") {
      return "Pseudo disponible."
    }

    if (usernameState === "taken") {
      return "Pseudo déjà pris."
    }

    return "Choisis un pseudo unique pour apparaître dans les drafts."
  }, [usernameState, usernameValue])

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setUsernameState("idle")
      return
    }

    const normalizedUsername = usernameValue.trim()

    if (normalizedUsername.length < 3) {
      setUsernameState("idle")
      form.clearErrors("username")
      return
    }

    let cancelled = false
    setUsernameState("checking")

    const timer = window.setTimeout(async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", normalizedUsername)
          .limit(1)

        if (cancelled) {
          return
        }

        if (error) {
          setUsernameState("idle")
          return
        }

        const isTaken = Boolean(data?.length)
        setUsernameState(isTaken ? "taken" : "available")

        if (isTaken) {
          form.setError("username", {
            type: "manual",
            message: "Ce pseudo est déjà pris.",
          })
        } else if (form.formState.errors.username?.type === "manual") {
          form.clearErrors("username")
        }
      } catch {
        if (!cancelled) {
          setUsernameState("idle")
        }
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [form, hasSupabaseConfig, usernameValue])

  const onSubmit = async (values: SignupValues) => {
    if (!hasSupabaseConfig) {
      toast.error("Variables Supabase manquantes. Configure NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createSupabaseClient()
      const username = values.username.trim()
      const { data: existingUsername } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .limit(1)

      if (existingUsername?.length) {
        form.setError("username", {
          type: "manual",
          message: "Ce pseudo est déjà pris.",
        })
        toast.error("Choisis un autre pseudo.")
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { username },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/dashboard`
              : undefined,
        },
      })

      if (error) {
        toast.error(mapSignupError(error.message))
        return
      }

      if (data.user && data.user.identities?.length === 0) {
        toast.error("Cet email est déjà utilisé.")
        return
      }

      if (!data.session) {
        toast.success("Compte créé. Vérifie ton email pour activer la connexion.")
        router.replace(`/auth/login?confirmation=1&email=${encodeURIComponent(values.email)}`)
        return
      }

      toast.success("Compte créé. Bienvenue dans le draft.")
      window.location.href = "/dashboard"
    } catch {
      toast.error("Inscription impossible pour le moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_1fr]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl order-2 lg:order-1">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit rounded-full border border-white/10 bg-white/5">
              Auth
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-white">Créer un compte</CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                Choisis ton pseudo et prépare-toi pour ta première partie.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pseudo</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="username"
                          placeholder="auctionboss"
                          className="h-11 rounded-2xl border-white/10 bg-white/5 px-4"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{usernameHint}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="coach@draft.gg"
                          className="h-11 rounded-2xl border-white/10 bg-white/5 px-4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="h-11 rounded-2xl border-white/10 bg-white/5 px-4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="h-12 w-full rounded-2xl text-base" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Créer mon compte
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex-col items-start gap-3 border-t border-white/10 bg-white/5 text-sm text-muted-foreground">
            <p>
              Déjà inscrit ?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
                Se connecter
              </Link>
            </p>
            <p>Ton profil est prêt automatiquement dès ton inscription.</p>
          </CardFooter>
        </Card>

        <div className="order-1 flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:order-2">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1 text-amber-300">
              Nouveau joueur
            </Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-white">
                Entre dans le jeu avec un profil prêt pour le duel.
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Un pseudo unique, ton classement et un accès direct aux parties rapides ou privées.
              </p>
            </div>
          </div>
          <div className="grid gap-4 pt-8">
            {[
              {
                icon: Sparkles,
                title: "Pseudo unique",
                description: "Ton identité de coach est réservée dès l'inscription.",
              },
              {
                icon: Target,
                title: "Accueil immédiat",
                description: "Retrouve tes parties et tes résultats dès la première connexion.",
              },
              {
                icon: Shield,
                title: "Compte sécurisé",
                description: "Ta session et ton profil restent bien enregistrés.",
              },
            ].map(({ icon: FeatureIcon, title, description }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <FeatureIcon className="mb-4 size-5 text-primary" />
                <p className="font-medium text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
