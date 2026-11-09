"use client"

import { useMutation, useQuery } from "convex/react"

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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"

export function AdminUsers() {
  const users = useQuery(api.users.listAll, {})
  const setRole = useMutation(api.users.setRole)
  const setTrustedLender = useMutation(api.users.setTrustedLender)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Trusted lender</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users === undefined
          ? Array.from({ length: 3 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={3}>
                  <Skeleton className="h-5" />
                </TableCell>
              </TableRow>
            ))
          : users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Switch
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
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
