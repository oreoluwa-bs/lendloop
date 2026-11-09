"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { List, ScribbleLoop } from "@phosphor-icons/react"
import { cn } from "cn"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SignInCta } from "@/features/auth/components/sign-in-cta"
import { NotificationBell } from "@/features/notifications/components/notification-bell"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const publicMenu = [{ title: "Browse tools", url: "/#tools" }]

const appMenu = [
  { title: "Browse tools", url: "/tools" },
  { title: "My listings", url: "/my-listings" },
  { title: "My requests", url: "/my-requests" },
  { title: "Incoming", url: "/incoming" },
]

const adminItem = { title: "Admin", url: "/admin" }

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ScribbleLoop className="size-6" weight="bold" />
      <span className="text-lg font-semibold tracking-tighter">LendLoop</span>
    </Link>
  )
}

function MenuLinks({
  items,
  className,
}: {
  items: { title: string; url: string }[]
  className?: string
}) {
  const pathname = usePathname()
  return (
    <ul className={className}>
      {items.map((item) => {
        const active = !item.url.includes("#") && pathname === item.url
        return (
          <li key={item.title}>
            <Link
              href={item.url}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground",
                active && "bg-muted text-foreground"
              )}
            >
              {item.title}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Navbar({
  className,
  authed,
}: {
  className?: string
  /** Known server-side; when omitted the client waits for Clerk to load. */
  authed?: boolean
}) {
  const { isSignedIn, isLoaded } = useUser()
  const signedIn = authed ?? (isLoaded ? isSignedIn : undefined)
  const me = useQuery(api.users.whoami, signedIn ? {} : "skip")
  const items =
    signedIn === undefined
      ? []
      : signedIn
        ? me?.role === "admin"
          ? [...appMenu, adminItem]
          : appMenu
        : publicMenu
  return (
    <section className={cn("py-4", className)}>
      <div className="container mx-auto">
        <nav className="hidden grid-cols-[1fr_auto_1fr] items-center lg:grid">
          <div className="justify-self-start">
            <Logo />
          </div>
          <MenuLinks items={items} className="flex items-center justify-self-center" />
          <div className="flex items-center gap-2 justify-self-end">
            <SignInCta size="sm" />
            {signedIn && <NotificationBell />}
            {signedIn && <UserButton />}
          </div>
        </nav>

        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <SignInCta size="sm" />
            {signedIn && <NotificationBell />}
            {signedIn && <UserButton />}
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
                  <MenuLinks
                    items={items}
                    className="flex flex-col gap-2"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  )
}
