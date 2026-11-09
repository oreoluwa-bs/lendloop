/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

const paginationOpts = { numItems: 10, cursor: null }

const identity = (name: string) => ({
  subject: name,
  issuer: "https://test",
  tokenIdentifier: `https://test#${name}`,
  name,
})

const listing = {
  name: "Drill",
  category: "power-tools" as const,
  condition: "good" as const,
  description: "Cordless drill",
}

test("users are plain users until bootstrapped as admin", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  await alice.mutation(api.listings.create, listing)
  const bob = t.withIdentity(identity("bob"))
  await bob.mutation(api.listings.create, listing)

  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  expect(aliceUser).toMatchObject({ role: "user" })
  expect(await bob.query(api.users.whoami)).toMatchObject({ role: "user" })

  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })
  expect(await alice.query(api.users.whoami)).toMatchObject({ role: "admin" })
})

test("users manage only their own listings", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const id = await alice.mutation(api.listings.create, listing)

  await expect(
    bob.mutation(api.listings.edit, { listingId: id, ...listing })
  ).rejects.toThrowError("Not your listing")
  await expect(
    bob.mutation(api.listings.remove, { listingId: id })
  ).rejects.toThrowError("Not your listing")

  await alice.mutation(api.listings.edit, {
    listingId: id,
    ...listing,
    name: "Hammer drill",
  })
  await alice.mutation(api.listings.remove, { listingId: id })
  expect(await alice.query(api.listings.listPublic)).toEqual([])
})

test("admin can remove any listing, users cannot", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  await alice.mutation(api.listings.create, { ...listing, name: "Alice drill" })
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })
  const bob = t.withIdentity(identity("bob"))
  const id = await bob.mutation(api.listings.create, {
    ...listing,
    name: "Bob saw",
  })

  await expect(
    bob.mutation(api.listings.removeAny, { listingId: id })
  ).rejects.toThrowError("Admin access required")
  await alice.mutation(api.listings.removeAny, { listingId: id })
  expect(await bob.query(api.listings.listPublic)).toMatchObject([
    { name: "Alice drill" },
  ])
})

test("borrow requests validate dates and ownership", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const id = await alice.mutation(api.listings.create, listing)

  await expect(
    alice.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-01-10",
      endDate: "2030-01-05",
    })
  ).rejects.toThrowError("Cannot borrow your own listing")

  await expect(
    bob.mutation(api.loans.request, {
      listingId: id,
      startDate: "2020-01-01",
      endDate: "2020-01-05",
    })
  ).rejects.toThrowError("Invalid date range")

  // impossible calendar dates fail the round-trip check
  await expect(
    bob.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-02-31",
      endDate: "2030-03-05",
    })
  ).rejects.toThrowError("Invalid date range")

  const loanId = await bob.mutation(api.loans.request, {
    listingId: id,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })
  expect(loanId).toBeDefined()
  expect(
    (
      await bob.query(api.loans.listMine, {
        side: "borrowed",
        paginationOpts,
      })
    ).page
  ).toMatchObject([
    {
      listingName: "Drill",
      counterpartyName: "alice",
      isMineAsLender: false,
      status: "requested",
    },
  ])
})

test("overlapping requests on the same listing are rejected", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const carol = t.withIdentity(identity("carol"))
  const id = await alice.mutation(api.listings.create, listing)
  const loanId = await bob.mutation(api.loans.request, {
    listingId: id,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })

  // same neighbour, same window (double-click / duplicate)
  await expect(
    bob.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-01-01",
      endDate: "2030-01-05",
    })
  ).rejects.toThrowError("overlap")

  // different neighbour, overlapping window
  await expect(
    carol.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-01-03",
      endDate: "2030-01-08",
    })
  ).rejects.toThrowError("overlap")

  // back-to-back sharing the handover day is fine
  await expect(
    carol.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-01-05",
      endDate: "2030-01-10",
    })
  ).resolves.toBeDefined()

  // a declined request frees its window
  await alice.mutation(api.loans.decline, { loanId })
  await expect(
    carol.mutation(api.loans.request, {
      listingId: id,
      startDate: "2030-01-01",
      endDate: "2030-01-05",
    })
  ).resolves.toBeDefined()
})

test("listing fields are trimmed and capped", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))

  await expect(
    alice.mutation(api.listings.create, { ...listing, name: "   " })
  ).rejects.toThrowError("Name is required")
  await expect(
    alice.mutation(api.listings.create, {
      ...listing,
      name: "x".repeat(81),
    })
  ).rejects.toThrowError("max 80")
  await expect(
    alice.mutation(api.listings.create, {
      ...listing,
      description: "x".repeat(501),
    })
  ).rejects.toThrowError("max 500")

  await alice.mutation(api.listings.create, {
    ...listing,
    name: "  Drill  ",
    description: "  Cordless  ",
  })
  expect(await alice.query(api.listings.mine)).toMatchObject([
    { name: "Drill", description: "Cordless" },
  ])
})

