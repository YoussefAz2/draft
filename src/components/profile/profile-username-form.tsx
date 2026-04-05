"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PencilLine } from "lucide-react"
import { toast } from "sonner"

import { updateProfileUsername } from "@/app/profile/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ProfileUsernameForm({ initialUsername }: { initialUsername: string }) {
  const router = useRouter()
  const [username, setUsername] = useState(initialUsername)
  const [isPending, startTransition] = useTransition()

  const hasChanges = username.trim() !== initialUsername

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={20}
          className="h-12 rounded-2xl border-white/10 bg-white/5 px-4 text-base"
          placeholder="Ton pseudo"
        />
        <Button
          className="h-12 rounded-2xl px-5"
          disabled={isPending || !hasChanges}
          onClick={() => {
            startTransition(async () => {
              try {
                const result = await updateProfileUsername(username)
                toast.success(`Pseudo mis à jour: ${result.username}`)
                router.refresh()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Impossible de modifier le pseudo.")
              }
            })
          }}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
          Modifier le pseudo
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">3 à 20 caractères, lettres, chiffres et underscore uniquement.</p>
    </div>
  )
}
