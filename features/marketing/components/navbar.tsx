"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { List, ScribbleLoop } from "@phosphor-icons/react"
import { cn } from "cn"
import Link from "next/link"

import { SignInCta } from "@/features/auth/components/sign-in-cta"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const menu = [{ title: "Browse tools", url: "#tools" }]

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ScribbleLoop className="size-6" weight="bold" />
      <span className="text-lg font-semibold tracking-tighter">LendLoop</span>
    </Link>
  )
}

function MenuLinks({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {menu.map((item) => (
        <li key={item.title}>
          <a
            href={item.url}
            className="inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function Navbar({ className }: { className?: string }) {
  const { isSignedIn } = useUser()
  return (
    <section className={cn("py-4", className)}>
      <div className="container mx-auto">
        <nav className="hidden grid-cols-[1fr_auto_1fr] items-center lg:grid">
          <div className="justify-self-start">
            <Logo />
          </div>
          <MenuLinks className="flex items-center justify-self-center" />
          <div className="flex items-center gap-2 justify-self-end">
            <SignInCta size="sm" />
            {isSignedIn && <UserButton />}
          </div>
        </nav>

        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <SignInCta size="sm" />
            {isSignedIn && <UserButton />}
            <Sheet>
              <SheetTrigger
                render={<Button variant="outline" size="icon" />}
                aria-label="Open menu"
              >
                <List className="size-4" />
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <MenuLinks className="flex flex-col gap-2" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  )
}
