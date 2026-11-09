import { auth } from "@clerk/nextjs/server"

import { Footer } from "@/features/marketing/components/footer"
import { Navbar } from "@/features/marketing/components/navbar"

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated } = await auth()
  return (
    <>
      <Navbar authed={isAuthenticated} />
      <main className="container mx-auto px-4 py-10">{children}</main>
      <Footer />
    </>
  )
}
