import { ScribbleLoop } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

const sections = [
  {
    title: "LendLoop",
    links: [
      { name: "How it works", href: "#" },
      { name: "Browse tools", href: "#tools" },
    ],
  },
  {
    title: "Community",
    links: [
      { name: "About", href: "#" },
      { name: "Contact", href: "#" },
    ],
  },
]

const legalLinks = [
  { name: "Terms and Conditions", href: "#" },
  { name: "Privacy Policy", href: "#" },
]

export function Footer({ className }: { className?: string }) {
  return (
    <section className={className ?? "py-16"}>
      <div className="container mx-auto">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <ScribbleLoop className="size-6" weight="bold" />
                <span className="text-lg font-semibold tracking-tighter">
                  LendLoop
                </span>
              </Link>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Borrow what you need. Lend what you don&apos;t.
              </p>
            </div>
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-sm font-semibold tracking-tight">
                  {section.title}
                </h3>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  {section.links.map((link) => (
                    <li
                      key={link.name}
                      className="font-medium hover:text-primary"
                    >
                      <a href={link.href}>{link.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col justify-between gap-4 border-t border-border pt-8 text-xs font-medium text-muted-foreground md:flex-row md:items-center">
            <p>© 2026 LendLoop. All rights reserved.</p>
            <ul className="flex gap-4">
              {legalLinks.map((link) => (
                <li key={link.name} className="underline hover:text-primary">
                  <a href={link.href}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  )
}
