"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { DoorOpen, Joystick, LockKeyhole } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function DashboardActions() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [open, setOpen] = useState(false)

  const handleJoin = () => {
    if (!code.trim()) {
      return
    }

    router.push(`/lobby?mode=join&code=${encodeURIComponent(code.trim().toUpperCase())}`)
    setOpen(false)
  }

  return (
    <div className="grid gap-3">
      <Link
        href="/lobby?mode=quick"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-12 justify-start rounded-2xl px-4 text-base shadow-[0_0_30px_rgba(34,197,94,0.2)]",
        )}
      >
        <Joystick className="size-4" />
        Match Rapide
      </Link>
      <Link
        href="/lobby?mode=create"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-12 justify-start rounded-2xl border-white/10 bg-white/5 px-4 text-base hover:bg-white/10",
        )}
      >
        <LockKeyhole className="size-4" />
        Créer Salon Privé
      </Link>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "h-12 justify-start rounded-2xl px-4 text-base",
          )}
        >
          <DoorOpen className="size-4" />
          Rejoindre avec Code
        </DialogTrigger>
        <DialogContent className="rounded-[1.75rem] border border-white/10 bg-zinc-950/95 p-6 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Rejoindre une salle privée</DialogTitle>
            <DialogDescription>
              Entre le code reçu pour rejoindre directement le lobby.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="room-code">Code du salon</Label>
            <Input
              id="room-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="h-11 rounded-2xl border-white/10 bg-white/5 text-base uppercase tracking-[0.35em]"
            />
          </div>
          <DialogFooter className="-mx-6 -mb-6 mt-2 rounded-b-[1.75rem] border-white/10 bg-white/5 p-6">
            <Button variant="outline" className="rounded-2xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button className="rounded-2xl" onClick={handleJoin} disabled={!code.trim()}>
              Rejoindre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
