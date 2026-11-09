import { query } from "./_generated/server"

export const whoami = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    return identity ? { tokenIdentifier: identity.tokenIdentifier } : null
  },
})
