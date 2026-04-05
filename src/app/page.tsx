import Link from 'next/link';
import { ArrowRight, Shield, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const features = [
  {
    title: 'Draft live à 2 joueurs',
    description: 'Enchères en temps réel, room code simple, budget limité et tours rapides.',
    icon: Users,
  },
  {
    title: 'Base joueurs 2024/2025',
    description: '150 joueurs réels avec ratings, prix de base et distribution équilibrée.',
    icon: Trophy,
  },
  {
    title: 'Backend Supabase',
    description: 'Auth, RLS, profils, parties, bids et setup simplifié après déploiement.',
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12 sm:px-10">
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="max-w-3xl space-y-6">
          <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
            Football Auction Draft · Next.js 15 · Supabase
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Le squelette du draft est prêt.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Projet initialisé avec App Router, Tailwind CSS v4, shadcn/ui,
              Supabase SSR, endpoint de seed et dataset complet de 150 joueurs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/api/setup"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Lancer le seed
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Voir le dashboard placeholder
            </Link>
          </div>
        </div>
        <Separator />
        <section className="grid gap-4 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Coming soon.
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
