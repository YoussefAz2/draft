"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Shield, Trophy } from "lucide-react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"

const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
})

type LoginValues = z.infer<typeof loginSchema>

function mapAuthError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect."
  }

  if (message.includes("Email not confirmed")) {
    return "Valide ton email avant de te connecter."
  }

  if (message.includes("rate limit")) {
    return "Trop de tentatives. Réessaie dans quelques minutes."
  }

  return "Connexion impossible pour le moment."
}

export function LoginForm({
  redirectTo,
  confirmation,
}: {
  redirectTo: string
  confirmation: boolean
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (values: LoginValues) => {
    if (!hasSupabaseConfig) {
      toast.error("Variables Supabase manquantes. Configure NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword(values)

      if (error) {
        toast.error(mapAuthError(error.message))
        return
      }

      toast.success("Connexion réussie.")
      router.replace(redirectTo)
      router.refresh()
    } catch {
      toast.error("Connexion impossible pour le moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-primary">
              Retour dans l’arène
            </Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-white">
                Reprends le contrôle du draft.
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Connecte-toi pour lancer une partie rapide, ouvrir un salon privé et suivre tes stats ELO.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              {
                icon: Trophy,
                title: "Live duels",
                description: "Bids en temps réel contre un autre coach.",
              },
              {
                icon: Shield,
                title: "Profils synchronisés",
                description: "Stats, historique et progression sauvegardés.",
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

        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit rounded-full border border-white/10 bg-white/5">
              Auth
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-white">Se connecter</CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                Email et mot de passe pour accéder au dashboard et aux enchères live.
              </CardDescription>
            </div>
            {confirmation ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                Compte créé. Vérifie ta boîte mail si la confirmation email est activée, puis connecte-toi.
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                          autoComplete="current-password"
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
                  Se connecter
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex-col items-start gap-3 border-t border-white/10 bg-white/5 text-sm text-muted-foreground">
            <p>
              Pas encore de compte ?{" "}
              <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/80">
                Créer un compte
              </Link>
            </p>
            <p>Redirect après connexion: {redirectTo}</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
