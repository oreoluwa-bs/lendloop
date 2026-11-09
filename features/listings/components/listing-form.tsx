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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import {
  categories,
  categoryLabels,
  conditionLabels,
} from "@/features/listings/lib/categories"
import { errorMessage } from "@/lib/errors"

const conditions = ["like-new", "good", "fair", "poor"] as const

export function ListingForm({ listing }: { listing?: Doc<"listings"> }) {
  const create = useMutation(api.listings.create)
  const edit = useMutation(api.listings.edit)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>(
    listing?.category ?? "power-tools"
  )
  const [condition, setCondition] = useState<string>(
    listing?.condition ?? "good"
  )
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const data = new FormData(event.currentTarget)
    const fields = {
      name: String(data.get("name")),
      category: category as (typeof categories)[number],
      condition: condition as (typeof conditions)[number],
      description: String(data.get("description")),
    }
    try {
      if (listing) {
        await edit({ listingId: listing._id, ...fields })
      } else {
        await create(fields)
      }
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          listing ? (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          ) : (
            <Button>List a tool</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{listing ? "Edit listing" : "List a tool"}</DialogTitle>
          <DialogDescription>
            Neighbours can find it in the tool library and request to borrow it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={listing?.name}
              placeholder="Cordless drill"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value ?? "power-tools")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Condition</Label>
              <Select
                value={condition}
                onValueChange={(value) => setCondition(value ?? "good")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {conditionLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Short description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={listing?.description}
              placeholder="18V, two batteries, bit set included."
              rows={3}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">
              {listing ? "Save changes" : "List it"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
