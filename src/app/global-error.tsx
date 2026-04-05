"use client"

import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr" className="dark h-full">
      <body className="min-h-screen bg-black font-sans text-white antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-12">
          <div className="w-full space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-red-400">Erreur {error.digest ? `· ${error.digest}` : ""}</p>
            <h1 className="text-3xl font-semibold text-white">Quelque chose a planté</h1>
            <p className="text-muted-foreground">
              Une erreur inattendue s&apos;est produite. Réessaie ou reviens à l&apos;accueil.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Réessayer
              </button>
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10"
              >
                Accueil
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
