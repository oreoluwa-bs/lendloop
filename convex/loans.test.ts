/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

const identity = (name: string) => ({
  subject: name,
  issuer: "https://test",
  tokenIdentifier: `https://test#${name}`,
  name,
  email: `${name}@test.dev`,
})

const listing = {
  name: "Drill",
  category: "power-tools" as const,
  condition: "good" as const,
  description: "Cordless drill",
}

test("forListing returns only requested and approved ranges", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const listingId = await alice.mutation(api.listings.create, listing)

  // requested
  await bob.mutation(api.loans.request, {
    listingId,
    startDate: "2030-01-10",
    endDate: "2030-01-20",
  })
  // declined
  const declined = await bob.mutation(api.loans.request, {
    listingId,
    startDate: "2030-02-10",
    endDate: "2030-02-20",
  })
  await alice.mutation(api.loans.decline, { loanId: declined })
  // returned
  const returned = await bob.mutation(api.loans.request, {
    listingId,
    startDate: "2030-03-10",
    endDate: "2030-03-20",
  })
  await alice.mutation(api.loans.approve, { loanId: returned })
  await alice.mutation(api.loans.markReturned, { loanId: returned })
  // approved (listing goes on-loan, so this one must come last)
  const approved = await bob.mutation(api.loans.request, {
    listingId,
    startDate: "2030-04-10",
    endDate: "2030-04-20",
  })
  await alice.mutation(api.loans.approve, { loanId: approved })

  const booked = await bob.query(api.loans.forListing, { listingId })
  expect(booked).toEqual([
    { startDate: "2030-01-10", endDate: "2030-01-20" },
    { startDate: "2030-04-10", endDate: "2030-04-20" },
  ])
})
