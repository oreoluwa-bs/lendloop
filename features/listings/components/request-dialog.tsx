"use client"

import { useMutation, useQuery } from "convex/react"
import { format } from "date-fns"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"
import { today } from "@/convex/lib/dates"
import { CalendarBlank } from "@phosphor-icons/react"

const iso = (date: Date) => format(date, "yyyy-MM-dd")

export function RequestDialog({
  listingId,
  toolName,
}: {
  listingId: Id<"listings">
  toolName: string
}) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>()
  const [rangeError, setRangeError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const request = useMutation(api.loans.request)
  const booked = useQuery(api.loans.forListing, open ? { listingId } : "skip")

  // end-exclusive, same semantics as the overlap check in loans.request
  function isUnavailable(date: Date) {
    const d = iso(date)
    return (booked ?? []).some((b) => b.startDate <= d && d < b.endDate)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const start = range?.from ? iso(range.from) : ""
    const end = range?.to ? iso(range.to) : ""
    if (!start || !end) {
      setRangeError("Pick the days you need it")
      return
    }
    if (end <= start) {
      setRangeError("Until must be after From")
      return
    }
    setRangeError(undefined)
    try {
      await request({ listingId, startDate: start, endDate: end })
      toast.add({
        type: "success",
        title: "Request sent",
        description: `${toolName} · ${start} → ${end}`,
      })
      setRange(undefined)
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Request to borrow</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request {toolName}</DialogTitle>
          <DialogDescription>
            Pick the dates you need it. The owner approves or declines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label id="request-dates-label">Dates</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    aria-labelledby="request-dates-label"
                    className="justify-start font-normal"
                  />
                }
              >
                <CalendarBlank aria-hidden />
                {range?.from ? (
                  range.to ? (
                    <>
                      {format(range.from, "MMM d")} →{" "}
                      {format(range.to, "MMM d")}
                    </>
                  ) : (
                    format(range.from, "MMM d")
                  )
                ) : (
                  "Pick dates"
                )}
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-3rem)] max-w-80 p-0"
                align="start"
              >
                <Calendar
                  className="w-full"
                  mode="range"
                  captionLayout="dropdown"
                  selected={range}
                  onSelect={setRange}
                  // "today" comes from the same helper the server validates
                  // with, so the picker never offers a day the server rejects
                  disabled={[(date) => iso(date) < today(), isUnavailable]}
                  excludeDisabled
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Unavailable dates are greyed out.
            </p>
            <FieldError>{rangeError}</FieldError>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">Send request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
