# LendLoop n8n integration

Three importable n8n workflows plus the Convex HTTP endpoints they talk to.

| File | Trigger | What it does |
| --- | --- | --- |
| `loan-notifications.json` | Convex webhook (loan requested/approved/declined/returned) | Notifies the relevant user — mock/log node, swap for Email/Slack/Discord |
| `overdue-reminders.json` | Schedule, daily at 9am | Fetches overdue loans, reminds each borrower, writes reminder status back |
| `error-handler.json` | Error trigger | Logs failed runs and records them in LendLoop so failures never pass silently |

## 1. Convex environment

```sh
npx convex env set N8N_WEBHOOK_URL https://<your-n8n>/webhook/lendloop-loan-events
npx convex env set N8N_WEBHOOK_SECRET <random-shared-secret>
npx convex env set N8N_API_SECRET <random-shared-secret>
```

- `N8N_WEBHOOK_URL` — unset = events are logged to Convex logs only (dev mode).
- `N8N_WEBHOOK_SECRET` — sent as `X-Lendloop-Secret` on every event; verify it in
  the Webhook node (Header Auth) if you want to reject spoofed calls.
- `N8N_API_SECRET` — bearer token required by the HTTP endpoints. They stay
  locked (401) while unset.

## 2. n8n environment

The workflows read two values from n8n's environment:

- `CONVEX_SITE_URL` — your deployment's site URL, `https://<deployment>.convex.site`
- `N8N_API_SECRET` — same value as in Convex

Set them where n8n runs (docker-compose `environment`, systemd `Environment=`,
or shell exports). If your n8n blocks env access in expressions
(`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`), replace `$env.X` in the nodes with
Header Auth credentials instead.

## 3. Import

1. Import the three JSON files (Workflows → Import from file).
2. Open **LendLoop - Loan notifications** and **LendLoop - Overdue reminders** →
   Settings → Error workflow → select **LendLoop - Error handler** (the import
   links it by id; re-select only if n8n assigned new ids).
3. Activate the workflows.

## Endpoints

All require `Authorization: Bearer $N8N_API_SECRET`.

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/webhook…` (n8n side) | event payload | Loan events out of Convex |
| GET | `/overdue-loans` | – | Overdue approved loans (borrower contact, dates) |
| POST | `/reminders/sent` | `{ "sentAt": "YYYY-MM-DD", "loanIds": [...] }` | Idempotent reminder write-back |
| POST | `/loan-events` | `{ "type": "workflow-failed", "detail": "..." }` | Record a failed automation run |

## Idempotency & retries

- Event payloads carry an `eventId`; dedupe on it if a receiver ever sees
  duplicates.
- `POST /reminders/sent` skips any loan already reminded on or after `sentAt`,
  so retries and workflow re-runs never duplicate reminders or in-app
  notifications. Overdue loans already reminded today are excluded from
  `/overdue-loans` for the same reason.
- Convex retries webhook delivery 3 times with backoff, then records a
  `webhook-failed` activity row on the loan (visible in the app) instead of
  failing silently. n8n HTTP nodes retry 3 times, and anything that still fails
  lands in the error handler.
