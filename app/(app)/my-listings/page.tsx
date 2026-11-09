import { auth } from "@clerk/nextjs/server"

import { MyListings } from "@/features/listings/components/my-listings"

export default async function Page() {
  await auth.protect()
  return (
    <>
      <MyListings />
    </>
  )
}
