"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { WarningOctagon } from "@phosphor-icons/react"

export default function Error({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningOctagon />
          </EmptyMedia>
          <EmptyTitle className="text-balance">Something went wrong</EmptyTitle>
          <EmptyDescription>
            This page hit an unexpected error. Retrying usually fixes it.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={retry}>Try again</Button>
      </Empty>
    </div>
  )
}
