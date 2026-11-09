/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
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

test("listMine splits by side and paginates", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  for (let i = 0; i < 2; i++) {
    const listingId = await alice.mutation(api.listings.create, listing)
    await bob.mutation(api.loans.request, {
      listingId,
      startDate: `2030-0${i + 1}-01`,
      endDate: `2030-0${i + 1}-05`,
    })
  }

  const first = await bob.query(api.loans.listMine, {
    side: "borrowed",
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(first.page).toHaveLength(1)
  expect(first.isDone).toBe(false)
  const second = await bob.query(api.loans.listMine, {
    side: "borrowed",
    paginationOpts: { numItems: 1, cursor: first.continueCursor },
  })
  expect(second.page).toHaveLength(1)
  expect(second.isDone).toBe(true)

  const lentOpts = { numItems: 10, cursor: null }
  expect(
    (
      await bob.query(api.loans.listMine, {
        side: "lent",
        paginationOpts: lentOpts,
      })
    ).page
  ).toEqual([])
  expect(
    (
      await alice.query(api.loans.listMine, {
        side: "lent",
        paginationOpts: lentOpts,
      })
    ).page
  ).toHaveLength(2)
})

test("admin search finds loans by tool or party name", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const drillId = await alice.mutation(api.listings.create, listing) // "Drill"
  const sawId = await alice.mutation(api.listings.create, {
    ...listing,
    name: "Circular Saw",
  })
  await bob.mutation(api.loans.request, {
    listingId: drillId,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })
  await bob.mutation(api.loans.request, {
    listingId: sawId,
    startDate: "2030-02-01",
    endDate: "2030-02-05",
  })
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })

  // search matches word prefixes on tool and party names
  const opts = { numItems: 10, cursor: null }
  const byTool = (
    await alice.query(api.loans.listAll, {
      paginationOpts: opts,
      search: "dri",
    })
  ).page
  expect(byTool).toMatchObject([{ listingName: "Drill" }])

  const byParty = (
    await alice.query(api.loans.listAll, {
      paginationOpts: opts,
      search: "bob",
    })
  ).page
  expect(byParty).toHaveLength(2)

  const drillListing = (
    await alice.query(api.listings.list, {
      paginationOpts: opts,
      search: "dri",
    })
  ).page
  expect(drillListing).toMatchObject([{ name: "Drill" }])
})
