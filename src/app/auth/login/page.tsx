import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; confirmation?: string }>
}) {
  const params = await searchParams

  return (
    <LoginForm
      redirectTo={params.redirect || "/dashboard"}
      confirmation={params.confirmation === "1"}
    />
  )
}
