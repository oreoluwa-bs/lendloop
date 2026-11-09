"use client"

import { useMutation, usePaginatedQuery } from "convex/react"
import { useDeferredValue, useState } from "react"

import { LoadMore } from "@/components/load-more"
import { SearchInput } from "@/components/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  StackedCell,
  StackedRow,
} from "@/features/admin/components/stacked-table"
import { errorMessage } from "@/lib/errors"

export function AdminUsers() {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.users.listAll,
    { search: deferredSearch.trim() || undefined },
    { initialNumItems: 20 }
  )
  const setRole = useMutation(api.users.setRole)
  const setTrustedLender = useMutation(api.users.setTrustedLender)

  return (
    <div>
      <div className="border-b px-3 pb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search people"
        />
      </div>
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Trusted lender</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {status === "LoadingFirstPage"
            ? Array.from({ length: 3 }, (_, i) => (
                <StackedRow key={i}>
                  <StackedCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </StackedCell>
                </StackedRow>
              ))
            : users.map((user) => (
                <StackedRow key={user._id}>
                  <StackedCell label="Name" className="font-medium">
                    {user.name}
                  </StackedCell>
                  <StackedCell label="Role">
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        value &&
                        setRole({
                          userId: user._id as Id<"users">,
                          role: value as "admin" | "user",
                        }).catch((err) =>
                          toast.add({ type: "error", title: errorMessage(err) })
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </StackedCell>
                  <StackedCell label="Trusted lender">
                    <Switch
                      aria-label={`Trusted lender for ${user.name}`}
                      checked={user.trustedLender}
                      onCheckedChange={(checked) =>
                        setTrustedLender({
                          userId: user._id as Id<"users">,
                          trustedLender: checked,
                        }).catch((err) =>
                          toast.add({ type: "error", title: errorMessage(err) })
                        )
                      }
                    />
                  </StackedCell>
                </StackedRow>
              ))}
        </TableBody>
      </Table>
      <LoadMore status={status} loadMore={loadMore} />
    </div>
  )
}
