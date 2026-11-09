"use client"

import { useQuery } from "convex/react"

import { AdminListings } from "@/features/admin/components/admin-listings"
import { AdminLoans } from "@/features/admin/components/admin-loans"
import { AdminUsers } from "@/features/admin/components/admin-users"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mb-4 text-pretty text-sm text-muted-foreground">
        {description}
      </p>
      {children}
    </section>
  )
}

export function AdminPanel() {
  const me = useQuery(api.users.whoami)

  if (me === undefined) return <Skeleton className="h-64" />
  if (me?.role !== "admin") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Admins only</EmptyTitle>
          <EmptyDescription>
            You need an admin role to manage the library.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-10">
      <Section
        title="Listings"
        description="Every tool in the library. Removal pulls a tool even mid-loan."
      >
        <AdminListings />
      </Section>
      <Section
        title="Loans"
        description="Every borrow across the library, whatever the status."
      >
        <AdminLoans />
      </Section>
      <Section
        title="People"
        description="Roles and the trusted-lender badge."
      >
        <AdminUsers />
      </Section>
    </div>
  )
}
