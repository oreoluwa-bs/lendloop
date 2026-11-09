import { auth } from "@clerk/nextjs/server"

import { AllTools } from "@/features/listings/components/all-tools"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  await auth.protect()
  const { category } = await searchParams
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        All tools
      </h1>
      <p className="mt-1 text-pretty text-muted-foreground">
        Everything in the library, filterable by category.
      </p>
      <AllTools active={category} />
    </>
  )
}
