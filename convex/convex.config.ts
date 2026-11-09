import { defineApp } from "convex/server"
import { v } from "convex/values"

export default defineApp({
  env: {
    N8N_WEBHOOK_URL: v.optional(v.string()),
    N8N_WEBHOOK_SECRET: v.optional(v.string()),
    N8N_API_SECRET: v.optional(v.string()),
  },
})
