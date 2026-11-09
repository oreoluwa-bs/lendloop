"use client"

import { SignInButton, useUser } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export function SignInCta({
  size = "lg",
  label = "Sign in to lend or borrow",
  shortLabel,
}: {
  size?: "sm" | "lg"
  label?: string
  /** Shown below `sm` when the full label would crowd the row. */
  shortLabel?: string
}) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded || isSignedIn) return null
  return (
    <SignInButton fallbackRedirectUrl="/tools">
      <Button size={size}>
        {shortLabel ? (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </Button>
    </SignInButton>
  )
}
