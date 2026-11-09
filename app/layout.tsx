import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import type { Metadata } from "next"
import { Geist_Mono, Manrope } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConvexProvider } from "@/features/auth/components/convex-provider"
import { cn } from "@/lib/utils"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LendLoop — borrow tools from your neighbours",
    template: "%s · LendLoop",
  },
  description:
    "A neighbourhood tool library: list the tools gathering dust in your garage, and borrow what your neighbours already own.",
  openGraph: {
    type: "website",
    siteName: "LendLoop",
    title: "LendLoop — borrow tools from your neighbours",
    description:
      "A neighbourhood tool library: list the tools gathering dust in your garage, and borrow what your neighbours already own.",
  },
  twitter: {
    card: "summary",
    title: "LendLoop — borrow tools from your neighbours",
    description:
      "A neighbourhood tool library: list the tools gathering dust in your garage, and borrow what your neighbours already own.",
  },
}

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        manrope.variable
      )}
    >
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ConvexProvider>
            <ThemeProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ThemeProvider>
          </ConvexProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  )
}
