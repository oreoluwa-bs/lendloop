"use client"

import { SignInButton, useUser } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export function SignInCta({
  size = "lg",
  label = "Sign in to lend or borrow",
}: {
  size?: "sm" | "lg"
  label?: string
}) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded || isSignedIn) return null
  return (
    <SignInButton fallbackRedirectUrl="/tools">
      <Button size={size}>{label}</Button>
    </SignInButton>
  )
}
