"use client"

import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { Bell } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/convex/_generated/api"
import { timeAgo } from "@/lib/utils"

// Notifications are always *about* a loan; the item links to the page
// where that loan can be acted on.
const destinations: Record<string, string> = {
  "loan-requested": "/incoming",
  "loan-approved": "/my-requests",
  "loan-declined": "/my-requests",
  "loan-returned": "/my-requests",
  "overdue-reminder": "/my-requests",
}

export function NotificationBell() {
  const { isSignedIn } = useUser()
  const data = useQuery(api.notifications.listMine, isSignedIn ? {} : "skip")
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  if (!isSignedIn) return null
  const unread = data?.unreadCount ?? 0

  return (
    <Popover>
      <span className="relative inline-flex">
        <PopoverTrigger
          render={<Button variant="outline" size="icon" />}
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="size-4" />
        </PopoverTrigger>
        {unread > 0 && (
          <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Notifications</h3>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => markAllRead()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ul className="flex flex-col gap-1">
          {(data?.items ?? []).map((notification) => (
            <li key={notification._id} className="relative">
              <Link
                href={destinations[notification.type] ?? "/tools"}
                onClick={() =>
                  notification.readAt === undefined &&
                  markRead({ notificationId: notification._id })
                }
                className="block rounded-md px-2 py-1.5 transition-colors hover:bg-muted after:absolute after:inset-0"
              >
                <span className="flex items-center gap-2">
                  {notification.readAt === undefined && (
                    <>
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span className="sr-only">Unread</span>
                    </>
                  )}
                  <span className="min-w-0 grow truncate text-sm font-medium">
                    {notification.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(notification._creationTime)}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {notification.body}
                </span>
              </Link>
            </li>
          ))}
          {data && data.items.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
