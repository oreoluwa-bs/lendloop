"use client"

import { useState } from "react"
import { useMutation } from "convex/react"

import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { errorMessage } from "@/lib/errors"

export function RequestDialog({
  listingId,
  toolName,
}: {
  listingId: Id<"listings">
  toolName: string
}) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [errors, setErrors] = useState<{
    startDate?: string
    endDate?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const request = useMutation(api.loans.request)
  const today = new Date().toISOString().slice(0, 10)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const data = new FormData(event.currentTarget)
    const start = String(data.get("startDate"))
    const end = String(data.get("endDate"))
    const errs: typeof errors = {}
    if (start < today) errs.startDate = "From cannot be in the past"
    if (end <= start) errs.endDate = "Until must be after From"
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await request({ listingId, startDate: start, endDate: end })
      toast.add({
        type: "success",
        title: "Request sent",
        description: `${toolName} · ${start} → ${end}`,
      })
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm">Request to borrow</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request {toolName}</DialogTitle>
          <DialogDescription>
            Pick the dates you need it. The owner approves or declines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startDate">From</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <FieldError>{errors.startDate}</FieldError>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">Until</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              min={startDate || today}
              required
            />
            <FieldError>{errors.endDate}</FieldError>
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
