/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterAll, expect, test } from "vitest"
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

const dates = { startDate: "2030-01-10", endDate: "2030-01-20" }

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

afterAll(() => {
  delete process.env.N8N_API_SECRET
})

test("borrow request notifies the lender", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const listingId = await alice.mutation(api.listings.create, listing)
  await bob.mutation(api.loans.request, { listingId, ...dates })

  const forAlice = await alice.query(api.notifications.listMine)
  expect(forAlice.items.map((n) => n.type)).toEqual(["loan-requested"])
  expect(forAlice.unreadCount).toBe(1)
  expect((await bob.query(api.notifications.listMine)).items).toEqual([])
})

test("status changes notify the counterparty", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const listingId = await alice.mutation(api.listings.create, listing)
  const loanId = await bob.mutation(api.loans.request, { listingId, ...dates })
  await alice.mutation(api.loans.approve, { loanId })
  await bob.mutation(api.loans.markReturned, { loanId })

  expect((await bob.query(api.notifications.listMine)).items.map((n) => n.type))
    .toEqual(["loan-approved"])
  expect((await alice.query(api.notifications.listMine)).items.map((n) => n.type))
    .toEqual(["loan-returned", "loan-requested"])

  const second = await alice.mutation(api.listings.create, {
    ...listing,
    name: "Saw",
  })
  const loanId2 = await bob.mutation(api.loans.request, {
    listingId: second,
    ...dates,
  })
  await alice.mutation(api.loans.decline, { loanId: loanId2 })
  expect((await bob.query(api.notifications.listMine)).items.map((n) => n.type))
    .toEqual(["loan-declined", "loan-approved"])
})

test("reminder write-back is idempotent", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const listingId = await alice.mutation(api.listings.create, listing)
  const loanId = await bob.mutation(api.loans.request, { listingId, ...dates })
  await alice.mutation(api.loans.approve, { loanId })

  const first = await t.mutation(internal.loans.markReminded, {
    sentAt: "2030-02-01",
    loanIds: [loanId],
  })
  expect(first).toEqual({ reminded: [loanId], skipped: [] })
  // retries (same or earlier sentAt) must be no-ops
  expect(
    await t.mutation(internal.loans.markReminded, {
      sentAt: "2030-02-01",
      loanIds: [loanId],
    })
  ).toEqual({ reminded: [], skipped: [loanId] })
  expect(
    await t.mutation(internal.loans.markReminded, {
      sentAt: "2030-01-15",
      loanIds: [loanId],
    })
  ).toEqual({ reminded: [], skipped: [loanId] })

  const events = await t.run((ctx) => ctx.db.query("loanEvents").collect())
  expect(events.map((e) => e.type)).toEqual(["reminder-sent"])
  const notes = await bob.query(api.notifications.listMine)
  expect(notes.items.map((n) => n.type)).toEqual([
    "overdue-reminder",
    "loan-approved",
  ])
})

test("notifications can be marked read", async () => {
  const t = convexTest(schema, modules)
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const first = await alice.mutation(api.listings.create, listing)
  await bob.mutation(api.loans.request, { listingId: first, ...dates })
  const second = await alice.mutation(api.listings.create, {
    ...listing,
    name: "Saw",
  })
  await bob.mutation(api.loans.request, { listingId: second, ...dates })

  const before = await alice.query(api.notifications.listMine)
  expect(before.unreadCount).toBe(2)
  await alice.mutation(api.notifications.markRead, {
    notificationId: before.items[0]._id,
  })
  expect((await alice.query(api.notifications.listMine)).unreadCount).toBe(1)
  await alice.mutation(api.notifications.markAllRead)
  expect((await alice.query(api.notifications.listMine)).unreadCount).toBe(0)
})

test("http endpoints require the shared secret", async () => {
  process.env.N8N_API_SECRET = "test-secret"
  const t = convexTest(schema, modules)
  const auth = { Authorization: "Bearer test-secret" }

  expect((await t.fetch("/overdue-loans")).status).toBe(401)
  expect(
    (await t.fetch("/overdue-loans", { headers: { Authorization: "Bearer no" } }))
      .status
  ).toBe(401)
  expect((await t.fetch("/overdue-loans", { headers: auth })).status).toBe(200)
  expect(
    (
      await t.fetch("/reminders/sent", {
        method: "POST",
        headers: auth,
        body: "{}",
      })
    ).status
  ).toBe(400)
})

test("overdue loans flow through the http endpoints", async () => {
  process.env.N8N_API_SECRET = "test-secret"
  const t = convexTest(schema, modules)
  const auth = { Authorization: "Bearer test-secret" }
  const alice = t.withIdentity(identity("alice"))
  const bob = t.withIdentity(identity("bob"))
  const listingId = await alice.mutation(api.listings.create, listing)
  await bob.mutation(api.listings.create, { ...listing, name: "Wrench" })
  const aliceUser = await alice.query(api.users.whoami)
  const bobUser = await bob.query(api.users.whoami)
  if (!aliceUser || !bobUser) throw new Error("expected profiles")
  // request() rejects past dates, so fabricate an overdue approved loan
  const loanId = await t.run((ctx) =>
    ctx.db.insert("loans", {
      listingId,
      lenderId: aliceUser._id,
      borrowerId: bobUser._id,
      startDate: daysAgo(14),
      endDate: daysAgo(7),
      status: "approved",
    })
  )

  const overdue = await (
    await t.fetch("/overdue-loans", { headers: auth })
  ).json()
  expect(overdue).toHaveLength(1)
  expect(overdue[0]).toMatchObject({ loanId, borrowerEmail: "bob@test.dev" })

  const writeBack = () =>
    t.fetch("/reminders/sent", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ sentAt: today(), loanIds: [loanId] }),
    })
  const res = await writeBack()
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ reminded: [loanId], skipped: [] })
  // a workflow re-run must not remind twice
  expect(await (await writeBack()).json()).toEqual({
    reminded: [],
    skipped: [loanId],
  })

  const rerun = await (await t.fetch("/overdue-loans", { headers: auth })).json()
  expect(rerun).toHaveLength(0)

  const events = await t.run((ctx) => ctx.db.query("loanEvents").collect())
  expect(events.map((e) => e.type)).toEqual(["reminder-sent"])
  expect((await bob.query(api.notifications.listMine)).items).toHaveLength(1)
})
