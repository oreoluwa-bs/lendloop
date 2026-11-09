# LendLoop n8n integration

Three importable n8n workflows plus the Convex HTTP endpoints they talk to.

| File                      | Trigger                                                    | What it does                                                                                               |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `loan-notifications.json` | Convex webhook (loan requested/approved/declined/returned) | Verifies the HMAC signature, then notifies the relevant user — mock/log node, swap for Email/Slack/Discord |
| `overdue-reminders.json`  | Schedule, daily at 9am                                     | Fetches overdue loans, reminds each borrower, writes reminder status back                                  |
| `error-handler.json`      | Error trigger                                              | Logs failed runs and records them in LendLoop so failures never pass silently                              |

## Try it with Docker

n8n runs in Docker at `localhost:5678`; Convex runs locally as usual
(`npx convex dev`, HTTP actions on `127.0.0.1:3211`). Both directions stay on
your machine — no tunnel.

```sh
cp .env.example .env         # fill in the values
npx convex env set --from-file .env --force
docker compose up -d

docker compose exec n8n n8n import:workflow --input=/workflows/loan-notifications.json
docker compose exec n8n n8n import:workflow --input=/workflows/overdue-reminders.json
docker compose exec n8n n8n import:workflow --input=/workflows/error-handler.json
docker compose exec n8n n8n update:workflow --id=lendloop-loan-notifications --active=true
docker compose exec n8n n8n update:workflow --id=lendloop-overdue-reminders --active=true
```

Smoke test (the workflow answers with the mock notification it "delivered").
Source `.env` first so the signature uses your secret:

```sh
set -a; . ./.env; set +a
body='{"event":"loan-requested","recipient":{"name":"Ada","email":"ada@test"},"listing":{"name":"Drill"},"counterparty":{"name":"Bob"},"startDate":"2026-12-01","endDate":"2026-12-05"}'
ts=$(date +%s)
sig="v1=$(printf '%s.%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$N8N_WEBHOOK_SECRET" -hex | awk '{print $NF}')"
curl -s http://127.0.0.1:5678/webhook/lendloop-loan-events \
  -H "Content-Type: application/json" \
  -H "X-Lendloop-Timestamp: $ts" \
  -H "X-Lendloop-Signature: $sig" \
  -d "$body"
```

A bad or missing signature is rejected (500 → error handler) and notifies no one.

Run the overdue workflow on demand (its **Run now** trigger) instead of waiting
for the 9am schedule:

```sh
docker compose run --rm n8n execute --id=lendloop-overdue-reminders
```

## Secrets

Secrets live in environment variables and `.env` (gitignored) — never in code
or exported workflow JSON. The workflows only reference `$env.…`.

`.env` is the single file you edit (copy `.env.example`) and everything reads
it natively:

- **Next.js** loads `.env` directly.
- **n8n** gets it via `env_file` in `docker-compose.yml`.
- **Convex functions** run in the Convex backend (which reads deployment env,
  not local files), so copy the values over — one native command, re-run
  whenever `.env` changes (`--force` lets new values overwrite old):

```sh
npx convex env set --from-file .env --force
```

(`.env.local` is machine-written state owned by `npx convex dev` — you never
edit it; it just records the deployment name and local URLs.)

- `N8N_WEBHOOK_URL` — unset = events are logged to Convex logs only (dev mode).
- `N8N_WEBHOOK_SECRET` — HMAC key for outbound events (below). Set the same
  value in `.env` for n8n.
- `N8N_API_SECRET` — shared secret for n8n → Convex: bearer token required by
  the HTTP endpoints **and** HMAC key for the signed write-backs. The endpoints
  stay locked (401) while unset.

## Signed events (Convex → n8n)

Every event is signed with HMAC-SHA256 over `${timestamp}.${body}`:

- `X-Lendloop-Timestamp` — unix seconds
- `X-Lendloop-Signature` — `v1=<hex hmac>`

The **Verify signature** node in `loan-notifications.json` recomputes the HMAC
from the raw body (Webhook node "Raw Body" is enabled), compares with
`crypto.timingSafeEqual`, and rejects timestamps older than 5 minutes.
Signatures fail closed: no secret configured on either side = no delivery.

## Signed write-backs (n8n → Convex)

The reverse direction uses the same scheme, keyed with `N8N_API_SECRET`:

- The Code node before each POST (`overdue-reminders.json`,
  `error-handler.json`) builds the JSON body, then signs `${ts}.${body}` and
  emits `{ body, ts, sig }`.
- The HTTP Request node sends that exact `body` as **raw** JSON (not
  `specifyBody: json`, which would re-serialize and break the signature) and
  forwards `X-Lendloop-Timestamp` / `X-Lendloop-Signature`.
- Convex reads `req.text()` first, verifies the HMAC over those bytes with
  `crypto.subtle.verify`, checks the 5-minute window, and only then parses and
  applies the write-back. Bearer auth is still required as a second layer.

Rotating `N8N_API_SECRET` therefore invalidates in-flight requests on both
sides at once — update `.env`, restart n8n, and re-run
`npx convex env set --from-file .env --force`.

## Endpoints

All require `Authorization: Bearer $N8N_API_SECRET`; POSTs must also carry a
valid `X-Lendloop-*` signature over the raw body (see above).

| Method | Path                   | Body                                             | Purpose                                          |
| ------ | ---------------------- | ------------------------------------------------ | ------------------------------------------------ |
| POST   | webhook URL (n8n side) | signed event payload                             | Loan events out of Convex                        |
| GET    | `/overdue-loans`       | –                                                | Overdue approved loans (borrower contact, dates) |
| POST   | `/reminders/sent`      | `{ "sentAt": "YYYY-MM-DD", "loanIds": [...] }`   | Idempotent reminder write-back                   |
| POST   | `/loan-events`         | `{ "type": "workflow-failed", "detail": "..." }` | Record a failed automation run                   |

## Idempotency & retries

- Event payloads carry an `eventId`; dedupe on it if a real channel ever sees
  duplicates.
- `POST /reminders/sent` skips any loan already reminded on or after `sentAt`,
  so retries and workflow re-runs never duplicate reminders or in-app
  notifications. Overdue loans already reminded today are excluded from
  `/overdue-loans` for the same reason.
- Convex retries webhook delivery 3 times with backoff, then records a
  `webhook-failed` activity row on the loan (visible in the app) instead of
  failing silently. n8n HTTP nodes retry 3 times, and anything that still fails
  lands in the error handler.
