import { SignInCta } from "@/features/auth/components/sign-in-cta"

export function Hero() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-pretty lg:text-6xl">
            Borrow what you need. Lend what you don&apos;t.
          </h1>
          <p className="mx-auto max-w-4xl text-balance text-muted-foreground lg:text-lg">
            LendLoop is a neighborhood tool library. Find the drill, ladder, or
            tent gathering dust nearby — and list the tools you barely use.
          </p>
        </div>
        <div className="mt-10">
          <SignInCta />
        </div>
      </div>
    </section>
  )
}
