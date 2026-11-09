"use client"

import { useQuery } from "convex/react"
import { Handshake, SquaresFour, UsersThree } from "@phosphor-icons/react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import { AdminListings } from "@/features/admin/components/admin-listings"
import { AdminLoans } from "@/features/admin/components/admin-loans"
import { AdminUsers } from "@/features/admin/components/admin-users"

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 grid gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-pretty text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
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
    <Tabs defaultValue="listings">
      <TabsList>
        <TabsTrigger value="listings">
          <SquaresFour aria-hidden />
          Listings
        </TabsTrigger>
        <TabsTrigger value="loans">
          <Handshake aria-hidden />
          Loans
        </TabsTrigger>
        <TabsTrigger value="people">
          <UsersThree aria-hidden />
          People
        </TabsTrigger>
      </TabsList>
      <TabsContent value="listings">
        <Panel
          title="Listings"
          description="Every tool in the library. Removal pulls a tool even mid-loan."
        >
          <AdminListings />
        </Panel>
      </TabsContent>
      <TabsContent value="loans">
        <Panel
          title="Loans"
          description="Every borrow across the library, whatever the status."
        >
          <AdminLoans />
        </Panel>
      </TabsContent>
      <TabsContent value="people">
        <Panel
          title="People"
          description="Roles and the trusted-lender badge."
        >
          <AdminUsers />
        </Panel>
      </TabsContent>
    </Tabs>
  )
}
