import { Footer } from "@/features/marketing/components/footer"
import { Hero } from "@/features/marketing/components/hero"
import { Navbar } from "@/features/marketing/components/navbar"
import { ToolsList } from "@/features/listings/components/tools-list"

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ToolsList />
      </main>
      <Footer />
    </>
  )
}
