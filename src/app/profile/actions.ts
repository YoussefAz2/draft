"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

function normalizeUsername(value: string) {
  return value.trim()
}

export async function updateProfileUsername(nextUsername: string) {
  const username = normalizeUsername(nextUsername)

  if (username.length < 3 || username.length > 20) {
    throw new Error("Le pseudo doit contenir entre 3 et 20 caractères.")
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error("Utilise uniquement des lettres, chiffres et underscore.")
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Authentification requise.")
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .limit(1)

  if (duplicateError) {
    throw new Error("Impossible de vérifier la disponibilité du pseudo.")
  }

  if (duplicate?.length) {
    throw new Error("Ce pseudo est déjà pris.")
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    throw new Error("Impossible de mettre à jour le pseudo.")
  }

  revalidatePath("/dashboard")
  revalidatePath("/profile")

  return { username }
}
