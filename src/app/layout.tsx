import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import { Footer } from "@/components/layout/footer"
import { Navbar } from "@/components/layout/navbar"
import { Providers } from "@/components/layout/providers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/types/database"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://football-auction-draft.vercel.app"),
  title: {
    default: "Football Auction Draft",
    template: "%s | Football Auction Draft",
  },
  description:
    "Draft football 1v1 avec enchères live, lobby privé, classement et dashboard Supabase.",
  openGraph: {
    title: "Football Auction Draft",
    description:
      "Construis ton équipe de rêve via des enchères en temps réel.",
    siteName: "Football Auction Draft",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Football Auction Draft",
    description:
      "Construis ton équipe de rêve via des enchères en temps réel.",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  let initialUser = null
  let initialProfile: Database["public"]["Tables"]["profiles"]["Row"] | null = null

  if (isConfigured) {
    try {
      const supabase = await createSupabaseServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      initialUser = user

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        initialProfile = profile
      }
    } catch {
      initialUser = null
      initialProfile = null
    }
  }

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers
          initialUser={initialUser}
          initialProfile={initialProfile}
          isConfigured={isConfigured}
        >
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
