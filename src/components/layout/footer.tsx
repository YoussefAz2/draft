import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Football Auction Draft © 2025</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="transition-colors hover:text-foreground">
            Accueil
          </Link>
          <Link href="/auth/login" className="transition-colors hover:text-foreground">
            Login
          </Link>
          <Link href="/auth/signup" className="transition-colors hover:text-foreground">
            Signup
          </Link>
        </div>
      </div>
    </footer>
  )
}
