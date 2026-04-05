import { LandingPage } from "@/components/landing/landing-page"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  let user = null

  if (isConfigured) {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    user = currentUser
  }

  return <LandingPage ctaHref={user ? "/dashboard" : "/auth/signup"} />
}