test("only the lender approves or declines", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice")) // lender here
  const bob = t.withIdentity(identity("bob"))
  const carol = t.withIdentity(identity("carol"))
  const id = await alice.mutation(api.listings.create, listing)
  const loanId = await bob.mutation(api.loans.request, {
    listingId: id,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })

  // nobody but the lender can act on the request
  await expect(
    carol.mutation(api.loans.approve, { loanId })
  ).rejects.toThrowError("Only the lender can approve")
  await alice.mutation(api.loans.approve, { loanId })
  expect(
    (await alice.query(api.listings.list, { paginationOpts })).page
  ).toMatchObject([{ status: "on-loan" }])
})

test("only the parties to a loan can mark it returned", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const carol = t.withIdentity(identity("carol"))
  const id = await alice.mutation(api.listings.create, listing)
  const loanId = await bob.mutation(api.loans.request, {
    listingId: id,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })
  await alice.mutation(api.loans.approve, { loanId })

  await expect(
    carol.mutation(api.loans.markReturned, { loanId })
  ).rejects.toThrowError("Not part of this loan")
  await bob.mutation(api.loans.markReturned, { loanId })
  expect(
    (await bob.query(api.listings.list, { paginationOpts })).page
  ).toMatchObject([{ status: "available" }])
})

test("admin-only powers are refused to users", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  await alice.mutation(api.listings.create, listing)
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })
  const bob = t.withIdentity(identity("bob"))
  await bob.mutation(api.listings.create, listing) // creates bob's profile
  const bobUser = await bob.query(api.users.whoami)
  if (!bobUser) throw new Error("expected bob profile")

  await expect(
    bob.mutation(api.users.setTrustedLender, {
      userId: bobUser._id,
      trustedLender: true,
    })
  ).rejects.toThrowError("Admin access required")
  await expect(
    bob.mutation(api.users.setRole, { userId: bobUser._id, role: "admin" })
  ).rejects.toThrowError("Admin access required")
  await expect(
    bob.query(api.loans.listAll, { paginationOpts })
  ).rejects.toThrowError("Admin access required")

  await alice.mutation(api.users.setTrustedLender, {
    userId: bobUser._id,
    trustedLender: true,
  })
  await alice.mutation(api.users.setRole, {
    userId: bobUser._id,
    role: "admin",
  })
  expect(await bob.query(api.users.whoami)).toMatchObject({
    role: "admin",
    trustedLender: true,
  })
})

test("demoting the last admin is refused", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  await alice.mutation(api.listings.create, listing)
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })

  await expect(
    alice.mutation(api.users.setRole, { userId: aliceUser._id, role: "user" })
  ).rejects.toThrowError("Cannot demote the last admin")

  const bob = t.withIdentity(identity("bob"))
  await bob.mutation(api.listings.create, listing)
  const bobUser = await bob.query(api.users.whoami)
  if (!bobUser) throw new Error("expected bob profile")
  await alice.mutation(api.users.setRole, {
    userId: bobUser._id,
    role: "admin",
  })
  // two admins now, so demoting one is fine
  await alice.mutation(api.users.setRole, { userId: bobUser._id, role: "user" })
})

test("loaned listings cannot be edited or removed", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const listingId = await alice.mutation(api.listings.create, listing)
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })
  const bob = t.withIdentity(identity("bob"))
  const loanId = await bob.mutation(api.loans.request, {
    listingId,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })
  await alice.mutation(api.loans.approve, { loanId })

  await expect(
    alice.mutation(api.listings.edit, { listingId, ...listing, name: "New" })
  ).rejects.toThrowError("Listing is not available")
  await expect(
    alice.mutation(api.listings.remove, { listingId })
  ).rejects.toThrowError("Listing is not available")

  // an admin removal of an on-loan listing must not resurrect on return
  await alice.mutation(api.listings.removeAny, { listingId })
  await bob.mutation(api.loans.markReturned, { loanId })
  expect(await bob.query(api.listings.listPublic)).toEqual([])
})

test("unauthenticated access is refused", async () => {
  const t = convexTest(schema, modules)
  // the catalog is public
  expect(await t.query(api.listings.listPublic)).toEqual([])
  await expect(
    t.query(api.listings.list, { paginationOpts })
  ).rejects.toThrowError("Not authenticated")
  await expect(
    t.query(api.loans.listMine, { side: "borrowed", paginationOpts })
  ).rejects.toThrowError("Not authenticated")
  await expect(
    t.query(api.loans.listAll, { paginationOpts })
  ).rejects.toThrowError("Not authenticated")
  await expect(t.mutation(api.listings.create, listing)).rejects.toThrowError(
    "Not authenticated"
  )
})

test("users.listAll is admin-only", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  await alice.mutation(api.listings.create, listing)
  const aliceUser = await alice.query(api.users.whoami)
  if (!aliceUser) throw new Error("expected alice profile")
  await t.mutation(internal.users.bootstrapAdmin, { userId: aliceUser._id })
  const bob = t.withIdentity(identity("bob"))
  await bob.mutation(api.listings.create, listing)

  await expect(
    bob.query(api.users.listAll, { paginationOpts })
  ).rejects.toThrowError("Admin access required")
  const users = (await alice.query(api.users.listAll, { paginationOpts })).page
  expect(users.map((u) => u.name).sort()).toEqual(["alice", "bob"])
  expect(users.every((u) => "trustedLender" in u)).toBe(true)
})
