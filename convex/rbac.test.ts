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
  expect(await alice.query(api.listings.list)).toEqual([])
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
  expect(await bob.query(api.listings.list)).toMatchObject([
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

  const loanId = await bob.mutation(api.loans.request, {
    listingId: id,
    startDate: "2030-01-01",
    endDate: "2030-01-05",
  })
  expect(loanId).toBeDefined()
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
  expect(await alice.query(api.listings.list)).toMatchObject([
    { status: "on-loan" },
  ])
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
  expect(await bob.query(api.listings.list)).toMatchObject([
    { status: "available" },
  ])
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
  await expect(bob.query(api.loans.listAll)).rejects.toThrowError(
    "Admin access required"
  )

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
  expect(await bob.query(api.listings.list)).toEqual([])
})

test("unauthenticated access is refused", async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(api.listings.list)).rejects.toThrowError(
    "Not authenticated"
  )
  await expect(t.query(api.loans.listMine)).rejects.toThrowError(
    "Not authenticated"
  )
  await expect(t.query(api.loans.listAll)).rejects.toThrowError(
    "Not authenticated"
  )
  await expect(t.mutation(api.listings.create, listing)).rejects.toThrowError(
    "Not authenticated"
  )
})
