# LendLoop

A neighborhood tool-lending board with automated workflows. Built with Next.js (App Router), Convex, and Clerk, with n8n handling the notification automations.

- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [n8n workflows](#n8n-workflows) — exported workflow JSON lives in [`docs/n8n/`](docs/n8n/)
- [Security & data minimization](#security--data-minimization)
- [Running in production](#running-in-production)

## Local setup

Prerequisites: Node 20+, [pnpm](https://pnpm.io), Docker (for n8n), and a
[Clerk](https://clerk.com) account.

```sh
pnpm install
cp .env.example .env    # fill in the Clerk keys and n8n secrets (see table below)
```

**1. Convex backend.** First run provisions a dev deployment and writes
machine state to `.env.local` (never edit that file):

```sh
npx convex dev
```

Convex functions run on the Convex backend, which reads _deployment_ env vars,
not local files. Push your `.env` values over (re-run whenever `.env` changes):

```sh
npx convex env set --from-file .env --force
```

**2. Clerk.** In the Clerk dashboard create a JWT template named `convex`, then
copy its Issuer Domain into `.env` as `CLERK_JWT_ISSUER_DOMAIN` (and push it
with the command above).

**3. App.**

```sh
pnpm dev
```

Open http://localhost:3000, sign up, then make yourself the first admin from a
terminal (clients cannot call internal functions):

```sh
npx convex data users
npx convex run users:bootstrapAdmin '{"userId":"<id from above>"}'
```

Optional demo data (idempotent, only touches its own `seed#…` rows — drop it
before real use with `npx convex run listings:seed` again):

```sh
npx convex run listings:seed
```

**4. n8n (optional, for the notification automations).** n8n runs in Docker at
`localhost:5678`; both directions stay on your machine — no tunnel needed:

```sh
docker compose up -d
docker compose exec n8n n8n import:workflow --input=/workflows/loan-notifications.json
docker compose exec n8n n8n import:workflow --input=/workflows/overdue-reminders.json
docker compose exec n8n n8n import:workflow --input=/workflows/error-handler.json
docker compose exec n8n n8n update:workflow --id=lendloop-loan-notifications --active=true
docker compose exec n8n n8n update:workflow --id=lendloop-overdue-reminders --active=true
```

The workflows are mounted read-only into the container from
[`docs/n8n/`](docs/n8n/). See [docs/n8n/README.md](docs/n8n/README.md) for the
HMAC smoke test, the manual overdue-reminder run, and the endpoint reference.

## Environment variables

Everything you edit lives in `.env` (gitignored) — copy `.env.example`. It is
read natively by Next.js and by `docker compose` (`env_file`); Convex gets its
own copies via `npx convex env set --from-file .env --force`.

| Variable                                                                                                                                                               | Read by                                 | Where it comes from                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                                                                                                    | Next.js (client)                        | Clerk dashboard                                                       |
| `CLERK_SECRET_KEY`                                                                                                                                                     | Next.js (server, `proxy.ts` middleware) | Clerk dashboard                                                       |
| `CLERK_JWT_ISSUER_DOMAIN`                                                                                                                                              | Convex (auth config)                    | Clerk dashboard → JWT templates → `convex`                            |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Next.js (client)                        | Static routing config                                                 |
| `N8N_WEBHOOK_URL`                                                                                                                                                      | Convex (`webhooks.dispatch`)            | n8n webhook URL. Unset = events only logged to Convex logs (dev mode) |
| `N8N_WEBHOOK_SECRET`                                                                                                                                                   | Convex + n8n                            | Random shared secret; HMAC key for outbound events                    |
| `N8N_API_SECRET`                                                                                                                                                       | Convex (HTTP actions) + n8n             | Random bearer secret; HTTP endpoints stay locked (401) while unset    |

Two variables are **machine-written** into `.env.local` by `npx convex dev` and
need no manual setup: `NEXT_PUBLIC_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_SITE_URL`
(plus `CONVEX_DEPLOYMENT`). You never edit `.env.local`.

Secrets are never in code or exported workflow JSON — the n8n workflows only
reference `$env.…` lookups.

## Architecture

```
Browser ──▶ Next.js (App Router; Clerk middleware in proxy.ts)
              │  ConvexProviderWithClerk (features/auth/convex-provider.tsx)
              ▼
        Convex backend (convex/)
        ├── queries/mutations: listings, loans, users, notifications
        │     └── schema: users · listings · loans · notifications · loanEvents
        ├── webhooks.dispatch ── HMAC-signed POST ──▶ n8n webhook
        └── HTTP actions (convex/http.ts) ◀── bearer N8N_API_SECRET ── n8n
                                                     │
                                                     ▼
                              n8n (docker compose) · docs/n8n/*.json
                              loan notifications · overdue reminders · error handler
```

**UI surfaces** (`app/` routes; components under `features/`):

| Route                  | What it is                                                                  |
| ---------------------- | --------------------------------------------------------------------------- |
| `/`                    | Marketing landing                                                           |
| `/sign-in`, `/sign-up` | Clerk auth                                                                  |
| `/tools`               | Browse available tools (public catalog)                                     |
| `/my-listings`         | Create/edit/remove your own listings                                        |
| `/my-requests`         | Loans you requested (approve/decline/return flows)                          |
| `/incoming`            | Borrow requests on your listings                                            |
| `/admin`               | Admin panel: listings moderation, all loans, people (roles, trusted lender) |

**Data model** (`convex/schema.ts`):

| Table           | Purpose                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `users`         | Clerk profile: `tokenIdentifier`, name, email, `role` (admin/user), `trustedLender`                                       |
| `listings`      | Tools: name, category, condition, description, `status` (available/on-loan/removed)                                       |
| `loans`         | Borrow requests: listing, lender, borrower, date range, `status` (requested/approved/declined/returned), `lastReminderAt` |
| `notifications` | In-app bell items, linked to the loan that caused them                                                                    |
| `loanEvents`    | Audit trail of automation runs (reminder-sent / webhook-failed / workflow-failed), surfaced in the UI                     |

**Automations** (n8n): loan lifecycle events fan out to notifications; a daily
schedule fetches overdue loans and reminds borrowers (writing reminder status
back idempotently); an error handler records any failed automation run so
failures never pass silently.

## n8n workflows

Exported workflow JSON lives in [`docs/n8n/`](docs/n8n/) — importable as-is,
secrets stripped (workflows read `$env` only):

| File                                                          | Trigger                                                    | What it does                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`loan-notifications.json`](docs/n8n/loan-notifications.json) | Convex webhook (loan requested/approved/declined/returned) | Verifies the HMAC signature, then notifies the relevant user — mock/log node, swap for Email/Slack/Discord |
| [`overdue-reminders.json`](docs/n8n/overdue-reminders.json)   | Schedule, daily at 9am                                     | Fetches overdue loans, reminds each borrower, writes reminder status back                                  |
| [`error-handler.json`](docs/n8n/error-handler.json)           | Error trigger                                              | Logs failed runs and records them in LendLoop                                                              |

Full walkthrough, smoke test, and endpoint reference:
[docs/n8n/README.md](docs/n8n/README.md).

## Security & data minimization

- **Signed webhooks (Convex → n8n).** Every event is HMAC-SHA256 signed over
  `${timestamp}.${body}` and sent with `X-Lendloop-Timestamp` /
  `X-Lendloop-Signature: v1=<hex>`. n8n recomputes the HMAC from the raw body
  with `crypto.timingSafeEqual` and rejects timestamps older than 5 minutes
  (replay window). Signatures **fail closed**: no secret on either side = no
  delivery.
- **Bearer auth (n8n → Convex).** The HTTP actions require
  `Authorization: Bearer $N8N_API_SECRET` and **fail closed** — while the
  secret is unset they 401 for everyone. Request bodies are shape-validated
  before touching the database.
- **Minimal webhook payloads.** Events carry only what a notification needs:
  event type + `eventId`, and for the parties involved just display name and
  email, the listing name, and the loan dates. No user IDs, addresses, or free
  text leave the database.
- **Shaped query returns.** Queries return purpose-built objects, never raw
  documents — the public catalog returns only id/name/category, loan lists
  return counterparty display names. The overdue-loan endpoint exposes borrower
  contact details only to the authenticated n8n workflow, which needs them to
  send the reminder.
- **AuthZ on every mutation.** Clerk auth → Convex identity; per-row ownership
  checks (lender-only approve/decline, owner-only edit/remove, notification
  ownership) plus server-side `requireAdmin` for admin surfaces. The client
  hides admin UI, but enforcement is always server-side. Bootstrapping the
  first admin is terminal-only (`internalMutation`).
- **Input validation at trust boundaries.** Text length caps enforced both
  client- and server-side, strict date round-trip validation, loan overlap
  checks, and date-format regexes on HTTP endpoint bodies.
- **Error redaction.** `ConvexError` messages are deliberately user-safe;
  unexpected errors are redacted to "Server Error" in production so stacks and
  internals never leak (`lib/errors.ts`).
- **Idempotency & audit.** `eventId` on every event, `lastReminderAt` write-back
  so retries never double-remind, and a `loanEvents` audit trail that surfaces
  automation failures in the app.
- **Known gaps** (called out honestly): no application-level rate limiting —
  Convex handles transport-level abuse, but a determined caller could spam
  `loans.request`; and there's no email verification step beyond Clerk's
  defaults.

## Tests

```sh
pnpm test        # convex-test: webhook signing/verification, notifications, RBAC, loans & pagination
pnpm typecheck
pnpm lint
```

## Running in production

What I'd change beyond the local setup above.

**Infrastructure & security**

- Point everything at a **production Convex deployment** (`npx convex deploy`
  - `npx convex env set` against prod, never `dev`), and move Clerk to
    production keys. Keep secrets in a secret manager and **rotate
    `N8N_WEBHOOK_SECRET` / `N8N_API_SECRET`** on a schedule — both directions
    authenticate with long-lived shared secrets today; short-lived tokens or
    mTLS would be the next step.
- **HTTPS-only webhook URLs.** `N8N_WEBHOOK_URL` must be a public HTTPS
  endpoint, which means putting n8n behind a reverse proxy with TLS and auth.
  If workflows ever store credentials inside n8n itself, pin
  `N8N_ENCRYPTION_KEY` so they survive volume recreation.
- **Pin the n8n image** (no `:latest`) and give n8n a real backing database
  (Postgres) + persistent volume, or move to n8n Cloud / a managed queue-mode
  deployment rather than a single Docker container.
- **Replace the mock notification node** with a real channel (email via
  Resend/SES, or Slack/Discord). Then dedupe on `eventId` — n8n retries can
  otherwise double-send.
- **Monitor the automation layer.** Alert on `webhook-failed` /
  `workflow-failed` rows in `loanEvents` and on error-handler runs; today the
  app shows them but nobody is paged. Add Convex log/error alerting and
  backups (Convex has managed backups — enable and test a restore).
- **Rate limit** the public queries and request-creating mutations (WAF or
  edge middleware), and drop the demo seed path from the production deploy.

**UX / UI**

- **Fuzzy search and column filters.** Search matches name prefixes (Convex
  full-text) across the catalog and all three admin tabs; substring matching,
  description search, and status/role filters would round it out.
- **Offline handling.** `app/error.tsx` catches render failures, but a dropped
  connection just leaves queries sitting; add an offline banner and retry.
- **Notification preferences** (email vs in-app, digest vs instant) and a
  proper request detail page with the loan's event history instead of the
  inline `lastAutomationEvent` snippet.
