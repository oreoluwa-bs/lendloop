"use client"

import { SignInButton, useUser } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export function SignInCta({ size = "lg" }: { size?: "sm" | "lg" }) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded || isSignedIn) return null
  return (
    <SignInButton>
      <Button size={size}>Sign in to lend or borrow</Button>
    </SignInButton>
  )
}
